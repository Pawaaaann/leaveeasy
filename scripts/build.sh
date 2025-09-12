#!/bin/bash
set -e

echo "🏗️  Building the application..."

# Clean previous build
rm -rf dist

echo "📦 Building frontend with Vite..."
vite build

echo "🔧 Building backend with esbuild..."
npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist

echo "✅ Build completed successfully!"
echo "📁 Frontend: dist/public/"
echo "📁 Backend: dist/index.js"