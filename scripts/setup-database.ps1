# SustainPro Database Setup Script
# Automates the database setup process

param(
    [string]$DBUser = "postgres",
    [string]$DBName = "sustainpro",
    [switch]$DropExisting,
    [switch]$SkipSampleData,
    [switch]$SkipVerification
)

$ErrorActionPreference = "Stop"

Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "         SustainPro Database Setup Automation" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

# Get script location
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir
$SQLDir = Join-Path $ProjectRoot "backend\sql"

# File paths
$SchemaFile = Join-Path $SQLDir "sps_schema.sql"
$SampleDataFile = Join-Path $SQLDir "sample_data.sql"
$VerifyFile = Join-Path $SQLDir "verify_setup.sql"

Write-Host "Project Root: $ProjectRoot" -ForegroundColor Gray
Write-Host "SQL Directory: $SQLDir" -ForegroundColor Gray
Write-Host ""

# Check if files exist
if (-not (Test-Path $SchemaFile)) {
    Write-Host "ERROR: Schema file not found: $SchemaFile" -ForegroundColor Red
    exit 1
}

# Check PostgreSQL service
Write-Host "Checking PostgreSQL service..." -ForegroundColor Yellow
$PostgresService = Get-Service -Name "postgresql*" -ErrorAction SilentlyContinue | Select-Object -First 1

if ($null -eq $PostgresService) {
    Write-Host "ERROR: PostgreSQL service not found. Please install PostgreSQL." -ForegroundColor Red
    exit 1
}

if ($PostgresService.Status -ne "Running") {
    Write-Host "WARNING: PostgreSQL is not running. Starting service..." -ForegroundColor Yellow
    try {
        Start-Service $PostgresService.Name
        Write-Host "OK: PostgreSQL service started" -ForegroundColor Green
    } catch {
        Write-Host "ERROR: Failed to start PostgreSQL: $_" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "OK: PostgreSQL is running" -ForegroundColor Green
}
Write-Host ""

# Check if psql is available
Write-Host "Checking psql command..." -ForegroundColor Yellow
$psqlPath = (Get-Command psql -ErrorAction SilentlyContinue).Source
if (-not $psqlPath) {
    Write-Host "ERROR: psql command not found. Please add PostgreSQL bin directory to PATH." -ForegroundColor Red
    Write-Host "   Typical location: C:\Program Files\PostgreSQL\<version>\bin" -ForegroundColor Gray
    exit 1
}
Write-Host "OK: psql found at: $psqlPath" -ForegroundColor Green
Write-Host ""

# Drop existing database if requested
if ($DropExisting) {
    Write-Host "WARNING: Dropping existing database '$DBName'..." -ForegroundColor Yellow
    $dropCmd = "DROP DATABASE IF EXISTS $DBName;"
    $output = & psql -U $DBUser -c $dropCmd 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "WARNING: Database drop failed (may not exist): $output" -ForegroundColor Yellow
    } else {
        Write-Host "OK: Database dropped" -ForegroundColor Green
    }
    Write-Host ""
}

# Create database
Write-Host "Creating database '$DBName'..." -ForegroundColor Yellow
$createCmd = "CREATE DATABASE $DBName;"
$output = & psql -U $DBUser -c $createCmd 2>&1

if ($LASTEXITCODE -ne 0) {
    if ($output -match "already exists") {
        Write-Host "WARNING: Database already exists, continuing..." -ForegroundColor Yellow
    } else {
        Write-Host "ERROR: Failed to create database: $output" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "OK: Database created" -ForegroundColor Green
}
Write-Host ""

# Create uuid extension
Write-Host "Creating UUID extension..." -ForegroundColor Yellow
$uuidCmd = "CREATE EXTENSION IF NOT EXISTS `"uuid-ossp`";"
$output = & psql -U $DBUser -d $DBName -c $uuidCmd 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "WARNING: UUID extension creation warning: $output" -ForegroundColor Yellow
} else {
    Write-Host "OK: UUID extension ready" -ForegroundColor Green
}
Write-Host ""

# Apply schema
Write-Host "Applying database schema..." -ForegroundColor Yellow
Write-Host "   File: $SchemaFile" -ForegroundColor Gray
$output = & psql -U $DBUser -d $DBName -f $SchemaFile 2>&1

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Schema application failed:" -ForegroundColor Red
    Write-Host $output -ForegroundColor Red
    exit 1
}
Write-Host "OK: Schema applied successfully" -ForegroundColor Green
Write-Host ""

# Load sample data
if (-not $SkipSampleData) {
    if (Test-Path $SampleDataFile) {
        Write-Host "Loading sample data..." -ForegroundColor Yellow
        Write-Host "   File: $SampleDataFile" -ForegroundColor Gray
        
        # First, generate password hashes
        Write-Host "   Generating password hashes..." -ForegroundColor Gray
        
        $output = & psql -U $DBUser -d $DBName -f $SampleDataFile 2>&1
        
        if ($LASTEXITCODE -ne 0) {
            Write-Host "WARNING: Sample data loading had warnings:" -ForegroundColor Yellow
            Write-Host $output -ForegroundColor Yellow
        } else {
            Write-Host "OK: Sample data loaded" -ForegroundColor Green
        }
    } else {
        Write-Host "WARNING: Sample data file not found, skipping..." -ForegroundColor Yellow
    }
    Write-Host ""
}

# Verify setup
if (-not $SkipVerification) {
    if (Test-Path $VerifyFile) {
        Write-Host "Verifying database setup..." -ForegroundColor Yellow
        Write-Host ""
        
        & psql -U $DBUser -d $DBName -f $VerifyFile
        
        if ($LASTEXITCODE -ne 0) {
            Write-Host ""
            Write-Host "WARNING: Verification completed with warnings" -ForegroundColor Yellow
        }
    } else {
        Write-Host "WARNING: Verification file not found, skipping..." -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "                   Setup Complete!" -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Database: $DBName" -ForegroundColor White
Write-Host "User:     $DBUser" -ForegroundColor White
Write-Host ""
Write-Host "Test Users (if sample data loaded):" -ForegroundColor White
Write-Host "  * admin@acme.com    / Admin@123    (Super Admin)" -ForegroundColor Gray
Write-Host "  * manager@acme.com  / Manager@123  (Manager)" -ForegroundColor Gray
Write-Host "  * operator@acme.com / Operator@123 (Operator)" -ForegroundColor Gray
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "  1. Update service .env files with database credentials" -ForegroundColor Gray
Write-Host "  2. Start services: cd services/<service> && npm run dev" -ForegroundColor Gray
Write-Host "  3. Test the system with E2E tests" -ForegroundColor Gray
Write-Host ""
Write-Host "Connection String:" -ForegroundColor White
Write-Host "  postgresql://$DBUser@localhost:5432/$DBName" -ForegroundColor Cyan
Write-Host ""
