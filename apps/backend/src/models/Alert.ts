import { prisma } from '../config/prisma.js';
import { Alert as PrismaAlert, AlertType as PrismaAlertType, Product as PrismaProduct } from '@prisma/client';

export type AlertType =
    | 'price_below'
    | 'price_above'
    | 'price_drop_pct'
    | 'price_rise_pct'
    | 'any_change'
    | 'back_in_stock'
    | 'all_time_low';

export interface Alert {
    id: string;
    user_id: string;
    product_id: string;
    alert_type: AlertType;
    target_price?: number | null;
    target_percentage?: number | null;
    is_active: boolean;
    is_triggered: boolean;
    trigger_count: number;
    last_triggered_at?: Date | null;
    last_triggered_price?: number | null;
    notify_email: boolean;
    notify_push: boolean;
    notify_once: boolean;
    created_at: Date;
    updated_at: Date;
}

export interface CreateAlertInput {
    user_id: string;
    product_id: string;
    alert_type: AlertType;
    target_price?: number;
    target_percentage?: number;
    notify_email?: boolean;
    notify_push?: boolean;
    notify_once?: boolean;
}

export interface UpdateAlertInput {
    alert_type?: AlertType;
    target_price?: number;
    target_percentage?: number;
    is_active?: boolean;
    notify_email?: boolean;
    notify_push?: boolean;
    notify_once?: boolean;
}

// Alert with product details (for user views)
export interface AlertWithProduct extends Alert {
    product_title?: string | null;
    product_url: string;
    product_image_url?: string | null;
    product_current_price?: number | null;
    product_marketplace: string;
}

/** Convert Decimal to number */
function toNumber(val: { toNumber(): number } | number | null | undefined): number | null {
    if (val === null || val === undefined) return null;
    if (typeof val === 'number') return val;
    return val.toNumber();
}

/** Map Prisma alert to legacy Alert interface */
function toAlert(a: PrismaAlert): Alert {
    return {
        id: a.id,
        user_id: a.userId,
        product_id: a.productId,
        alert_type: a.alertType as AlertType,
        target_price: toNumber(a.targetPrice),
        target_percentage: toNumber(a.targetPercentage),
        is_active: a.isActive,
        is_triggered: a.isTriggered,
        trigger_count: a.triggerCount,
        last_triggered_at: a.lastTriggeredAt,
        last_triggered_price: toNumber(a.lastTriggeredPrice),
        notify_email: a.notifyEmail,
        notify_push: a.notifyPush,
        notify_once: a.notifyOnce,
        created_at: a.createdAt,
        updated_at: a.updatedAt,
    };
}

/** Map Prisma alert with product to AlertWithProduct */
function toAlertWithProduct(a: PrismaAlert & { product: PrismaProduct }): AlertWithProduct {
    return {
        ...toAlert(a),
        product_title: a.product.title,
        product_url: a.product.url,
        product_image_url: a.product.imageUrl,
        product_current_price: toNumber(a.product.currentPrice),
        product_marketplace: a.product.marketplace,
    };
}

/**
 * Alert model with Prisma operations
 */
export const AlertModel = {
    /**
     * Find alert by ID
     */
    async findById(id: string): Promise<Alert | null> {
        const alert = await prisma.alert.findUnique({
            where: { id },
        });
        return alert ? toAlert(alert) : null;
    },

    /**
     * Find alert by ID with ownership check
     */
    async findByIdAndUser(id: string, userId: string): Promise<Alert | null> {
        const alert = await prisma.alert.findFirst({
            where: { id, userId },
        });
        return alert ? toAlert(alert) : null;
    },

    /**
     * Get all alerts for a user
     */
    async getByUserId(
        userId: string,
        options: { activeOnly?: boolean; limit?: number; offset?: number } = {}
    ): Promise<AlertWithProduct[]> {
        const { activeOnly = false, limit = 50, offset = 0 } = options;

        const alerts = await prisma.alert.findMany({
            where: {
                userId,
                ...(activeOnly && { isActive: true }),
            },
            include: {
                product: true,
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
            skip: offset,
        });

        return alerts.map(toAlertWithProduct);
    },

    /**
     * Get alerts for a specific product
     */
    async getByProductId(productId: string): Promise<Alert[]> {
        const alerts = await prisma.alert.findMany({
            where: { productId, isActive: true },
        });
        return alerts.map(toAlert);
    },

    /**
     * Create a new alert
     */
    async create(input: CreateAlertInput): Promise<Alert> {
        const alert = await prisma.alert.create({
            data: {
                userId: input.user_id,
                productId: input.product_id,
                alertType: input.alert_type as PrismaAlertType,
                targetPrice: input.target_price,
                targetPercentage: input.target_percentage,
                notifyEmail: input.notify_email ?? true,
                notifyPush: input.notify_push ?? true,
                notifyOnce: input.notify_once ?? false,
            },
        });

        return toAlert(alert);
    },

    /**
     * Update an alert
     */
    async update(id: string, userId: string, input: UpdateAlertInput): Promise<Alert | null> {
        const existing = await this.findByIdAndUser(id, userId);
        if (!existing) return null;

        const data: any = {};
        if (input.alert_type !== undefined) data.alertType = input.alert_type as PrismaAlertType;
        if (input.target_price !== undefined) data.targetPrice = input.target_price;
        if (input.target_percentage !== undefined) data.targetPercentage = input.target_percentage;
        if (input.is_active !== undefined) data.isActive = input.is_active;
        if (input.notify_email !== undefined) data.notifyEmail = input.notify_email;
        if (input.notify_push !== undefined) data.notifyPush = input.notify_push;
        if (input.notify_once !== undefined) data.notifyOnce = input.notify_once;

        if (Object.keys(data).length === 0) {
            return existing;
        }

        const alert = await prisma.alert.update({
            where: { id },
            data,
        });

        return toAlert(alert);
    },

    /**
     * Delete an alert
     */
    async delete(id: string, userId: string): Promise<boolean> {
        try {
            await prisma.alert.deleteMany({
                where: { id, userId },
            });
            return true;
        } catch {
            return false;
        }
    },

    /**
     * Mark alert as triggered
     */
    async trigger(id: string, price: number): Promise<Alert | null> {
        const current = await prisma.alert.findUnique({ where: { id } });
        if (!current) return null;

        const alert = await prisma.alert.update({
            where: { id },
            data: {
                isTriggered: true,
                triggerCount: { increment: 1 },
                lastTriggeredAt: new Date(),
                lastTriggeredPrice: price,
                // Deactivate if notify_once is true
                isActive: current.notifyOnce ? false : undefined,
            },
        });

        return toAlert(alert);
    },

    /**
     * Check which alerts should be triggered for a price change
     */
    async checkAlerts(
        productId: string,
        newPrice: number,
        oldPrice: number | null,
        availability: string,
        allTimeLow: number | null
    ): Promise<Alert[]> {
        // Get all active alerts for this product
        const alerts = await this.getByProductId(productId);
        const triggeredAlerts: Alert[] = [];

        for (const alert of alerts) {
            let shouldTrigger = false;

            switch (alert.alert_type) {
                case 'price_below':
                    if (alert.target_price && newPrice <= alert.target_price) {
                        shouldTrigger = true;
                    }
                    break;

                case 'price_above':
                    if (alert.target_price && newPrice >= alert.target_price) {
                        shouldTrigger = true;
                    }
                    break;

                case 'price_drop_pct':
                    if (oldPrice && alert.target_percentage) {
                        const dropPct = ((oldPrice - newPrice) / oldPrice) * 100;
                        if (dropPct >= alert.target_percentage) {
                            shouldTrigger = true;
                        }
                    }
                    break;

                case 'price_rise_pct':
                    if (oldPrice && alert.target_percentage) {
                        const risePct = ((newPrice - oldPrice) / oldPrice) * 100;
                        if (risePct >= alert.target_percentage) {
                            shouldTrigger = true;
                        }
                    }
                    break;

                case 'any_change':
                    if (oldPrice !== null && newPrice !== oldPrice) {
                        shouldTrigger = true;
                    }
                    break;

                case 'back_in_stock':
                    if (availability === 'in_stock') {
                        // Only trigger if it wasn't in stock before
                        shouldTrigger = true;
                    }
                    break;

                case 'all_time_low':
                    if (allTimeLow === null || newPrice < allTimeLow) {
                        shouldTrigger = true;
                    }
                    break;
            }

            if (shouldTrigger) {
                triggeredAlerts.push(alert);
            }
        }

        return triggeredAlerts;
    },
};

export default AlertModel;
