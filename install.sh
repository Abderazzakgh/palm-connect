#!/bin/bash

# Vercel Install Script - Skip Rollup Native Modules
echo "🔧 Installing dependencies..."

# Set environment variables
export NPM_CONFIG_OPTIONAL=false
export SKIP_INSTALL_SIMPLE_UPDATE_NOTIFIER=true

# Install without optional dependencies
npm install --legacy-peer-deps --prefer-offline --no-audit --no-fund

echo "✅ Dependencies installed!"
