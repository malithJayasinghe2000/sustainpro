#!/bin/bash

# SustainPro - Start Frontend Server
echo "🚀 Starting SustainPro Frontend..."

cd frontend

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    echo "⚠️  Warning: .env.local file not found!"
    echo "📝 Creating from template..."
    echo "NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1" > .env.local
    echo "NEXT_PUBLIC_APP_NAME=SustainPro" >> .env.local
    echo "NEXT_PUBLIC_APP_VERSION=1.0.0" >> .env.local
    echo "✅ Created .env.local with default values"
fi

echo "✅ Starting frontend server on port 3000..."
npm run dev
