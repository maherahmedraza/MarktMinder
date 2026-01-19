import webpush from 'web-push';
import { query } from '../config/database.js';
import { logger } from '../utils/logger.js';

// VAPID keys should be generated only once.
// We expect them to be in environment variables.
const publicVapidKey = process.env.VAPID_PUBLIC_KEY;
const privateVapidKey = process.env.VAPID_PRIVATE_KEY;
const subject = process.env.VAPID_SUBJECT || 'mailto:admin@marktminder.de';

if (publicVapidKey && privateVapidKey) {
    webpush.setVapidDetails(subject, publicVapidKey, privateVapidKey);
    logger.info('✅ Web Push configured with VAPID keys');
} else {
    logger.warn('⚠️ Web Push NOT configured (missing VAPID keys)');
}

export interface PushSubscription {
    endpoint: string;
    keys: {
        p256dh: string;
        auth: string;
    };
}

export interface PushPayload {
    title: string;
    body: string;
    icon?: string;
    url?: string;
    tag?: string;
}

class PushService {
    /**
     * Save a new push subscription for a user
     */
    async saveSubscription(userId: string, subscription: PushSubscription, userAgent?: string) {
        try {
            await query(
                `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth, user_agent)
                 VALUES ($1, $2, $3, $4, $5)
                 ON CONFLICT (user_id, endpoint) DO UPDATE 
                 SET updated_at = NOW(), p256dh = $3, auth = $4, user_agent = $5`,
                [userId, subscription.endpoint, subscription.keys.p256dh, subscription.keys.auth, userAgent]
            );
            logger.info(`Push subscription saved for user ${userId}`);
        } catch (error) {
            logger.error('Failed to save push subscription:', error);
            throw error;
        }
    }

    /**
     * Remove a subscription (e.g. when invalid)
     */
    async removeSubscription(endpoint: string) {
        try {
            await query('DELETE FROM push_subscriptions WHERE endpoint = $1', [endpoint]);
        } catch (error) {
            logger.error('Failed to remove push subscription:', error);
        }
    }

    /**
     * Send notification to a specific user
     */
    async sendNotification(userId: string, payload: PushPayload) {
        if (!publicVapidKey || !privateVapidKey) {
            logger.warn('Cannot send push notification: VAPID keys missing');
            return;
        }

        try {
            // Get all subscriptions for this user
            const result = await query(
                'SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = $1',
                [userId]
            );

            const subscriptions = result.rows;
            if (subscriptions.length === 0) {
                return;
            }

            logger.info(`Sending push notification to ${subscriptions.length} devices for user ${userId}`);

            const notificationPayload = JSON.stringify(payload);

            const promises = subscriptions.map(async (sub) => {
                const pushSubscription = {
                    endpoint: sub.endpoint,
                    keys: {
                        p256dh: sub.p256dh,
                        auth: sub.auth,
                    },
                };

                try {
                    await webpush.sendNotification(pushSubscription, notificationPayload);
                } catch (err: any) {
                    if (err.statusCode === 410 || err.statusCode === 404) {
                        // Subscription has expired or is no longer valid
                        logger.info(`Removing expired subscription: ${sub.endpoint}`);
                        await this.removeSubscription(sub.endpoint);
                    } else {
                        logger.error('Error sending push notification:', err);
                    }
                }
            });

            await Promise.all(promises);

        } catch (error) {
            logger.error(`Failed to send push notification to user ${userId}:`, error);
        }
    }

    /**
     * Send price alert notification
     */
    async sendPriceAlert(userId: string, data: {
        productName: string;
        newPrice: number;
        oldPrice?: number;
        url?: string;
        imageUrl?: string;
    }) {
        const dropText = data.oldPrice
            ? `Price dropped to €${data.newPrice.toFixed(2)} (was €${data.oldPrice.toFixed(2)})`
            : `New price: €${data.newPrice.toFixed(2)}`;

        await this.sendNotification(userId, {
            title: `Price Alert: ${data.productName.substring(0, 30)}...`,
            body: dropText,
            icon: '/icon-192x192.png', // Assuming pwa icon
            url: data.url || '/dashboard',
            tag: 'price-alert'
        });
    }
}

export const pushService = new PushService();
