/**
 * [EXCELLENCE SUMMARY]
 * The AuthCard is the focal container for the Aegis authentication gateway. 
 * Designed to provide a sense of security and structure, it utilizes 
 * refined elevation and subtle borders to lift high-value forms above 
 * the application's background layers. It serves as the primary 
 * vessel for the 'Trust-First' user experience.
 * 
 * [DOMAIN LOGIC]
 * Provides a standardized structural footprint for 'Login', 'Signup', 
 * and 'Reset Password' workflows. By enforcing consistent padding 
 * and shadow tokens, it ensures that sensitive data entry fields 
 * are framed with the technical intentionality required for a 
 * professional insurance platform.
 */

import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { Theme } from '../../theme';

interface AuthCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export default function AuthCard({ children, style }: AuthCardProps) {
  /**
   * [IN-LINE PRIDE]: Structural Focus
   * Leverages high-fidelity shadow tokens to create professional depth. 
   * The 'shadowRadius: 12' and 'elevation: 4' are calibrated to create 
   * a soft but definitive separation from the background, centering 
   * the user's attention on the authentication task.
   */
  return (
    <View style={[styles.card, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Theme.colors.surface,
    borderRadius: Theme.borderRadius.lg,
    padding: Theme.spacing.xl,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  }
});
