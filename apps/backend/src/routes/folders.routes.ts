import { Router, Request, Response } from 'express';
import { body, param } from 'express-validator';
import { FolderModel } from '../models/index.js';
import { asyncHandler, validate, authenticate } from '../middleware/index.js';
import { BadRequestError, NotFoundError } from '../utils/errors.js';
import { prisma } from '../config/prisma.js';

const router = Router();

/**
 * @route   GET /api/folders
 * @desc    Get all user folders
 * @access  Private
 */
router.get(
    '/',
    authenticate,
    asyncHandler(async (req: Request, res: Response) => {
        const userId = req.user!.id;
        const folders = await FolderModel.getByUserId(userId);
        res.json({ folders });
    })
);

/**
 * @route   POST /api/folders
 * @desc    Create a new folder
 * @access  Private
 */
router.post(
    '/',
    authenticate,
    validate([
        body('name').isString().trim().isLength({ min: 1, max: 255 }).withMessage('Folder name is required'),
        body('color').optional().isHexColor().withMessage('Invalid color format'),
        body('icon').optional().isString().isLength({ max: 50 }),
        body('isPublic').optional().isBoolean(),
        body('description').optional().isString().isLength({ max: 1000 }),
    ]),
    asyncHandler(async (req: Request, res: Response) => {
        const { name, color, icon, isPublic, description } = req.body;
        const userId = req.user!.id;

        const folder = await FolderModel.create({
            userId,
            name,
            color,
            icon,
            isPublic,
            description
        });

        res.status(201).json({
            message: 'Folder created successfully',
            folder
        });
    })
);

/**
 * @route   GET /api/folders/:id
 * @desc    Get folder by ID with its products
 * @access  Private
 */
router.get(
    '/:id',
    authenticate,
    validate([param('id').isUUID().withMessage('Invalid folder ID')]),
    asyncHandler(async (req: Request, res: Response) => {
        const { id } = req.params;
        const userId = req.user!.id;

        const folder = await FolderModel.findById(id);
        if (!folder || folder.user_id !== userId) {
            throw new NotFoundError('Folder not found');
        }

        // Get products in this folder
        const userProducts = await prisma.userProduct.findMany({
            where: {
                userId,
                folderId: id
            },
            include: {
                product: true
            },
            orderBy: [
                { isFavorite: 'desc' },
                { addedAt: 'desc' }
            ]
        });

        res.json({
            folder,
            products: userProducts.map((up: any) => ({
                ...up.product,
                custom_name: up.customName,
                notes: up.notes,
                is_favorite: up.isFavorite,
                added_at: up.addedAt
            }))
        });
    })
);

/**
 * @route   PATCH /api/folders/:id
 * @desc    Update folder
 * @access  Private
 */
router.patch(
    '/:id',
    authenticate,
    validate([
        param('id').isUUID().withMessage('Invalid folder ID'),
        body('name').optional().isString().trim().isLength({ min: 1, max: 255 }),
        body('color').optional().isHexColor(),
        body('icon').optional().isString().isLength({ max: 50 }),
        body('isPublic').optional().isBoolean(),
        body('description').optional().isString().isLength({ max: 1000 }),
        body('sortOrder').optional().isInt({ min: 0 }),
    ]),
    asyncHandler(async (req: Request, res: Response) => {
        const { id } = req.params;
        const userId = req.user!.id;
        const updates = req.body;

        const folder = await FolderModel.update(id, userId, updates);
        if (!folder) {
            throw new NotFoundError('Folder not found or you do not have permission');
        }

        res.json({
            message: 'Folder updated successfully',
            folder
        });
    })
);

/**
 * @route   DELETE /api/folders/:id
 * @desc    Delete folder (unassigns products)
 * @access  Private
 */
router.delete(
    '/:id',
    authenticate,
    validate([param('id').isUUID().withMessage('Invalid folder ID')]),
    asyncHandler(async (req: Request, res: Response) => {
        const { id } = req.params;
        const userId = req.user!.id;

        const deleted = await FolderModel.delete(id, userId);
        if (!deleted) {
            throw new NotFoundError('Folder not found or you do not have permission');
        }

        res.json({ message: 'Folder deleted successfully' });
    })
);


/**
 * @route   POST /api/folders/products
 * @desc    Add product to folder (or move)
 * @access  Private
 */
router.post(
    '/products',
    authenticate,
    validate([
        body('folderId').isUUID().withMessage('Folder ID required'),
        body('productId').isUUID().withMessage('Product ID required'),
    ]),
    asyncHandler(async (req: Request, res: Response) => {
        const { folderId, productId } = req.body;
        const userId = req.user!.id;

        // Verify folder belongs to user
        const folder = await FolderModel.findById(folderId);
        if (!folder || folder.user_id !== userId) {
            throw new NotFoundError('Folder not found');
        }

        // Update user product
        // We use updateMany to avoid error if product doesn't exist (returns count 0), 
        // or we could use update and handle error. 
        // Using update with unique constraint is better.
        try {
            await prisma.userProduct.update({
                where: {
                    userId_productId: {
                        userId,
                        productId
                    }
                },
                data: { folderId }
            });
        } catch (error: any) {
            if (error.code === 'P2025') {
                throw new NotFoundError('Product not tracked by user');
            }
            throw error;
        }

        res.json({ message: 'Product moved to folder' });
    })
);

export default router;
