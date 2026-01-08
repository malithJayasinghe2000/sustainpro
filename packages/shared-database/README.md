# SustainPro Shared Database

Centralized Prisma ORM client for all SustainPro microservices.

## Features

- 🔄 Singleton Prisma client instance
- 🔌 Connection pooling and retry logic
- 📝 Automatic type generation
- 🛡️ Type-safe database queries
- 🎯 Shared across all services

## Usage

### In Microservices

```typescript
import { getPrismaClient, initDatabase } from '@sustainpro/shared-database';

// Initialize on startup
const prisma = await initDatabase();

// Use in your code
const users = await prisma.user.findMany({
  where: { isActive: true }
});
```

### Development Commands

```bash
# Generate Prisma client
npm run prisma:generate

# Open Prisma Studio
npm run prisma:studio

# Push schema to database (dev only)
npm run prisma:push

# Create migration
npm run prisma:migrate

# Deploy migrations (production)
npm run prisma:migrate:deploy
```

## Environment Variables

Required in each service:

```env
DATABASE_URL="postgresql://sustainpro:password@localhost:5433/sustainpro?schema=public"
```

## Schema Location

`prisma/schema.prisma` - Single source of truth for database schema
