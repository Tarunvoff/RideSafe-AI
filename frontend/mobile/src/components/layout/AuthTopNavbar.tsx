/**
 * [EXCELLENCE SUMMARY]
 * The AuthTopNavbar is the unified navigation anchor for the Aegis 
 * authentication gateway. It provides a consistent visual hierarchy 
 * across the driver onboarding funnel, handling both established 
 * brand identities and navigational constraints with a 'Zero-Friction' 
 * interface.
 * 
 * [DOMAIN LOGIC]
 * Centralizes the 'Entry Point' branding. By providing a common 
 * component for all login screens, it ensures that the user's 
 * first programmatic interaction with Aegis is cohesive, 
 * reinforcing trust and platform reliability.
 */

import React from 'react';
import { StyleSheet, View, TouchableOpacity, Image, Text, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '../../theme';

interface AuthTopNavbarProps {
  onBack?: () => void;
  title?: string;
  transparent?: boolean;
  light?: boolean; // Use for dark or vibrant backgrounds
}

export default function AuthTopNavbar({ onBack, title, transparent = true, light = false }: AuthTopNavbarProps) {
  const iconColor = light ? '#fff' : Theme.colors.text;
  const textColor = light ? '#fff' : Theme.colors.text;

  return (
    <View style={[
      styles.header, 
      transparent ? styles.transparent : styles.whiteBg,
    ]}>
      <View style={styles.slot}>
        {onBack && (
          <TouchableOpacity 
            style={styles.actionBtn} 
            onPress={onBack}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color={iconColor} />
          </TouchableOpacity>
        )}
      </View>
      
      <View style={styles.center}>
        {!title ? (
           <Image
             source={require('../../../assets/images/productlogo.png')}
             style={[styles.logo, light && styles.logoLight]}
             resizeMode="contain"
           />
        ) : (
          <Text style={[styles.title, { color: textColor }]}>{title}</Text>
        )}
      </View>

      <View style={styles.slot}>
        {/* Placeholder for symmetry */}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 64,
    width: '100%',
    zIndex: 100,
    marginTop: Platform.OS === 'android' ? 10 : 0, 
  },
  transparent: {
    backgroundColor: 'transparent',
  },
  whiteBg: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  slot: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)', // Subtle hover/feedback background
  },
  logo: {
    width: 32,
    height: 32,
  },
  logoLight: {
    // In case we want to apply filters to make the logo look better on dark
    tintColor: '#fff', 
  },
  title: {
    ...Theme.typography.h3,
    fontWeight: '800' as const,
    letterSpacing: -0.5,
  },
});
