# Botpress Integration - Quick Start Guide

## For Developers

### Add Botpress to Your Screen - 30 seconds

#### Option 1: Simple Component Usage (Recommended)

```typescript
import React from 'react';
import { View } from 'react-native';
import { Platform } from 'react-native';
import BotpressChat from '../components/BotpressChat';
import { BOTPRESS_CONFIG } from '../config/BotpressConfig';

export default function MyScreen() {
  return (
    <View>
      {/* Your content */}
      
      {/* Add Botpress - 3 lines of code */}
      {Platform.OS === 'web' && (
        <BotpressChat context="login" enabled={true} />
      )}
    </View>
  );
}
```

#### Option 2: Using Custom Hook

```typescript
import React from 'react';
import { useBotpress } from '../hooks/useBotpress';

export default function MyScreen() {
  const { isInitialized, show, hide } = useBotpress({
    context: 'support',
  });

  return (
    <div>
      {isInitialized && (
        <button onClick={show}>Show Help</button>
      )}
    </div>
  );
}
```

#### Option 3: Manual Control

```typescript
import React, { useEffect } from 'react';
import BotpressService from '../services/BotpressService';
import { BOTPRESS_CONFIG } from '../config/BotpressConfig';

export default function MyScreen() {
  useEffect(() => {
    BotpressService.initialize({
      configUrl: BOTPRESS_CONFIG.configUrl,
      lazyLoadDelay: 1500,
    });
  }, []);

  return (
    <button onClick={() => BotpressService.show()}>
      Contact Support
    </button>
  );
}
```

## Configuration by Context

### Login / Authentication Pages

```typescript
<BotpressChat
  context="login"
  lazyLoadDelay={1500}
  showWelcomeDelay={4000}
/>
// Message: "Need help logging in? I'm here to assist! 🤖"
```

### KYC / Verification Pages

```typescript
<BotpressChat
  context="kyc"
  lazyLoadDelay={1000}
  showWelcomeDelay={3000}
/>
// Message: "Need help with KYC? I can guide you through it. 📋"
```

### Support / General Pages

```typescript
<BotpressChat
  context="support"
  lazyLoadDelay={500}
  showWelcomeDelay={2000}
/>
// Message: "How can we help you today? 👋"
```

## Common Patterns

### Pattern 1: Show on User Scroll

```typescript
useEffect(() => {
  const handleScroll = () => {
    const scrollPercentage = (window.scrollY / 
      (document.documentElement.scrollHeight - window.innerHeight)) * 100;
    
    if (scrollPercentage > 50) {
      BotpressService.show();
    }
  };

  window.addEventListener('scroll', handleScroll);
  return () => window.removeEventListener('scroll', handleScroll);
}, []);
```

### Pattern 2: Show After Time Delay

```typescript
useEffect(() => {
  const timer = setTimeout(() => {
    BotpressService.show();
  }, 5000); // Show after 5 seconds

  return () => clearTimeout(timer);
}, []);
```

### Pattern 3: Show on User Action

```typescript
const handleNeedHelp = () => {
  BotpressService.show();
  useBotpressWelcomeMessage(); // Trigger welcome
};

return <button onClick={handleNeedHelp}>Need Help?</button>;
```

### Pattern 4: Show on Error

```typescript
const [error, setError] = useState(null);

useEffect(() => {
  if (error) {
    BotpressService.show();
    useBotpressWelcomeMessage();
  }
}, [error]);
```

### Pattern 5: Conditional Display

```typescript
{isLoaded ? (
  <BotpressChat context="login" />
) : (
  <Spinner /> // Show loading while bootstrapping
)}
```

## Environment-Specific Config

### Development

```typescript
<BotpressChat
  debug={true}
  lazyLoadDelay={0}  // Immediate loading
/>
// Check console for detailed logs
```

### Production

```typescript
<BotpressChat
  debug={false}
  lazyLoadDelay={1500}  // Let page settle
/>
```

## Error Handling

```typescript
const { error } = useBotpress({
  onError: (error) => {
    console.error('Botpress failed:', error);
    // Show fallback UI
    showContactForm();
    // Or send to monitoring
    logErrorToSentry(error);
  },
});

if (error) {
  return <div>Unable to load chat. Try calling us at 1-800-HELP</div>;
}
```

## Testing

### Unit Test Example

```typescript
import { render, screen, waitFor } from '@testing-library/react';
import BotpressChat from '../BotpressChat';

describe('BotpressChat', () => {
  it('should initialize on mount', async () => {
    const { container } = render(
      <BotpressChat enabled={true} />
    );
    
    expect(container.querySelector('.bp-chat-container')).toBeInTheDocument();
  });

  it('should not render on web=false', () => {
    const { container } = render(
      <BotpressChat enabled={false} />
    );
    
    expect(container.firstChild).toBeNull();
  });
});
```

## Performance Tips

1. **Delay Loading**
   ```typescript
   lazyLoadDelay={1500}  // Don't load immediately
   ```

2. **Conditional Rendering**
   ```typescript
   {Platform.OS === 'web' && <BotpressChat />}
   ```

3. **Defer Welcome Message**
   ```typescript
   showWelcomeDelay={4000}  // Let user settle in
   ```

4. **Use React.memo** (if component re-renders often)
   ```typescript
   export default React.memo(BotpressChat);
   ```

## Styling Customization

### Change Button Color

Edit `src/components/BotpressChat.css`:

```css
.bp-launcher {
  background: linear-gradient(135deg, #YOUR_COLOR 0%, #YOUR_COLOR_DARK 100%);
}
```

### Change Window Position

```typescript
// In BotpressConfig.ts
ui: {
  position: {
    bottom: 20,  // Change this
    right: 20,   // Or this
  },
}
```

### Change Welcome Message

```typescript
welcomeMessage: {
  text: 'Your custom message here! 👋',
  delayMs: 4000,
}
```

## Debugging Checklist

- [ ] Script loading? Check Network tab in DevTools
- [ ] Platform check? Verify `Platform.OS === 'web'`
- [ ] CSS imported? Check `import './BotpressChat.css'`
- [ ] Config valid? Verify configUrl is accessible
- [ ] Console errors? Enable `debug={true}`
- [ ] Dark mode? Test with `prefers-color-scheme: dark`

## FAQ

**Q: Does this work on mobile?**  
A: Only on web. Mobile apps would need custom native implementation.

**Q: Can I customize messages?**  
A: Yes! Update `welcomeMessage` in `BotpressConfig.ts`

**Q: How do I hide the chatbot?**  
A: Call `BotpressService.hide()` or `hide()` from hook

**Q: What if Botpress fails to load?**  
A: Use `onError` callback to show fallback UI

**Q: Can I track analytics?**  
A: Yes! Integrate with your analytics tool in `onInitialized`

## Next Steps

1. **Choose integration pattern** - Pick from Option 1, 2, or 3
2. **Add to your screen** - Copy 3 lines of code
3. **Test** - Check browser console for logs
4. **Customize** - Adjust delays and messages
5. **Deploy** - Push to production

## Full Example

```typescript
import React, { useState } from 'react';
import { View, Text, Button, Platform } from 'react-native';
import BotpressChat from '../components/BotpressChat';
import { useBotpress } from '../hooks/useBotpress';

export default function SupportScreen() {
  const { isInitialized, show } = useBotpress({
    context: 'support',
    onInitialized: () => console.log('Support chat ready'),
    onError: (error) => console.error('Chat failed:', error),
  });

  return (
    <>
      <View>
        <Text>Welcome to Support</Text>
        
        {isInitialized && (
          <Button
            title="Chat with us"
            onPress={show}
          />
        )}
      </View>

      {Platform.OS === 'web' && (
        <BotpressChat context="support" />
      )}
    </>
  );
}
```

---

**Need Help?** See `BOTPRESS_INTEGRATION_GUIDE.md` for detailed documentation.
