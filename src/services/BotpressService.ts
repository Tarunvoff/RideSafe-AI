/**
 * BotpressService
 * Handles async loading and initialization of Botpress Webchat
 * Provides singleton pattern to ensure script is loaded only once
 */

interface BotpressConfig {
  configUrl: string;
  lazyLoadDelay?: number;
}

interface BotpressWindow extends Window {
  botpressWebChat?: any;
}

class BotpressService {
  private static instance: BotpressService;
  private isLoaded: boolean = false;
  private isLoading: boolean = false;
  private loadPromise: Promise<void> | null = null;
  private config: BotpressConfig | null = null;

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): BotpressService {
    if (!BotpressService.instance) {
      BotpressService.instance = new BotpressService();
    }
    return BotpressService.instance;
  }

  /**
   * Initialize Botpress with configuration
   * Supports lazy loading with optional delay
   */
  async initialize(config: BotpressConfig): Promise<void> {
    // Store config
    this.config = config;

    console.log('[BotpressService] Initializing...', {
      configUrl: config.configUrl,
      lazyLoadDelay: config.lazyLoadDelay,
    });

    // If already loaded, resolve immediately
    if (this.isLoaded) {
      console.log('[BotpressService] Already loaded, returning existing instance');
      return Promise.resolve();
    }

    // If currently loading, wait for the existing promise
    if (this.isLoading && this.loadPromise) {
      console.log('[BotpressService] Currently loading, waiting for existing promise');
      return this.loadPromise;
    }

    // Mark as loading
    this.isLoading = true;

    // Create load promise
    this.loadPromise = new Promise((resolve, reject) => {
      try {
        // Apply lazy load delay if specified
        const delay = config.lazyLoadDelay || 0;

        setTimeout(() => {
          this.loadBotpressScript(config, resolve, reject);
        }, delay);
      } catch (error) {
        this.isLoading = false;
        reject(error);
      }
    });

    return this.loadPromise;
  }

  /**
   * Load Botpress script asynchronously
   */
  private loadBotpressScript(
    config: BotpressConfig,
    resolve: () => void,
    reject: (error: any) => void
  ): void {
    try {
      console.log('[BotpressService] Loading script from CDN...');
      
      const script = document.createElement('script');
      script.src = 'https://cdn.botpress.cloud/webchat/v3.6/inject.js';
      script.async = true;

      script.onload = () => {
        console.log('[BotpressService] ✅ Script loaded from CDN');
        this.configureWebChat(config, resolve, reject);
      };

      script.onerror = () => {
        console.error('[BotpressService] ❌ Failed to load script from CDN');
        this.isLoading = false;
        this.isLoaded = false;
        this.loadPromise = null;
        reject(new Error('Failed to load Botpress script from https://cdn.botpress.cloud/webchat/v3.6/inject.js'));
      };

      // Append script to document head
      if (document.head) {
        document.head.appendChild(script);
      } else {
        // Fallback to body if head is not available
        document.body.appendChild(script);
      }
    } catch (error) {
      console.error('[BotpressService] Exception while loading script:', error);
      this.isLoading = false;
      reject(error);
    }
  }

  /**
   * Configure Botpress Web Chat
   */
  private configureWebChat(
    config: BotpressConfig,
    resolve: () => void,
    reject: (error: any) => void
  ): void {
    try {
      console.log('[BotpressService] Configuring Web Chat...');
      const maxRetries = 10;
      let retries = 0;

      const checkAndConfigure = () => {
        const botpressWindow = window as BotpressWindow;

        if (botpressWindow.botpressWebChat) {
          console.log('[BotpressService] 🎉 botpressWebChat found, configuring...');
          
          // Configure the webchat
          botpressWindow.botpressWebChat.configure({
            configUrl: config.configUrl,
            hideWidget: false,
            disableAnimations: false,
          });

          console.log('[BotpressService] ✅ Web Chat configured successfully');

          // Emit custom events for initialization
          this.emitEvent('botpress:initialized', { configUrl: config.configUrl });

          this.isLoaded = true;
          this.isLoading = false;
          this.loadPromise = null;
          resolve();
        } else if (retries < maxRetries) {
          retries++;
          if (retries === 1) {
            console.log('[BotpressService] Waiting for botpressWebChat to be available...');
          }
          setTimeout(checkAndConfigure, 100);
        } else {
          console.error('[BotpressService] ❌ botpressWebChat not available after retries');
          this.isLoading = false;
          this.loadPromise = null;
          reject(new Error('Botpress Web Chat failed to initialize - botpressWebChat not found on window'));
        }
      };

      // Start checking
      checkAndConfigure();
    } catch (error) {
      console.error('[BotpressService] Exception in configureWebChat:', error);
      this.isLoading = false;
      this.loadPromise = null;
      reject(error);
    }
  }

  /**
   * Check if Botpress is loaded
   */
  isInitialized(): boolean {
    return this.isLoaded;
  }

  /**
   * Get current loading state
   */
  getLoadingState(): boolean {
    return this.isLoading;
  }

  /**
   * Emit custom events
   */
  private emitEvent(eventName: string, detail: any): void {
    const event = new CustomEvent(eventName, { detail });
    document.dispatchEvent(event);
  }

  /**
   * Show the chatbot (if Botpress API supports it)
   */
  show(): void {
    try {
      const botpressWindow = window as BotpressWindow;
      if (botpressWindow.botpressWebChat?.show) {
        botpressWindow.botpressWebChat.show();
      }
    } catch (error) {
      console.warn('Failed to show Botpress chatbot:', error);
    }
  }

  /**
   * Hide the chatbot (if Botpress API supports it)
   */
  hide(): void {
    try {
      const botpressWindow = window as BotpressWindow;
      if (botpressWindow.botpressWebChat?.hide) {
        botpressWindow.botpressWebChat.hide();
      }
    } catch (error) {
      console.warn('Failed to hide Botpress chatbot:', error);
    }
  }
}

export default BotpressService.getInstance();
