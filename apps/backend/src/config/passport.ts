import passport from 'passport';
import { Strategy as GoogleStrategy, Profile } from 'passport-google-oauth20';
import { prisma } from './prisma.js';
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
            const user = await prisma.user.findUnique({ where: { id } });
            done(null, user);
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
    const existingByGoogleId = await prisma.user.findFirst({
        where: { googleId }
    });

    if (existingByGoogleId) {
        // Update avatar if changed
        if (avatarUrl && existingByGoogleId.avatarUrl !== avatarUrl) {
            await prisma.user.update({
                where: { id: existingByGoogleId.id },
                data: { avatarUrl }
            });
        }
        return {
            id: existingByGoogleId.id,
            email: existingByGoogleId.email,
            name: existingByGoogleId.name || 'User',
            avatar_url: avatarUrl || existingByGoogleId.avatarUrl || undefined,
            google_id: existingByGoogleId.googleId || undefined,
            auth_provider: 'google',
        };
    }

    // Check if user exists with this email (link accounts)
    const existingByEmail = await prisma.user.findUnique({
        where: { email }
    });

    if (existingByEmail) {
        // Link Google account to existing user
        // Respect existing avatar if present, or use google one
        const updatedUser = await prisma.user.update({
            where: { id: existingByEmail.id },
            data: {
                googleId,
                avatarUrl: existingByEmail.avatarUrl || avatarUrl
            }
        });

        logger.info(`Linked Google account to existing user ${updatedUser.id}`);
        return {
            id: updatedUser.id,
            email: updatedUser.email,
            name: updatedUser.name || name,
            avatar_url: updatedUser.avatarUrl || undefined,
            google_id: googleId,
            auth_provider: 'google', // Updated logic might keep existing, but returning current context
        };
    }

    // Create new user
    const newUser = await prisma.user.create({
        data: {
            email,
            name,
            googleId,
            avatarUrl,
            emailVerified: true // OAuth emails are verified
        }
    });

    logger.info(`Created new user via Google OAuth: ${newUser.id}`);

    return {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name || 'User',
        avatar_url: newUser.avatarUrl || undefined,
        google_id: newUser.googleId || undefined,
        auth_provider: 'google',
    };
}

export default passport;
