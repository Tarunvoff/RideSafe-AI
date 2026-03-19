#!/bin/bash

# Installation script for Botpress Multi-Platform Support
# Run this to install required dependencies

set -e  # Exit on error

echo "🤖 Installing Botpress Multi-Platform Dependencies..."
echo ""

# Check if in correct directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found!"
    echo "   Please run this script from the RideSafe-AI root directory"
    exit 1
fi

# Install react-native-webview
echo "📦 Installing react-native-webview..."
npm install react-native-webview

# Also install via expo for compatibility
echo "📦 Installing with Expo..."
expo install react-native-webview

echo ""
echo "✅ Installation Complete!"
echo ""
echo "Now you can run Botpress on all platforms:"
echo "  🌐 Web:     npx expo start  →  Press 'w'"
echo "  📱 iOS:     npx expo start  →  Press 'i'"
echo "  🤖 Android: npx expo start  →  Press 'a'"
echo ""
echo "See BOTPRESS_MOBILE_SETUP.md for detailed instructions"
