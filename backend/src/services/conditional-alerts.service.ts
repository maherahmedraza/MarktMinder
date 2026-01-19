/**
 * Conditional Alert Engine
 * 
 * Smart multi-condition alert system that supports complex triggers:
 * - Price drops below/above threshold
 * - Percentage changes
 * - Price at historical low/high
 * - Trend detection (falling/rising for X days)
 * - Comparison to marketplace average
 * - Time-based conditions (weekend/weekday, time of day)
 */

import { query, queryOne } from '../config/database.js';
import { cache } from '../config/redis.js';
import { logger } from '../utils/logger.js';

// =============================
// Types & Interfaces
// =============================

export type ConditionOperator =
    | 'lt' | 'lte' | 'gt' | 'gte' | 'eq'
    | 'between' | 'percent_drop' | 'percent_rise'
    | 'at_lowest' | 'at_highest' | 'near_lowest' | 'near_highest'
    | 'falling_trend' | 'rising_trend' | 'stable'
    | 'below_average' | 'above_average';

export type ConditionField =
    | 'current_price' | 'original_price' | 'discount_percent'
    | 'price_change_24h' | 'price_change_7d' | 'price_change_30d'
    | 'days_at_price' | 'stock_status' | 'rating';

export type LogicalOperator = 'AND' | 'OR';

export interface AlertCondition {
    id: string;
    field: ConditionField;
    operator: ConditionOperator;
    value: number | string | [number, number]; // Single value, string, or range
    unit?: 'currency' | 'percent' | 'days';
}

export interface ConditionalAlert {
    id: string;
    userId: string;
    productId: string;
    name: string;
    conditions: AlertCondition[];
    logic: LogicalOperator;
    isActive: boolean;
    notifyVia: ('email' | 'push' | 'telegram')[];
    cooldownHours: number; // Minimum hours between triggers
    lastTriggeredAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface ProductContext {
    currentPrice: number;
    originalPrice: number | null;
    lowestPrice: number | null;
    highestPrice: number | null;
    averagePrice: number | null;
    priceChange24h: number | null;
    priceChange7d: number | null;
    priceChange30d: number | null;
    daysAtCurrentPrice: number;
    stockStatus: 'in_stock' | 'low_stock' | 'out_of_stock';
    rating: number | null;
    trendDirection: 'falling' | 'rising' | 'stable';
    trendStrength: number; // 0-100
}

export interface EvaluationResult {
    alertId: string;
    triggered: boolean;
    conditionResults: {
        conditionId: string;
        passed: boolean;
        reason: string;
    }[];
    summary: string;
}

// =============================
// Condition Evaluator
// =============================

function evaluateCondition(
    condition: AlertCondition,
    context: ProductContext
): { passed: boolean; reason: string } {
    const { field, operator, value } = condition;

    // Get the field value from context
    const fieldValue = getFieldValue(field, context);

    if (fieldValue === null || fieldValue === undefined) {
        return { passed: false, reason: `${field} data unavailable` };
    }

    // For numeric operations, ensure we have a number
    const numValue = typeof fieldValue === 'number' ? fieldValue : parseFloat(String(fieldValue));

    switch (operator) {
        case 'lt':
            return {
                passed: numValue < (value as number),
                reason: `${field} (${numValue}) ${numValue < (value as number) ? '<' : '>='} ${value}`,
            };

        case 'lte':
            return {
                passed: numValue <= (value as number),
                reason: `${field} (${numValue}) ${numValue <= (value as number) ? '<=' : '>'} ${value}`,
            };

        case 'gt':
            return {
                passed: numValue > (value as number),
                reason: `${field} (${numValue}) ${numValue > (value as number) ? '>' : '<='} ${value}`,
            };

        case 'gte':
            return {
                passed: numValue >= (value as number),
                reason: `${field} (${numValue}) ${numValue >= (value as number) ? '>=' : '<'} ${value}`,
            };

        case 'eq':
            return {
                passed: fieldValue === value,
                reason: `${field} (${fieldValue}) ${fieldValue === value ? '==' : '!='} ${value}`,
            };

        case 'between': {
            const [min, max] = value as [number, number];
            const inRange = numValue >= min && numValue <= max;
            return {
                passed: inRange,
                reason: `${field} (${numValue}) ${inRange ? 'in' : 'outside'} [${min}, ${max}]`,
            };
        }

        case 'percent_drop': {
            if (!context.originalPrice) {
                return { passed: false, reason: 'Original price unavailable' };
            }
            const dropPercent = ((context.originalPrice - context.currentPrice) / context.originalPrice) * 100;
            const passed = dropPercent >= (value as number);
            return {
                passed,
                reason: `Price drop ${dropPercent.toFixed(1)}% ${passed ? '>=' : '<'} ${value}%`,
            };
        }

        case 'percent_rise': {
            if (!context.lowestPrice) {
                return { passed: false, reason: 'Lowest price unavailable' };
            }
            const risePercent = ((context.currentPrice - context.lowestPrice) / context.lowestPrice) * 100;
            const passed = risePercent >= (value as number);
            return {
                passed,
                reason: `Price rise ${risePercent.toFixed(1)}% ${passed ? '>=' : '<'} ${value}%`,
            };
        }

        case 'at_lowest':
            return {
                passed: context.currentPrice === context.lowestPrice,
                reason: context.currentPrice === context.lowestPrice
                    ? 'Price at all-time low!'
                    : `Current €${context.currentPrice} > lowest €${context.lowestPrice}`,
            };

        case 'at_highest':
            return {
                passed: context.currentPrice === context.highestPrice,
                reason: context.currentPrice === context.highestPrice
                    ? 'Price at all-time high'
                    : `Current €${context.currentPrice} < highest €${context.highestPrice}`,
            };

        case 'near_lowest': {
            if (!context.lowestPrice) {
                return { passed: false, reason: 'Lowest price unavailable' };
            }
            const threshold = (value as number) / 100; // percent threshold
            const nearLow = context.currentPrice <= context.lowestPrice * (1 + threshold);
            return {
                passed: nearLow,
                reason: nearLow
                    ? `Within ${value}% of lowest price`
                    : `${((context.currentPrice - context.lowestPrice) / context.lowestPrice * 100).toFixed(1)}% above lowest`,
            };
        }

        case 'near_highest': {
            if (!context.highestPrice) {
                return { passed: false, reason: 'Highest price unavailable' };
            }
            const threshold = (value as number) / 100;
            const nearHigh = context.currentPrice >= context.highestPrice * (1 - threshold);
            return {
                passed: nearHigh,
                reason: nearHigh
                    ? `Within ${value}% of highest price`
                    : `${((context.highestPrice - context.currentPrice) / context.highestPrice * 100).toFixed(1)}% below highest`,
            };
        }

        case 'falling_trend':
            return {
                passed: context.trendDirection === 'falling' && context.trendStrength >= (value as number),
                reason: `Trend: ${context.trendDirection} (${context.trendStrength}% strength)`,
            };

        case 'rising_trend':
            return {
                passed: context.trendDirection === 'rising' && context.trendStrength >= (value as number),
                reason: `Trend: ${context.trendDirection} (${context.trendStrength}% strength)`,
            };

        case 'stable':
            return {
                passed: context.trendDirection === 'stable',
                reason: `Trend: ${context.trendDirection}`,
            };

        case 'below_average': {
            if (!context.averagePrice) {
                return { passed: false, reason: 'Average price unavailable' };
            }
            const belowAvg = context.currentPrice < context.averagePrice;
            return {
                passed: belowAvg,
                reason: belowAvg
                    ? `€${context.currentPrice} below avg €${context.averagePrice.toFixed(2)}`
                    : `€${context.currentPrice} above avg €${context.averagePrice.toFixed(2)}`,
            };
        }

        case 'above_average': {
            if (!context.averagePrice) {
                return { passed: false, reason: 'Average price unavailable' };
            }
            const aboveAvg = context.currentPrice > context.averagePrice;
            return {
                passed: aboveAvg,
                reason: aboveAvg
                    ? `€${context.currentPrice} above avg €${context.averagePrice.toFixed(2)}`
                    : `€${context.currentPrice} below avg €${context.averagePrice.toFixed(2)}`,
            };
        }

        default:
            return { passed: false, reason: `Unknown operator: ${operator}` };
    }
}

function getFieldValue(field: ConditionField, context: ProductContext): number | string | null {
    switch (field) {
        case 'current_price':
            return context.currentPrice;
        case 'original_price':
            return context.originalPrice;
        case 'discount_percent':
            if (!context.originalPrice) return null;
            return ((context.originalPrice - context.currentPrice) / context.originalPrice) * 100;
        case 'price_change_24h':
            return context.priceChange24h;
        case 'price_change_7d':
            return context.priceChange7d;
        case 'price_change_30d':
            return context.priceChange30d;
        case 'days_at_price':
            return context.daysAtCurrentPrice;
        case 'stock_status':
            return context.stockStatus;
        case 'rating':
            return context.rating;
        default:
            return null;
    }
}

// =============================
// Main Evaluation Function
// =============================

export async function evaluateAlert(
    alert: ConditionalAlert,
    context: ProductContext
): Promise<EvaluationResult> {
    const conditionResults = alert.conditions.map(condition => {
        const result = evaluateCondition(condition, context);
        return {
            conditionId: condition.id,
            passed: result.passed,
            reason: result.reason,
        };
    });

    let triggered: boolean;
    if (alert.logic === 'AND') {
        triggered = conditionResults.every(r => r.passed);
    } else {
        triggered = conditionResults.some(r => r.passed);
    }

    // Check cooldown
    if (triggered && alert.lastTriggeredAt) {
        const hoursSinceLastTrigger = (Date.now() - new Date(alert.lastTriggeredAt).getTime()) / (1000 * 60 * 60);
        if (hoursSinceLastTrigger < alert.cooldownHours) {
            triggered = false;
        }
    }

    const passedCount = conditionResults.filter(r => r.passed).length;
    const summary = triggered
        ? `✅ Alert triggered! ${passedCount}/${alert.conditions.length} conditions met (${alert.logic})`
        : `⏳ ${passedCount}/${alert.conditions.length} conditions met`;

    return {
        alertId: alert.id,
        triggered,
        conditionResults,
        summary,
    };
}

// =============================
// Database Operations
// =============================

export async function getProductContext(productId: string): Promise<ProductContext | null> {
    const cacheKey = `product_context:${productId}`;
    const cached = await cache.get<ProductContext>(cacheKey);
    if (cached) return cached;

    const product = await queryOne<any>(
        `SELECT 
       p.current_price, p.original_price, p.lowest_price, p.highest_price,
       p.stock_status, p.rating,
       (SELECT AVG(ph.price) FROM price_history ph WHERE ph.product_id = p.id) as avg_price,
       (SELECT price FROM price_history WHERE product_id = p.id ORDER BY recorded_at DESC OFFSET 1 LIMIT 1) as prev_price,
       (SELECT price FROM price_history WHERE product_id = p.id AND recorded_at >= NOW() - INTERVAL '7 days' ORDER BY recorded_at ASC LIMIT 1) as price_7d_ago,
       (SELECT price FROM price_history WHERE product_id = p.id AND recorded_at >= NOW() - INTERVAL '30 days' ORDER BY recorded_at ASC LIMIT 1) as price_30d_ago,
       (SELECT COUNT(*) FROM price_history WHERE product_id = p.id AND price = p.current_price AND recorded_at >= NOW() - INTERVAL '30 days') as days_at_price
     FROM products p
     WHERE p.id = $1`,
        [productId]
    );

    if (!product) return null;

    // Calculate trend
    let trendDirection: 'falling' | 'rising' | 'stable' = 'stable';
    let trendStrength = 0;

    if (product.price_7d_ago) {
        const change = ((product.current_price - product.price_7d_ago) / product.price_7d_ago) * 100;
        if (change < -2) {
            trendDirection = 'falling';
            trendStrength = Math.min(100, Math.abs(change) * 5);
        } else if (change > 2) {
            trendDirection = 'rising';
            trendStrength = Math.min(100, change * 5);
        }
    }

    const context: ProductContext = {
        currentPrice: parseFloat(product.current_price),
        originalPrice: product.original_price ? parseFloat(product.original_price) : null,
        lowestPrice: product.lowest_price ? parseFloat(product.lowest_price) : null,
        highestPrice: product.highest_price ? parseFloat(product.highest_price) : null,
        averagePrice: product.avg_price ? parseFloat(product.avg_price) : null,
        priceChange24h: product.prev_price
            ? ((product.current_price - product.prev_price) / product.prev_price) * 100
            : null,
        priceChange7d: product.price_7d_ago
            ? ((product.current_price - product.price_7d_ago) / product.price_7d_ago) * 100
            : null,
        priceChange30d: product.price_30d_ago
            ? ((product.current_price - product.price_30d_ago) / product.price_30d_ago) * 100
            : null,
        daysAtCurrentPrice: parseInt(product.days_at_price) || 0,
        stockStatus: product.stock_status || 'in_stock',
        rating: product.rating ? parseFloat(product.rating) : null,
        trendDirection,
        trendStrength,
    };

    await cache.set(cacheKey, context, 300); // Cache for 5 minutes
    return context;
}

export async function getUserConditionalAlerts(userId: string): Promise<ConditionalAlert[]> {
    const result = await query<any>(
        `SELECT * FROM conditional_alerts WHERE user_id = $1 AND is_active = true`,
        [userId]
    );

    return result.rows.map(row => ({
        id: row.id,
        userId: row.user_id,
        productId: row.product_id,
        name: row.name,
        conditions: row.conditions,
        logic: row.logic,
        isActive: row.is_active,
        notifyVia: row.notify_via,
        cooldownHours: row.cooldown_hours,
        lastTriggeredAt: row.last_triggered_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    }));
}

export async function createConditionalAlert(
    userId: string,
    productId: string,
    name: string,
    conditions: AlertCondition[],
    logic: LogicalOperator = 'AND',
    notifyVia: ('email' | 'push' | 'telegram')[] = ['email'],
    cooldownHours: number = 24
): Promise<ConditionalAlert> {
    const result = await queryOne<any>(
        `INSERT INTO conditional_alerts (user_id, product_id, name, conditions, logic, notify_via, cooldown_hours)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
        [userId, productId, name, JSON.stringify(conditions), logic, notifyVia, cooldownHours]
    );

    return {
        id: result.id,
        userId: result.user_id,
        productId: result.product_id,
        name: result.name,
        conditions: result.conditions,
        logic: result.logic,
        isActive: result.is_active,
        notifyVia: result.notify_via,
        cooldownHours: result.cooldown_hours,
        lastTriggeredAt: result.last_triggered_at,
        createdAt: result.created_at,
        updatedAt: result.updated_at,
    };
}

export async function markAlertTriggered(alertId: string): Promise<void> {
    await query(
        `UPDATE conditional_alerts SET last_triggered_at = NOW() WHERE id = $1`,
        [alertId]
    );
}

export async function deleteConditionalAlert(alertId: string, userId: string): Promise<boolean> {
    const result = await query(
        `DELETE FROM conditional_alerts WHERE id = $1 AND user_id = $2`,
        [alertId, userId]
    );
    return (result.rowCount ?? 0) > 0;
}

// =============================
// Preset Alert Templates
// =============================

export const ALERT_TEMPLATES = {
    priceDropPercent: (percent: number): AlertCondition[] => [{
        id: 'price_drop',
        field: 'current_price',
        operator: 'percent_drop',
        value: percent,
        unit: 'percent',
    }],

    atLowestPrice: (): AlertCondition[] => [{
        id: 'at_lowest',
        field: 'current_price',
        operator: 'at_lowest',
        value: 0,
    }],

    nearLowest: (withinPercent: number): AlertCondition[] => [{
        id: 'near_lowest',
        field: 'current_price',
        operator: 'near_lowest',
        value: withinPercent,
        unit: 'percent',
    }],

    belowPrice: (price: number): AlertCondition[] => [{
        id: 'below_price',
        field: 'current_price',
        operator: 'lt',
        value: price,
        unit: 'currency',
    }],

    fallingTrend: (minStrength: number = 30): AlertCondition[] => [{
        id: 'falling',
        field: 'current_price',
        operator: 'falling_trend',
        value: minStrength,
    }],

    buyOpportunity: (): AlertCondition[] => [
        { id: 'below_avg', field: 'current_price', operator: 'below_average', value: 0 },
        { id: 'falling', field: 'current_price', operator: 'falling_trend', value: 20 },
    ],
};

export default {
    evaluateAlert,
    getProductContext,
    getUserConditionalAlerts,
    createConditionalAlert,
    markAlertTriggered,
    deleteConditionalAlert,
    ALERT_TEMPLATES,
};
