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

export default function AdminClaimsScreen({ navigation }: any) {
  const { logout, user } = useAuth();
  const [profileMenuVisible, setProfileMenuVisible] = useState(false);

  const handleLogout = async () => {
    try {
      setProfileMenuVisible(false);
      await logout();
    } catch {
      setProfileMenuVisible(false);
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
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerBtn} activeOpacity={0.8} onPress={handleBack}>
            <MaterialIcons name="arrow-back" size={20} color={Theme.colors.text} />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>CLAIMS</Text>
          </View>

          <TouchableOpacity style={styles.avatar} onPress={() => setProfileMenuVisible(true)} activeOpacity={0.8}>
            <MaterialIcons name="person" size={20} color={Theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <View style={styles.kickerWrap}>
          <Text style={styles.kicker}>CLAIMS AND PAYOUT MONITORING</Text>
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

        {/* Filters */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersRow}
          style={styles.filtersScroll}
        >
          <FilterButton label="City" />
          <FilterButton label="Claim Type" />
          <FilterButton label="Status" />
        </ScrollView>

        {/* Summary */}
        <View style={styles.summaryStrip}>
          <SummaryCell label="Total Claims" value="0" isRightBorder />
          <SummaryCell label="Pending Review" value="0" isRightBorder />
          <SummaryCell label="Total Payout" value="₹0" />
        </View>

        {/* Empty State */}
        <View style={styles.emptyWrap}>
          <View style={styles.emptyIconWrap}>
            <MaterialIcons name="receipt-long" size={64} color={Theme.colors.text} />
          </View>
          <Text style={styles.emptyTitle}>No claims available</Text>
          <Text style={styles.emptySubtitle}>Claim records and payout activity will appear here</Text>
        </View>

        {/* Bottom Nav */}
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
            active
            label="Claims"
            icon={<MaterialIcons name="security" size={24} color={Theme.colors.text} />}
            onPress={() => {}}
          />
          <BottomNavItem
            label="Setup"
            icon={<MaterialIcons name="settings" size={24} color={Theme.colors.text} />}
            onPress={() => navigation.navigate('AdminSetup')}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

function FilterButton({ label }: { label: string }) {
  return (
    <TouchableOpacity style={styles.filterBtn} activeOpacity={0.85}>
      <Text style={styles.filterText}>{label.toUpperCase()}</Text>
      <MaterialIcons name="expand-more" size={18} color={Theme.colors.textSecondary} />
    </TouchableOpacity>
  );
}

function SummaryCell({
  label,
  value,
  isRightBorder,
}: {
  label: string;
  value: string;
  isRightBorder?: boolean;
}) {
  return (
    <View style={[styles.summaryCell, isRightBorder ? styles.summaryCellRightBorder : null]}>
      <Text style={styles.summaryLabel}>{label.toUpperCase()}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
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
      activeOpacity={0.8}
      onPress={onPress}
    >
      {icon}
      <Text style={[styles.bottomNavLabel, active ? styles.bottomNavLabelActive : null]}>{label.toUpperCase()}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Theme.colors.background },
  root: { flex: 1, backgroundColor: Theme.colors.background },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Theme.spacing.lg,
    paddingTop: Theme.spacing.xxl,
    paddingBottom: Theme.spacing.sm,
    backgroundColor: Theme.colors.background,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: Theme.borderRadius.full,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Theme.colors.background,
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 3,
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
    overflow: 'hidden',
    backgroundColor: Theme.colors.surface,
  },

  kickerWrap: {
    paddingHorizontal: Theme.spacing.lg,
    paddingTop: Theme.spacing.sm,
    paddingBottom: Theme.spacing.md,
    alignItems: 'center',
  },
  kicker: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
    color: Theme.colors.textSecondary,
    textAlign: 'center',
  },

  filtersScroll: { flexGrow: 0 },
  filtersRow: {
    paddingHorizontal: Theme.spacing.lg,
    paddingBottom: Theme.spacing.lg,
    gap: 8,
  },
  filterBtn: {
    height: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    paddingHorizontal: 16,
    backgroundColor: Theme.colors.background,
  },
  filterText: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.2,
    color: Theme.colors.text,
  },

  summaryStrip: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Theme.colors.border,
    backgroundColor: Theme.colors.background,
  },
  summaryCell: {
    flex: 1,
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.md,
  },
  summaryCellRightBorder: {
    borderRightWidth: 1,
    borderRightColor: Theme.colors.border,
  },
  summaryLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: Theme.colors.textSecondary,
  },
  summaryValue: {
    marginTop: 4,
    fontSize: 20,
    fontWeight: '300',
    color: Theme.colors.text,
  },

  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Theme.spacing.xl,
    paddingBottom: 110,
  },
  emptyIconWrap: {
    opacity: 0.2,
    marginBottom: Theme.spacing.lg,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Theme.colors.text,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 12,
    color: Theme.colors.textSecondary,
    textAlign: 'center',
    maxWidth: 220,
    lineHeight: 18,
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
    fontSize: 9,
    letterSpacing: 2,
    color: Theme.colors.text,
    fontWeight: '500',
  },
  bottomNavLabelActive: {
    color: Theme.colors.text,
    fontWeight: '700',
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
});
