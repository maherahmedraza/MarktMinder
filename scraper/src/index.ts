// Polyfill for esbuild __name helper if missing
if (typeof (globalThis as any).__name === 'undefined') {
    (globalThis as any).__name = (target: any, value: any) => target.name = value;
}

import logger from './logger.js';
import { closePool } from './database.js';
import { browserManager } from './browser/BrowserManager.js';
import { queueManager, smartScheduler } from './queue/index.js';

/**
 * MarktMinder Scraper Service
 * 
 * This service handles price scraping for Amazon, Etsy, and Otto.de products.
 * It uses a job queue for coordinated scraping and a smart scheduler for
 * priority-based scheduling.
 */

async function main() {
    logger.info('Starting MarktMinder Scraper Service...');

    // Handle graceful shutdown
    const shutdown = async (signal: string) => {
        logger.info(`Received ${signal}, shutting down...`);

        try {
            smartScheduler.stop();
            await queueManager.close();
            await browserManager.close();
            await closePool();

            logger.info('Shutdown complete');
            process.exit(0);
        } catch (error) {
            logger.error('Error during shutdown:', error);
            process.exit(1);
        }
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    try {
        // Start the job queue worker
        await queueManager.startWorker();

        // Start the smart scheduler
        smartScheduler.start(5); // Check every 5 minutes

        // Log initial stats
        const queueStats = await queueManager.getStats();
        const scheduleStats = await smartScheduler.getStats();

        logger.info(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   🕷️  MarktMinder Scraper Service                          ║
║                                                            ║
║   Products tracked: ${scheduleStats.totalProducts.toString().padEnd(34)}║
║   Products due:     ${scheduleStats.dueProducts.toString().padEnd(34)}║
║   Queue waiting:    ${queueStats.waiting.toString().padEnd(34)}║
║   Queue active:     ${queueStats.active.toString().padEnd(34)}║
║                                                            ║
║   Scheduler running every 5 minutes                        ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
    `);

        // Keep the process running
        await new Promise(() => { });
    } catch (error) {
        logger.error('Failed to start scraper service:', error);
        process.exit(1);
    }
}

main();
