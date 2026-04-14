/**
 * [EXCELLENCE SUMMARY]
 * The Card is the atomic layout primitive for the Aegis mobile 
 * ecosystem. It provides a standardized container for grouping 
 * related data points into logical, high-contrast sections. By 
 * enforcing a consistent 'Bento-style' footprint, it allows our 
 * complex data streams (Risk metrics, Claim details, Alerts) to 
 * remain legible and structured.
 * 
 * [DOMAIN LOGIC]
 * Serves as the primary 'Information Vessel' for the Aegis dashboard 
 * and status lists. Its subtle elevation and distinct border 
 * tokens are designed to reduce cognitive load, enabling users 
 * with varying digital literacy levels to successfully scan and 
 * parse operational updates.
 */

import React from 'react';
import { View, StyleSheet, ViewProps } from 'react-native';
import { Theme } from '../../theme';

export default function Card({ style, children, ...props }: ViewProps) {
  /**
   * [IN-LINE PRIDE]: Structural Standardization
   * Encapsulates spacing, rounding, and elevation tokens into a 
   * reusable higher-order view. This prevents 'Style Drift' and 
   * ensures that the platform maintains its premium, professional 
   * visual hierarchy across all persona-specific interfaces.
   */
  return (
    <View style={[styles.card, style]} {...props}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Theme.colors.background,
    borderRadius: Theme.roundness,
    padding: Theme.spacing.md,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2.22,
    elevation: 2,
    marginBottom: Theme.spacing.md,
  }
});
