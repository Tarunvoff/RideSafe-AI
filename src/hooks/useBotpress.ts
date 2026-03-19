/**
 * useBotpress Hook
 * Custom React hook for managing Botpress initialization and lifecycle
 * Provides a clean API for integrating Botpress in React components
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import BotpressService from '../services/BotpressService';
import { BOTPRESS_CONFIG, getBotpressConfig } from '../config/BotpressConfig';

interface UseBotpressOptions {
  configUrl?: string;
  lazyLoadDelay?: number;
  showWelcomeDelay?: number;
  enabled?: boolean;
  debug?: boolean;
  context?: string;
  onInitialized?: () => void;
  onError?: (error: Error) => void;
}

interface UseBotpressReturn {
  isInitialized: boolean;
  isLoading: boolean;
  error: Error | null;
  show: () => void;
  hide: () => void;
  reinitialize: () => void;
}

/**
 * Custom hook for Botpress integration
 */
export const useBotpress = (options: UseBotpressOptions = {}): UseBotpressReturn => {
  const {
    configUrl,
    lazyLoadDelay,
    showWelcomeDelay,
    enabled = true,
    debug = false,
    context = 'default',
    onInitialized,
    onError,
  } = options;

  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const initializationAttempted = useRef(false);

  // Get config based on context or use provided config
  const config = getBotpressConfig(context);
  const finalConfigUrl = configUrl || config.configUrl;
  const finalLazyLoadDelay = lazyLoadDelay ?? config.lazyLoadDelay;
  const finalShowWelcomeDelay = showWelcomeDelay ?? config.showWelcomeDelay;

  // Initialize Botpress
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') {
      return;
    }

    // Prevent multiple initialization attempts
    if (initializationAttempted.current && isInitialized) {
      return;
    }

    initializationAttempted.current = true;

    const initializeBotpress = async () => {
      try {
        setIsLoading(true);
        setError(null);

        await BotpressService.initialize({
          configUrl: finalConfigUrl,
          lazyLoadDelay: finalLazyLoadDelay,
        });

        setIsInitialized(true);
        setError(null);

        if (debug) {
          console.log('[useBotpress] Initialization successful', {
            configUrl: finalConfigUrl,
            lazyLoadDelay: finalLazyLoadDelay,
          });
        }

        // Call onInitialized callback
        onInitialized?.();
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        setIsInitialized(false);

        if (debug) {
          console.error('[useBotpress] Initialization error:', error);
        }

        // Call onError callback
        onError?.(error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeBotpress();
  }, [
    enabled,
    finalConfigUrl,
    finalLazyLoadDelay,
    debug,
    onInitialized,
    onError,
    isInitialized,
  ]);

  // Show Botpress chatbot
  const show = useCallback(() => {
    try {
      BotpressService.show();
      if (debug) {
        console.log('[useBotpress] Show called');
      }
    } catch (err) {
      if (debug) {
        console.warn('[useBotpress] Show error:', err);
      }
    }
  }, [debug]);

  // Hide Botpress chatbot
  const hide = useCallback(() => {
    try {
      BotpressService.hide();
      if (debug) {
        console.log('[useBotpress] Hide called');
      }
    } catch (err) {
      if (debug) {
        console.warn('[useBotpress] Hide error:', err);
      }
    }
  }, [debug]);

  // Reinitialize Botpress
  const reinitialize = useCallback(async () => {
    try {
      initializationAttempted.current = false;
      setIsLoading(true);
      setError(null);

      await BotpressService.initialize({
        configUrl: finalConfigUrl,
        lazyLoadDelay: finalLazyLoadDelay,
      });

      setIsInitialized(true);

      if (debug) {
        console.log('[useBotpress] Reinitialization successful');
      }

      onInitialized?.();
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      setIsInitialized(false);

      if (debug) {
        console.error('[useBotpress] Reinitialization error:', error);
      }

      onError?.(error);
    } finally {
      setIsLoading(false);
    }
  }, [finalConfigUrl, finalLazyLoadDelay, debug, onInitialized, onError]);

  return {
    isInitialized,
    isLoading,
    error,
    show,
    hide,
    reinitialize,
  };
};

/**
 * Hook to check if Botpress is available on the current platform
 */
export const useBotpressAvailable = (): boolean => {
  const [isAvailable, setIsAvailable] = useState(false);

  useEffect(() => {
    const checkAvailability = () => {
      const available = typeof window !== 'undefined' && 'document' in window;
      setIsAvailable(available);
    };

    checkAvailability();
  }, []);

  return isAvailable;
};

/**
 * Hook to handle Botpress errors gracefully
 */
export const useBotpressErrorHandler = (onError?: (error: Error) => void) => {
  const handleBotpressError = useCallback(
    (error: Error) => {
      console.error('[Botpress Error]', {
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
      });

      // Call custom error handler if provided
      onError?.(error);

      // You can send error to error tracking service here
      // Example: Sentry.captureException(error);
    },
    [onError]
  );

  return handleBotpressError;
};

/**
 * Hook to trigger Botpress welcome message
 */
export const useBotpressWelcomeMessage = () => {
  const triggerWelcome = useCallback(() => {
    try {
      const botpressWindow = window as any;

      if (botpressWindow.botpressWebChat?.sendEvent) {
        botpressWindow.botpressWebChat.sendEvent({
          type: 'trigger.message',
          payload: {
            text: BOTPRESS_CONFIG.welcomeMessage.text,
          },
        });
      }
    } catch (err) {
      console.warn('[useBotpressWelcomeMessage] Error triggering welcome message:', err);
    }
  }, []);

  return triggerWelcome;
};

export default useBotpress;
