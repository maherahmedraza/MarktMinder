import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import { logger } from '../utils/logger.js';
import dotenv from 'dotenv';

// Load env vars
dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function runMigration() {
    try {
        const migrationFile = path.resolve(process.cwd(), '../database/migrations/003_oauth_providers.sql');
        logger.info(`Running migration: ${migrationFile}`);

        if (!fs.existsSync(migrationFile)) {
            throw new Error(`Migration file not found: ${migrationFile}`);
        }

        const sql = fs.readFileSync(migrationFile, 'utf8');

        // Execute SQL
        await pool.query(sql);

        logger.info('✅ Migration successful');
    } catch (error) {
        logger.error('❌ Migration failed:', error);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

runMigration();
