import { prisma } from '../config/prisma.js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { User as PrismaUser } from '@prisma/client';

// Keep existing interface for backward compatibility
export interface User {
    id: string;
    email: string;
    password_hash?: string | null;
    name?: string | null;
    avatar_url?: string | null;
    email_verified: boolean;
    email_verification_token?: string | null;
    password_reset_token?: string | null;
    password_reset_expires?: Date | null;
    role: string;
    google_id?: string | null;
    apple_id?: string | null;
    notification_email: boolean;
    notification_push: boolean;
    default_currency: string;
    timezone: string;
    telegram_chat_id?: string | null;
    telegram_username?: string | null;
    last_login_at?: Date | null;
    created_at: Date;
    updated_at: Date;
}

export interface CreateUserInput {
    email: string;
    password?: string;
    name?: string;
    googleId?: string;
    appleId?: string;
}

export interface UpdateUserInput {
    name?: string;
    avatar_url?: string;
    notification_email?: boolean;
    notification_push?: boolean;
    default_currency?: string;
    timezone?: string;
    telegram_chat_id?: string;
    telegram_username?: string;
}

/**
 * Map Prisma user to legacy User interface
 */
function toUser(user: PrismaUser): User {
    return {
        id: user.id,
        email: user.email,
        password_hash: user.passwordHash,
        name: user.name,
        avatar_url: user.avatarUrl,
        email_verified: user.emailVerified,
        email_verification_token: user.emailVerificationToken,
        password_reset_token: user.passwordResetToken,
        password_reset_expires: user.passwordResetExpires,
        role: user.role,
        google_id: user.googleId,
        apple_id: user.appleId,
        notification_email: user.notificationEmail,
        notification_push: user.notificationPush,
        default_currency: user.defaultCurrency,
        timezone: user.timezone,
        telegram_chat_id: user.telegramChatId,
        telegram_username: user.telegramUsername,
        last_login_at: user.lastLoginAt,
        created_at: user.createdAt,
        updated_at: user.updatedAt,
    };
}

/**
 * User model with Prisma operations
 */
export const UserModel = {
    /**
     * Find user by ID
     */
    async findById(id: string): Promise<User | null> {
        const user = await prisma.user.findUnique({
            where: { id },
        });
        return user ? toUser(user) : null;
    },

    /**
     * Find user by email
     */
    async findByEmail(email: string): Promise<User | null> {
        const user = await prisma.user.findUnique({
            where: { email: email.toLowerCase() },
        });
        return user ? toUser(user) : null;
    },

    /**
     * Find user by Google ID
     */
    async findByGoogleId(googleId: string): Promise<User | null> {
        const user = await prisma.user.findUnique({
            where: { googleId },
        });
        return user ? toUser(user) : null;
    },

    /**
     * Create a new user
     */
    async create(input: CreateUserInput): Promise<User> {
        const { email, password, name, googleId, appleId } = input;

        // Hash password if provided
        let passwordHash: string | null = null;
        if (password) {
            passwordHash = await bcrypt.hash(password, 12);
        }

        // Generate email verification token
        const verificationToken = crypto.randomBytes(32).toString('hex');

        const user = await prisma.user.create({
            data: {
                email: email.toLowerCase(),
                passwordHash,
                name,
                googleId,
                appleId,
                emailVerificationToken: verificationToken,
                emailVerified: !!(googleId || appleId), // Auto-verify OAuth users
            },
        });

        return toUser(user);
    },

    /**
     * Update user by ID
     */
    async update(id: string, input: UpdateUserInput): Promise<User | null> {
        // Map input fields to Prisma usage
        const data: any = {};
        if (input.name !== undefined) data.name = input.name;
        if (input.avatar_url !== undefined) data.avatarUrl = input.avatar_url;
        if (input.notification_email !== undefined) data.notificationEmail = input.notification_email;
        if (input.notification_push !== undefined) data.notificationPush = input.notification_push;
        if (input.default_currency !== undefined) data.defaultCurrency = input.default_currency;
        if (input.timezone !== undefined) data.timezone = input.timezone;
        if (input.telegram_chat_id !== undefined) data.telegramChatId = input.telegram_chat_id;
        if (input.telegram_username !== undefined) data.telegramUsername = input.telegram_username;

        if (Object.keys(data).length === 0) {
            return this.findById(id);
        }

        const user = await prisma.user.update({
            where: { id },
            data,
        });

        return toUser(user);
    },

    /**
     * Update user password
     */
    async updatePassword(id: string, newPassword: string): Promise<void> {
        const passwordHash = await bcrypt.hash(newPassword, 12);

        await prisma.user.update({
            where: { id },
            data: {
                passwordHash,
                passwordResetToken: null,
                passwordResetExpires: null,
            },
        });
    },

    /**
     * Verify user password
     */
    async verifyPassword(user: User, password: string): Promise<boolean> {
        if (!user.password_hash) {
            return false;
        }
        return bcrypt.compare(password, user.password_hash);
    },

    /**
     * Verify user email
     */
    async verifyEmail(token: string): Promise<User | null> {
        // First find the user with this token
        const userToVerify = await prisma.user.findFirst({
            where: { emailVerificationToken: token },
        });

        if (!userToVerify) return null;

        const user = await prisma.user.update({
            where: { id: userToVerify.id },
            data: {
                emailVerified: true,
                emailVerificationToken: null,
            },
        });

        return toUser(user);
    },

    /**
     * Generate password reset token
     */
    async generatePasswordResetToken(email: string): Promise<string | null> {
        const token = crypto.randomBytes(32).toString('hex');
        const expires = new Date(Date.now() + 3600000); // 1 hour

        try {
            await prisma.user.update({
                where: { email: email.toLowerCase() },
                data: {
                    passwordResetToken: token,
                    passwordResetExpires: expires,
                },
            });
            return token;
        } catch (error) {
            return null;
        }
    },

    /**
     * Verify password reset token
     */
    async verifyPasswordResetToken(token: string): Promise<User | null> {
        const user = await prisma.user.findFirst({
            where: {
                passwordResetToken: token,
                passwordResetExpires: {
                    gt: new Date(),
                },
            },
        });

        return user ? toUser(user) : null;
    },

    /**
     * Update last login timestamp
     */
    async updateLastLogin(id: string): Promise<void> {
        await prisma.user.update({
            where: { id },
            data: { lastLoginAt: new Date() },
        });
    },

    /**
     * Delete user account
     */
    async delete(id: string): Promise<void> {
        await prisma.user.delete({
            where: { id },
        });
    },
};

export default UserModel;
