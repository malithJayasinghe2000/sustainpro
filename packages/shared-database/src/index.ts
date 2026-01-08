/**
 * SustainPro Shared Database Client
 * 
 * Provides a singleton Prisma client instance for all microservices.
 * Follows best practices for connection pooling and graceful shutdown.
 */

import { PrismaClient, Prisma } from '@prisma/client';

// Singleton instance
let prisma: PrismaClient | null = null;

/**
 * Get or create Prisma client instance
 */
export function getPrismaClient(): PrismaClient {
  if (!prisma) {
    prisma = new PrismaClient({
      log: process.env.NODE_ENV === 'development' 
        ? ['query', 'error', 'warn'] 
        : ['error'],
      errorFormat: 'pretty',
    });
  }
  return prisma;
}

/**
 * Initialize database connection with retry logic
 */
export async function initDatabase(maxRetries = 5, delay = 2000): Promise<PrismaClient> {
  const client = getPrismaClient();
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      await client.$connect();
      console.log('✅ Database connected successfully');
      return client;
    } catch (error) {
      console.error(`❌ Database connection attempt ${i + 1} failed:`, error);
      if (i < maxRetries - 1) {
        console.log(`⏳ Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw new Error('Failed to connect to database after multiple attempts');
      }
    }
  }
  
  return client;
}

/**
 * Close database connection
 */
export async function closeDatabase(): Promise<void> {
  if (prisma) {
    await prisma.$disconnect();
    console.log('✅ Database disconnected');
    prisma = null;
  }
}

// Re-export Prisma types
export { PrismaClient, Prisma };
export * from '@prisma/client';

// Default export
export default getPrismaClient();
