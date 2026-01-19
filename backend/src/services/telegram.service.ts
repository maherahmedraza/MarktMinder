/**
 * MarktMinder Telegram Bot Service
 * 
 * Provides instant price alerts and deal notifications via Telegram.
 * Features:
 * - Account linking via verification code
 * - Real-time price drop notifications
 * - Quick deal summaries
 * - Mute/unmute controls
 */

import config from '../config/index.js';
import { query, queryOne } from '../config/database.js';
import { logger } from '../utils/logger.js';

// Bot token from environment
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

interface TelegramUpdate {
    update_id: number;
    message?: {
        message_id: number;
        from: {
            id: number;
            first_name: string;
            username?: string;
        };
        chat: {
            id: number;
            type: string;
        };
        text?: string;
        date: number;
    };
}

interface TelegramUser {
    id: string;
    user_id: string;
    telegram_chat_id: string;
    telegram_username: string | null;
    is_verified: boolean;
    notifications_enabled: boolean;
    created_at: Date;
}

// =============================
// Telegram API Helpers
// =============================

async function sendMessage(chatId: number | string, text: string, parseMode: 'HTML' | 'Markdown' = 'HTML'): Promise<boolean> {
    if (!BOT_TOKEN) {
        logger.warn('Telegram bot token not configured');
        return false;
    }

    try {
        const response = await fetch(`${TELEGRAM_API}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text,
                parse_mode: parseMode,
            }),
        });

        if (!response.ok) {
            const error = await response.json();
            logger.error('Telegram sendMessage failed:', error);
            return false;
        }

        return true;
    } catch (error) {
        logger.error('Telegram API error:', error);
        return false;
    }
}

// =============================
// User Link Management
// =============================

/**
 * Generate a 6-digit verification code for account linking
 */
export async function generateLinkCode(userId: string): Promise<string> {
    const code = Math.random().toString().slice(2, 8); // 6 digits
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await query(
        `INSERT INTO telegram_link_codes (user_id, code, expires_at)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id) DO UPDATE SET code = $2, expires_at = $3`,
        [userId, code, expiresAt]
    );

    return code;
}

/**
 * Verify a link code and connect Telegram account
 */
export async function verifyLinkCode(
    telegramChatId: string,
    telegramUsername: string | null,
    code: string
): Promise<{ success: boolean; message: string }> {
    const result = await queryOne<{ user_id: string }>(
        `SELECT user_id FROM telegram_link_codes 
     WHERE code = $1 AND expires_at > NOW()`,
        [code]
    );

    if (!result) {
        return { success: false, message: 'Invalid or expired code. Please generate a new one from the MarktMinder dashboard.' };
    }

    // Create or update telegram user link
    await query(
        `INSERT INTO telegram_users (user_id, telegram_chat_id, telegram_username, is_verified)
     VALUES ($1, $2, $3, true)
     ON CONFLICT (user_id) DO UPDATE SET 
       telegram_chat_id = $2, 
       telegram_username = $3, 
       is_verified = true`,
        [result.user_id, telegramChatId, telegramUsername]
    );

    // Clean up used code
    await query(`DELETE FROM telegram_link_codes WHERE user_id = $1`, [result.user_id]);

    return { success: true, message: '✅ Account linked successfully! You will now receive price alerts via Telegram.' };
}

/**
 * Get Telegram user by MarktMinder user ID
 */
export async function getTelegramUser(userId: string): Promise<TelegramUser | null> {
    return queryOne<TelegramUser>(
        `SELECT * FROM telegram_users WHERE user_id = $1 AND is_verified = true`,
        [userId]
    );
}

/**
 * Unlink Telegram account
 */
export async function unlinkAccount(userId: string): Promise<boolean> {
    const result = await query(
        `DELETE FROM telegram_users WHERE user_id = $1`,
        [userId]
    );
    return (result.rowCount ?? 0) > 0;
}

/**
 * Toggle notifications for a user
 */
export async function toggleNotifications(userId: string, enabled: boolean): Promise<boolean> {
    const result = await query(
        `UPDATE telegram_users SET notifications_enabled = $2 WHERE user_id = $1`,
        [userId, enabled]
    );
    return (result.rowCount ?? 0) > 0;
}

// =============================
// Notification Functions
// =============================

/**
 * Send a price drop alert to a user's Telegram
 */
export async function sendPriceAlert(
    userId: string,
    productTitle: string,
    oldPrice: number,
    newPrice: number,
    productUrl: string,
    imageUrl?: string
): Promise<boolean> {
    const telegramUser = await getTelegramUser(userId);

    if (!telegramUser || !telegramUser.notifications_enabled) {
        return false;
    }

    const savings = oldPrice - newPrice;
    const percentDrop = ((savings / oldPrice) * 100).toFixed(1);

    const message = `
🔔 <b>Price Drop Alert!</b>

📦 <b>${escapeHtml(productTitle)}</b>

💰 Was: <s>€${oldPrice.toFixed(2)}</s>
✨ Now: <b>€${newPrice.toFixed(2)}</b>
💸 Save: <b>€${savings.toFixed(2)} (${percentDrop}%)</b>

🔗 <a href="${productUrl}">View Product</a>
  `.trim();

    return sendMessage(telegramUser.telegram_chat_id, message);
}

/**
 * Send daily deal summary
 */
export async function sendDealSummary(
    userId: string,
    deals: Array<{ title: string; savings: number; url: string }>
): Promise<boolean> {
    const telegramUser = await getTelegramUser(userId);

    if (!telegramUser || !telegramUser.notifications_enabled || deals.length === 0) {
        return false;
    }

    const totalSavings = deals.reduce((sum, d) => sum + d.savings, 0);

    let message = `📊 <b>Your Daily Deal Summary</b>\n\n`;
    message += `Found <b>${deals.length}</b> deals with potential savings of <b>€${totalSavings.toFixed(2)}</b>!\n\n`;

    deals.slice(0, 5).forEach((deal, i) => {
        message += `${i + 1}. ${escapeHtml(deal.title.slice(0, 40))}... - <b>€${deal.savings.toFixed(2)}</b>\n`;
    });

    if (deals.length > 5) {
        message += `\n...and ${deals.length - 5} more deals!`;
    }

    return sendMessage(telegramUser.telegram_chat_id, message);
}

/**
 * Send target price reached notification
 */
export async function sendTargetPriceReached(
    userId: string,
    productTitle: string,
    targetPrice: number,
    currentPrice: number,
    productUrl: string
): Promise<boolean> {
    const telegramUser = await getTelegramUser(userId);

    if (!telegramUser || !telegramUser.notifications_enabled) {
        return false;
    }

    const message = `
🎯 <b>Target Price Reached!</b>

📦 <b>${escapeHtml(productTitle)}</b>

🎯 Your target: €${targetPrice.toFixed(2)}
✨ Current price: <b>€${currentPrice.toFixed(2)}</b>

⚡ <b>Time to buy!</b>

🔗 <a href="${productUrl}">Go to Product</a>
  `.trim();

    return sendMessage(telegramUser.telegram_chat_id, message);
}

// =============================
// Command Handlers
// =============================

const COMMANDS: Record<string, (chatId: number, args: string[], username?: string) => Promise<void>> = {
    start: async (chatId) => {
        await sendMessage(chatId, `
🚀 <b>Welcome to MarktMinder Bot!</b>

I'll send you instant notifications when:
• Your tracked products drop in price
• Target prices are reached
• New deals are found

<b>Commands:</b>
/link [CODE] - Link your MarktMinder account
/status - Check your notification status
/mute - Pause notifications
/unmute - Resume notifications
/help - Show this message
    `.trim());
    },

    help: async (chatId) => {
        await COMMANDS.start(chatId, []);
    },

    link: async (chatId, args, username) => {
        if (args.length === 0) {
            await sendMessage(chatId, '❌ Please provide your verification code.\n\nUsage: /link YOUR_CODE\n\nGet your code from the MarktMinder dashboard → Settings → Telegram.');
            return;
        }

        const code = args[0];
        const result = await verifyLinkCode(String(chatId), username || null, code);
        await sendMessage(chatId, result.message);
    },

    status: async (chatId) => {
        const user = await queryOne<TelegramUser>(
            `SELECT * FROM telegram_users WHERE telegram_chat_id = $1`,
            [String(chatId)]
        );

        if (!user || !user.is_verified) {
            await sendMessage(chatId, '❌ Your account is not linked.\n\nUse /link [CODE] to connect your MarktMinder account.');
            return;
        }

        const status = user.notifications_enabled ? '🔔 Notifications: ON' : '🔕 Notifications: OFF';
        await sendMessage(chatId, `✅ Account linked!\n${status}`);
    },

    mute: async (chatId) => {
        const user = await queryOne<TelegramUser>(
            `SELECT user_id FROM telegram_users WHERE telegram_chat_id = $1 AND is_verified = true`,
            [String(chatId)]
        );

        if (!user) {
            await sendMessage(chatId, '❌ Account not linked. Use /link [CODE] first.');
            return;
        }

        await toggleNotifications(user.user_id, false);
        await sendMessage(chatId, '🔕 Notifications paused. Use /unmute to resume.');
    },

    unmute: async (chatId) => {
        const user = await queryOne<TelegramUser>(
            `SELECT user_id FROM telegram_users WHERE telegram_chat_id = $1 AND is_verified = true`,
            [String(chatId)]
        );

        if (!user) {
            await sendMessage(chatId, '❌ Account not linked. Use /link [CODE] first.');
            return;
        }

        await toggleNotifications(user.user_id, true);
        await sendMessage(chatId, '🔔 Notifications resumed! You will receive price alerts again.');
    },
};

/**
 * Process incoming Telegram update (webhook handler)
 */
export async function processUpdate(update: TelegramUpdate): Promise<void> {
    if (!update.message?.text) return;

    const { chat, from, text } = update.message;

    if (!text.startsWith('/')) return;

    const parts = text.slice(1).split(' ');
    const command = parts[0].toLowerCase().split('@')[0]; // Handle @botname suffix
    const args = parts.slice(1);

    const handler = COMMANDS[command];
    if (handler) {
        try {
            await handler(chat.id, args, from.username);
        } catch (error) {
            logger.error(`Telegram command error (${command}):`, error);
            await sendMessage(chat.id, '❌ An error occurred. Please try again later.');
        }
    }
}

// =============================
// Utility Functions
// =============================

function escapeHtml(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

export default {
    generateLinkCode,
    verifyLinkCode,
    getTelegramUser,
    unlinkAccount,
    toggleNotifications,
    sendPriceAlert,
    sendDealSummary,
    sendTargetPriceReached,
    processUpdate,
};
