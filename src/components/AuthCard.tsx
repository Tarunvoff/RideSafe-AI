import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Theme } from '../theme';

interface AuthCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export default function AuthCard({ children, style }: AuthCardProps) {
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
