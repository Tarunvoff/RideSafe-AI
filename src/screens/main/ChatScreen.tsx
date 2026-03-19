/**
 * ChatScreen - Integrated Botpress Chat for Authenticated Users
 * Displays Botpress webchat in a full-screen chat interface
 * Works with the real Botpress service on web
 */

import React, { useCallback, useState } from 'react';
import {
  View,
  SafeAreaView,
  StyleSheet,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '../../theme';
import { BOTPRESS_CONFIG } from '../../config/BotpressConfig';
import BotpressService from '../../services/BotpressService';

export default function ChatScreen() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chatModalVisible, setChatModalVisible] = useState(false);

  const config = BOTPRESS_CONFIG;
  const botpressShareableUrl = 'https://cdn.botpress.cloud/webchat/v3.6/shareable.html?configUrl=https://files.bpcontent.cloud/2026/03/18/05/20260318051107-I20IO0FA.json';

  const initializeBotpress = useCallback(async () => {
    // On mobile, open the chat modal instead
    if (Platform.OS !== 'web') {
      setChatModalVisible(true);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const isInitialized = await BotpressService.initialize({
        configUrl: config.configUrl,
        lazyLoadDelay: 500,
      });

      if (isInitialized && BotpressService.isInitialized()) {
        BotpressService.show();
        console.log('[ChatScreen] Botpress initialized successfully');
      }

      setIsLoading(false);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to initialize chat';
      setError(errorMsg);
      setIsLoading(false);
      console.error('[ChatScreen] Initialization error:', errorMsg);
    }
  }, [config]);

  // Web platform - Show Botpress in container
  if (Platform.OS === 'web') {
    return (
      <View style={styles.webContainer}>
        <View style={styles.webHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.webTitle}>Chat with Support</Text>
            <Text style={styles.webSubtitle}>We&apos;re here to help</Text>
          </View>
          <TouchableOpacity
            onPress={initializeBotpress}
            style={styles.refreshButton}
          >
            <Ionicons name="refresh" size={20} color={Theme.colors.primary} />
          </TouchableOpacity>
        </View>

        {error && (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={20} color="#ff4444" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity
              onPress={initializeBotpress}
              style={styles.retryButton}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Theme.colors.primary} />
            <Text style={styles.loadingText}>Connecting to support...</Text>
          </View>
        )}

        {/* Botpress container - will render here */}
        <div
          id="botpress-chat-container"
          style={{ flex: 1, width: '100%' }}
        />
      </View>
    );
  }

  // Mobile platform - Show support options with modal chat
  return (
    <>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Chat with Support</Text>
          <Text style={styles.headerSubtitle}>Get help instantly</Text>
        </View>

        <ScrollView
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.card}>
            <View style={styles.iconContainer}>
              <Ionicons
                name="chatbubble-ellipses"
                size={48}
                color={Theme.colors.primary}
              />
            </View>

            <Text style={styles.cardTitle}>Support Team Ready</Text>
            <Text style={styles.cardDescription}>
              Our support team is available 24/7 to help you with any questions
              about your coverage, claims, or account.
            </Text>

            <View style={styles.featureList}>
              <Feature icon="time" text="Quick responses" />
              <Feature icon="shield-checkmark" text="Secure & encrypted" />
              <Feature icon="checkmark-circle" text="Always available" />
            </View>

            {isLoading ? (
              <View style={styles.loadingButton}>
                <ActivityIndicator color="#fff" size="small" />
                <Text style={styles.loadingButtonText}>Connecting...</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={initializeBotpress}
              >
                <Ionicons name="send" size={20} color="#fff" />
                <Text style={styles.primaryButtonText}>Start Chat</Text>
              </TouchableOpacity>
            )}

            {error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorBoxText}>{error}</Text>
              </View>
            )}
          </View>

          <View style={styles.infoCard}>
            <Ionicons name="information-circle" size={24} color={Theme.colors.primary} />
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text style={styles.infoTitle}>Email Support</Text>
              <Text style={styles.infoText}>support@gigsheild.com</Text>
              <Text style={styles.infoText}>Response time: 2-4 hours</Text>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* Chat Modal - Mobile */}
      <Modal
        visible={chatModalVisible}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setChatModalVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.modalTitle}>RideSafe Support</Text>
              <Text style={styles.modalSubtitle}>Chat with us</Text>
            </View>
            <TouchableOpacity
              onPress={() => setChatModalVisible(false)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Messages */}
          <WebView
            source={{ uri: botpressShareableUrl }}
            style={styles.webViewContainer}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            startInLoadingState={true}
            scalePageToFit={true}
            showsVerticalScrollIndicator={true}
            originWhitelist={['*']}
            onError={(syntheticEvent) => {
              const { nativeEvent } = syntheticEvent;
              console.error('[ChatScreen] WebView error:', nativeEvent);
              setError('Failed to load chat');
            }}
            onLoad={() => {
              console.log('[ChatScreen] Botpress chat loaded successfully');
            }}
          />
        </SafeAreaView>
      </Modal>
    </>
  );
}

function Feature({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={styles.featureItem}>
      <Ionicons
        name={icon as any}
        size={20}
        color={Theme.colors.primary}
        style={styles.featureIcon}
      />
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  webContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  webHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  webTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
  },
  webSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  refreshButton: {
    padding: 8,
    marginRight: -8,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: Theme.colors.primary,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
  },
  contentContainer: {
    padding: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
    textAlign: 'center',
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  featureList: {
    marginBottom: 20,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginBottom: 8,
  },
  featureIcon: {
    marginRight: 12,
  },
  featureText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  primaryButton: {
    flexDirection: 'row',
    backgroundColor: Theme.colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  loadingButton: {
    flexDirection: 'row',
    backgroundColor: Theme.colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
  },
  loadingButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  errorBox: {
    backgroundColor: '#ffebee',
    borderLeftWidth: 4,
    borderLeftColor: '#ff4444',
    padding: 12,
    borderRadius: 4,
    marginTop: 12,
  },
  errorBoxText: {
    color: '#c33',
    fontSize: 13,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 13,
    color: '#666',
    marginBottom: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: Theme.colors.primary,
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    borderRadius: 8,
    padding: 16,
    margin: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  errorText: {
    color: '#c33',
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  retryButton: {
    backgroundColor: '#c33',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Theme.colors.primary,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  modalSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  webViewContainer: {
    flex: 1,
  },
});
