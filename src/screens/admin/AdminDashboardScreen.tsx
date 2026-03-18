import { MaterialIcons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  Alert,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { Theme } from '../../theme';

export default function AdminDashboardScreen({ navigation }: any) {
  const { logout, user } = useAuth();
  const [profileMenuVisible, setProfileMenuVisible] = useState(false);

  const handleLogout = async () => {
    try {
      setProfileMenuVisible(false);
      await logout();
      // Navigation will happen automatically when isAuthenticated becomes false
    } catch {
      setProfileMenuVisible(false);
      Alert.alert('Error', 'Failed to log out');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.root}>
        {/* Top Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>ADMIN DASHBOARD</Text>
            <Text style={styles.headerSubtitle}>OPERATIONAL OVERVIEW</Text>
          </View>
          <TouchableOpacity style={styles.avatar} onPress={() => setProfileMenuVisible(true)} activeOpacity={0.8}>
            <MaterialIcons name="person" size={20} color={Theme.colors.text} />
          </TouchableOpacity>
        </View>

        {/* Profile Menu Popup Modal */}
        <Modal
          visible={profileMenuVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setProfileMenuVisible(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setProfileMenuVisible(false)}
          >
            <View style={styles.profileMenuBox}>
              <View style={styles.profileMenuHeader}>
                <Text style={styles.profileMenuEmail} numberOfLines={1}>
                  {user?.email || 'Admin'}
                </Text>
              </View>
              <TouchableOpacity style={styles.profileMenuItem} onPress={handleLogout}>
                <MaterialIcons name="logout" size={20} color="#ef4444" />
                <Text style={styles.profileMenuTextLogout}>Log Out</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Overview Grid */}
          <View style={styles.overviewGrid}>
            <OverviewCell label="Total Workers" value="0" />
            <OverviewCell label="Active Plans" value="0" isRight />
            <OverviewCell label="Active Alerts" value="0" isTop />
            <OverviewCell label="Claims Today" value="0" isTop isRight />
            <OverviewCell label="High Risk Workers" value="0" isTop />
            <OverviewCell label="Simulated Payout" value="₹0" isTop isRight />
          </View>

          {/* Quick Actions */}
          <View style={styles.section}>
            <Text style={styles.sectionKicker}>QUICK ACTIONS</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickActionsRow}>
              <QuickAction icon={<MaterialIcons name="add-alert" size={22} color={Theme.colors.text} />} label="Alert" />
              <QuickAction
                icon={<MaterialIcons name="group" size={22} color={Theme.colors.text} />}
                label="Workers"
                onPress={() => navigation.navigate('AdminWorkers')}
              />
              <QuickAction
                icon={<MaterialIcons name="description" size={22} color={Theme.colors.text} />}
                label="Claims"
                onPress={() => navigation.navigate('AdminClaims')}
              />
              <QuickAction icon={<MaterialIcons name="analytics" size={22} color={Theme.colors.text} />} label="Analytics" />
            </ScrollView>
          </View>

          {/* Risk Overview Chart Placeholder */}
          <View style={styles.section}>
            <Text style={styles.sectionKicker}>RISK DISTRIBUTION</Text>
            <View style={styles.riskPlaceholder}>
              <MaterialIcons name="monitor" size={40} color={Theme.colors.text} />
              <Text style={styles.placeholderText}>No risk data available</Text>
            </View>
          </View>

          {/* Recent Alerts (Empty State) */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionKicker}>RECENT ALERTS</Text>
              <Text style={styles.viewAll}>VIEW ALL</Text>
            </View>
            <View style={styles.emptyBox}>
              <Text style={styles.emptyBoxText}>No active alerts detected</Text>
            </View>
          </View>

          {/* Recent Claims (Empty State) */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionKicker}>RECENT CLAIMS</Text>
              <Text style={styles.viewAll}>VIEW ALL</Text>
            </View>
            <View style={styles.emptyBox}>
              <Text style={styles.emptyBoxText}>No claims to display</Text>
            </View>
          </View>
        </ScrollView>

        {/* Bottom Navigation Bar */}
        <View style={styles.bottomNav}>
          <BottomNavItem
            active
            icon={<MaterialIcons name="dashboard" size={24} color={Theme.colors.text} />}
            label="Dash"
            onPress={() => {}}
          />
          <BottomNavItem
            icon={<MaterialIcons name="group" size={24} color={Theme.colors.text} />}
            label="Workers"
            onPress={() => navigation.navigate('AdminWorkers')}
          />
          <BottomNavItem
            icon={<MaterialIcons name="security" size={24} color={Theme.colors.text} />}
            label="Claims"
            onPress={() => navigation.navigate('AdminClaims')}
          />
          <BottomNavItem
            icon={<MaterialIcons name="settings" size={24} color={Theme.colors.text} />}
            label="Setup"
            onPress={() => navigation.navigate('AdminSetup')}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

function OverviewCell({
  label,
  value,
  isTop,
  isRight,
}: {
  label: string;
  value: string;
  isTop?: boolean;
  isRight?: boolean;
}) {
  return (
    <View
      style={[
        styles.overviewCell,
        isTop ? styles.cellTopBorder : null,
        isRight ? styles.cellRightBorder : null,
      ]}
    >
      <Text style={styles.cellLabel}>{label.toUpperCase()}</Text>
      <Text style={styles.cellValue}>{value}</Text>
    </View>
  );
}

function QuickAction({
  icon,
  label,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity style={styles.quickActionBtn} activeOpacity={0.8} onPress={onPress}>
      <View style={styles.quickActionIcon}>{icon}</View>
      <Text style={styles.quickActionLabel}>{label.toUpperCase()}</Text>
    </TouchableOpacity>
  );
}

function BottomNavItem({
  icon,
  label,
  active,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.bottomNavItem, active ? styles.bottomNavItemActive : null]}
      activeOpacity={0.8}
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

  header: {
    paddingHorizontal: Theme.spacing.lg,
    paddingTop: Theme.spacing.xxl,
    paddingBottom: Theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
    backgroundColor: Theme.colors.background,
  },
  headerLeft: { flexDirection: 'column', gap: 4 },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
    color: Theme.colors.text,
  },
  headerSubtitle: {
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 2,
    color: Theme.colors.text,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: Theme.borderRadius.full,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Theme.colors.background,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.1)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingRight: Theme.spacing.lg,
    paddingTop: 60,
  },
  profileMenuBox: {
    backgroundColor: Theme.colors.background,
    borderRadius: Theme.borderRadius.lg,
    padding: 8,
    width: 220,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  profileMenuHeader: {
    padding: Theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
    marginBottom: 8,
  },
  profileMenuEmail: {
    fontSize: 13,
    fontWeight: '700',
    color: Theme.colors.text,
  },
  profileMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Theme.spacing.md,
    gap: 12,
    borderRadius: Theme.borderRadius.md,
    backgroundColor: '#fef2f2',
  },
  profileMenuTextLogout: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ef4444',
  },

  scrollContent: {
    paddingBottom: 110,
  },

  overviewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
    backgroundColor: Theme.colors.background,
  },
  overviewCell: {
    width: '50%',
    paddingHorizontal: Theme.spacing.lg,
    paddingVertical: Theme.spacing.lg,
    backgroundColor: Theme.colors.background,
  },
  cellTopBorder: {
    borderTopWidth: 1,
    borderTopColor: Theme.colors.border,
  },
  cellRightBorder: {
    borderLeftWidth: 1,
    borderLeftColor: Theme.colors.border,
  },
  cellLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1.6,
    color: Theme.colors.text,
  },
  cellValue: {
    marginTop: 4,
    fontSize: 26,
    fontWeight: '300',
    color: Theme.colors.text,
  },

  section: {
    paddingHorizontal: Theme.spacing.lg,
    paddingTop: Theme.spacing.lg,
  },
  sectionKicker: {
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 2,
    color: Theme.colors.text,
  },

  quickActionsRow: {
    paddingTop: Theme.spacing.md,
    paddingBottom: Theme.spacing.xs,
    gap: 12,
  },
  quickActionBtn: {
    width: 90,
    height: 90,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Theme.colors.background,
  },
  quickActionIcon: { marginBottom: 8 },
  quickActionLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1,
    color: Theme.colors.text,
  },

  riskPlaceholder: {
    marginTop: Theme.spacing.md,
    width: '100%',
    aspectRatio: 16 / 9,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Theme.colors.background,
  },
  placeholderText: { fontSize: 12, color: Theme.colors.text },

  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  viewAll: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1.6,
    color: Theme.colors.text,
    textDecorationLine: 'underline',
    textDecorationStyle: 'solid',
  },
  emptyBox: {
    marginTop: Theme.spacing.md,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    padding: Theme.spacing.xl,
    alignItems: 'center',
    backgroundColor: Theme.colors.background,
  },
  emptyBoxText: { fontSize: 12, color: Theme.colors.text },

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
    fontSize: 9,
    letterSpacing: 2,
    color: Theme.colors.text,
    fontWeight: '500',
  },
  bottomNavLabelActive: {
    color: Theme.colors.text,
    fontWeight: '700',
  },
});
