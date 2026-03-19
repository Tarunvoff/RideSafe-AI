# Botpress Chatbot - Multi-Platform Setup Guide

## Installation

The chatbot now works on **all platforms**: Web, iOS, and Android!

### Step 1: Install WebView for Mobile Support

The mobile implementation requires `react-native-webview`:

```bash
cd /home/sriram/PROJECTS/GUIDEWIRE/RideSafe-AI

# Install the WebView package
npm install react-native-webview
# or
yarn add react-native-webview

# For Expo, also run:
expo install react-native-webview
```

### Step 2: Verify Dependencies

Check that the package is added to `package.json`:

```bash
npm list react-native-webview
```

You should see: `react-native-webview@X.X.X`

---

## Running on Different Platforms

### 🌐 **Web (Expo Web)**

```bash
npx expo start
# Press 'w' to open web
```

**Result**: Blue floating button in bottom-right corner

### 📱 **iOS (Simulator)**

```bash
npx expo start
# Press 'i' to open iOS simulator
```

**Result**: Chat icon (💬) button at bottom-right, tap to open full-screen chat modal

### 🤖 **Android (Emulator)**

```bash
npx expo start
# Press 'a' to open Android emulator
```

**Result**: Chat icon (💬) button at bottom-right, tap to open full-screen chat modal

---

## Platform-Specific Features

### Web Platform
- Floating button in bottom-right corner
- Instant access to chat
- Theme-matched styling with gradients
- Welcome message after 4 seconds
- Smooth animations

### Mobile Platforms (iOS/Android)
- Chat button as floating action button (FAB)
- Tap to open full-screen modal
- Full-height chat interface
- Close button in top-right
- Header with "Chat with Support" title
- Responsive layout
- Smooth slide-up animation

---

## Console Logs

### Expected Output When Running

**Web Console Logs:**
```
🤖 [RideSafe-AI Botpress] Running on web platform
[BotpressChat] Component mounted
  platform: "web"
  context: "login"
  isWeb: true
  isMobile: false

[BotpressService] Initializing...
[BotpressService] ✅ Script loaded from CDN
[BotpressService] ✅ Web Chat configured successfully
[BotpressChat] ✅ Botpress initialized successfully
```

**Mobile Console Logs (Metro/React Native):**
```
[BotpressChat] Component mounted
  platform: "ios"
  context: "login"
  isWeb: false
  isMobile: true

[BotpressChatMobile] Component mounted
  platform: "ios"
  configUrl: "https://files.bpcontent.cloud/..."
```

---

## File Structure

```
src/
├── components/
│   ├── BotpressChat.tsx ..................... Main component (routes to web/mobile)
│   ├── BotpressChat.css ..................... Web styling
│   └── BotpressChatMobile.tsx ............... Mobile WebView implementation
├── services/
│   └── BotpressService.ts .................. Web script loading
├── hooks/
│   └── useBotpress.ts ...................... Custom hook
├── config/
│   └── BotpressConfig.ts ................... Centralized config
└── screens/auth/
    └── LoginScreen.tsx ..................... Integration point
```

---

## How It Works

### Web Implementation
1. **BotpressChat** detects platform is web
2. Uses **useBotpress** hook to load script asynchronously
3. Injects **BotpressChat.css** for styling
4. Renders Botpress floating button with animations

### Mobile Implementation
1. **BotpressChat** detects platform is iOS/Android
2. Renders **BotpressChatMobile** component
3. Shows floating chat button (FAB) using native React Native
4. On tap, opens full-screen modal with **WebView**
5. WebView loads HTML with Botpress script injected
6. Chat renders inside WebView container

---

## Debugging

### Check Platform Detection

In browser/React Native console:

**Web:**
```javascript
Platform.OS  // "web"
```

**Mobile:**
```javascript
Platform.OS  // "ios" or "android"
```

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| Chat doesn't appear on mobile | WebView package not installed | Run `npm install react-native-webview` |
| Chat button appears but modal doesn't open | WebView not rendering | Check console for errors |
| Chat content doesn't load | Network issue | Verify CDN access to `cdn.botpress.cloud` |
| Styling looks wrong on mobile | WebView CSS processing | Check DevTools in WebView (Android) |

### Inspect WebView (Android)

To debug WebView content on Android:

```bash
# In Chrome DevTools:
# chrome://inspect/#devices
# Should show your WebView
```

---

## Configuration

Both platforms use the same configuration from `BotpressConfig.ts`:

```typescript
BOTPRESS_CONFIG = {
  configUrl: 'https://files.bpcontent.cloud/...',
  lazyLoadDelay: 1500,      // Delay before loading (ms)
  showWelcomeDelay: 4000,    // Delay before welcome message (ms)
  
  ui: {
    position: { bottom: 20, right: 20 },    // FAB position
    launcherSize: 60,                        // FAB size (web)
    windowWidth: 420,                        // Chat window width
    windowHeight: 600,                       // Chat window height
  }
}
```

### Customize by Context

```typescript
// Login page
<BotpressChat context="login" />

// KYC page
<BotpressChat context="kyc" />

// Support page
<BotpressChat context="support" />
```

---

## Performance Considerations

### Web
- Script loads asynchronously (non-blocking)
- Lazy loading with 1.5s delay
- ~50KB gzipped script size
- Minimal performance impact

### Mobile
- WebView adds ~1-2MB memory
- Chat loads inside modal (hidden initially)
- Content loads when modal opens
- Smooth 300ms animations

---

## Testing Checklist

### Web
- [ ] Blue floating button appears in bottom-right
- [ ] Welcome message shows after 4 seconds
- [ ] Chat opens on click
- [ ] Responsive on mobile web
- [ ] Dark mode works

### iOS
- [ ] Chat button (💬) visible in bottom-right
- [ ] Modal opens on tap
- [ ] Full-screen layout
- [ ] Close button works
- [ ] Chat content loads

### Android
- [ ] Chat button visible in bottom-right
- [ ] Modal opens on tap
- [ ] Full-screen layout
- [ ] Close button works
- [ ] Chat content loads
- [ ] Inspect with Chrome DevTools

---

## Next Steps

1. **Install WebView**: `npm install react-native-webview`
2. **Test on Web**: `npx expo start` → Press `w`
3. **Test on iOS**: `npx expo start` → Press `i`
4. **Test on Android**: `npx expo start` → Press `a`
5. **Customize**: Edit `BotpressConfig.ts` as needed
6. **Deploy**: Build for production on all platforms

---

## Support

For issues:
1. Check console logs (F12 on web, Metro on mobile)
2. Verify `react-native-webview` is installed
3. Check internet connection (CDN access)
4. Try clearing app cache and restarting
5. Consult `BOTPRESS_INTEGRATION_GUIDE.md` for detailed docs

