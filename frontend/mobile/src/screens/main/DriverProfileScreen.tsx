import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View, Image } from 'react-native';
import MainTopNavbar from '../../components/MainTopNavbar';
import DriverBottomNavbar from '../../components/DriverBottomNavbar';
import DriverLogoutMenu from '../../components/DriverLogoutMenu';
import { useAuth } from '../../context/AuthContext';
import { Theme } from '../../theme';

export default function DriverProfileScreen({ navigation }: any) {
  const { logout, user } = useAuth();
  const [profileMenuVisible, setProfileMenuVisible] = useState(false);

  const handleLogout = async () => {
    try {
      setProfileMenuVisible(false);
      await logout();
    } catch {
      setProfileMenuVisible(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <MainTopNavbar onProfilePress={() => setProfileMenuVisible(true)} />

      <DriverLogoutMenu
        visible={profileMenuVisible}
        userEmail={user?.email ?? null}
        onClose={() => setProfileMenuVisible(false)}
        onLogout={() => {
          void handleLogout();
        }}
      />

      <ScrollView
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerSection}>
          <Text style={styles.headerTitle}>Profile</Text>
          <Text style={styles.headerSubtitle}>Manage your professional identity</Text>
        </View>

        <View style={styles.driverCard}>
          <View style={styles.avatarWrap}>
            <Image
              source={{
                uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBQT01w9FFlrGiacx3oFRYd0JAN6CpBNXfADCxTKWTMfRgscSlgrs1Bp5oZtgKm7u2K7__lpkC5UUvo238I4gRoBYOWNRBVAgzY9tNbxyuFk6DqQkoaPIRC5--Xj-b6XBaGq06FreaLTsi0OqLv06UJS_h5j7QJ29JG7KeYzz4lNfpSFNaqpF2vvGgb8S_hben5AhgK15MpvxEHFP0vCgvuWB5p12omcczF8tv03W_GEjTtudb_G39t3kVDWqaygfX4Qgp-Wb7V_b3W',
              }}
              style={styles.avatarImg}
            />
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={14} color="#ffffff" />
            </View>
          </View>

          <View style={styles.driverInfo}>
            <View style={styles.driverNameRow}>
              <Text style={styles.driverName}>Alex Rivera</Text>
              <View style={styles.driverVerifiedPill}>
                <Text style={styles.driverVerifiedText}>VERIFIED</Text>
              </View>
            </View>
            <Text style={styles.driverId}>GS-99281</Text>
            <Text style={styles.driverPhone}>+1 (555) 012-3456</Text>
          </View>

          <TouchableOpacity style={styles.editBtn} activeOpacity={0.8}>
            <Ionicons name="pencil" size={18} color="#111827" />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionOverline}>SYSTEM STATUS</Text>
            <View style={styles.liveRow}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>Live</Text>
            </View>
          </View>

          <View style={styles.systemGrid}>
            <View style={styles.systemCell}>
              <Text style={styles.systemLabel}>Auto Respond</Text>
              <View style={styles.systemValueRow}>
                <Text style={styles.systemValue}>On</Text>
                <Ionicons name="checkmark-circle" size={20} color="#16a34a" />
              </View>
            </View>
            <View style={styles.systemCell}>
              <Text style={styles.systemLabel}>Location</Text>
              <View style={styles.systemValueRow}>
                <Text style={styles.systemValue}>Granted</Text>
                <Ionicons name="location" size={20} color="#16a34a" />
              </View>
            </View>
            <View style={styles.systemCell}>
              <Text style={styles.systemLabel}>Ping Response</Text>
              <View style={styles.systemValueRow}>
                <Text style={styles.systemValue}>Active</Text>
                <Ionicons name="flash" size={20} color="#16a34a" />
              </View>
            </View>
            <View style={styles.systemCell}>
              <Text style={styles.systemLabel}>Last Sync</Text>
              <View style={styles.systemValueRow}>
                <Text style={styles.systemValue}>2m ago</Text>
                <Ionicons name="sync" size={18} color="#9ca3af" />
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionOverline}>PREFERENCES</Text>

          <View style={styles.prefCard}>
            <View style={styles.prefItemFirst}>
              <View style={styles.prefLabelRow}>
                <Ionicons name="sparkles-outline" size={20} color="#6b7280" />
                <Text style={styles.prefTitle}>Enable Auto Respond</Text>
              </View>
              <View style={styles.toggleShell}>
                <View style={styles.toggleThumb} />
              </View>
            </View>

            <View style={styles.prefDivider} />

            <TouchableOpacity style={styles.prefItem} activeOpacity={0.8}>
              <View style={styles.prefLabelRow}>
                <Ionicons name="notifications-outline" size={20} color="#6b7280" />
                <Text style={styles.prefTitle}>Notification Settings</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
            </TouchableOpacity>

            <View style={styles.prefDivider} />

            <TouchableOpacity style={styles.prefItem} activeOpacity={0.8}>
              <View style={styles.prefLabelRow}>
                <Ionicons name="lock-closed-outline" size={20} color="#6b7280" />
                <Text style={styles.prefTitle}>Data & Privacy</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
            </TouchableOpacity>

            <View style={styles.prefDivider} />

            <TouchableOpacity style={styles.prefItem} activeOpacity={0.8}>
              <View style={styles.prefLabelRow}>
                <Ionicons name="help-circle-outline" size={20} color="#6b7280" />
                <Text style={styles.prefTitle}>Help & Support</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <TouchableOpacity style={styles.kycButton} activeOpacity={0.9}>
            <Text style={styles.kycButtonText}>View KYC Details</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.logoutButton}
            activeOpacity={0.9}
            onPress={() => {
              void handleLogout();
            }}
          >
            <Text style={styles.logoutButtonText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <DriverBottomNavbar navigation={navigation} activeKey="profile" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f8f9fa' },
  contentContainer: {
    paddingHorizontal: Theme.spacing.lg,
    paddingTop: Theme.spacing.lg,
    paddingBottom: 120,
  },
  headerSection: { marginBottom: Theme.spacing.lg },
  headerTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: '#111827',
  },
  headerSubtitle: {
    marginTop: 4,
    fontSize: 13,
    color: '#6b7280',
  },
  driverCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Theme.spacing.md,
    borderRadius: Theme.borderRadius.xl,
    backgroundColor: '#ffffff',
    marginBottom: Theme.spacing.lg,
    shadowColor: '#111827',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  avatarWrap: { marginRight: Theme.spacing.md },
  avatarImg: { width: 64, height: 64, borderRadius: 32 },
  verifiedBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#16a34a',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  driverInfo: { flex: 1 },
  driverNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  driverName: { fontSize: 18, fontWeight: '700', color: '#111827' },
  driverVerifiedPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: '#dcfce7',
  },
  driverVerifiedText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#166534',
    letterSpacing: 0.8,
  },
  driverId: { fontSize: 13, color: '#6b7280', fontWeight: '500' },
  driverPhone: { marginTop: 2, fontSize: 11, color: '#9ca3af' },
  editBtn: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: '#f3f4f6',
  },

  section: { marginBottom: Theme.spacing.lg },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Theme.spacing.sm,
  },
  sectionOverline: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    color: '#6b7280',
  },
  liveRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#16a34a' },
  liveText: { fontSize: 10, color: '#16a34a', fontWeight: '600' },

  systemGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  systemCell: {
    flexBasis: '48%',
    backgroundColor: '#f3f4f6',
    borderRadius: Theme.borderRadius.lg,
    padding: Theme.spacing.md,
  },
  systemLabel: {
    fontSize: 10,
    textTransform: 'uppercase',
    color: '#6b7280',
    fontWeight: '600',
    marginBottom: 6,
  },
  systemValueRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  systemValue: { fontSize: 14, fontWeight: '700', color: '#111827' },

  prefCard: {
    backgroundColor: '#f3f4f6',
    borderRadius: Theme.borderRadius.lg,
    overflow: 'hidden',
  },
  prefItemFirst: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.md,
    backgroundColor: '#ffffff',
  },
  prefItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.md,
    backgroundColor: '#ffffff',
  },
  prefLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  prefTitle: { fontSize: 14, color: '#111827', fontWeight: '500' },
  prefDivider: { height: 1, backgroundColor: '#e5e7eb', marginHorizontal: Theme.spacing.md },
  toggleShell: {
    width: 40,
    height: 24,
    borderRadius: 999,
    backgroundColor: '#16a34a',
    padding: 3,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  toggleThumb: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  },

  kycButton: {
    width: '100%',
    backgroundColor: '#e5e7eb',
    paddingVertical: 14,
    borderRadius: Theme.borderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  kycButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  logoutButton: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: Theme.borderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#fecaca',
    backgroundColor: '#fef2f2',
  },
  logoutButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#b91c1c',
  },
  // Bottom nav styles removed (shared DriverBottomNavbar is used)
});

