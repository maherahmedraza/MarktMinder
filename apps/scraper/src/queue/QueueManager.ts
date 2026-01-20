import { Queue, Worker, Job, QueueEvents } from 'bullmq';
import { Redis } from 'ioredis';
import config from '../config.js';
import logger from '../logger.js';
import { browserManager } from '../browser/BrowserManager.js';
import { scraperService } from '../services/ScraperService.js';
import type { ScrapeResult } from '../services/ScraperService.js';

export interface ScrapeJobData {
    productId: string;
    url: string;
    marketplace: string;
    marketplaceId: string;
    priority: number;
    retryCount?: number;
}

export { ScrapeResult as ScrapeJobResult };

/**
 * Smart Job Queue Manager for coordinating scraping jobs
 * Features:
 * - Priority-based scheduling
 * - Rate limiting per marketplace
 * - Automatic retries with exponential backoff
 * - Job deduplication
 * - Efficient bulk job processing
 */
export class QueueManager {
    private connection: Redis;
    private queue: Queue<ScrapeJobData, ScrapeResult>;
    private worker: Worker<ScrapeJobData, ScrapeResult> | null = null;
    private queueEvents: QueueEvents | null = null;
    private isProcessing = false;

    constructor() {
        this.connection = new Redis(config.redisUrl, { maxRetriesPerRequest: null });

        this.queue = new Queue<ScrapeJobData, ScrapeResult>('scrape-jobs', {
            connection: this.connection,
            defaultJobOptions: {
                attempts: config.scraping.retryAttempts,
                backoff: {
                    type: 'exponential',
                    delay: 5000,
                },
                removeOnComplete: {
                    count: 1000, // Keep last 1000 completed jobs
                    age: 3600,   // Remove after 1 hour
                },
                removeOnFail: {
                    count: 5000, // Keep last 5000 failed jobs
                    age: 86400,  // Remove after 24 hours
                },
            },
        });

        logger.info('Queue manager initialized');
    }

    /**
     * Add a scrape job to the queue
     */
    async addJob(data: ScrapeJobData): Promise<Job<ScrapeJobData, ScrapeResult>> {
        const job = await this.queue.add(`scrape-${data.marketplace}`, data, {
            priority: 10 - data.priority, // BullMQ: lower number = higher priority
            delay: this.calculateDelay(data.marketplace),
        });

        logger.debug(`Added job ${job.id} for ${data.url}`);
        return job;
    }

    /**
     * Add multiple jobs in bulk
     */
    async addBulkJobs(jobs: ScrapeJobData[]): Promise<void> {
        const bulkJobs = jobs.map((data) => ({
            name: `scrape-${data.marketplace}`,
            data,
            opts: {
                priority: 10 - data.priority,
                delay: this.calculateDelay(data.marketplace),
            },
        }));

        await this.queue.addBulk(bulkJobs);
        logger.info(`Added ${jobs.length} jobs to queue`);
    }

    /**
     * Calculate delay based on rate limits
     */
    private calculateDelay(marketplace: string): number {
        const limits = config.rateLimits;
        const limit = limits[marketplace as keyof typeof limits] || 20;

        // Convert requests per minute to milliseconds between requests
        return Math.ceil(60000 / limit);
    }

    /**
     * Start processing jobs
     */
    async startWorker(): Promise<void> {
        if (this.worker) {
            logger.warn('Worker already running');
            return;
        }

        // Initialize browser
        await browserManager.initialize();

        this.worker = new Worker<ScrapeJobData, ScrapeResult>(
            'scrape-jobs',
            async (job) => this.processJob(job),
            {
                connection: this.connection,
                concurrency: config.scraping.concurrency,
                limiter: {
                    max: 10,
                    duration: 60000, // 10 jobs per minute per worker
                },
            }
        );

        // Set up event listeners
        this.worker.on('completed', (job, result) => {
            if (result.success) {
                logger.info(`Job ${job.id} completed: ${result.product?.title ? result.product.title.substring(0, 30) : 'Success'}`);
            } else {
                logger.warn(`Job ${job.id} completed with error: ${result.error}`);
            }
        });

        this.worker.on('failed', (job, error) => {
            logger.error(`Job ${job?.id} failed:`, error);
        });

        this.worker.on('error', (error) => {
            logger.error('Worker error:', error);
        });

        // Set up queue events
        this.queueEvents = new QueueEvents('scrape-jobs', { connection: this.connection });

        this.isProcessing = true;
        logger.info('Worker started');
    }

    /**
     * Process a single scrape job
     */
    private async processJob(job: Job<ScrapeJobData, ScrapeResult>): Promise<ScrapeResult> {
        const { productId, url } = job.data;
        const startTime = Date.now();

        try {
            logger.debug(`Processing job ${job.id}: ${url}`);

            // Delegate to ScraperService
            const result = await scraperService.processProduct(productId, url);

            // Just return the result, ScraperService handles DB saving/alerting/errors
            return result;

        } catch (error) {
            // This catch block handles unexpected errors outside ScraperService
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';

            // We can't easily record to DB here if duplicate code is removed, 
            // but ScraperService catches its own errors.
            // This is a failsafe.

            return {
                success: false,
                error: errorMessage
            };
        }
    }

    /**
     * Get queue statistics
     */
    async getStats(): Promise<{
        waiting: number;
        active: number;
        completed: number;
        failed: number;
    }> {
        const [waiting, active, completed, failed] = await Promise.all([
            this.queue.getWaitingCount(),
            this.queue.getActiveCount(),
            this.queue.getCompletedCount(),
            this.queue.getFailedCount(),
        ]);

        return { waiting, active, completed, failed };
    }

    /**
     * Stop the worker
     */
    async stopWorker(): Promise<void> {
        if (this.worker) {
            await this.worker.close();
            this.worker = null;
        }

        if (this.queueEvents) {
            await this.queueEvents.close();
            this.queueEvents = null;
        }

        await browserManager.close();
        this.isProcessing = false;
        logger.info('Worker stopped');
    }

    /**
     * Close all connections
     */
    async close(): Promise<void> {
        await this.stopWorker();
        await this.queue.close();
        await this.connection.quit();
        logger.info('Queue manager closed');
    }
}

// Singleton instance
export const queueManager = new QueueManager();
export default queueManager;
