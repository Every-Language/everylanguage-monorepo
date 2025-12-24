#!/bin/bash

# EAS Development Build Script
# This script helps build development versions of the app

set -e

echo "🚀 Starting EAS Development Build..."

# Check if EAS CLI is installed
if ! command -v eas &> /dev/null; then
    echo "❌ EAS CLI is not installed. Please install it with: npm install -g @expo/eas-cli"
    exit 1
fi

# Check if user is logged in
if ! eas whoami &> /dev/null; then
    echo "❌ Not logged in to EAS. Please run: eas login"
    exit 1
fi

# Validate project configuration
echo "📋 Validating project configuration..."
npx expo config --type introspect > /dev/null 2>&1 || {
    echo "❌ Project configuration validation failed"
    exit 1
}

# Check for common issues
echo "🔍 Checking for common build issues..."

# Check if app.json is valid
if ! npx expo config --type introspect &> /dev/null; then
    echo "❌ app.json configuration is invalid"
    exit 1
fi

# Check if all required dependencies are installed
if [ ! -f "node_modules/.package-lock.json" ] && [ ! -f "yarn.lock" ]; then
    echo "⚠️  Dependencies not installed. Installing..."
    npm install
fi

# Build for development
echo "🏗️  Building development version..."

# Ask user for platform
echo "Select platform:"
echo "1) iOS (Simulator)"
echo "2) Android (APK)"
echo "3) Both"
read -p "Enter choice (1-3): " choice

case $choice in
    1)
        echo "📱 Building for iOS Simulator..."
        eas build --profile development --platform ios
        ;;
    2)
        echo "🤖 Building for Android..."
        eas build --profile development --platform android
        ;;
    3)
        echo "📱🤖 Building for both platforms..."
        eas build --profile development
        ;;
    *)
        echo "❌ Invalid choice"
        exit 1
        ;;
esac

echo "✅ Build completed successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Download the build from the EAS dashboard"
echo "2. Install on your device/simulator"
echo "3. Test the app functionality"
echo ""
echo "🔧 For troubleshooting:"
echo "- Check the build logs in the EAS dashboard"
echo "- Run 'npx expo doctor' to check for issues"
echo "- Ensure all permissions are properly configured" 