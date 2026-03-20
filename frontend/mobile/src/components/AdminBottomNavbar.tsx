import { Ionicons } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Theme } from '../theme';

export type AdminBottomNavKey = 'dash' | 'workers' | 'claims' | 'setup';

type AdminBottomNavbarProps = {
  navigation: any;
  activeKey: AdminBottomNavKey;
};

const PRIMARY_GREEN = '#16a34a';

export default function AdminBottomNavbar({ navigation, activeKey }: AdminBottomNavbarProps) {
  const rootNav = navigation?.getParent?.() ?? navigation;

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

  return (
    <View style={styles.bottomBar}>
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
    bottom: Theme.spacing.md,
    height: 72,
    backgroundColor: '#ffffff',
    borderRadius: Theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Theme.spacing.md,
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

