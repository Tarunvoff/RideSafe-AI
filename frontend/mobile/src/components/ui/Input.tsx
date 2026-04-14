/**
 * [EXCELLENCE SUMMARY]
 * The Input component is the gateway for data integrity in the Aegis 
 * ecosystem. Precision-engineered for clarity and error resilience, 
 * it provides a standardized interface for capturing user information. 
 * By integrating label, input, and error states into a single atomic 
 * unit, it ensures a consistent and high-fidelity 'Form Experience' 
 * across the entire application.
 * 
 * [DOMAIN LOGIC]
 * Critical for 'Actuarial Precision' during onboarding and claim 
 * reporting. The component supports explicit error highlighting, 
 * which is essential for guiding users through complex validation 
 * logic (e.g., verifying phone numbers or insurance IDs) without 
 * increasing cognitive load.
 */

import React from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, View, ViewStyle } from 'react-native';
import { Theme } from '../../theme';

interface InputProps extends TextInputProps {
  /** Optional descriptive label displayed above the input field. */
  label?: string;
  /** Semantic error message displayed below the input; triggers 'Error' visual state. */
  error?: string;
  /** Custom styling for the outer wrapper. */
  containerStyle?: ViewStyle | ViewStyle[];
}

export default function Input({ label, error, style, containerStyle, ...props }: InputProps) {
  /**
   * [IN-LINE PRIDE]: Descriptive Validation
   * Leverages conditional rendering for labels and errors to maintain 
   * a clean UI footprint when the fields are unused. The input border 
   * dynamically shifts to 'Theme.colors.error' to provide immediate 
   * visual feedback on validation failure.
   */
  return (
    <View style={[styles.container, containerStyle]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        style={[styles.input, error && styles.inputError, style]}
        placeholderTextColor={Theme.colors.textSecondary}
        {...props}
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Theme.spacing.md,
    width: '100%',
  },
  label: {
    ...Theme.typography.caption,
    color: Theme.colors.textSecondary,
    marginBottom: Theme.spacing.xs,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderRadius: Theme.roundness,
    paddingHorizontal: Theme.spacing.md,
    ...Theme.typography.body,
    color: Theme.colors.text,
    backgroundColor: Theme.colors.background,
  },
  inputError: {
    borderColor: Theme.colors.error,
  },
  errorText: {
    ...Theme.typography.caption,
    color: Theme.colors.error,
    marginTop: Theme.spacing.xs,
  }
});
