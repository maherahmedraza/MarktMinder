import Redis from 'ioredis';
import config from '../config/index.js';
import { getIO } from '../config/socket.js';
import { EVENTS } from '../config/events.js';
import { logger } from '../utils/logger.js';

let subscriber: Redis;

export const initRedisSubscriber = () => {
    subscriber = new Redis(config.redis.url);

    subscriber.on('connect', () => {
        logger.info('Redis Subscriber connected');
    });

    // Subscribe to channels
    subscriber.subscribe('scrape:completed', (err) => {
        if (err) {
            logger.error('Failed to subscribe to scrape:completed', err);
        } else {
            logger.info('Subscribed to scrape:completed');
        }
    });

    // Handle messages
    subscriber.on('message', (channel, message) => {
        if (channel === 'scrape:completed') {
            try {
                const data = JSON.parse(message);
                const io = getIO();

                logger.debug(`Received scrape completion for product ${data.productId}`);

                // Broadcast to all clients (or room-based if implemented later)
                // For now, simpler to just broadcast 'product:updated' 
                // and let frontend decide if it needs to refresh based on ID.
                io.emit(EVENTS.PRODUCT_UPDATED, data);

            } catch (error) {
                logger.error('Error handling Redis message', error);
            }
        }
    });
};

export const closeRedisSubscriber = async () => {
    if (subscriber) {
        await subscriber.quit();
    }
};
