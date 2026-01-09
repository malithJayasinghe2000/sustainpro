# Prisma & Swagger Integration Guide

## 🎯 Overview

This guide explains the integration of **Prisma ORM** and **Swagger API Documentation** into SustainPro, following enterprise best practices.

## 📁 New Project Structure

```
sustainpro/
├── packages/
│   ├── shared-database/          # ✨ NEW: Prisma client
│   │   ├── prisma/
│   │   │   └── schema.prisma     # Database schema (single source of truth)
│   │   ├── src/
│   │   │   └── index.ts          # Prisma client singleton
│   │   ├── generated/            # Auto-generated Prisma client
│   │   └── package.json
│   │
│   ├── shared-swagger/           # ✨ NEW: Swagger configuration
│   │   ├── src/
│   │   │   └── index.ts          # Reusable Swagger setup
│   │   └── package.json
│   │
│   ├── shared-types/             # TypeScript types
│   ├── shared-utils/             # Utility functions
│   └── shared-middleware/        # Express middleware
│
├── services/
│   ├── auth-service/
│   │   ├── src/
│   │   │   ├── app.ts            # ✏️ UPDATED: Swagger added
│   │   │   ├── server.ts         # ✏️ UPDATED: Prisma integration
│   │   │   └── ... (routes, controllers)
│   │   └── package.json          # ✏️ UPDATED: Dependencies
│   │
│   ├── core-service/             # ✏️ UPDATED (similar to auth-service)
│   └── iot-service/              # ✏️ UPDATED (similar to auth-service)
│
└── database/
    ├── schema.sql                # 🗑️ DEPRECATED: Use Prisma schema instead
    └── seed-data.sql             # Still used for initial data
```

## 🔧 Setup Instructions

### 1. Install Dependencies

```bash
# Install all dependencies (includes new packages)
npm install

# Build shared packages
npm run build:packages
```

### 2. Configure Environment

Ensure your `.env` file has the DATABASE_URL:

```env
DATABASE_URL="postgresql://sustainpro:password@localhost:5433/sustainpro?schema=public"
```

### 3. Generate Prisma Client

```bash
# Navigate to shared-database package
cd packages/shared-database

# Generate Prisma client from schema
npm run prisma:generate

# Or from root
npm run prisma:generate --workspace=@sustainpro/shared-database
```

### 4. Push Schema to Database (Development)

If you have an existing database:

```bash
# Introspect existing database and generate schema
cd packages/shared-database
npx prisma db pull

# Or push Prisma schema to database (overwrites)
npm run prisma:push
```

### 5. Start Services

```bash
# From root directory
npm run dev

# Or individually
npm run dev --filter=@sustainpro/auth-service
npm run dev --filter=@sustainpro/core-service
npm run dev --filter=@sustainpro/iot-service
```

## 📚 Accessing API Documentation

Once services are running:

### Auth Service
- **Swagger UI**: http://localhost:5000/api/v1/docs
- **Swagger JSON**: http://localhost:5000/api/v1/swagger.json

### Core Service
- **Swagger UI**: http://localhost:5001/api/v1/docs
- **Swagger JSON**: http://localhost:5001/api/v1/swagger.json

### IoT Service
- **Swagger UI**: http://localhost:5002/api/v1/docs
- **Swagger JSON**: http://localhost:5002/api/v1/swagger.json

### Via nginx (Production-like)
- **All Services**: http://localhost:8080/api/v1/docs

## 💻 Using Prisma in Your Code

### Basic Usage

```typescript
import { getPrismaClient } from '@sustainpro/shared-database';

const prisma = getPrismaClient();

// Find users
const users = await prisma.user.findMany({
  where: { isActive: true },
  include: { organization: true }
});

// Create organization
const org = await prisma.organization.create({
  data: {
    name: 'New Organization',
    slug: 'new-org',
    planTier: 'BASIC'
  }
});

// Update user
await prisma.user.update({
  where: { id: userId },
  data: { lastLogin: new Date() }
});

// Transaction
await prisma.$transaction([
  prisma.user.create({ data: { ... } }),
  prisma.auditLog.create({ data: { ... } })
]);
```

### Repository Pattern Example

```typescript
// src/repositories/user.repository.ts
import { getPrismaClient, User, Prisma } from '@sustainpro/shared-database';

export class UserRepository {
  private prisma = getPrismaClient();

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id },
      include: { organization: true }
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email }
    });
  }

  async create(data: Prisma.UserCreateInput): Promise<User> {
    return this.prisma.user.create({ data });
  }

  async update(id: string, data: Prisma.UserUpdateInput): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data
    });
  }

  async delete(id: string): Promise<User> {
    return this.prisma.user.delete({ where: { id } });
  }
}
```

### Service Layer Example

```typescript
// src/services/user.service.ts
import { UserRepository } from '../repositories/user.repository';
import argon2 from 'argon2';

export class UserService {
  private userRepo = new UserRepository();

  async createUser(email: string, password: string, organizationId: string) {
    const passwordHash = await argon2.hash(password);
    
    return this.userRepo.create({
      email,
      passwordHash,
      organization: { connect: { id: organizationId } }
    });
  }

  async authenticateUser(email: string, password: string) {
    const user = await this.userRepo.findByEmail(email);
    
    if (!user) {
      throw new Error('User not found');
    }

    const isValid = await argon2.verify(user.passwordHash, password);
    
    if (!isValid) {
      throw new Error('Invalid password');
    }

    return user;
  }
}
```

## 📝 Adding Swagger Documentation to Routes

### Basic Route Documentation

```typescript
/**
 * @swagger
 * /api/v1/users:
 *   get:
 *     summary: Get all users
 *     tags: [Users]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: List of users
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/User'
 *                 meta:
 *                   $ref: '#/components/schemas/PaginationMeta'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get('/', authenticateToken, userController.getAll);
```

### Define Schemas

```typescript
/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         email:
 *           type: string
 *           format: email
 *         fullName:
 *           type: string
 *         isActive:
 *           type: boolean
 *         organization:
 *           $ref: '#/components/schemas/Organization'
 */
```

## 🔄 Migration from pg Pool to Prisma

### Old Way (pg pool)

```typescript
// ❌ OLD
import { pool } from './db';

const result = await pool.query(
  'SELECT * FROM sps_users WHERE email = $1',
  [email]
);
const user = result.rows[0];
```

### New Way (Prisma)

```typescript
// ✅ NEW
import { getPrismaClient } from '@sustainpro/shared-database';

const prisma = getPrismaClient();
const user = await prisma.user.findUnique({
  where: { email }
});
```

## 🗃️ Database Management Commands

### Development

```bash
# Generate Prisma client after schema changes
npm run prisma:generate --workspace=@sustainpro/shared-database

# Push schema to database (no migration files)
npm run prisma:push --workspace=@sustainpro/shared-database

# Open Prisma Studio (GUI for database)
npm run prisma:studio --workspace=@sustainpro/shared-database

# Create migration
npm run prisma:migrate --workspace=@sustainpro/shared-database
# Enter migration name when prompted
```

### Production

```bash
# Deploy pending migrations
npm run prisma:migrate:deploy --workspace=@sustainpro/shared-database
```

## 🎨 Prisma Studio

Prisma Studio is a visual database browser:

```bash
cd packages/shared-database
npm run prisma:studio
```

Opens at: http://localhost:5555

## 🧪 Testing with Prisma

```typescript
import { getPrismaClient } from '@sustainpro/shared-database';

describe('User Service', () => {
  const prisma = getPrismaClient();

  beforeEach(async () => {
    // Clean database
    await prisma.user.deleteMany();
  });

  it('should create user', async () => {
    const user = await prisma.user.create({
      data: {
        email: 'test@example.com',
        passwordHash: 'hashed',
      }
    });

    expect(user.email).toBe('test@example.com');
  });
});
```

## 🚀 Performance Tips

### 1. Use Select to Limit Fields

```typescript
// Only fetch needed fields
const users = await prisma.user.findMany({
  select: {
    id: true,
    email: true,
    fullName: true
  }
});
```

### 2. Optimize Relations

```typescript
// Include only necessary relations
const events = await prisma.event.findMany({
  include: {
    organization: { select: { name: true } },
    departments: { where: { isActive: true } }
  }
});
```

### 3. Use Transactions for Consistency

```typescript
await prisma.$transaction(async (tx) => {
  const user = await tx.user.create({ data: userData });
  await tx.auditLog.create({ 
    data: { 
      action: 'USER_CREATED',
      actorUserId: user.id 
    } 
  });
});
```

## 🔐 Security Best Practices

### 1. Never Expose Sensitive Fields

```typescript
// ❌ BAD
const user = await prisma.user.findUnique({ where: { id } });
return user; // Exposes passwordHash!

// ✅ GOOD
const user = await prisma.user.findUnique({
  where: { id },
  select: {
    id: true,
    email: true,
    fullName: true,
    // passwordHash excluded
  }
});
```

### 2. Use Middleware for Logging

```typescript
// In shared-database/src/index.ts
prisma.$use(async (params, next) => {
  const before = Date.now();
  const result = await next(params);
  const after = Date.now();
  
  console.log(`Query ${params.model}.${params.action} took ${after - before}ms`);
  
  return result;
});
```

## 🐛 Troubleshooting

### Prisma Client Not Generated

```bash
cd packages/shared-database
npm run prisma:generate
npm run build
```

### Database Connection Failed

Check your `DATABASE_URL` in `.env`:
- Correct host and port?
- Database exists?
- User has permissions?

### Type Errors After Schema Changes

```bash
# Regenerate client
cd packages/shared-database
npm run prisma:generate

# Rebuild packages
cd ../..
npm run build:packages
```

### Swagger Not Showing

- Check if route files have JSDoc comments
- Verify `apis` path in swagger config
- Rebuild TypeScript: `npm run build`

## 📖 Additional Resources

- **Prisma Docs**: https://www.prisma.io/docs
- **Swagger Docs**: https://swagger.io/docs/
- **Prisma Best Practices**: https://www.prisma.io/docs/guides/performance-and-optimization

## ✅ Next Steps

1. **Migrate Repositories**: Update existing repository files to use Prisma
2. **Add Swagger Annotations**: Document all API endpoints
3. **Remove Old Code**: Clean up `db/` folders with pg pool code
4. **Update Tests**: Modify tests to use Prisma
5. **Production Deploy**: Test migrations in staging before production


📋 Test Credentials:
   superadmin@sustainpro.io / Admin@123 (Super Admin)
   admin@acme.com / Admin@123 (Org Admin)
   manager@acme.com / Admin@123 (Event Manager)
   operator@acme.com / Admin@123 (Operator)

