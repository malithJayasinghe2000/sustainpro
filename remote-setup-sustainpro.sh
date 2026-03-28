#!/bin/bash
set -e

echo "====================================="
echo "   SustainPro Remote Server Deploy"
echo "====================================="

# Check and install Docker if missing
if ! command -v docker &> /dev/null; then
    echo "Installing Docker..."
    curl -fsSL https://get.docker.com | sh
else
    echo "Docker is already installed."
fi

# Clone or update
if [ ! -d "/opt/sustainpro" ]; then
    echo "Cloning repository..."
    git clone https://github.com/malithJayasinghe2000/sustainpro.git /opt/sustainpro
else
    echo "Updating repository..."
    cd /opt/sustainpro
    git fetch origin
    git reset --hard origin/sandaru-fix
fi

cd /opt/sustainpro

# Setup Environment variables
if [ ! -f .env ]; then
    echo "Setting up .env file..."
    cp .env.example .env
fi

# Fix collision for Traefik ports 80/443 (since another project uses them)
cd docker
sed -i 's/- "80:80"/- "8888:80"/g' docker-compose.production.yml
sed -i 's/- "443:443"/- "8443:443"/g' docker-compose.production.yml
# Fix acme email warning or error
sed -i 's/${ACME_EMAIL}/admin@example.com/g' docker-compose.production.yml
cd ..

# Deploy
echo "Running production deployment script..."
chmod +x scripts/deploy-production.sh
./scripts/deploy-production.sh

echo "✅ Deployment finished! API Gateway should be accessible on port 8888."