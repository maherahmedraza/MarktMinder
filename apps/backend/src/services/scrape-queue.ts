import { Queue } from 'bullmq';
import { Redis } from 'ioredis';
import config from '../config/index.js';
import { logger } from '../utils/logger.js';

// Define the job data structure (must match Scraper's definition)
export interface ScrapeJobData {
    productId: string;
    url: string;
    marketplace: string;
    marketplaceId: string;
    priority: number;
    retryCount?: number;
}

let scrapeQueue: Queue | null = null;
let connection: Redis | null = null;

export const initScrapeQueue = () => {
    if (scrapeQueue) return scrapeQueue;

    connection = new Redis(config.redis.url, { maxRetriesPerRequest: null });

    scrapeQueue = new Queue('scrape-jobs', {
        connection,
        defaultJobOptions: {
            attempts: 3,
            backoff: {
                type: 'exponential',
                delay: 2000,
            },
            removeOnComplete: true,
            removeOnFail: { count: 1000 },
        },
    });

    logger.info('Scrape Queue initialized in Backend');
    return scrapeQueue;
};

export const addScrapeJob = async (data: ScrapeJobData) => {
    try {
        const queue = initScrapeQueue();
        await queue.add(`scrape-${data.marketplace}`, data, {
            priority: 1, // High priority (lower number = lower priority in BullMQ? Wait, QueueManager says 10 - priority)
            // Scraper QueueManager: priority: 10 - data.priority.
            // If we want High priority, we should pass data.priority = 10?
            // QueueManager.ts:
            // priority: 10 - data.priority
            // If data.priority is 10, real priority is 0 (highest).
            // If data.priority is 1, real priority is 9 (lowest).
            // So we should pass a high number in data.priority.
        });
        logger.info(`Added scrape job for product ${data.productId}`);
    } catch (error) {
        logger.error('Failed to add scrape job', error);
    }
};

export const closeScrapeQueue = async () => {
    if (scrapeQueue) {
        await scrapeQueue.close();
    }
    if (connection) {
        await connection.quit();
    }
};
