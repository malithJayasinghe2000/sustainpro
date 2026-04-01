const { getPrismaClient } = require('@sustainpro/shared-database'); const prisma = getPrismaClient(); prisma.sps_system_settings.findMany().then(console.log).finally(() => prisma.$disconnect());
