import { Pool, QueryResult, QueryResultRow } from 'pg';
import { config } from '../config';
import { createLogger } from '@sustainpro/shared-utils';

const logger = createLogger({ service: 'iot-service' });

const pool = new Pool({
    connectionString: config.database.connectionString,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

// Log pool events
pool.on('connect', () => {
    logger.debug('New client connected to database');
});

pool.on('error', (err) => {
    logger.error('Unexpected database error', { error: err.message });
});

/**
 * Execute a parameterized query
 */
export const query = async <T extends QueryResultRow = any>(
    text: string,
    params?: any[]
): Promise<QueryResult<T>> => {
    const start = Date.now();
    const result = await pool.query<T>(text, params);
    const duration = Date.now() - start;

    logger.debug('Query executed', {
        duration: `${duration}ms`,
        rows: result.rowCount
    });

    return result;
};

/**
 * Get a client from the pool for transactions
 */
export const getClient = async () => {
    const client = await pool.connect();
    return client;
};

/**
 * Close the pool connection
 */
export const closePool = async () => {
    await pool.end();
    logger.info('Database pool closed');
};

export default pool;
