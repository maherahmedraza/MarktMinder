import Redis from 'ioredis';
import config from '../config/index.js';
import { getIO } from '../config/socket.js';
import { EVENTS } from '../config/events.js';
import { logger } from '../utils/logger.js';
import { AlertModel } from '../models/index.js';
import { emailService } from './email.service.js';
import { pushService } from './push.service.js';
import { query } from '../config/database.js';

let subscriber: Redis;

interface ScrapeCompletedData {
    productId: string;
    price: number;
    oldPrice?: number;
    availability: string;
    title: string;
    imageUrl?: string;
    marketplace: string;
    url: string;
}

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
    subscriber.on('message', async (channel, message) => {
        if (channel === 'scrape:completed') {
            try {
                const data: ScrapeCompletedData = JSON.parse(message);
                const io = getIO();

                logger.debug(`Received scrape completion for product ${data.productId}`);

                // Broadcast to all clients
                io.emit(EVENTS.PRODUCT_UPDATED, data);

                // Check and process alerts
                await processAlerts(data);

            } catch (error) {
                logger.error('Error handling Redis message', error);
            }
        }
    });
};

/**
 * Process triggered alerts and send notifications
 */
async function processAlerts(data: ScrapeCompletedData) {
    try {
        // Get all-time low for the product
        const allTimeLowResult = await query(
            'SELECT MIN(price) as min_price FROM price_history WHERE product_id = $1',
            [data.productId]
        );
        const allTimeLow = allTimeLowResult.rows[0]?.min_price || null;

        // Check which alerts should trigger
        const triggeredAlerts = await AlertModel.checkAlerts(
            data.productId,
            data.price,
            data.oldPrice || null,
            data.availability,
            allTimeLow
        );

        if (triggeredAlerts.length === 0) {
            return;
        }

        logger.info(`${triggeredAlerts.length} alert(s) triggered for product ${data.productId}`);

        // Process each triggered alert
        for (const alert of triggeredAlerts) {
            try {
                // Mark alert as triggered
                await AlertModel.trigger(alert.id, data.price);

                // Record in alert history
                await query(
                    `INSERT INTO alert_history (alert_id, triggered_at, triggered_price) 
                     VALUES ($1, NOW(), $2)`,
                    [alert.id, data.price]
                );

                // Get user email
                const userResult = await query(
                    'SELECT email, name FROM users WHERE id = $1',
                    [alert.user_id]
                );
                const user = userResult.rows[0];

                if (!user) {
                    logger.warn(`User not found for alert ${alert.id}`);
                    continue;
                }

                // Send email notification if enabled
                if (alert.notify_email) {
                    await emailService.sendPriceAlert({
                        to: user.email,
                        productName: data.title,
                        oldPrice: data.oldPrice || data.price,
                        newPrice: data.price,
                        productUrl: data.url,
                        imageUrl: data.imageUrl,
                        marketplace: capitalizeFirst(data.marketplace),
                        targetPrice: alert.target_price || undefined,
                    });

                    logger.info(`Price alert email sent to ${user.email} for product ${data.productId}`);
                }

                // Send push notification if enabled
                if (alert.notify_push) {
                    await pushService.sendPriceAlert(user.id, {
                        productName: data.title,
                        newPrice: data.price,
                        oldPrice: data.oldPrice,
                        url: `${config.frontendUrl}/dashboard/products/${data.productId}`,
                        imageUrl: data.imageUrl,
                    });

                    logger.info(`Push notification sent to user ${alert.user_id} for product ${data.productId}`);
                }

                // Emit socket event for real-time notification
                const io = getIO();
                io.to(`user:${alert.user_id}`).emit(EVENTS.ALERT_TRIGGERED, {
                    alertId: alert.id,
                    productId: data.productId,
                    productName: data.title,
                    alertType: alert.alert_type,
                    newPrice: data.price,
                    targetPrice: alert.target_price,
                });

                // Deactivate if notify_once is true
                if (alert.notify_once) {
                    await AlertModel.update(alert.id, alert.user_id, { is_active: false });
                    logger.debug(`Alert ${alert.id} deactivated (notify_once)`);
                }

            } catch (alertError) {
                logger.error(`Error processing alert ${alert.id}:`, alertError);
            }
        }

    } catch (error) {
        logger.error('Error processing alerts:', error);
    }
}

function capitalizeFirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

export const closeRedisSubscriber = async () => {
    if (subscriber) {
        await subscriber.quit();
    }
};
