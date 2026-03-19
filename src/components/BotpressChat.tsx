/**
 * BotpressChat Component
 * Integrates Botpress Webchat across all platforms:
 * - Web: Native HTML/CSS implementation
 * - Mobile (iOS/Android): WebView-based modal
 */

import React, { useMemo } from 'react';
import { Platform } from 'react-native';
import { useBotpress } from '../hooks/useBotpress';
import { getBotpressConfig } from '../config/BotpressConfig';
import { Theme } from '../theme';
import BotpressChatMobile from './BotpressChatMobile';
import './BotpressChat.css';

interface BotpressChatProps {
  configUrl?: string;
  lazyLoadDelay?: number;
  showWelcomeDelay?: number;
  enabled?: boolean;
  debug?: boolean;
  context?: string;
  onInitialized?: () => void;
  onError?: (error: Error) => void;
}

const BotpressChat: React.FC<BotpressChatProps> = ({
  configUrl,
  lazyLoadDelay,
  showWelcomeDelay,
  enabled = true,
  debug = false,
  context = 'default',
  onInitialized,
  onError,
}) => {
  // Get configuration
  const config = useMemo(() => getBotpressConfig(context), [context]);

  // Determine platform - be explicit about web vs native
  const isWeb = Platform.OS === 'web';
  const isMobile = Platform.OS === 'ios' || Platform.OS === 'android';

  // Always call hook (required by React Hook Rules), but only use result on web
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const botpressHook = useBotpress({
    configUrl: configUrl || config.configUrl,
    lazyLoadDelay: lazyLoadDelay ?? config.lazyLoadDelay,
    showWelcomeDelay: showWelcomeDelay ?? config.showWelcomeDelay,
    enabled: isWeb ? enabled : false,
    debug,
    context,
    onInitialized,
    onError,
  });

  // Log component mount
  React.useEffect(() => {
    if (enabled) {
      console.log('[BotpressChat] Component mounted', {
        platform: Platform.OS,
        context,
        isWeb,
        isMobile,
      });
    }
  }, [enabled, context, isMobile, isWeb]);

  // Render nothing if not enabled
  if (!enabled) {
    return null;
  }

  // Render mobile version (iOS/Android)
  if (isMobile) {
    return (
      <BotpressChatMobile
        configUrl={configUrl || config.configUrl}
        enabled={enabled}
        debug={debug}
        context={context}
        onInitialized={onInitialized}
        onError={onError}
      />
    );
  }

  // Render web version
  if (isWeb && typeof window !== 'undefined') {
    return (
      <>
        {/* Debug Info */}
        {typeof window !== 'undefined' && (
          <script
            dangerouslySetInnerHTML={{
              __html: `
                console.log('🤖 [RideSafe-AI Botpress] Running on web platform');
              `,
            }}
          />
        )}

        {/* Botpress Floating Button Styling */}
        <style>{`
        /* Botpress container positioning and styling */
        .bp-chat-container {
          position: fixed;
          bottom: 20px;
          right: 20px;
          z-index: 9999;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
            'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
            sans-serif;
        }

        /* Enhanced floating button styles */
        .bp-launcher {
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
          transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) !important;
          border-radius: 50% !important;
        }

        .bp-launcher:hover {
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2) !important;
          transform: scale(1.1) translateY(-2px) !important;
        }

        .bp-launcher:active {
          transform: scale(0.95) !important;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1) !important;
        }

        /* Chat window styling */
        .bp-chat-window {
          border-radius: 16px !important;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12) !important;
          overflow: hidden !important;
          animation: slideUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) !important;
        }

        /* Chat window open animation */
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* Header styling */
        .bp-chat-header {
          background: linear-gradient(135deg, ${Theme.colors.primary} 0%, #0052cc 100%) !important;
          color: #ffffff !important;
          padding: 16px !important;
          border-radius: 16px 16px 0 0 !important;
          font-weight: 600 !important;
        }

        /* Body styling */
        .bp-chat-body {
          background-color: #ffffff !important;
          color: ${Theme.colors.text} !important;
          font-size: 14px !important;
          line-height: 1.6 !important;
        }

        /* Message styling */
        .bp-message {
          padding: 12px 16px !important;
          margin: 8px 0 !important;
          border-radius: 12px !important;
          animation: fadeIn 0.3s ease-in-out !important;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* User message styling */
        .bp-user-message {
          background-color: ${Theme.colors.primary} !important;
          color: #ffffff !important;
          border-radius: 12px 12px 0 12px !important;
          word-wrap: break-word !important;
        }

        /* Bot message styling */
        .bp-bot-message {
          background-color: #f5f5f5 !important;
          color: ${Theme.colors.text} !important;
          border-radius: 12px 12px 12px 0 !important;
          word-wrap: break-word !important;
        }

        /* Input field styling */
        .bp-input-field {
          border: 1px solid ${Theme.colors.border} !important;
          border-top: 1px solid ${Theme.colors.border} !important;
          padding: 12px !important;
          border-radius: 0 0 16px 16px !important;
          font-size: 14px !important;
          background-color: #ffffff !important;
        }

        .bp-input-field input {
          border: none !important;
          outline: none !important;
          font-size: 14px !important;
          color: ${Theme.colors.text} !important;
        }

        .bp-input-field input::placeholder {
          color: ${Theme.colors.textSecondary} !important;
        }

        /* Send button styling */
        .bp-send-button {
          background-color: ${Theme.colors.primary} !important;
          color: #ffffff !important;
          border: none !important;
          border-radius: 8px !important;
          padding: 8px 12px !important;
          cursor: pointer !important;
          transition: all 0.2s ease !important;
          font-weight: 600 !important;
        }

        .bp-send-button:hover {
          background-color: #0052cc !important;
          box-shadow: 0 2px 8px rgba(13, 108, 242, 0.3) !important;
          transform: translateY(-1px) !important;
        }

        .bp-send-button:active {
          transform: translateY(0) !important;
          box-shadow: 0 1px 4px rgba(13, 108, 242, 0.2) !important;
        }

        /* Close button styling */
        .bp-close-button {
          color: ${Theme.colors.textSecondary} !important;
          transition: color 0.2s ease !important;
        }

        .bp-close-button:hover {
          color: ${Theme.colors.text} !important;
        }

        /* Scrollbar styling */
        .bp-chat-body::-webkit-scrollbar {
          width: 6px !important;
        }

        .bp-chat-body::-webkit-scrollbar-track {
          background: transparent !important;
        }

        .bp-chat-body::-webkit-scrollbar-thumb {
          background: #cbd5e1 !important;
          border-radius: 3px !important;
        }

        .bp-chat-body::-webkit-scrollbar-thumb:hover {
          background: #94a3b8 !important;
        }

        /* Mobile responsiveness */
        @media (max-width: 768px) {
          .bp-chat-container {
            bottom: 16px !important;
            right: 16px !important;
          }

          .bp-chat-window {
            width: calc(100vw - 32px) !important;
            max-width: 100% !important;
            height: calc(100vh - 100px) !important;
            max-height: 70vh !important;
          }

          .bp-launcher {
            width: 56px !important;
            height: 56px !important;
          }
        }

        @media (max-width: 480px) {
          .bp-chat-container {
            bottom: 12px !important;
            right: 12px !important;
          }

          .bp-chat-window {
            width: calc(100vw - 24px) !important;
            height: calc(100vh - 80px) !important;
          }

          .bp-launcher {
            width: 52px !important;
            height: 52px !important;
          }

          .bp-send-button {
            padding: 6px 10px !important;
            font-size: 13px !important;
          }
        }

        /* Accessibility improvements */
        .bp-launcher:focus {
          outline: 2px solid ${Theme.colors.primary} !important;
          outline-offset: 2px !important;
        }

        .bp-send-button:focus {
          outline: 2px solid ${Theme.colors.primary} !important;
          outline-offset: 2px !important;
        }

        /* Reduced motion support */
        @media (prefers-reduced-motion: reduce) {
          .bp-launcher,
          .bp-chat-window,
          .bp-message,
          .bp-send-button {
            animation: none !important;
            transition: none !important;
          }
        }

        /* Dark mode support */
        @media (prefers-color-scheme: dark) {
          .bp-chat-body {
            background-color: #1a1a1a !important;
            color: #e0e0e0 !important;
          }

          .bp-input-field {
            background-color: #2a2a2a !important;
            border-color: #3a3a3a !important;
          }

          .bp-input-field input {
            color: #e0e0e0 !important;
          }

          .bp-bot-message {
            background-color: #2a2a2a !important;
            color: #e0e0e0 !important;
          }

          .bp-close-button {
            color: #a0a0a0 !important;
          }

          .bp-close-button:hover {
            color: #e0e0e0 !important;
          }
        }

        /* Print styles */
        @media print {
          .bp-chat-container {
            display: none !important;
          }
        }
      `}</style>

      {/* Hidden container - Botpress script handles rendering */}
      <div id="botpress-chat-root" className="bp-chat-container" />
    </>
  );
  }

  // Fallback for unknown platforms
  return null;
};

export default BotpressChat;
