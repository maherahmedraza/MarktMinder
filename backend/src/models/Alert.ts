import { query } from '../config/database.js';

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
    target_price?: number;
    target_percentage?: number;
    is_active: boolean;
    is_triggered: boolean;
    trigger_count: number;
    last_triggered_at?: Date;
    last_triggered_price?: number;
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
    product_title?: string;
    product_url: string;
    product_image_url?: string;
    product_current_price?: number;
    product_marketplace: string;
}

/**
 * Alert model with database operations
 */
export const AlertModel = {
    /**
     * Find alert by ID
     */
    async findById(id: string): Promise<Alert | null> {
        const result = await query<Alert>(
            'SELECT * FROM alerts WHERE id = $1',
            [id]
        );
        return result.rows[0] || null;
    },

    /**
     * Find alert by ID with ownership check
     */
    async findByIdAndUser(id: string, userId: string): Promise<Alert | null> {
        const result = await query<Alert>(
            'SELECT * FROM alerts WHERE id = $1 AND user_id = $2',
            [id, userId]
        );
        return result.rows[0] || null;
    },

    /**
     * Get all alerts for a user
     */
    async getByUserId(
        userId: string,
        options: { activeOnly?: boolean; limit?: number; offset?: number } = {}
    ): Promise<AlertWithProduct[]> {
        const { activeOnly = false, limit = 50, offset = 0 } = options;

        let whereClause = 'WHERE a.user_id = $1';
        if (activeOnly) {
            whereClause += ' AND a.is_active = TRUE';
        }

        const result = await query<AlertWithProduct>(
            `SELECT 
        a.*,
        p.title as product_title,
        p.url as product_url,
        p.image_url as product_image_url,
        p.current_price as product_current_price,
        p.marketplace as product_marketplace
       FROM alerts a
       JOIN products p ON a.product_id = p.id
       ${whereClause}
       ORDER BY a.created_at DESC
       LIMIT $2 OFFSET $3`,
            [userId, limit, offset]
        );

        return result.rows;
    },

    /**
     * Get alerts for a specific product
     */
    async getByProductId(productId: string): Promise<Alert[]> {
        const result = await query<Alert>(
            'SELECT * FROM alerts WHERE product_id = $1 AND is_active = TRUE',
            [productId]
        );
        return result.rows;
    },

    /**
     * Create a new alert
     */
    async create(input: CreateAlertInput): Promise<Alert> {
        const result = await query<Alert>(
            `INSERT INTO alerts (
        user_id, product_id, alert_type, target_price, target_percentage,
        notify_email, notify_push, notify_once
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
            [
                input.user_id,
                input.product_id,
                input.alert_type,
                input.target_price,
                input.target_percentage,
                input.notify_email ?? true,
                input.notify_push ?? true,
                input.notify_once ?? false,
            ]
        );

        return result.rows[0];
    },

    /**
     * Update an alert
     */
    async update(id: string, userId: string, input: UpdateAlertInput): Promise<Alert | null> {
        const fields: string[] = [];
        const values: any[] = [];
        let paramIndex = 1;

        for (const [key, value] of Object.entries(input)) {
            if (value !== undefined) {
                fields.push(`${key} = $${paramIndex}`);
                values.push(value);
                paramIndex++;
            }
        }

        if (fields.length === 0) {
            return this.findByIdAndUser(id, userId);
        }

        values.push(id, userId);

        const result = await query<Alert>(
            `UPDATE alerts SET ${fields.join(', ')}, updated_at = NOW()
       WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}
       RETURNING *`,
            values
        );

        return result.rows[0] || null;
    },

    /**
     * Delete an alert
     */
    async delete(id: string, userId: string): Promise<boolean> {
        const result = await query(
            'DELETE FROM alerts WHERE id = $1 AND user_id = $2',
            [id, userId]
        );
        return (result.rowCount || 0) > 0;
    },

    /**
     * Mark alert as triggered
     */
    async trigger(id: string, price: number): Promise<Alert | null> {
        const result = await query<Alert>(
            `UPDATE alerts SET 
        is_triggered = TRUE,
        trigger_count = trigger_count + 1,
        last_triggered_at = NOW(),
        last_triggered_price = $1,
        -- Deactivate if notify_once is true
        is_active = CASE WHEN notify_once THEN FALSE ELSE is_active END,
        updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
            [price, id]
        );

        return result.rows[0] || null;
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
