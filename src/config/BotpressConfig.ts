/**
 * Botpress Configuration
 * Centralized configuration for Botpress Webchat integration
 * Customize settings here for consistent implementation across the app
 */

export const BOTPRESS_CONFIG = {
  // Botpress Platform Configuration
  configUrl: 'https://files.bpcontent.cloud/2026/03/18/05/20260318051107-I20IO0FA.json',

  // Script Loading
  scriptUrl: 'https://cdn.botpress.cloud/webchat/v3.6/inject.js',
  scriptVersion: 'v3.6',

  // Initialization Timing
  lazyLoadDelay: 1500, // Delay before loading the Botpress script (ms)
  showWelcomeDelay: 4000, // Delay before showing welcome message (ms)

  // Feature Flags
  features: {
    enableWelcomeMessage: true,
    enableWelcomeDelay: true,
    enableDebugMode: false,
    enableEventTracking: true,
    enableServiceWorker: true,
  },

  // UI Customization
  ui: {
    position: {
      bottom: 20,
      right: 20,
    },
    launcherSize: 60,
    windowWidth: 420,
    windowHeight: 600,
    borderRadius: 16,
    mobileWindowHeight: '70vh',
    mobileBottomPosition: 16,
    mobileRightPosition: 16,
  },

  // Theme Colors (matches app theme)
  theme: {
    primaryColor: '#0d6cf2',
    primaryColorDark: '#0052cc',
    textColor: '#111111',
    textSecondaryColor: '#666666',
    backgroundColor: '#ffffff',
    surfaceColor: '#f5f5f5',
    borderColor: '#e0e0e0',
    shadowColor: 'rgba(0, 0, 0, 0.12)',
  },

  // Welcome Message Configuration
  welcomeMessage: {
    text: 'Need help logging in? I\'m here to assist! 🤖',
    delayMs: 4000,
    enabled: true,
  },

  // Messages
  messages: {
    initialMessage: 'Welcome to GigShield Support!',
    connectionError: 'Unable to connect to support. Please try again later.',
    loadingMessage: 'Loading support...',
  },

  // Platform Detection
  supportedPlatforms: ['web'],
  excludePlatforms: ['ios', 'android'],

  // Performance Settings
  performance: {
    enableLazyLoading: true,
    enableServiceWorker: true,
    preloadScripts: true,
    scriptTimeout: 10000, // Timeout for script loading (ms)
  },

  // Analytics & Events
  analytics: {
    enableEventTracking: true,
    trackUserInteractions: true,
    trackOpenClose: true,
  },

  // Accessibility
  accessibility: {
    enableKeyboardNavigation: true,
    enableScreenReaderSupport: true,
    enableHighContrast: true,
    enableReducedMotion: true,
  },

  // Browser Compatibility
  compatibility: {
    requiresModernBrowser: true,
    minChromeVersion: 90,
    minFirefoxVersion: 88,
    minSafariVersion: 14,
    fallbackSupport: true,
  },
};

/**
 * Get Botpress configuration for specific context
 * @param context - The context name (e.g., 'login', 'support', 'checkout')
 */
export const getBotpressConfig = (context: string = 'default'): typeof BOTPRESS_CONFIG => {
  const contextConfigs: Record<string, Partial<typeof BOTPRESS_CONFIG>> = {
    login: {
      lazyLoadDelay: 1500,
      showWelcomeDelay: 4000,
      welcomeMessage: {
        text: 'Need help logging in? I\'m here to assist! 🤖',
        delayMs: 4000,
        enabled: true,
      },
    },
    kyc: {
      lazyLoadDelay: 1000,
      showWelcomeDelay: 3000,
      welcomeMessage: {
        text: 'Need help with KYC? I can guide you through it. 📋',
        delayMs: 3000,
        enabled: true,
      },
    },
    support: {
      lazyLoadDelay: 500,
      showWelcomeDelay: 2000,
      welcomeMessage: {
        text: 'How can we help you today? 👋',
        delayMs: 2000,
        enabled: true,
      },
    },
  };

  const contextConfig = contextConfigs[context];
  if (contextConfig) {
    return {
      ...BOTPRESS_CONFIG,
      ...contextConfig,
    };
  }

  return BOTPRESS_CONFIG;
};

/**
 * Validate if Botpress is supported on the current platform
 */
export const isBotpressSupported = (): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }

  return BOTPRESS_CONFIG.supportedPlatforms.includes('web');
};

/**
 * Check if the browser is compatible with Botpress
 */
export const isBrowserCompatible = (): boolean => {
  if (typeof navigator === 'undefined') {
    return false;
  }

  // In production, you would implement actual browser detection here
  // For now, just check if it's a modern browser
  return !window.navigator.userAgent.includes('MSIE');
};

/**
 * Get theme colors object
 */
export const getThemeColors = () => {
  return {
    primary: BOTPRESS_CONFIG.theme.primaryColor,
    primaryDark: BOTPRESS_CONFIG.theme.primaryColorDark,
    text: BOTPRESS_CONFIG.theme.textColor,
    textSecondary: BOTPRESS_CONFIG.theme.textSecondaryColor,
    background: BOTPRESS_CONFIG.theme.backgroundColor,
    surface: BOTPRESS_CONFIG.theme.surfaceColor,
    border: BOTPRESS_CONFIG.theme.borderColor,
    shadow: BOTPRESS_CONFIG.theme.shadowColor,
  };
};

/**
 * Get responsive layout values
 */
export const getResponsiveLayout = (screenWidth: number) => {
  if (screenWidth <= 480) {
    return {
      windowWidth: 'calc(100vw - 24px)',
      windowHeight: 'calc(100vh - 80px)',
      launcherSize: 52,
      bottom: 12,
      right: 12,
    };
  } else if (screenWidth <= 768) {
    return {
      windowWidth: 'calc(100vw - 32px)',
      windowHeight: 'calc(100vh - 100px)',
      launcherSize: 56,
      bottom: 16,
      right: 16,
    };
  }

  return {
    windowWidth: BOTPRESS_CONFIG.ui.windowWidth,
    windowHeight: BOTPRESS_CONFIG.ui.windowHeight,
    launcherSize: BOTPRESS_CONFIG.ui.launcherSize,
    bottom: BOTPRESS_CONFIG.ui.position.bottom,
    right: BOTPRESS_CONFIG.ui.position.right,
  };
};

export default BOTPRESS_CONFIG;
