import { prisma } from '../config/prisma.js';
import { WatchlistFolder as PrismaFolder } from '@prisma/client';

export interface Folder {
    id: string;
    user_id: string;
    name: string;
    color?: string | null;
    icon?: string | null;
    sort_order: number;
    is_public: boolean;
    slug?: string | null;
    description?: string | null;
    view_count: number;
    created_at: Date;
    updated_at?: Date;
    product_count?: number;
}

export interface CreateFolderInput {
    userId: string;
    name: string;
    color?: string;
    icon?: string;
    isPublic?: boolean;
    description?: string;
}

export interface UpdateFolderInput {
    name?: string;
    color?: string;
    icon?: string;
    sort_order?: number;
    isPublic?: boolean;
    description?: string;
}

/** Map Prisma folder to legacy Folder interface */
function toFolder(f: PrismaFolder): Folder {
    return {
        id: f.id,
        user_id: f.userId,
        name: f.name,
        color: f.color,
        icon: f.icon,
        sort_order: f.sortOrder,
        is_public: f.isPublic,
        slug: f.slug,
        description: f.description,
        view_count: f.viewCount,
        created_at: f.createdAt,
    };
}

export const FolderModel = {
    /**
     * Get folder by ID
     */
    async findById(id: string): Promise<Folder | null> {
        const folder = await prisma.watchlistFolder.findUnique({
            where: { id },
            include: {
                _count: {
                    select: { products: true }
                }
            }
        });
        return folder ? { ...toFolder(folder), product_count: folder._count.products } : null;
    },

    /**
     * Get folder by slug (public access)
     */
    async findBySlug(slug: string): Promise<Folder | null> {
        const folder = await prisma.watchlistFolder.findFirst({
            where: { slug, isPublic: true },
        });
        return folder ? toFolder(folder) : null;
    },

    /**
     * Get user's folders
     */
    async getByUserId(userId: string): Promise<Folder[]> {
        const folders = await prisma.watchlistFolder.findMany({
            where: { userId },
            include: {
                _count: {
                    select: { products: true }
                }
            },
            orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
        });
        return folders.map(f => ({
            ...toFolder(f),
            product_count: f._count.products
        }));
    },

    /**
     * Create folder
     */
    async create(input: CreateFolderInput): Promise<Folder> {
        const slug = await this.generateUniqueSlug(input.name);

        const folder = await prisma.watchlistFolder.create({
            data: {
                userId: input.userId,
                name: input.name,
                color: input.color || '#6366f1',
                icon: input.icon || 'Folder',
                isPublic: input.isPublic || false,
                description: input.description || '',
                slug,
            },
        });
        return toFolder(folder);
    },

    /**
     * Update folder
     */
    async update(id: string, userId: string, input: UpdateFolderInput): Promise<Folder | null> {
        const existing = await prisma.watchlistFolder.findFirst({
            where: { id, userId },
        });
        if (!existing) return null;

        const data: any = {};
        if (input.name !== undefined) data.name = input.name;
        if (input.color !== undefined) data.color = input.color;
        if (input.icon !== undefined) data.icon = input.icon;
        if (input.sort_order !== undefined) data.sortOrder = input.sort_order;
        if (input.isPublic !== undefined) data.isPublic = input.isPublic;
        if (input.description !== undefined) data.description = input.description;

        if (Object.keys(data).length === 0) {
            return toFolder(existing);
        }

        const folder = await prisma.watchlistFolder.update({
            where: { id },
            data,
        });

        return toFolder(folder);
    },

    /**
     * Delete folder
     */
    async delete(id: string, userId: string): Promise<boolean> {
        try {
            await prisma.watchlistFolder.deleteMany({
                where: { id, userId },
            });
            return true;
        } catch {
            return false;
        }
    },

    /**
     * Increment view count
     */
    async incrementViewCount(id: string): Promise<void> {
        await prisma.watchlistFolder.update({
            where: { id },
            data: { viewCount: { increment: 1 } },
        });
    },

    /**
     * Get public watchlists for discovery
     */
    async getPublicWatchlists(options: {
        limit?: number;
        offset?: number;
        sort?: 'popular' | 'newest';
    } = {}): Promise<(Folder & { product_count: number; user_name: string })[]> {
        const { limit = 20, offset = 0, sort = 'popular' } = options;

        const folders = await prisma.watchlistFolder.findMany({
            where: { isPublic: true },
            include: {
                user: { select: { name: true } },
                products: { select: { id: true } },
            },
            orderBy: sort === 'popular' ? { viewCount: 'desc' } : { createdAt: 'desc' },
            take: limit,
            skip: offset,
        });

        return folders.map(f => ({
            ...toFolder(f),
            product_count: f.products.length,
            user_name: f.user.name || 'Anonymous',
        }));
    },

    /**
     * Helper to generate unique slug
     */
    async generateUniqueSlug(name: string): Promise<string> {
        const baseSlug = name
            .toLowerCase()
            .replace(/[^\w\s-]/g, '')
            .replace(/[\s_]+/g, '-')
            .replace(/^-+|-+$/g, '');

        let slug = baseSlug;
        let counter = 1;

        while (true) {
            const existing = await prisma.watchlistFolder.findUnique({
                where: { slug },
            });
            if (!existing) return slug;
            slug = `${baseSlug}-${counter++}`;

            // Safety break
            if (counter > 100) return `${baseSlug}-${Math.random().toString(36).substring(7)}`;
        }
    }
};

export default FolderModel;
