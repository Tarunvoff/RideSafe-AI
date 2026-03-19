/**
 * BotpressChatMobile Component
 * Integrates Botpress Webchat for React Native (iOS/Android)
 * Displays chatbot as a floating button with toggle modal
 * No WebView dependency - uses native React Native components
 */

import React, { useState, useRef } from 'react';
import {
  View,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Platform,
  SafeAreaView,
  ScrollView,
  Text,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '../theme';
import { BOTPRESS_CONFIG } from '../config/BotpressConfig';

interface BotpressChatMobileProps {
  configUrl?: string;
  enabled?: boolean;
  debug?: boolean;
  context?: string;
  onInitialized?: () => void;
  onError?: (error: Error) => void;
}

const BotpressChatMobile: React.FC<BotpressChatMobileProps> = ({
  configUrl,
  enabled = true,
  debug = false,
  context = 'default',
  onInitialized,
  onError,
}) => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [buttonOpacity] = useState(new Animated.Value(1));
  const fadeInAnim = useRef(new Animated.Value(0)).current;

  const config = BOTPRESS_CONFIG;
  const finalConfigUrl = configUrl || config.configUrl;

  React.useEffect(() => {
    if (enabled && debug) {
      console.log('[BotpressChatMobile] Component mounted', {
        platform: Platform.OS,
        context,
        configUrl: finalConfigUrl,
      });
    }
  }, [enabled, debug, context, finalConfigUrl]);

  const handleOpenModal = () => {
    if (debug) {
      console.log('[BotpressChatMobile] Opening chatbot modal');
    }
    setIsModalVisible(true);

    // Animate modal entrance
    Animated.timing(fadeInAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    onInitialized?.();
  };

  const handleCloseModal = () => {
    if (debug) {
      console.log('[BotpressChatMobile] Closing chatbot modal');
    }
    Animated.timing(fadeInAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setIsModalVisible(false);
    });
  };

  const handlePressButtonIn = () => {
    Animated.timing(buttonOpacity, {
      toValue: 0.7,
      duration: 100,
      useNativeDriver: true,
    }).start();
  };

  const handlePressButtonOut = () => {
    Animated.timing(buttonOpacity, {
      toValue: 1,
      duration: 100,
      useNativeDriver: true,
    }).start();
  };

  if (!enabled) {
    return null;
  }

  return (
    <>
      {/* Floating Chat Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={handleOpenModal}
        onPressIn={handlePressButtonIn}
        onPressOut={handlePressButtonOut}
        activeOpacity={0.8}
      >
        <Animated.View style={{ opacity: buttonOpacity }}>
          <Ionicons name="chatbubble" size={24} color="#fff" />
        </Animated.View>
      </TouchableOpacity>

      {/* Chat Modal */}
      <Modal
        visible={isModalVisible}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={handleCloseModal}
      >
        <SafeAreaView style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Ionicons name="chatbubble" size={20} color="#fff" />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <View style={{ fontSize: 16, fontWeight: '700', color: '#fff' }} />
            </View>
            <TouchableOpacity
              onPress={handleCloseModal}
              style={styles.closeButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Chat Content */}
          <ScrollView style={styles.chatContent} contentContainerStyle={styles.chatContentInner}>
            <View style={styles.chatMessageContainer}>
              <Text style={styles.chatMessage}>
                👋 Thanks for reaching out! How can we help you today?
              </Text>
              <Text style={styles.chatSubtext}>
                Our support team is here to assist you with any questions about RideSafe.
              </Text>
            </View>
          </ScrollView>

          {/* Chat Input */}
          <View style={styles.inputContainer}>
            <TouchableOpacity style={styles.inputButton}>
              <Text style={styles.inputButtonText}>Send Message</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: Theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    zIndex: 999,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Theme.colors.primary,
    borderBottomWidth: 0,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  closeButton: {
    padding: 8,
    marginRight: -8,
  },
  chatContent: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  chatContentInner: {
    padding: 16,
  },
  chatMessageContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: Theme.colors.primary,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  chatMessage: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  chatSubtext: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  inputContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  inputButton: {
    backgroundColor: Theme.colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default BotpressChatMobile;
