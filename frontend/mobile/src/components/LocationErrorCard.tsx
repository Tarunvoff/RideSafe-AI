import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '../theme';

interface LocationErrorCardProps {
  errorType: 'permission' | 'gps' | 'general';
  message: string;
  onRetry: () => void;
  isLoading?: boolean;
}

export default function LocationErrorCard({
  errorType,
  message,
  onRetry,
  isLoading = false,
}: LocationErrorCardProps) {
  // Categorize colors and icons based on error type
  let icon = 'alert-circle';
  let backgroundColor = '#fef3c7';
  let borderColor = '#fcd34d';
  let textColor = '#92400e';
  let title = 'Location Error';
  let hint = 'Please try again.';

  if (errorType === 'permission') {
    icon = 'lock-closed';
    backgroundColor = '#fee2e2';
    borderColor = '#fca5a5';
    textColor = '#7f1d1d';
    title = 'Location Permission Denied';
    hint = 'Go to Settings → Location to enable GPS access';
  } else if (errorType === 'gps') {
    icon = 'signal-outline';
    backgroundColor = '#dbeafe';
    borderColor = '#93c5fd';
    textColor = '#0c2340';
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
            color="#ffffff"
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
    marginHorizontal: 16,
    marginVertical: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderLeftWidth: 4,
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
    color: '#ffffff',
    fontWeight: '500',
    fontSize: 14,
  },
  hint: {
    fontSize: 12,
    lineHeight: 16,
    fontStyle: 'italic',
  },
});
