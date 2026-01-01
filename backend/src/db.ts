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


// Set timezone to UTC for all connections
pool.on('connect', async (client: PoolClient) => {
    try {
        await client.query("SET timezone TO 'UTC'");
        console.log('✅ Connected to PostgreSQL database (Timezone: UTC)');
    } catch (err) {
        console.error('❌ Error setting timezone to UTC:', err);
    }
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
