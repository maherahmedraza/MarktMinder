import { query, transaction } from '../config/database.js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

export interface User {
    id: string;
    email: string;
    password_hash?: string;
    name?: string;
    avatar_url?: string;
    email_verified: boolean;
    google_id?: string;
    apple_id?: string;
    notification_email: boolean;
    notification_push: boolean;
    default_currency: string;
    timezone: string;
    last_login_at?: Date;
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
}

/**
 * User model with database operations
 */
export const UserModel = {
    /**
     * Find user by ID
     */
    async findById(id: string): Promise<User | null> {
        const result = await query<User>(
            'SELECT * FROM users WHERE id = $1',
            [id]
        );
        return result.rows[0] || null;
    },

    /**
     * Find user by email
     */
    async findByEmail(email: string): Promise<User | null> {
        const result = await query<User>(
            'SELECT * FROM users WHERE email = $1',
            [email.toLowerCase()]
        );
        return result.rows[0] || null;
    },

    /**
     * Find user by Google ID
     */
    async findByGoogleId(googleId: string): Promise<User | null> {
        const result = await query<User>(
            'SELECT * FROM users WHERE google_id = $1',
            [googleId]
        );
        return result.rows[0] || null;
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

        const result = await query<User>(
            `INSERT INTO users (
        email, password_hash, name, google_id, apple_id,
        email_verification_token, email_verified
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
            [
                email.toLowerCase(),
                passwordHash,
                name,
                googleId,
                appleId,
                verificationToken,
                googleId || appleId ? true : false, // Auto-verify OAuth users
            ]
        );

        return result.rows[0];
    },

    /**
     * Update user by ID
     */
    async update(id: string, input: UpdateUserInput): Promise<User | null> {
        const fields: string[] = [];
        const values: any[] = [];
        let paramIndex = 1;

        for (const [key, value] of Object.entries(input)) {
            if (value !== undefined) {
                fields.push(`${key} = $${paramIndex}`);
                values.push(value);
                paramIndex++;
            }
        }

        if (fields.length === 0) {
            return this.findById(id);
        }

        values.push(id);

        const result = await query<User>(
            `UPDATE users SET ${fields.join(', ')}, updated_at = NOW()
       WHERE id = $${paramIndex}
       RETURNING *`,
            values
        );

        return result.rows[0] || null;
    },

    /**
     * Update user password
     */
    async updatePassword(id: string, newPassword: string): Promise<void> {
        const passwordHash = await bcrypt.hash(newPassword, 12);

        await query(
            `UPDATE users SET password_hash = $1, password_reset_token = NULL, 
       password_reset_expires = NULL, updated_at = NOW()
       WHERE id = $2`,
            [passwordHash, id]
        );
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
        const result = await query<User>(
            `UPDATE users SET email_verified = TRUE, email_verification_token = NULL, updated_at = NOW()
       WHERE email_verification_token = $1
       RETURNING *`,
            [token]
        );
        return result.rows[0] || null;
    },

    /**
     * Generate password reset token
     */
    async generatePasswordResetToken(email: string): Promise<string | null> {
        const token = crypto.randomBytes(32).toString('hex');
        const expires = new Date(Date.now() + 3600000); // 1 hour

        const result = await query(
            `UPDATE users SET password_reset_token = $1, password_reset_expires = $2, updated_at = NOW()
       WHERE email = $3
       RETURNING id`,
            [token, expires, email.toLowerCase()]
        );

        if (result.rows.length === 0) {
            return null;
        }

        return token;
    },

    /**
     * Verify password reset token
     */
    async verifyPasswordResetToken(token: string): Promise<User | null> {
        const result = await query<User>(
            `SELECT * FROM users 
       WHERE password_reset_token = $1 
         AND password_reset_expires > NOW()`,
            [token]
        );
        return result.rows[0] || null;
    },

    /**
     * Update last login timestamp
     */
    async updateLastLogin(id: string): Promise<void> {
        await query(
            'UPDATE users SET last_login_at = NOW() WHERE id = $1',
            [id]
        );
    },

    /**
     * Delete user account
     */
    async delete(id: string): Promise<void> {
        await query('DELETE FROM users WHERE id = $1', [id]);
    },
};

export default UserModel;
