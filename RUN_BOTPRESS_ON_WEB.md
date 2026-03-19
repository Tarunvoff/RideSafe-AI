# How to Run Botpress Chatbot with Expo

## Quick Start

The Botpress chatbot is **web-only** and will appear when you run the Expo web client.

### Step 1: Start Expo

```bash
cd /home/sriram/PROJECTS/GUIDEWIRE/RideSafe-AI
npx expo start
```

### Step 2: Launch Web Client

When you see the Expo menu with options:
```
› Press w to open web
› Press i to open iOS simulator
› Press a to open Android emulator
```

**Press `w`** to launch the web client in your browser.

### Step 3: View the Chatbot

Once the browser opens:
1. **Open DevTools** (F12 / Cmd+Option+I)
2. Check the **Console tab** for initialization logs
3. Look for a **blue floating button** in the **bottom-right corner** of the page

Expected console output:
```
🤖 [RideSafe-AI Botpress] Running on web platform
✅ Botpress initialized successfully
```

---

## Debugging

### If Chatbot Doesn't Appear

1. **Check Console Logs**:
   - Open DevTools Console (F12)
   - Look for messages starting with `[BotpressService]` or `[BotpressChat]`
   - Resolve any errors shown

2. **Verify Network Request**:
   - Open DevTools **Network** tab
   - Look for `inject.js` from `cdn.botpress.cloud`
   - If it fails, check your internet connection

3. **Check Bottom-Right Corner**:
   - The floating button appears in the **bottom-right corner**
   - Scroll down if needed
   - Make sure it's not hidden by other UI elements

### Common Issues

| Issue | Solution |
|-------|----------|
| Bot doesn't appear | Press `w` to launch web client (Expo start defaults to native) |
| Got "Platform is iOS/Android" error | You pressed `i` or `a` instead of `w` |
| Console shows CDN error | Check internet connection or firewall blocking cdn.botpress.cloud |
| Button hidden | The chat window might be covering it - try scrolling or closing other modals |

---

## Console Logs Explained

```javascript
// Script loading started
[BotpressService] Initializing...
  configUrl: "https://files.bpcontent.cloud/..."
  lazyLoadDelay: 1500

// CDN script loaded
[BotpressService] ✅ Script loaded from CDN

// Waiting for botpressWebChat object
[BotpressService] Waiting for botpressWebChat to be available...

// Configuration successful
[BotpressService] 🎉 botpressWebChat found, configuring...
[BotpressService] ✅ Web Chat configured successfully

// Component initialization
[BotpressChat] Component mounted
  enabled: true
  platform: "web"
  context: "login"

[BotpressChat] ✅ Botpress initialized successfully
```

---

## File Locations

| File | Purpose |
|------|---------|
| `src/components/BotpressChat.tsx` | React component |
| `src/services/BotpressService.ts` | Script loading service |
| `src/config/BotpressConfig.ts` | Configuration |
| `src/hooks/useBotpress.ts` | Custom helper hook |
| `src/screens/auth/LoginScreen.tsx` | Integration point |

---

## Advanced Debugging

### Enable Debug Mode

Edit `src/screens/auth/LoginScreen.tsx`:

```typescript
<BotpressChat
  context="login"
  debug={true}  // <- Add this
/>
```

This will log extra debugging information to the console.

### Check Window.botpressWebChat

In browser console (F12):

```javascript
// Check if script loaded
window.botpressWebChat
// Should show an object with methods like configure(), show(), hide()

// Manually show/hide
window.botpressWebChat?.show()
window.botpressWebChat?.hide()
```

### Verify Config URL

The chatbot uses this configuration URL:
```
https://files.bpcontent.cloud/2026/03/18/05/20260318051107-I20IO0FA.json
```

Test it in browser console:
```javascript
fetch('https://files.bpcontent.cloud/2026/03/18/05/20260318051107-I20IO0FA.json')
  .then(r => r.json())
  .then(console.log)
  .catch(e => console.error('Config URL Error:', e))
```

---

## Testing Flow

✅ **Expected Flow**:
1. Run `npx expo start`
2. Press `w` for web
3. Browser opens (http://localhost:8081)
4. Login page loads
5. Wait 1.5 seconds (script loads)
6. Blue floating button appears in bottom-right
7. Wait 4 seconds
8. Welcome message: "Need help logging in? 🤖"
9. Click button to open chat

---

## Mobile Web Testing

The chatbot is also responsive on mobile browsers:

```bash
# Start Expo in a way that shows the URL
npx expo start

# You'll see output like:
# To open the app in your browser, visit one of these links:
#   http://192.168.x.x:8081
#   http://localhost:8081
```

Open the URL on a mobile device to test responsive behavior.

---

## Support

If you still have issues:
1. Check all console logs
2. Verify internet connection
3. Try in an incognito/private window
4. Clear browser cache
5. Restart Expo: `Ctrl+C` and run again

See `BOTPRESS_INTEGRATION_GUIDE.md` for complete documentation.
