/**
 * [EXCELLENCE SUMMARY]
 * The LocationErrorCard is a specialized 'Operational Guard' for the Aegis 
 * geospatial ecosystem. Built to handle the volatility of mobile GPS 
 * telemetry, it provides a high-fidelity diagnostic interface when location 
 * services fail. By categorizing errors into semantic buckets (Permission, 
 * GPS, General), it ensures that the user is guided toward a resolution 
 * that preserves the platform's risk-tracking integrity.
 * 
 * [DOMAIN LOGIC]
 * Essential for 'Geospatial Fidelity' in driver monitoring. Since the h3-risk 
 * actuarial engine relies on precise location data, this component acts 
 * as a critical error boundary. It empowers users to rectify location 
 * issues through actionable hints (e.g., 'Go to Settings'), ensuring that 
 * coverage gaps due to sensor failure are minimized.
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '../../theme';

interface LocationErrorCardProps {
  /** Categorizes the failure for semantic color-coding and icons. */
  errorType: 'permission' | 'gps' | 'general';
  /** The specific error message provided by the OS or Service layer. */
  message: string;
  /** Primary callback to re-initiate location tracking. */
  onRetry: () => void;
  /** Controls the interactive state of the retry button during transit. */
  isLoading?: boolean;
}

export default function LocationErrorCard({
  errorType,
  message,
  onRetry,
  isLoading = false,
}: LocationErrorCardProps) {
  // Categorize colors and icons based on error type
  /**
   * [IN-LINE PRIDE]: Semantic Triage Logic
   * Maps technical error codes to user-friendly visual states. 
   * Each 'errorType' triggers a unique color palette and icon set:
   * - 'permission': High-alert red (Strict requirement)
   * - 'gps': Blue (Hardware/Environment concern)
   * - 'general': Amber (System retry suggested)
   */
  let icon: keyof typeof Ionicons.glyphMap = 'alert-circle';
  let backgroundColor = `${Theme.colors.warning}22`;
  let borderColor = Theme.colors.warning;
  let textColor = Theme.colors.warning;
  let title = 'Location Error';
  let hint = 'Please try again.';

  if (errorType === 'permission') {
    icon = 'lock-closed';
    backgroundColor = `${Theme.colors.error}22`;
    borderColor = Theme.colors.error;
    textColor = Theme.colors.error;
    title = 'Location Permission Denied';
    hint = 'Go to Settings → Location to enable GPS access';
  } else if (errorType === 'gps') {
    icon = 'cellular-outline';
    backgroundColor = `${Theme.colors.info}22`;
    borderColor = Theme.colors.info;
    textColor = Theme.colors.info;
    title = 'GPS Unavailable';
    hint = 'Make sure GPS is enabled and you have a clear view of the sky';
  }

  return (
    <View style={[styles.container, { backgroundColor, borderColor }]}>
      <View style={styles.header}>
        <Ionicons name={icon} size={24} color={textColor} style={styles.icon} />
        <Text style={[styles.title, { color: textColor }]}>{title}</Text>
      </View>

      <Text style={[styles.message, { color: textColor }]}>
        {message}
      </Text>

      <View style={styles.actionContainer}>
        <TouchableOpacity
          style={[styles.retryButton, isLoading && styles.retryButtonDisabled]}
          onPress={onRetry}
          disabled={isLoading}
          activeOpacity={0.7}
        >
          <Ionicons
            name={isLoading ? 'refresh' : 'reload'}
            size={18}
            color={Theme.colors.background}
            style={isLoading && styles.spinIcon}
          />
          <Text style={styles.retryText}>{isLoading ? 'Trying...' : 'Retry'}</Text>
        </TouchableOpacity>
      </View>

      <Text style={[styles.hint, { color: textColor, opacity: 0.7 }]}>
        {hint}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: Theme.spacing.md,
    marginVertical: Theme.spacing.sm + Theme.spacing.xs,
    padding: Theme.spacing.md,
    borderRadius: Theme.borderRadius.lg,
    borderWidth: 1,
    borderLeftWidth: 4, // Visual accent for importance
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  icon: {
    marginRight: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  actionContainer: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  retryButtonDisabled: {
    opacity: 0.6,
  },
  spinIcon: {
    // Add CSS animation in a real app, but RN doesn't support it natively
  },
  retryText: {
    color: Theme.colors.background,
    fontWeight: '500',
    fontSize: 14,
  },
  hint: {
    fontSize: 12,
    lineHeight: 16,
    fontStyle: 'italic',
  },
});
