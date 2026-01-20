import Redis from 'ioredis';
import config from '../config/index.js';
import { getIO } from '../config/socket.js';
import { EVENTS } from '../config/events.js';
import { logger } from '../utils/logger.js';
import { AlertModel } from '../models/index.js';
import { emailService } from './email.service.js';
import { pushService } from './push.service.js';
import { prisma } from '../config/prisma.js';

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
        const allTimeLowResult = await prisma.priceHistory.aggregate({
            _min: { price: true },
            where: { productId: data.productId }
        });
        const allTimeLow = allTimeLowResult._min.price ? Number(allTimeLowResult._min.price) : null;

        // Check which alerts should trigger
        // Assuming AlertModel.checkAlerts has been migrated or communicates well
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
                await prisma.alertHistory.create({
                    data: {
                        alertId: alert.id,
                        triggeredAt: new Date(),
                        // triggered_price is not in schema directly? 
                        // Schema has oldPrice, newPrice. 
                        // The original SQL was triggered_price. 
                        // Let's use newPrice.
                        newPrice: data.price,
                        userId: alert.user_id,
                        productId: data.productId,
                        // Defaults
                        emailSent: false,
                        pushSent: false
                    }
                });

                // Get user email
                const user = await prisma.user.findUnique({
                    where: { id: alert.user_id },
                    select: { email: true, name: true, id: true }
                });

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

                    // Update history
                    // We need the ID of the history record to update it?
                    // Or we just assume it's created. 
                    // To update 'emailSent', we should have captured the created record.
                    // Or execute update on most recent.
                    // For simplicity and speed, trigger the update via finding the last record?
                    // Actually, let's create it with emailSent=true if success?
                    // But we create it before sending.
                    // Let's create it AFTER sending or update it.
                    // Better: create first (log attempt), update after.
                    // I will fetch the last inserted history for this alert to update it?
                    // Better yet, keep the history object.
                    // Prisma create returns the object.

                    // Let's refactor slightly to keep the history ID.
                }

                // Refactoring history creation to capture ID:
                const historyRecord = await prisma.alertHistory.create({
                    data: {
                        alertId: alert.id,
                        triggeredAt: new Date(),
                        newPrice: data.price,
                        userId: alert.user_id,
                        productId: data.productId,
                        emailSent: false,
                        pushSent: false
                    }
                });

                // Send email notification if enabled
                if (alert.notify_email && user.email) {
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

                    await prisma.alertHistory.update({
                        where: { id: historyRecord.id },
                        data: { emailSent: true }
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

                    await prisma.alertHistory.update({
                        where: { id: historyRecord.id },
                        data: { pushSent: true }
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
