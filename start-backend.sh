#!/bin/bash

# SustainPro - Start Backend Server
echo "🚀 Starting SustainPro Backend..."

cd backend

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "⚠️  Warning: .env file not found!"
    echo "📝 Please create .env file from .env.example"
    echo ""
    echo "Example:"
    echo "  cp .env.example .env"
    echo "  # Edit .env with your database credentials"
    echo ""
    exit 1
fi

echo "✅ Starting backend server on port 5000..."
npm run dev
