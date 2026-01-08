#!/usr/bin/env node

/**
 * SustainPro Setup Script
 * 
 * Automates initial project setup including:
 * - Dependency installation
 * - Prisma client generation
 * - Package building
 * - Environment validation
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function execCommand(command, description) {
  log(`\n${description}...`, 'cyan');
  try {
    execSync(command, { stdio: 'inherit', cwd: __dirname });
    log(`✓ ${description} completed`, 'green');
    return true;
  } catch (error) {
    log(`✗ ${description} failed`, 'red');
    return false;
  }
}

function checkFile(filePath, description) {
  if (fs.existsSync(filePath)) {
    log(`✓ ${description} exists`, 'green');
    return true;
  } else {
    log(`✗ ${description} not found`, 'red');
    return false;
  }
}

async function main() {
  log('\n╔══════════════════════════════════════════════════════╗', 'blue');
  log('║     SustainPro Project Setup                        ║', 'blue');
  log('╚══════════════════════════════════════════════════════╝', 'blue');

  // Check Node version
  log('\n📦 Checking Node.js version...', 'cyan');
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.split('.')[0].substring(1));
  if (majorVersion >= 20) {
    log(`✓ Node.js ${nodeVersion} detected`, 'green');
  } else {
    log(`✗ Node.js 20+ required, you have ${nodeVersion}`, 'red');
    process.exit(1);
  }

  // Check environment file
  log('\n🔧 Checking environment configuration...', 'cyan');
  const envPath = path.join(__dirname, '.env');
  const envExamplePath = path.join(__dirname, '.env.example');
  
  if (!checkFile(envPath, '.env file')) {
    if (checkFile(envExamplePath, '.env.example')) {
      log('\n⚠️  Please copy .env.example to .env and configure it', 'yellow');
      log('   Run: cp .env.example .env', 'yellow');
    }
  }

  // Install dependencies
  if (!execCommand('npm install', '📥 Installing dependencies')) {
    process.exit(1);
  }

  // Generate Prisma client
  log('\n🔨 Setting up Prisma...', 'cyan');
  const prismaPath = path.join(__dirname, 'packages', 'shared-database');
  if (fs.existsSync(prismaPath)) {
    if (!execCommand(
      'npm run prisma:generate --workspace=@sustainpro/shared-database',
      '⚡ Generating Prisma client'
    )) {
      log('⚠️  Prisma generation failed, but continuing...', 'yellow');
    }
  } else {
    log('⚠️  shared-database package not found', 'yellow');
  }

  // Build packages
  if (!execCommand('npm run build:packages', '🏗️  Building shared packages')) {
    log('⚠️  Package build failed, but continuing...', 'yellow');
  }

  // Summary
  log('\n╔══════════════════════════════════════════════════════╗', 'green');
  log('║     Setup Complete!                                  ║', 'green');
  log('╚══════════════════════════════════════════════════════╝', 'green');

  log('\n📚 Next steps:', 'cyan');
  log('   1. Configure your .env file with database credentials', 'yellow');
  log('   2. Start Docker services: cd docker && docker-compose up -d', 'yellow');
  log('   3. Initialize database: psql -U sustainpro -d sustainpro -f database/schema.sql', 'yellow');
  log('   4. Start development: npm run dev', 'yellow');
  log('\n📖 Documentation:');
  log('   - Setup Guide: docs/SETUP.md');
  log('   - Prisma & Swagger: docs/PRISMA_SWAGGER_GUIDE.md');
  log('   - API Docs (after start): http://localhost:5000/api/v1/docs');
  log('\n🎉 Happy coding!\n');
}

main().catch((error) => {
  log(`\n✗ Setup failed: ${error.message}`, 'red');
  process.exit(1);
});
