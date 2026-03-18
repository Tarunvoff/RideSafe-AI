import { MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import {
    Alert,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { Theme } from '../../theme';

export default function AdminSetupScreen({ navigation }: any) {
  const { logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } catch {
      Alert.alert('Error', 'Failed to log out');
    }
  };

  const handleBack = () => {
    if (navigation?.canGoBack?.()) navigation.goBack();
    else navigation.navigate('AdminDashboard');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.root}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Header Section */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.backRow} onPress={handleBack} activeOpacity={0.85}>
              <MaterialIcons name="arrow-back" size={22} color={Theme.colors.text} />
            </TouchableOpacity>

            <Text style={styles.title}>SETUP</Text>
            <Text style={styles.subtitle}>SYSTEM CONFIGURATION</Text>
          </View>

          {/* Main Content */}
          <View style={styles.main}>
            {/* Configuration Section */}
            <View style={styles.section}>
              <View style={styles.dividerGroup}>
                <SetupItem
                  title="Alert Thresholds"
                  description="Configure sensitivity for automated alerts"
                  onPress={() => {}}
                />
                <SetupItem
                  title="Risk Configuration"
                  description="Manage risk assessment parameters"
                  onPress={() => {}}
                />
                <SetupItem
                  title="Plan Configuration"
                  description="Subscription and tier settings"
                  onPress={() => {}}
                />
                <SetupItem
                  title="Verification Settings"
                  description="Identity and background check rules"
                  onPress={() => {}}
                  hideDivider
                />
              </View>
            </View>

            {/* System Section */}
            <View style={styles.section}>
              <Text style={styles.systemKicker}>SYSTEM</Text>
              <View style={styles.dividerGroup}>
                <SetupItem title="Admin Profile" onPress={() => {}} />
                <SetupItem title="Notifications" onPress={() => {}} hideDivider />
              </View>
            </View>

            {/* Danger Zone */}
            <View style={styles.dangerSection}>
              <TouchableOpacity style={styles.logoutBtn} activeOpacity={0.85} onPress={handleLogout}>
                <MaterialIcons name="logout" size={20} color={Theme.colors.text} />
                <Text style={styles.logoutText}>LOGOUT</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>

        {/* Bottom Navigation */}
        <View style={styles.bottomNav}>
          <BottomNavItem
            label="Dash"
            icon={<MaterialIcons name="dashboard" size={24} color={Theme.colors.text} />}
            onPress={() => navigation.navigate('AdminDashboard')}
          />
          <BottomNavItem
            label="Workers"
            icon={<MaterialIcons name="group" size={24} color={Theme.colors.text} />}
            onPress={() => navigation.navigate('AdminWorkers')}
          />
          <BottomNavItem
            label="Claims"
            icon={<MaterialIcons name="security" size={24} color={Theme.colors.text} />}
            onPress={() => navigation.navigate('AdminClaims')}
          />
          <BottomNavItem
            active
            label="Setup"
            icon={<MaterialIcons name="settings" size={24} color={Theme.colors.text} />}
            onPress={() => {}}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

function SetupItem({
  title,
  description,
  onPress,
  hideDivider,
}: {
  title: string;
  description?: string;
  onPress: () => void;
  hideDivider?: boolean;
}) {
  return (
    <TouchableOpacity style={styles.itemRow} activeOpacity={0.85} onPress={onPress}>
      <View style={[styles.itemInner, hideDivider ? null : styles.itemDivider]}>
        <View style={styles.itemTextCol}>
          <Text style={styles.itemTitle}>{title}</Text>
          {description ? <Text style={styles.itemDesc}>{description}</Text> : null}
        </View>
        <MaterialIcons name="chevron-right" size={22} color={Theme.colors.textSecondary} />
      </View>
    </TouchableOpacity>
  );
}

function BottomNavItem({
  label,
  icon,
  active,
  onPress,
}: {
  label: string;
  icon: React.ReactNode;
  active?: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.bottomNavItem, active ? styles.bottomNavItemActive : null]}
      activeOpacity={0.85}
      onPress={onPress}
    >
      {icon}
      <Text style={[styles.bottomNavLabel, active ? styles.bottomNavLabelActive : null]}>
        {label.toUpperCase()}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Theme.colors.background },
  root: { flex: 1, backgroundColor: Theme.colors.background },
  scrollContent: { paddingBottom: 140 },

  header: {
    paddingHorizontal: Theme.spacing.xl,
    paddingTop: Theme.spacing.xxl,
    paddingBottom: Theme.spacing.lg,
    gap: 6,
  },
  backRow: {
    height: 28,
    width: 28,
    alignItems: 'flex-start',
    justifyContent: 'center',
    marginBottom: Theme.spacing.lg,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: Theme.colors.text,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 2.5,
    color: Theme.colors.textSecondary,
  },

  main: {
    paddingHorizontal: Theme.spacing.lg,
    gap: Theme.spacing.xl,
  },

  section: {},
  dividerGroup: {
    borderTopWidth: 1,
    borderTopColor: Theme.colors.border,
  },

  itemRow: { backgroundColor: Theme.colors.background },
  itemInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 18,
  },
  itemDivider: {
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
  },
  itemTextCol: { flex: 1, paddingRight: 16 },
  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Theme.colors.text,
  },
  itemDesc: {
    marginTop: 4,
    fontSize: 14,
    color: Theme.colors.textSecondary,
  },

  systemKicker: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 3,
    color: Theme.colors.textSecondary,
    marginBottom: Theme.spacing.sm,
  },

  dangerSection: { paddingTop: Theme.spacing.sm, paddingBottom: Theme.spacing.xl },
  logoutBtn: {
    width: '100%',
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderRadius: Theme.borderRadius.lg,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Theme.colors.background,
  },
  logoutText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 2,
    color: Theme.colors.text,
  },

  bottomNav: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Theme.spacing.lg,
    paddingTop: Theme.spacing.md,
    paddingBottom: Theme.spacing.xl,
    borderTopWidth: 1,
    borderTopColor: Theme.colors.border,
    backgroundColor: Theme.colors.background,
  },
  bottomNavItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderTopWidth: 2,
    borderTopColor: 'transparent',
  },
  bottomNavItemActive: {
    borderTopColor: Theme.colors.text,
  },
  bottomNavLabel: {
    letterSpacing: 2,
    color: Theme.colors.text,
    fontSize: 9,
    fontWeight: '500',
  },
  bottomNavLabelActive: {
    color: Theme.colors.text,
    fontWeight: '700',
  },
});
