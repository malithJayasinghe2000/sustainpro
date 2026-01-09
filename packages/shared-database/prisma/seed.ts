/**
 * Prisma Seeder for SustainPro
 * Best Practice: Uses Prisma client for type-safe seeding with proper password hashing
 * Run: npm run prisma:seed
 */


// if not get env 

// $env:DATABASE_URL="postgresql://sustainpro:sustainpro_dev@localhost:5432/sustainpro"; npx prisma studio

import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';

const prisma = new PrismaClient();

// Default password for all demo users (should be changed in production)
const DEFAULT_PASSWORD = 'Admin@123';

async function hashPassword(password: string): Promise<string> {
    return await argon2.hash(password, {
        type: argon2.argon2id,
        memoryCost: 65536,
        timeCost: 3,
        parallelism: 4
    });
}

async function main() {
    console.log('🌱 Starting database seeding...\n');

    const passwordHash = await hashPassword(DEFAULT_PASSWORD);

    // ==================================================================================
    // 1. SYSTEM SETTINGS
    // ==================================================================================
    console.log('📝 Seeding system settings...');
    await prisma.sps_system_settings.upsert({
        where: { id: 'sps_main_config' },
        update: {},
        create: {
            id: 'sps_main_config',
            category: 'global',
            site_title: 'SustainPro',
            default_timezone: 'Asia/Colombo',
            support_email: 'support@sustainpro.io',
            support_phone: '+94 11 234 5678',
        },
    });

    // ==================================================================================
    // 2. PROVIDER ORGANIZATION
    // ==================================================================================
    console.log('🏢 Seeding provider organization...');
    await prisma.sps_organizations.upsert({
        where: { id: '00000000-0000-0000-0000-000000000001' },
        update: {},
        create: {
            id: '00000000-0000-0000-0000-000000000001',
            name: 'SustainPro Platform',
            slug: 'sustainpro',
            code: 'SPS-ORG-000',
            type: 'PROVIDER',
            description: 'SustainPro IoT Platform Provider',
        },
    });

    // ==================================================================================
    // 3. DEMO CLIENT ORGANIZATION
    // ==================================================================================
    console.log('🏢 Seeding demo client organization...');
    await prisma.sps_organizations.upsert({
        where: { id: '11111111-1111-1111-1111-111111111111' },
        update: {},
        create: {
            id: '11111111-1111-1111-1111-111111111111',
            name: 'ACME Corporation',
            slug: 'acme-corporation',
            code: 'SPS-ORG-001',
            type: 'CLIENT',
            description: 'Leading technology and innovation company',
            logo_url: 'https://via.placeholder.com/200x200?text=ACME',
            plan_tier: 'ENTERPRISE',
            max_users: 50,
            max_devices: 100,
        },
    });

    // ==================================================================================
    // 4. USERS (All with hashed password: Admin@123)
    // ==================================================================================
    console.log('👤 Seeding users with hashed passwords...');

    // Super Admin
    await prisma.sps_users.upsert({
        where: { id: '00000000-0000-0000-0000-000000000002' },
        update: {},
        create: {
            id: '00000000-0000-0000-0000-000000000002',
            organization_id: null,
            code: 'SPS-USR-000',
            email: 'superadmin@sustainpro.io',
            password_hash: passwordHash,
            full_name: 'Platform Super Admin',
            is_super_admin: true,
            timezone: 'UTC',
            is_active: true,
        },
    });

    // Org Admin for ACME
    await prisma.sps_users.upsert({
        where: { id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' },
        update: {},
        create: {
            id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
            organization_id: '11111111-1111-1111-1111-111111111111',
            code: 'USR-001',
            email: 'admin@acme.com',
            password_hash: passwordHash,
            full_name: 'John Admin',
            is_super_admin: false,
            timezone: 'UTC',
            is_active: true,
        },
    });

    // Manager for ACME
    await prisma.sps_users.upsert({
        where: { id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' },
        update: {},
        create: {
            id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
            organization_id: '11111111-1111-1111-1111-111111111111',
            code: 'USR-002',
            email: 'manager@acme.com',
            password_hash: passwordHash,
            full_name: 'Jane Manager',
            is_super_admin: false,
            timezone: 'UTC',
            is_active: true,
        },
    });

    // Operator for ACME
    await prisma.sps_users.upsert({
        where: { id: 'cccccccc-cccc-cccc-cccc-cccccccccccc' },
        update: {},
        create: {
            id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
            organization_id: '11111111-1111-1111-1111-111111111111',
            code: 'USR-003',
            email: 'operator@acme.com',
            password_hash: passwordHash,
            full_name: 'Bob Operator',
            is_super_admin: false,
            timezone: 'UTC',
            is_active: true,
        },
    });

    // ==================================================================================
    // 5. PERMISSIONS
    // ==================================================================================
    console.log('🔐 Seeding permissions...');
    
    const permissions = [
        { name: 'View Dashboard', code: 'dashboard.view', description: 'View main dashboard', category: 'dashboard' },
        { name: 'View Devices', code: 'devices.view', description: 'View device list', category: 'devices' },
        { name: 'Manage Devices', code: 'devices.manage', description: 'Create, update, delete devices', category: 'devices' },
        { name: 'View Events', code: 'events.view', description: 'View events', category: 'events' },
        { name: 'Manage Events', code: 'events.manage', description: 'Create, update, delete events', category: 'events' },
        { name: 'View Users', code: 'users.view', description: 'View user list', category: 'users' },
        { name: 'Manage Users', code: 'users.manage', description: 'Create, update, delete users', category: 'users' },
        { name: 'View Reports', code: 'reports.view', description: 'View analytics and reports', category: 'reports' },
        { name: 'Manage Settings', code: 'settings.manage', description: 'Manage system settings', category: 'settings' },
        { name: 'View Telemetry', code: 'telemetry.view', description: 'View telemetry data', category: 'telemetry' },
        { name: 'Manage Alerts', code: 'alerts.manage', description: 'Create and manage alert rules', category: 'alerts' },
    ];

    for (const perm of permissions) {
        await prisma.sps_permissions.upsert({
            where: { code: perm.code },
            update: {},
            create: perm,
        });
    }

    // ==================================================================================
    // 6. ROLE ASSIGNMENTS
    // ==================================================================================
    console.log('👥 Seeding role assignments...');

    // Clear existing role assignments for these users
    await prisma.sps_role_assignments.deleteMany({
        where: {
            user_id: {
                in: [
                    '00000000-0000-0000-0000-000000000002',
                    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
                    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
                    'cccccccc-cccc-cccc-cccc-cccccccccccc',
                ]
            }
        }
    });

    // Super Admin role
    await prisma.sps_role_assignments.create({
        data: {
            user_id: '00000000-0000-0000-0000-000000000002',
            role: 'SUPER_ADMIN',
            org_id: null,
            event_id: null,
            dept_id: null,
        },
    });

    // Org Admin role for ACME admin
    await prisma.sps_role_assignments.create({
        data: {
            user_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
            role: 'ORG_ADMIN',
            org_id: '11111111-1111-1111-1111-111111111111',
            event_id: null,
            dept_id: null,
        },
    });

    // Manager role
    await prisma.sps_role_assignments.create({
        data: {
            user_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
            role: 'EVENT_MANAGER',
            org_id: '11111111-1111-1111-1111-111111111111',
            event_id: null,
            dept_id: null,
        },
    });

    // Operator role
    await prisma.sps_role_assignments.create({
        data: {
            user_id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
            role: 'OPERATOR',
            org_id: '11111111-1111-1111-1111-111111111111',
            event_id: null,
            dept_id: null,
        },
    });

    console.log('\n✅ Seeding completed successfully!');
    console.log('\n📋 Test Credentials:');
    console.log('   superadmin@sustainpro.io / Admin@123 (Super Admin)');
    console.log('   admin@acme.com / Admin@123 (Org Admin)');
    console.log('   manager@acme.com / Admin@123 (Event Manager)');
    console.log('   operator@acme.com / Admin@123 (Operator)\n');
}

main()
    .catch((e) => {
        console.error('❌ Seeding failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
