import { Pool, PoolClient, QueryResult } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Create PostgreSQL connection pool
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 20, // Maximum number of clients in the pool
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

// Test connection on startup
pool.on('connect', () => {
    console.log('✅ Connected to PostgreSQL database');
});

pool.on('error', (err) => {
    console.error('❌ Unexpected error on idle client', err);
    process.exit(-1);
});

// Helper function to execute queries
export async function query(
    text: string,
    params?: any[]
): Promise<QueryResult<any>> {
    const start = Date.now();
    try {
        const res = await pool.query(text, params);
        const duration = Date.now() - start;
        console.log('Executed query', { text, duration, rows: res.rowCount });
        return res;
    } catch (error) {
        console.error('Database query error:', error);
        throw error;
    }
}

// Helper to get a client from the pool (for transactions)
export async function getClient(): Promise<PoolClient> {
    return await pool.connect();
}

// Graceful shutdown
export async function closePool(): Promise<void> {
    await pool.end();
    console.log('🔌 Database pool closed');
}

export default pool;
