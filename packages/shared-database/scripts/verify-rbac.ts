/**
 * Quick verification script for RBAC data
 * Run: npx ts-node scripts/verify-rbac.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🔍 Verifying RBAC Data...\n');

    // 1. Check Roles
    const roles = await prisma.sps_roles.findMany({
        orderBy: { level: 'asc' },
        select: { code: true, name: true, level: true, is_system: true }
    });
    console.log('📋 ROLES:', roles.length, 'total');
    roles.forEach(r => console.log(`   Level ${r.level}: ${r.code} - ${r.name}`));

    // 2. Check Permissions
    const permissions = await prisma.sps_permissions.findMany({
        orderBy: { category: 'asc' },
        select: { code: true, name: true, category: true }
    });
    console.log('\n🔐 PERMISSIONS:', permissions.length, 'total');
    permissions.forEach(p => console.log(`   [${p.category}] ${p.code} - ${p.name}`));

    // 3. Check Role-Permission Mappings
    const rolePermissions = await prisma.sps_role_permissions.findMany({
        include: {
            sps_permissions: { select: { code: true } }
        }
    });

    // Group by role
    const mappingsByRole: Record<string, string[]> = {};
    rolePermissions.forEach(rp => {
        if (!mappingsByRole[rp.role]) mappingsByRole[rp.role] = [];
        mappingsByRole[rp.role].push(rp.sps_permissions.code);
    });

    console.log('\n🔗 ROLE-PERMISSION MAPPINGS:', rolePermissions.length, 'total');
    Object.entries(mappingsByRole).forEach(([role, perms]) => {
        console.log(`   ${role}: ${perms.join(', ')}`);
    });

    // 4. Check Role Assignments
    const assignments = await prisma.sps_role_assignments.findMany({
        include: {
            sps_users: { select: { email: true, full_name: true } }
        }
    });
    console.log('\n👥 ROLE ASSIGNMENTS:', assignments.length, 'total');
    assignments.forEach(a => {
        console.log(`   ${a.sps_users.email} -> ${a.role}`);
    });

    // 5. Test: Check permissions for a specific user
    const testEmail = 'admin@acme.com';
    const testUser = await prisma.sps_users.findUnique({
        where: { email: testEmail },
        select: { id: true }
    });

    if (testUser) {
        const userPermissions = await prisma.$queryRaw<{ code: string }[]>`
            SELECT DISTINCT p.code
            FROM sps_permissions p
            INNER JOIN sps_role_permissions rp ON p.id = rp.permission_id
            INNER JOIN sps_role_assignments ra ON rp.role = ra.role
            WHERE ra.user_id = ${testUser.id}::uuid
        `;
        console.log(`\n🧪 TEST: Permissions for ${testEmail}:`);
        console.log(`   ${userPermissions.map(p => p.code).join(', ')}`);
    }

    console.log('\n✅ Verification complete!');
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
