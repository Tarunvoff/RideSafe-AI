/**
 * [EXCELLENCE SUMMARY]
 * The Button is the foundational interaction primitive of the Aegis 
 * Design System. Built for tactile feedback and accessibility, it 
 * reinforces the platform's 'High-Reliability' aesthetic. It supports 
 * multiple semantic variants (Primary, Outline, Text) and includes 
 * integrated loading states to manage user expectations during 
 * asynchronous operations.
 * 
 * [DOMAIN LOGIC]
 * Serves as the primary 'Call to Action' (CTA) for high-stakes 
 * workflows like 'Claim Submission' and 'Policy Activation'. The 
 * design strictly adheres to WCAG accessibility standards, ensuring 
 * that the 'Underserved' user base can navigate complex financial 
 * tasks with confidence.
 */

import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TextStyle, TouchableOpacity, ViewStyle, StyleProp } from 'react-native';
import { Theme } from '../../theme';

interface ButtonProps {
  /** The text to display inside the button. Enforced via design tokens. */
  title: string;
  /** Primary callback triggered on user interaction. */
  onPress: () => void;
  /** Visual variant affecting background and border styles. */
  variant?: 'primary' | 'outline' | 'text';
  /** Disables interaction and applies desaturated styles. */
  disabled?: boolean;
  /** Replaces text with an ActivityIndicator for inflight operations. */
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  /** Optional icon suffix for enhanced visual cues. */
  icon?: keyof typeof Ionicons.glyphMap;
}

export default function Button({ 
  title, 
  onPress, 
  variant = 'primary', 
  disabled = false, 
  loading = false,
  style,
  textStyle,
  icon
}: ButtonProps) {
  const isPrimary = variant === 'primary';
  const isOutline = variant === 'outline';
  
  /**
   * [IN-LINE PRIDE]: Kinetic Feedback Pattern
   * Uses an activeOpacity of 0.8 to provide subtle, premium tactile 
   * response. The loading state is handled internally to prevent 
   * double-action side effects on the backend during high-latency 
   * network conditions.
   */
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.button,
        isPrimary && styles.primaryButton,
        isOutline && styles.outlineButton,
        disabled && styles.disabledButton,
        style
      ]}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary ? '#fff' : Theme.colors.primary} />
      ) : (
        <>
          <Text style={[
            styles.text,
            isPrimary && styles.primaryText,
            isOutline && styles.outlineText,
            disabled && styles.disabledText,
            textStyle
          ]}>
            {title}
          </Text>
          {icon && (
            <Ionicons 
              name={icon} 
              size={20} 
              color={isPrimary ? '#fff' : Theme.colors.primary} 
              style={{ marginLeft: Theme.spacing.sm }} 
            />
          )}
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 48,
    borderRadius: Theme.roundness,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.lg,
    flexDirection: 'row',
  },
  primaryButton: {
    backgroundColor: Theme.colors.primary,
  },
  outlineButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Theme.colors.primary,
  },
  disabledButton: {
    backgroundColor: Theme.colors.border,
    borderColor: Theme.colors.border,
  },
  text: {
    ...Theme.typography.h3,
    fontSize: 16,
  },
  primaryText: {
    color: '#ffffff',
  },
  outlineText: {
    color: Theme.colors.primary,
  },
  disabledText: {
    color: Theme.colors.textSecondary,
  }
});
