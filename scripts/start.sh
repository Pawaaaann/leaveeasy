#!/bin/bash
set -e

# Check if build exists
if [ ! -f "dist/index.js" ] || [ ! -d "dist/public" ]; then
    echo "❌ Build artifacts not found. Please run 'npm run build' first."
    exit 1
fi

echo "🚀 Starting the production server..."
echo "📂 Serving frontend from: dist/public/"
echo "🌐 Backend API server: dist/index.js"
echo "🔗 Port: ${PORT:-5000}"

# Start the production server
node dist/index.js