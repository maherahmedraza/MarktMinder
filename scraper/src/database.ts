import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import config from './config.js';
import logger from './logger.js';

const pool = new Pool({
    connectionString: config.databaseUrl,
    max: 10,
    idleTimeoutMillis: 30000,
});

pool.on('error', (err) => {
    logger.error('Database pool error:', err);
});

export async function query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    params?: unknown[]
): Promise<QueryResult<T>> {
    return pool.query<T>(text, params);
}

export async function getClient(): Promise<PoolClient> {
    return pool.connect();
}

export async function closePool(): Promise<void> {
    await pool.end();
}

export { pool };
export default { query, getClient, closePool, pool };
