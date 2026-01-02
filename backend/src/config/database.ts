import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import config from './index.js';
import { logger } from '../utils/logger.js';

// Create connection pool
const pool = new Pool({
    connectionString: config.database.url,
    ssl: config.database.ssl ? { rejectUnauthorized: false } : false,
    max: config.database.poolSize,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

// Log pool errors
pool.on('error', (err) => {
    logger.error('Unexpected database pool error:', err);
});

// Log pool connection
pool.on('connect', () => {
    logger.debug('New database connection established');
});

// Typed error for DB issues
export class DatabaseError extends Error {
    constructor(message: string, public query: string, public originalError: any) {
        super(message);
        this.name = 'DatabaseError';
    }
}

/**
 * Execute a query with automatic connection handling
 */
export async function query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    params?: any[]
): Promise<QueryResult<T>> {
    const start = Date.now();
    try {
        const result = await pool.query<T>(text, params);
        const duration = Date.now() - start;

        // Warn on slow queries (>100ms)
        if (duration > 100) {
            logger.warn('Slow query detected', { text: text.substring(0, 100), duration, rows: result.rowCount });
        } else {
            logger.debug('Executed query', { text: text.substring(0, 100), duration, rows: result.rowCount });
        }

        return result;
    } catch (error) {
        logger.error('Database query failed', { text: text.substring(0, 100), error });
        throw new DatabaseError('Query execution failed', text, error);
    }
}

/**
 * Get a client from the pool for transactions
 */
export async function getClient(): Promise<PoolClient> {
    const client = await pool.connect();
    return client;
}

/**
 * Execute a transaction with automatic rollback on error
 */
export async function transaction<T>(
    callback: (client: PoolClient) => Promise<T>
): Promise<T> {
    const client = await getClient();
    try {
        await client.query('BEGIN');
        const result = await callback(client);
        await client.query('COMMIT');
        return result;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

/**
 * Check database connection health
 */
export async function checkHealth(): Promise<boolean> {
    try {
        const result = await query('SELECT NOW()');
        return result.rowCount === 1;
    } catch {
        return false;
    }
}

/**
 * Close all pool connections
 */
export async function closePool(): Promise<void> {
    await pool.end();
    logger.info('Database pool closed');
}

export { pool };
export default { query, getClient, transaction, checkHealth, closePool, pool };
