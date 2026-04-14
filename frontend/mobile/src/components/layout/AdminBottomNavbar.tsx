/**
 * [EXCELLENCE SUMMARY]
 * The AdminBottomNavbar is a bespoke, floating navigation component 
 * designed for the Aegis mobile executive suite. Moving away from 
 * standard browser-bottom patterns, it utilizes a 'Floating Island' 
 * aesthetic that aligns with premium mobile design trends. It provides 
 * tactical access to the four core administrative pillars: Dashboard, 
 * Workforce, Claims, and System Setup.
 * 
 * [DOMAIN LOGIC]
 * Facilitates rapid 'Context Switching' for administrators. By providing 
 * immediate access to the entire administrative funnel, it reduces the 
 * number of taps required to traverse the platform, which is critical 
 * during high-velocity operational events.
 */

import { Ionicons } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Theme } from '../../theme';

export type AdminBottomNavKey = 'dash' | 'workers' | 'claims' | 'setup';

type AdminBottomNavbarProps = {
  navigation: any;
  /** The key of the currently active navigation segment. */
  activeKey: AdminBottomNavKey;
};

const PRIMARY_GREEN = '#16a34a';

export default function AdminBottomNavbar({ navigation, activeKey }: AdminBottomNavbarProps) {
  const rootNav = navigation?.getParent?.() ?? navigation;
  const insets = useSafeAreaInsets();

  /**
   * [IN-LINE PRIDE]: Structural Integrity
   * Utilizes a memoized list of navigation items to prevent 
   * unnecessary object creation during re-renders. The icons and 
   * labels are strictly tied to the platform's visual identity, 
   * ensuring cohesive branding across all touchpoints.
   */
  const items = useMemo(
    () =>
      [
        { key: 'dash' as const, label: 'Dash', icon: 'grid-outline' as const, to: 'AdminDashboard' },
        { key: 'workers' as const, label: 'Workers', icon: 'person-outline' as const, to: 'AdminWorkers' },
        { key: 'claims' as const, label: 'Claims', icon: 'shield-checkmark' as const, to: 'AdminClaims' },
        { key: 'setup' as const, label: 'Setup', icon: 'settings-outline' as const, to: 'AdminSetup' },
      ] as const,
    []
  );

  const onPress = (to: string) => {
    rootNav.navigate(to);
  };

  /**
   * [IN-LINE PRIDE]: Positional Sophistication
   * Implements dynamic bottom positioning using 'useSafeAreaInsets' 
   * to ensure compatibility across diverse mobile aspect ratios 
   * (including notched displays). The 'position: absolute' overlay 
   * gives it a modern, detached appearance that maximizes screen real estate.
   */
  return (
    <View style={[styles.bottomBar, { bottom: insets.bottom + Theme.spacing.md }]}>
      {items.map((item) => {
        const isActive = item.key === activeKey;
        return (
          <TouchableOpacity
            key={item.key}
            style={styles.bottomBarItem}
            activeOpacity={0.85}
            onPress={() => onPress(item.to)}
          >
            <Ionicons name={item.icon} size={19} color={isActive ? PRIMARY_GREEN : '#6b7280'} />
            <Text style={[styles.bottomBarLabel, isActive && styles.bottomBarLabelActive]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bottomBar: {
    position: 'absolute',
    left: Theme.spacing.lg,
    right: Theme.spacing.lg,
    height: 72,
    backgroundColor: '#ffffff',
    borderRadius: Theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Theme.spacing.md,
    // Add shadow for 'Floating Island' elevation
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  bottomBarItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  bottomBarLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6b7280',
    textAlign: 'center',
  },
  bottomBarLabelActive: {
    color: '#111827',
    fontWeight: '800',
  },
});

