/**
 * E-Commerce Events Calendar
 * 
 * Tracks major German shopping events for better price predictions.
 * Impact scores indicate expected average discount percentages.
 */

export interface ShoppingEvent {
    name: string;
    nameDE: string;
    date: Date | null;  // null for dynamic dates
    getDates: (year: number) => { start: Date; end: Date };
    impactScore: number;  // Expected discount % (0-100)
    marketplaces: ('amazon' | 'otto' | 'etsy')[];
    categories: string[];  // Most affected categories
}

/**
 * Calculate Easter Sunday for a given year (Computus algorithm)
 */
function getEasterSunday(year: number): Date {
    const a = year % 19;
    const b = Math.floor(year / 100);
    const c = year % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31);
    const day = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(year, month - 1, day);
}

/**
 * Get US Thanksgiving (4th Thursday of November)
 */
function getThanksgiving(year: number): Date {
    const nov1 = new Date(year, 10, 1);
    const dayOfWeek = nov1.getDay();
    const firstThursday = dayOfWeek <= 4 ? 4 - dayOfWeek + 1 : 11 - dayOfWeek + 4 + 1;
    return new Date(year, 10, firstThursday + 21); // 4th Thursday
}

/**
 * Major shopping events with German market focus
 */
export const shoppingEvents: ShoppingEvent[] = [
    {
        name: 'New Year Sales',
        nameDE: 'Neujahrsverkauf',
        date: null,
        getDates: (year) => ({
            start: new Date(year, 0, 1),
            end: new Date(year, 0, 15),
        }),
        impactScore: 25,
        marketplaces: ['amazon', 'otto'],
        categories: ['electronics', 'fashion', 'home'],
    },
    {
        name: 'Valentine\'s Day',
        nameDE: 'Valentinstag',
        date: null,
        getDates: (year) => ({
            start: new Date(year, 1, 7),
            end: new Date(year, 1, 14),
        }),
        impactScore: 15,
        marketplaces: ['amazon', 'etsy', 'otto'],
        categories: ['jewelry', 'gifts', 'flowers'],
    },
    {
        name: 'Easter Sales',
        nameDE: 'Osterverkauf',
        date: null,
        getDates: (year) => {
            const easter = getEasterSunday(year);
            return {
                start: new Date(easter.getTime() - 14 * 24 * 60 * 60 * 1000),
                end: new Date(easter.getTime() + 1 * 24 * 60 * 60 * 1000),
            };
        },
        impactScore: 20,
        marketplaces: ['amazon', 'otto'],
        categories: ['toys', 'home', 'garden', 'food'],
    },
    {
        name: 'Summer Sale',
        nameDE: 'Sommerschlussverkauf',
        date: null,
        getDates: (year) => ({
            start: new Date(year, 6, 1),
            end: new Date(year, 7, 15),
        }),
        impactScore: 35,
        marketplaces: ['amazon', 'otto'],
        categories: ['fashion', 'outdoor', 'sports'],
    },
    {
        name: 'Back to School',
        nameDE: 'Schulanfang',
        date: null,
        getDates: (year) => ({
            start: new Date(year, 7, 15),
            end: new Date(year, 8, 15),
        }),
        impactScore: 20,
        marketplaces: ['amazon', 'otto'],
        categories: ['electronics', 'office', 'bags', 'stationery'],
    },
    {
        name: 'Amazon Prime Day',
        nameDE: 'Amazon Prime Day',
        date: null,
        getDates: (year) => ({
            // Usually mid-July, exact dates vary
            start: new Date(year, 6, 11),
            end: new Date(year, 6, 12),
        }),
        impactScore: 40,
        marketplaces: ['amazon'],
        categories: ['electronics', 'amazon devices', 'fashion', 'home'],
    },
    {
        name: 'Singles Day',
        nameDE: 'Singles Day',
        date: null,
        getDates: (year) => ({
            start: new Date(year, 10, 10),
            end: new Date(year, 10, 11),
        }),
        impactScore: 25,
        marketplaces: ['amazon', 'otto'],
        categories: ['electronics', 'fashion', 'beauty'],
    },
    {
        name: 'Black Friday',
        nameDE: 'Black Friday',
        date: null,
        getDates: (year) => {
            const thanksgiving = getThanksgiving(year);
            const blackFriday = new Date(thanksgiving.getTime() + 24 * 60 * 60 * 1000);
            return {
                start: new Date(blackFriday.getTime() - 7 * 24 * 60 * 60 * 1000),
                end: blackFriday,
            };
        },
        impactScore: 45,
        marketplaces: ['amazon', 'otto', 'etsy'],
        categories: ['electronics', 'fashion', 'home', 'toys', 'gaming'],
    },
    {
        name: 'Cyber Monday',
        nameDE: 'Cyber Monday',
        date: null,
        getDates: (year) => {
            const thanksgiving = getThanksgiving(year);
            const cyberMonday = new Date(thanksgiving.getTime() + 4 * 24 * 60 * 60 * 1000);
            return {
                start: cyberMonday,
                end: new Date(cyberMonday.getTime() + 24 * 60 * 60 * 1000),
            };
        },
        impactScore: 40,
        marketplaces: ['amazon', 'otto'],
        categories: ['electronics', 'software', 'tech accessories'],
    },
    {
        name: 'Christmas Sales',
        nameDE: 'Weihnachtsverkauf',
        date: null,
        getDates: (year) => ({
            start: new Date(year, 11, 1),
            end: new Date(year, 11, 24),
        }),
        impactScore: 30,
        marketplaces: ['amazon', 'otto', 'etsy'],
        categories: ['toys', 'electronics', 'gifts', 'home'],
    },
    {
        name: 'Boxing Day / Post-Christmas',
        nameDE: 'Nach-Weihnachtsverkauf',
        date: null,
        getDates: (year) => ({
            start: new Date(year, 11, 26),
            end: new Date(year, 11, 31),
        }),
        impactScore: 35,
        marketplaces: ['amazon', 'otto'],
        categories: ['electronics', 'fashion', 'home'],
    },
];

/**
 * Get upcoming events within a date range
 */
export function getUpcomingEvents(
    startDate: Date = new Date(),
    daysAhead: number = 30,
    marketplace?: 'amazon' | 'otto' | 'etsy'
): Array<{ event: ShoppingEvent; start: Date; end: Date; daysUntil: number }> {
    const endDate = new Date(startDate.getTime() + daysAhead * 24 * 60 * 60 * 1000);
    const year = startDate.getFullYear();
    const years = [year, year + 1]; // Check current and next year

    const upcoming: Array<{ event: ShoppingEvent; start: Date; end: Date; daysUntil: number }> = [];

    for (const event of shoppingEvents) {
        // Filter by marketplace if specified
        if (marketplace && !event.marketplaces.includes(marketplace)) {
            continue;
        }

        for (const y of years) {
            const dates = event.getDates(y);

            // Check if event is in range
            if (dates.start >= startDate && dates.start <= endDate) {
                const daysUntil = Math.ceil((dates.start.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));
                upcoming.push({
                    event,
                    start: dates.start,
                    end: dates.end,
                    daysUntil,
                });
            }
        }
    }

    // Sort by start date
    return upcoming.sort((a, b) => a.start.getTime() - b.start.getTime());
}

/**
 * Get event impact for a specific date
 */
export function getEventImpact(date: Date, marketplace?: 'amazon' | 'otto' | 'etsy'): {
    isEventPeriod: boolean;
    events: ShoppingEvent[];
    maxImpact: number;
    recommendation: string;
} {
    const year = date.getFullYear();
    const activeEvents: ShoppingEvent[] = [];

    for (const event of shoppingEvents) {
        if (marketplace && !event.marketplaces.includes(marketplace)) {
            continue;
        }

        const dates = event.getDates(year);
        if (date >= dates.start && date <= dates.end) {
            activeEvents.push(event);
        }
    }

    const maxImpact = activeEvents.reduce((max, e) => Math.max(max, e.impactScore), 0);

    let recommendation = '';
    if (activeEvents.length > 0) {
        if (maxImpact >= 40) {
            recommendation = `🔥 Major sale event! Expect ${maxImpact}%+ discounts.`;
        } else if (maxImpact >= 25) {
            recommendation = `💡 Good time to buy. ${activeEvents[0].name} discounts available.`;
        } else {
            recommendation = `ℹ️ Minor sale period. Some discounts possible.`;
        }
    }

    return {
        isEventPeriod: activeEvents.length > 0,
        events: activeEvents,
        maxImpact,
        recommendation,
    };
}

/**
 * Get best buying windows for a category
 */
export function getBestBuyingWindows(
    category: string,
    marketplace?: 'amazon' | 'otto' | 'etsy'
): Array<{ event: ShoppingEvent; expectedDiscount: number; months: number[] }> {
    const windows = shoppingEvents
        .filter(event => {
            if (marketplace && !event.marketplaces.includes(marketplace)) {
                return false;
            }
            return event.categories.some(c => c.toLowerCase().includes(category.toLowerCase()));
        })
        .map(event => {
            const dates = event.getDates(new Date().getFullYear());
            return {
                event,
                expectedDiscount: event.impactScore,
                months: [dates.start.getMonth()],
            };
        })
        .sort((a, b) => b.expectedDiscount - a.expectedDiscount);

    return windows;
}

export default {
    shoppingEvents,
    getUpcomingEvents,
    getEventImpact,
    getBestBuyingWindows,
};
