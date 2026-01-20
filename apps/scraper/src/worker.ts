import logger from './logger.js';
import { closePool } from './database.js';
import { browserManager } from './browser/BrowserManager.js';
import { queueManager } from './queue/index.js';

/**
 * Worker-only mode
 * 
 * Run this script to start only the job processing worker,
 * without the scheduler. Useful for scaling workers independently.
 */

async function main() {
    logger.info('Starting MarktMinder Scraper Worker...');

    const shutdown = async (signal: string) => {
        logger.info(`Received ${signal}, shutting down...`);

        try {
            await queueManager.stopWorker();
            await browserManager.close();
            await closePool();

            logger.info('Worker shutdown complete');
            process.exit(0);
        } catch (error) {
            logger.error('Error during shutdown:', error);
            process.exit(1);
        }
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    try {
        await queueManager.startWorker();

        logger.info(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   🔧 MarktMinder Scraper Worker                            ║
║                                                            ║
║   Worker is running and processing jobs...                 ║
║   Press Ctrl+C to stop                                     ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
    `);

        // Keep the process running
        await new Promise(() => { });
    } catch (error) {
        logger.error('Failed to start worker:', error);
        process.exit(1);
    }
}

main();
