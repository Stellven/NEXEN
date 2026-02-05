#!/bin/bash

# NEXEN Development Start Script

echo "🧠 Starting NEXEN Development Environment..."

# Check for .env file
if [ ! -f ".env" ]; then
    echo "⚠️  No .env file found. Creating from template..."
    cp .env.example .env
    echo "📝 Please edit .env and add your API keys."
fi

# Option 1: Start with Docker Compose
if command -v docker-compose &> /dev/null; then
    echo "🐳 Starting with Docker Compose..."
    docker-compose up -d
    echo ""
    echo "✅ Services started!"
    echo "   Frontend: http://localhost:3000"
    echo "   Backend:  http://localhost:8000"
    echo "   API Docs: http://localhost:8000/docs"
    echo ""
    echo "📋 To view logs: docker-compose logs -f"
    echo "🛑 To stop: docker-compose down"
else
    # Option 2: Start without Docker
    echo "🔧 Starting without Docker..."
    echo ""
    echo "1. Start Backend:"
    echo "   cd web/backend"
    echo "   pip install -e ."
    echo "   uvicorn app.main:app --reload"
    echo ""
    echo "2. Start Frontend (new terminal):"
    echo "   cd web/frontend"
    echo "   npm install"
    echo "   npm run dev"
    echo ""
    echo "3. Open http://localhost:3000"
fi
