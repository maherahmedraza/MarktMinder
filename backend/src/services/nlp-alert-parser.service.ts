/**
 * Natural Language Alert Parser
 * 
 * Converts conversational text into structured alert conditions.
 * 
 * Examples:
 * - "Alert me when the price drops below €50"
 * - "Notify me if it falls by 20%"
 * - "Tell me when it hits the lowest price"
 * - "Alert if it goes below €100 or drops 15%"
 */

import { v4 as uuidv4 } from 'uuid';
import { AlertCondition, ConditionField, ConditionOperator, LogicalOperator } from './conditional-alerts.service.js';
import { logger } from '../utils/logger.js';

export interface ParsedAlert {
    success: boolean;
    conditions: AlertCondition[];
    logic: LogicalOperator;
    summary: string;
    errors?: string[];
    suggestions?: string[];
}

// Pattern definitions for NLP matching
const PATTERNS = {
    // Price threshold patterns
    priceBelow: /(?:price\s+)?(?:drops?|falls?|goes?|is)\s*(?:below|under|less\s+than)\s*[€$£]?\s*(\d+(?:[.,]\d{1,2})?)/gi,
    priceAbove: /(?:price\s+)?(?:rises?|goes?|is)\s*(?:above|over|more\s+than)\s*[€$£]?\s*(\d+(?:[.,]\d{1,2})?)/gi,
    priceAt: /(?:price\s+)?(?:reaches?|hits?|is\s+exactly?)\s*[€$£]?\s*(\d+(?:[.,]\d{1,2})?)/gi,
    priceBetween: /(?:price\s+)?(?:is\s+)?between\s*[€$£]?\s*(\d+(?:[.,]\d{1,2})?)\s*(?:and|to|-)\s*[€$£]?\s*(\d+(?:[.,]\d{1,2})?)/gi,

    // Percentage patterns
    dropsPercent: /(?:drops?|falls?|decreases?)\s*(?:by\s+)?(\d+(?:[.,]\d{1,2})?)\s*%/gi,
    risesPercent: /(?:rises?|increases?|goes?\s+up)\s*(?:by\s+)?(\d+(?:[.,]\d{1,2})?)\s*%/gi,

    // Historical reference patterns
    lowestPrice: /(?:at\s+)?(?:the\s+)?(?:lowest|all[- ]?time\s+low|historical\s+low|cheapest)/gi,
    highestPrice: /(?:at\s+)?(?:the\s+)?(?:highest|all[- ]?time\s+high|peak|most\s+expensive)/gi,
    nearLowest: /(?:near|close\s+to|within\s+)(\d+)?\s*%?\s*(?:of\s+)?(?:the\s+)?(?:lowest|minimum)/gi,
    belowAverage: /below\s+(?:the\s+)?average/gi,

    // Trend patterns
    fallingTrend: /(?:keep|keeps|kept)\s+(?:falling|dropping|decreasing)|trend(?:ing)?\s+down|downward\s+trend/gi,
    risingTrend: /(?:keep|keeps|kept)\s+(?:rising|increasing|going\s+up)|trend(?:ing)?\s+up|upward\s+trend/gi,

    // Availability patterns
    inStock: /(?:back\s+)?in\s+stock|available\s+again|restocked/gi,
    outOfStock: /out\s+of\s+stock|unavailable|sold\s+out/gi,

    // Logic patterns
    andLogic: /\b(?:and|also|additionally|plus)\b/gi,
    orLogic: /\b(?:or|either|alternatively)\b/gi,
};

// Keywords that indicate notification desire
const TRIGGER_KEYWORDS = [
    'alert', 'notify', 'tell', 'let me know', 'inform', 'message', 'ping', 'remind',
    'when', 'if', 'once', 'as soon as'
];

/**
 * Parse natural language text into structured alert conditions
 */
export function parseNaturalLanguageAlert(text: string): ParsedAlert {
    const normalizedText = text.toLowerCase().trim();
    const conditions: AlertCondition[] = [];
    const errors: string[] = [];
    const suggestions: string[] = [];

    // Check if this looks like an alert request
    const hasTriggerKeyword = TRIGGER_KEYWORDS.some(keyword =>
        normalizedText.includes(keyword)
    );

    if (!hasTriggerKeyword && !normalizedText.includes('%') && !normalizedText.includes('€')) {
        suggestions.push('Try starting with "Alert me when..." or "Notify me if..."');
    }

    // Determine logical operator
    const hasOr = PATTERNS.orLogic.test(normalizedText);
    const hasAnd = PATTERNS.andLogic.test(normalizedText);
    const logic: LogicalOperator = hasOr && !hasAnd ? 'OR' : 'AND';

    // Reset regex lastIndex
    resetPatterns();

    // Price below pattern
    let match;
    while ((match = PATTERNS.priceBelow.exec(normalizedText)) !== null) {
        const value = parseNumber(match[1]);
        conditions.push(createCondition('current_price', 'lt', value, 'currency'));
    }
    resetPatterns();

    // Price above pattern
    while ((match = PATTERNS.priceAbove.exec(normalizedText)) !== null) {
        const value = parseNumber(match[1]);
        conditions.push(createCondition('current_price', 'gt', value, 'currency'));
    }
    resetPatterns();

    // Price at/reaches pattern
    while ((match = PATTERNS.priceAt.exec(normalizedText)) !== null) {
        const value = parseNumber(match[1]);
        // Use a small range for "at" (within 1%)
        conditions.push(createCondition('current_price', 'lte', value * 1.01, 'currency'));
        conditions.push(createCondition('current_price', 'gte', value * 0.99, 'currency'));
    }
    resetPatterns();

    // Price between pattern
    while ((match = PATTERNS.priceBetween.exec(normalizedText)) !== null) {
        const low = parseNumber(match[1]);
        const high = parseNumber(match[2]);
        conditions.push(createCondition('current_price', 'between', [low, high], 'currency'));
    }
    resetPatterns();

    // Drops by percentage
    while ((match = PATTERNS.dropsPercent.exec(normalizedText)) !== null) {
        const percent = parseNumber(match[1]);
        conditions.push(createCondition('price_change_percent', 'lte', -percent, 'percent'));
    }
    resetPatterns();

    // Rises by percentage
    while ((match = PATTERNS.risesPercent.exec(normalizedText)) !== null) {
        const percent = parseNumber(match[1]);
        conditions.push(createCondition('price_change_percent', 'gte', percent, 'percent'));
    }
    resetPatterns();

    // Lowest price
    if (PATTERNS.lowestPrice.test(normalizedText)) {
        conditions.push(createCondition('current_price', 'at_lowest', 0));
    }
    resetPatterns();

    // Highest price
    if (PATTERNS.highestPrice.test(normalizedText)) {
        conditions.push(createCondition('current_price', 'at_highest', 0));
    }
    resetPatterns();

    // Near lowest
    while ((match = PATTERNS.nearLowest.exec(normalizedText)) !== null) {
        const withinPercent = match[1] ? parseNumber(match[1]) : 5;
        conditions.push(createCondition('from_lowest_percent', 'lte', withinPercent, 'percent'));
    }
    resetPatterns();

    // Below average
    if (PATTERNS.belowAverage.test(normalizedText)) {
        conditions.push(createCondition('vs_average', 'lt', 0, 'percent'));
    }
    resetPatterns();

    // Falling trend
    if (PATTERNS.fallingTrend.test(normalizedText)) {
        conditions.push(createCondition('trend', 'eq', 'falling'));
    }
    resetPatterns();

    // Rising trend
    if (PATTERNS.risingTrend.test(normalizedText)) {
        conditions.push(createCondition('trend', 'eq', 'rising'));
    }
    resetPatterns();

    // In stock
    if (PATTERNS.inStock.test(normalizedText)) {
        conditions.push(createCondition('stock_status', 'eq', 'in_stock'));
    }
    resetPatterns();

    // Out of stock
    if (PATTERNS.outOfStock.test(normalizedText)) {
        conditions.push(createCondition('stock_status', 'neq', 'in_stock'));
    }
    resetPatterns();

    // Validate results
    if (conditions.length === 0) {
        errors.push('Could not understand the alert conditions');
        suggestions.push('Try phrases like: "price drops below €50", "falls by 20%", or "hits the lowest price"');
    }

    // Generate summary
    const summary = generateSummary(conditions, logic);

    return {
        success: conditions.length > 0,
        conditions,
        logic,
        summary,
        errors: errors.length > 0 ? errors : undefined,
        suggestions: suggestions.length > 0 ? suggestions : undefined,
    };
}

/**
 * Create a condition object
 */
function createCondition(
    field: ConditionField | string,
    operator: ConditionOperator | string,
    value: number | string | [number, number],
    unit?: 'currency' | 'percent' | 'days'
): AlertCondition {
    return {
        id: uuidv4(),
        field: field as ConditionField,
        operator: operator as ConditionOperator,
        value,
        unit,
    };
}

/**
 * Parse number from string, handling comma/period decimal separators
 */
function parseNumber(str: string): number {
    return parseFloat(str.replace(',', '.'));
}

/**
 * Reset all pattern lastIndex values
 */
function resetPatterns(): void {
    Object.values(PATTERNS).forEach(pattern => {
        pattern.lastIndex = 0;
    });
}

/**
 * Generate human-readable summary of conditions
 */
function generateSummary(conditions: AlertCondition[], logic: LogicalOperator): string {
    if (conditions.length === 0) {
        return 'No conditions detected';
    }

    const parts = conditions.map(c => {
        const value = Array.isArray(c.value)
            ? `${formatValue(c.value[0], c.unit)} and ${formatValue(c.value[1], c.unit)}`
            : formatValue(c.value, c.unit);

        switch (c.operator) {
            case 'lt':
            case 'lte':
                return `${fieldToText(c.field)} drops below ${value}`;
            case 'gt':
            case 'gte':
                return `${fieldToText(c.field)} rises above ${value}`;
            case 'eq':
                if (typeof c.value === 'string') {
                    return `${fieldToText(c.field)} is ${c.value}`;
                }
                return `${fieldToText(c.field)} equals ${value}`;
            case 'between':
                return `${fieldToText(c.field)} is between ${value}`;
            case 'at_lowest':
                return 'price hits historical low';
            case 'at_highest':
                return 'price hits historical high';
            default:
                return `${fieldToText(c.field)} ${c.operator} ${value}`;
        }
    });

    const connector = logic === 'OR' ? ' or ' : ' and ';
    return `Alert when ${parts.join(connector)}`;
}

/**
 * Format value for display
 */
function formatValue(value: number | string, unit?: string): string {
    if (typeof value === 'string') return value;
    if (unit === 'currency') return `€${value.toFixed(2)}`;
    if (unit === 'percent') return `${value}%`;
    return String(value);
}

/**
 * Convert field name to readable text
 */
function fieldToText(field: string): string {
    const map: Record<string, string> = {
        'current_price': 'price',
        'price_change_percent': 'price',
        'from_lowest_percent': 'price',
        'vs_average': 'price',
        'trend': 'price trend',
        'stock_status': 'availability',
    };
    return map[field] || field;
}

/**
 * Get suggested completions for partial input
 */
export function getSuggestions(partialText: string): string[] {
    const suggestions: string[] = [];
    const normalized = partialText.toLowerCase();

    if (normalized.includes('below')) {
        suggestions.push('below €50', 'below the average', 'below €100');
    }
    if (normalized.includes('drop')) {
        suggestions.push('drops by 10%', 'drops by 20%', 'drops below €50');
    }
    if (normalized.includes('low')) {
        suggestions.push('lowest price', 'low stock');
    }
    if (normalized.includes('when') || normalized.includes('if')) {
        suggestions.push(
            'when price drops below €50',
            'when it falls by 15%',
            'when it hits the lowest price',
            'if it goes back in stock'
        );
    }

    // Default suggestions
    if (suggestions.length === 0) {
        suggestions.push(
            'Alert me when price drops below €50',
            'Notify me if it falls by 20%',
            'Tell me when it hits the lowest price',
            'Alert if it goes below €100 or drops 15%'
        );
    }

    return suggestions.slice(0, 5);
}

/**
 * Validate parsed conditions before creating alert
 */
export function validateParsedAlert(parsed: ParsedAlert): { valid: boolean; issues: string[] } {
    const issues: string[] = [];

    if (!parsed.success || parsed.conditions.length === 0) {
        issues.push('No valid conditions were parsed');
        return { valid: false, issues };
    }

    for (const condition of parsed.conditions) {
        if (condition.unit === 'currency' && typeof condition.value === 'number') {
            if (condition.value <= 0) {
                issues.push('Price values must be positive');
            }
            if (condition.value > 100000) {
                issues.push('Price value seems unusually high');
            }
        }
        if (condition.unit === 'percent' && typeof condition.value === 'number') {
            if (Math.abs(condition.value) > 100) {
                issues.push('Percentage values typically don\'t exceed 100%');
            }
        }
    }

    return { valid: issues.length === 0, issues };
}

export default {
    parseNaturalLanguageAlert,
    getSuggestions,
    validateParsedAlert,
};
