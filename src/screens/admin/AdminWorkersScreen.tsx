import { MaterialIcons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
    Alert,
    Modal,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { Theme } from '../../theme';

export default function AdminWorkersScreen({ navigation }: any) {
  const { logout, user } = useAuth();

  const [profileMenuVisible, setProfileMenuVisible] = useState(false);
  const [search, setSearch] = useState('');

  const handleLogout = async () => {
    try {
      setProfileMenuVisible(false);
      await logout();
    } catch {
      setProfileMenuVisible(false);
      Alert.alert('Error', 'Failed to log out');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.root}>
        {/* Main Header */}
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.headerTitle}>WORKERS</Text>
              <Text style={styles.headerSubtitle}>REGISTERED WORKER OVERVIEW</Text>
            </View>

            <TouchableOpacity style={styles.avatar} onPress={() => setProfileMenuVisible(true)} activeOpacity={0.8}>
              <MaterialIcons name="person" size={20} color={Theme.colors.text} />
            </TouchableOpacity>
          </View>
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
          {/* Search Section */}
          <View style={styles.searchSection}>
            <View style={styles.searchWrap}>
              <View style={styles.searchIcon}>
                <MaterialIcons name="search" size={18} color={Theme.colors.text} />
              </View>
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search workers"
                placeholderTextColor={Theme.colors.textSecondary}
                style={styles.searchInput}
              />
            </View>
          </View>

          {/* Filter Section */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersRow}>
            <FilterChip label="City" />
            <FilterChip label="Platform" />
            <FilterChip label="Risk Level" />
          </ScrollView>

          {/* Worker Summary Strip */}
          <View style={styles.summaryStrip}>
            <SummaryCell label="Total Workers" value="0" isRightBorder />
            <SummaryCell label="High Risk" value="0" isRightBorder />
            <SummaryCell label="Active Plans" value="0" />
          </View>

          {/* Worker List Empty State */}
          <View style={styles.emptySection}>
            <View style={styles.emptyCard}>
              <MaterialIcons name="group" size={44} color={Theme.colors.border} />
              <Text style={styles.emptyTitle}>No workers registered yet</Text>
              <Text style={styles.emptySubtitle}>Registered worker profiles will appear here</Text>
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
            active
            label="Workers"
            icon={<MaterialIcons name="group" size={24} color={Theme.colors.text} />}
            onPress={() => {}}
          />
          <BottomNavItem
            label="Claims"
            icon={<MaterialIcons name="security" size={24} color={Theme.colors.text} />}
            onPress={() => navigation.navigate('AdminClaims')}
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

function FilterChip({ label }: { label: string }) {
  return (
    <TouchableOpacity style={styles.filterChip} activeOpacity={0.8}>
      <Text style={styles.filterChipText}>{label.toUpperCase()}</Text>
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
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
    backgroundColor: Theme.colors.background,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 0.5,
    color: Theme.colors.text,
  },
  headerSubtitle: {
    marginTop: 4,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 2,
    color: Theme.colors.textSecondary,
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

  scrollContent: {
    paddingBottom: 110,
  },

  searchSection: {
    paddingHorizontal: Theme.spacing.lg,
    paddingTop: Theme.spacing.lg,
    paddingBottom: Theme.spacing.sm,
  },
  searchWrap: {
    position: 'relative',
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderRadius: Theme.borderRadius.md,
    backgroundColor: Theme.colors.background,
    height: 48,
    justifyContent: 'center',
  },
  searchIcon: {
    position: 'absolute',
    left: 12,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  searchInput: {
    paddingLeft: 40,
    paddingRight: 12,
    fontSize: 14,
    color: Theme.colors.text,
    height: 48,
  },

  filtersRow: {
    paddingHorizontal: Theme.spacing.lg,
    paddingTop: Theme.spacing.md,
    paddingBottom: Theme.spacing.md,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderRadius: Theme.borderRadius.md,
    backgroundColor: Theme.colors.background,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
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
    letterSpacing: 1.6,
    color: Theme.colors.textSecondary,
  },
  summaryValue: {
    marginTop: 4,
    fontSize: 24,
    fontWeight: '300',
    color: Theme.colors.text,
  },

  emptySection: {
    flex: 1,
    paddingHorizontal: Theme.spacing.lg,
    paddingTop: Theme.spacing.xl,
    paddingBottom: Theme.spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCard: {
    width: '100%',
    maxWidth: 420,
    padding: Theme.spacing.xl,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Theme.colors.border,
    borderRadius: Theme.borderRadius.lg,
    alignItems: 'center',
    gap: 10,
  },
  emptyTitle: {
    marginTop: 4,
    fontSize: 18,
    fontWeight: '600',
    color: Theme.colors.text,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Theme.colors.textSecondary,
    textAlign: 'center',
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
