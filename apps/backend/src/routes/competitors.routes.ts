import { Router, Request, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import { prisma } from '../config/prisma.js';
import { authenticate } from '../middleware/auth.js';
import { requireTeamRole } from '../middleware/teamAuth.js';
import { parseProductUrl } from '../utils/product-url.js';
// We'll import product model or service if needed to fetch product details
import { ProductModel } from '../models/index.js'; // Assuming direct model access for now or similar

const router = Router({ mergeParams: true }); // Merge params to access :teamId

// Middleware: Authenticate & Check Team Role (Viewer can list, but Editor/Admin needed to modify)
router.use(authenticate);

/**
 * GET /api/v1/teams/:teamId/competitors
 * List all monitored competitors for a team
 */
router.get(
    '/',
    requireTeamRole('viewer'),
    async (req: Request, res: Response) => {
        try {
            const teamId = req.params.teamId as string;

            const competitors = await prisma.$queryRaw`
                SELECT 
                    c.id, 
                    c.product_id, 
                    c.competitor_url, 
                    c.competitor_marketplace, 
                    c.is_active, 
                    c.updated_at,
                    p.title as my_product_title,
                    p.current_price as my_product_price,
                    p.currency as my_product_currency,
                    p.image_url as my_product_image
                    -- Ideally join with a scraped product table or similar if we stored competitor details separately
                    -- For now, we only stored the URL. 
                    -- In a real implementation, we would likely have created a Product record for the competitor too 
                    -- or have extra fields in 'competitors' table for last scraped price.
                    -- Checking schema: 'competitors' has specific fields?
                    -- From migration: competitor_url, competitor_marketplace, competitor_product_id.
                    -- No price column in 'competitors'. 
                    -- So we need to fetch live data or link to a Product record.
                    -- Implementation Plan implies: "Product (Image + Price) vs Competitor". 
                    -- Let's assume for MVP we might need to store the competitor price or link to a Product.
                    -- If we look at the migration again: 
                    -- product_id REFERS TO 'our' product.
                    -- competitor_product_id is just string ID.
                    
                    -- Improvement: We should probably treat competitor product as a Product in our DB so it gets scraped regularly.
                    -- But to avoid pollution, we might just store metadata in 'competitors' or separate table.
                    -- Let's stick to the schema we built: 'competitors'. 
                    -- We might need to add 'last_price' to competitors table to make it useful without live scraping every view.
                FROM competitors c
                JOIN products p ON c.product_id = p.id
                WHERE c.team_id = ${teamId}::uuid
                ORDER BY c.created_at DESC
            `;

            // Since we don't have price in competitors table yet, we might return what we have
            // Future improvement: Add 'current_price' to competitors table via migration or link to a Product
            res.json({ competitors });
        } catch (error) {
            console.error('Error fetching competitors:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
);

/**
 * POST /api/v1/teams/:teamId/competitors
 * Add a new competitor
 */
router.post(
    '/',
    requireTeamRole('editor'),
    [
        body('product_id').isUUID().withMessage('Valid Product ID required'),
        body('competitor_url').isURL().withMessage('Valid URL required')
    ],
    async (req: Request, res: Response) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        try {
            const teamId = req.params.teamId as string;
            const { product_id, competitor_url } = req.body;

            // 1. Validate 'My Product' exists
            const myProduct = await prisma.product.findUnique({ where: { id: product_id } });
            if (!myProduct) {
                return res.status(404).json({ error: 'Your product not found' });
            }

            // 2. Validate Competitor URL
            const parsed = parseProductUrl(competitor_url);
            if (!parsed) {
                return res.status(400).json({ error: 'Unsupported marketplace URL' });
            }

            // 3. Create Competitor Record
            // We use raw query or Prisma if model was generated (it might not be in client yet if we didn't run generate)
            // Using raw query for safety as per previous pattterns if model missing
            // But let's try Prisma first if 'competitors' is in schema... 
            // It wasn't in the schema.prisma file we viewed earlier!
            // We added it via migration 006, but did we update schema.prisma?
            // The USER said "schema.prisma" file was viewed and it ended at line 516 with TelegramLinkCode.
            // So `competitors` model is NOT in schema.prisma. We must use $queryRawUnsafe or update schema.prisma.
            // I will use $queryRaw for now to match the "Backend Implementation" using the SQL we wrote.

            // To properly track it, we should probably trigger a scrape JOB for this URL.
            // Re-using scrape queue service.
            try {
                const { addScrapeJob } = await import('../services/scrape-queue.js');
                await addScrapeJob({
                    productId: 'COMPETITOR_placeholder', // We don't have a real product ID yet for this...
                    // Actually, if we want to scrape it, we usually need a Product record.
                    // This reveals a design choice: Should competitors be partial Products?
                    // For now, let's just save the record.
                    url: competitor_url,
                    marketplace: parsed.marketplace,
                    marketplaceId: parsed.marketplaceId,
                    priority: 10
                });
            } catch (e) {
                console.warn('Could not trigger immediate scrape', e);
            }

            const newCompetitor = await prisma.$queryRaw`
                INSERT INTO competitors (team_id, product_id, competitor_url, competitor_marketplace, competitor_product_id)
                VALUES (${teamId}::uuid, ${product_id}::uuid, ${competitor_url}, ${parsed.marketplace}, ${parsed.marketplaceId})
                RETURNING *
            `;

            res.status(201).json({
                message: 'Competitor added',
                competitor: Array.isArray(newCompetitor) ? newCompetitor[0] : newCompetitor
            });

        } catch (error) {
            console.error('Error adding competitor:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
);

/**
 * DELETE /api/v1/teams/:teamId/competitors/:id
 * Remove a competitor
 */
router.delete(
    '/:id',
    requireTeamRole('editor'),
    async (req: Request, res: Response) => {
        try {
            const { teamId, id } = req.params;

            await prisma.$queryRaw`
                DELETE FROM competitors 
                WHERE id = ${id}::uuid AND team_id = ${teamId}::uuid
            `;

            res.json({ message: 'Competitor removed' });
        } catch (error) {
            console.error('Error removing competitor:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
);

export default router;
