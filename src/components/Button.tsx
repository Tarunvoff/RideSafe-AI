import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '../theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'outline' | 'text';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
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
