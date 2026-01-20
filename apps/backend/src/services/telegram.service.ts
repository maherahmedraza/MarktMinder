import config from '../config/index.js';
import { prisma } from '../config/prisma.js';
import { logger } from '../utils/logger.js';
import { Prisma } from '@prisma/client';

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

    await prisma.telegramLinkCode.upsert({
        where: { userId },
        update: { code, expiresAt },
        create: { userId, code, expiresAt }
    });

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
    const linkCode = await prisma.telegramLinkCode.findFirst({
        where: {
            code,
            expiresAt: { gt: new Date() }
        }
    });

    if (!linkCode) {
        return { success: false, message: 'Invalid or expired code. Please generate a new one from the MarktMinder dashboard.' };
    }

    // Create or update telegram user link
    await prisma.telegramUser.upsert({
        where: { userId: linkCode.userId },
        update: {
            telegramChatId,
            telegramUsername,
            isVerified: true
        },
        create: {
            userId: linkCode.userId,
            telegramChatId,
            telegramUsername,
            isVerified: true
        }
    });

    // Clean up used code
    await prisma.telegramLinkCode.delete({
        where: { userId: linkCode.userId }
    });

    return { success: true, message: '✅ Account linked successfully! You will now receive price alerts via Telegram.' };
}

/**
 * Get Telegram user by MarktMinder user ID
 */
export async function getTelegramUser(userId: string): Promise<any> {
    const user = await prisma.telegramUser.findFirst({
        where: { userId, isVerified: true }
    });

    if (!user) return null;

    // Adapt prisma model to service interface (snake_case)
    return {
        id: user.id,
        user_id: user.userId,
        telegram_chat_id: user.telegramChatId,
        telegram_username: user.telegramUsername,
        is_verified: user.isVerified,
        notifications_enabled: user.notificationsEnabled,
        created_at: user.createdAt
    };
}

/**
 * Unlink Telegram account
 */
export async function unlinkAccount(userId: string): Promise<boolean> {
    try {
        await prisma.telegramUser.delete({
            where: { userId }
        });
        return true;
    } catch (error) {
        return false;
    }
}

/**
 * Toggle notifications for a user
 */
export async function toggleNotifications(userId: string, enabled: boolean): Promise<boolean> {
    try {
        await prisma.telegramUser.update({
            where: { userId },
            data: { notificationsEnabled: enabled }
        });
        return true;
    } catch (error) {
        return false;
    }
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
        const user = await prisma.telegramUser.findFirst({
            where: { telegramChatId: String(chatId) }
        });

        if (!user || (!user.isVerified && !user.userId)) { // Check verification
            await sendMessage(chatId, '❌ Your account is not linked.\n\nUse /link [CODE] to connect your MarktMinder account.');
            return;
        }

        const status = user.notificationsEnabled ? '🔔 Notifications: ON' : '🔕 Notifications: OFF';
        await sendMessage(chatId, `✅ Account linked!\n${status}`);
    },

    mute: async (chatId) => {
        const user = await prisma.telegramUser.findFirst({
            where: { telegramChatId: String(chatId), isVerified: true }
        });

        if (!user) {
            await sendMessage(chatId, '❌ Account not linked. Use /link [CODE] first.');
            return;
        }

        await toggleNotifications(user.userId, false);
        await sendMessage(chatId, '🔕 Notifications paused. Use /unmute to resume.');
    },

    unmute: async (chatId) => {
        const user = await prisma.telegramUser.findFirst({
            where: { telegramChatId: String(chatId), isVerified: true }
        });

        if (!user) {
            await sendMessage(chatId, '❌ Account not linked. Use /link [CODE] first.');
            return;
        }

        await toggleNotifications(user.userId, true);
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
