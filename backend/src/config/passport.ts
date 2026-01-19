import passport from 'passport';
import { Strategy as GoogleStrategy, Profile } from 'passport-google-oauth20';
import { query } from './database.js';
import { logger } from '../utils/logger.js';
import crypto from 'crypto';

// Google OAuth Configuration
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL || '/api/auth/google/callback';

interface OAuthUser {
    id: string;
    email: string;
    name: string;
    avatar_url?: string;
    google_id?: string;
    auth_provider: string;
}

/**
 * Initialize Passport with OAuth strategies
 */
export const initializePassport = () => {
    // Only initialize Google OAuth if credentials are provided
    if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET) {
        passport.use(new GoogleStrategy({
            clientID: GOOGLE_CLIENT_ID,
            clientSecret: GOOGLE_CLIENT_SECRET,
            callbackURL: CALLBACK_URL,
            scope: ['profile', 'email'],
        }, async (accessToken, refreshToken, profile, done) => {
            try {
                const user = await findOrCreateGoogleUser(profile);
                done(null, user);
            } catch (error) {
                logger.error('Google OAuth error:', error);
                done(error as Error, undefined);
            }
        }));

        logger.info('✅ Google OAuth strategy configured');
    } else {
        logger.warn('⚠️ Google OAuth not configured (missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET)');
    }

    // Serialize user for session (not used with JWT, but required)
    passport.serializeUser((user: any, done) => {
        done(null, user.id);
    });

    passport.deserializeUser(async (id: string, done) => {
        try {
            const result = await query('SELECT * FROM users WHERE id = $1', [id]);
            done(null, result.rows[0] || null);
        } catch (error) {
            done(error, null);
        }
    });
};

/**
 * Find existing user by Google ID or create a new one
 */
async function findOrCreateGoogleUser(profile: Profile): Promise<OAuthUser> {
    const email = profile.emails?.[0]?.value;
    const googleId = profile.id;
    const name = profile.displayName || profile.name?.givenName || 'User';
    const avatarUrl = profile.photos?.[0]?.value;

    if (!email) {
        throw new Error('Google account must have an email address');
    }

    // Check if user exists with this Google ID
    const existingByGoogleId = await query(
        'SELECT * FROM users WHERE google_id = $1',
        [googleId]
    );

    if (existingByGoogleId.rows.length > 0) {
        const user = existingByGoogleId.rows[0];
        // Update avatar if changed
        if (avatarUrl && user.avatar_url !== avatarUrl) {
            await query('UPDATE users SET avatar_url = $1 WHERE id = $2', [avatarUrl, user.id]);
        }
        return {
            id: user.id,
            email: user.email,
            name: user.name,
            avatar_url: avatarUrl || user.avatar_url,
            google_id: user.google_id,
            auth_provider: 'google',
        };
    }

    // Check if user exists with this email (link accounts)
    const existingByEmail = await query(
        'SELECT * FROM users WHERE email = $1',
        [email]
    );

    if (existingByEmail.rows.length > 0) {
        const user = existingByEmail.rows[0];
        // Link Google account to existing user
        await query(
            'UPDATE users SET google_id = $1, avatar_url = COALESCE($2, avatar_url), auth_provider = CASE WHEN auth_provider = $3 THEN auth_provider ELSE $3 END WHERE id = $4',
            [googleId, avatarUrl, 'google', user.id]
        );
        logger.info(`Linked Google account to existing user ${user.id}`);
        return {
            id: user.id,
            email: user.email,
            name: user.name || name,
            avatar_url: avatarUrl || user.avatar_url,
            google_id: googleId,
            auth_provider: 'google',
        };
    }

    // Create new user
    const userId = crypto.randomUUID();
    const result = await query(
        `INSERT INTO users (id, email, name, google_id, avatar_url, auth_provider, email_verified, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, 'google', TRUE, NOW(), NOW())
         RETURNING *`,
        [userId, email, name, googleId, avatarUrl]
    );

    const newUser = result.rows[0];
    logger.info(`Created new user via Google OAuth: ${newUser.id}`);

    return {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        avatar_url: newUser.avatar_url,
        google_id: newUser.google_id,
        auth_provider: 'google',
    };
}

export default passport;
