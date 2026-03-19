#!/bin/bash

# Run Botpress Chatbot on Expo Web
# Usage: ./run-expo-web.sh

echo "🚀 Starting RideSafe-AI with Botpress Chatbot..."
echo ""

cd "$(dirname "$0")" || exit 1

echo "📦 Running: npx expo start"
echo ""
echo "When Expo starts, you'll see:"
echo "  › Press w to open web"
echo "  › Press i to open iOS simulator"
echo "  › Press a to open Android emulator"
echo ""
echo "👉 Press 'w' to launch the web client with Botpress chatbot"
echo ""
echo "💡 Tips:"
echo "   - Open DevTools (F12) to see initialization logs"
echo "   - Look for blue floating button in bottom-right corner"
echo "   - Check console for [BotpressService] messages"
echo ""

npx expo start
