import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Alert, ImageBackground, Modal, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MainTopNavbar from '../../components/MainTopNavbar';
import { useAuth } from '../../context/AuthContext';
import { Theme } from '../../theme';
// react-native-svg removed — using pure RN ring

export default function HomeScreen({ navigation }: any) {
  const { logout, user } = useAuth();
  const [profileMenuVisible, setProfileMenuVisible] = useState(false);

  const handleLogout = async () => {
    try {
      setProfileMenuVisible(false);
      await logout();
      // Navigation will happen automatically when isAuthenticated becomes false
    } catch (e) {
      setProfileMenuVisible(false);
      Alert.alert('Error', 'Failed to log out');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <MainTopNavbar onProfilePress={() => setProfileMenuVisible(true)} />

      {/* Profile Menu Popup Modal */}
      <Modal visible={profileMenuVisible} transparent animationType="fade" onRequestClose={() => setProfileMenuVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setProfileMenuVisible(false)}>
          <View style={styles.profileMenuBox}>
            <View style={styles.profileMenuHeader}>
              <Text style={styles.profileMenuEmail} numberOfLines={1}>{user?.email || 'Driver'}</Text>
            </View>
            <TouchableOpacity style={styles.profileMenuItem} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={20} color="#ef4444" />
              <Text style={styles.profileMenuTextLogout}>Log Out</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        
        {/* Active Policy Status Section */}
        <View style={styles.section}>
          <View style={styles.policyCard}>
            <View style={styles.policyTextContainer}>
              <View style={styles.policyStatusRow}>
                <View style={styles.pulseDot} />
                <Text style={styles.policyStatusText}>ACTIVE PROTECTION</Text>
              </View>
              <Text style={styles.policyTitle}>Weekly Shield: Active</Text>
              <Text style={styles.policyExpiry}>Valid until Oct 27, 11:59 PM</Text>
              <TouchableOpacity style={styles.manageBtn}>
                <Text style={styles.manageBtnText}>Manage Policy</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.progressCircleContainer}>
              {/* Pure RN ring indicator */}
              <View style={styles.ringOuter}>
                <View style={styles.ringInner}>
                  <Text style={styles.progressText}>5/7</Text>
                  <Text style={styles.progressSub}>days</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Real-time Risk Monitoring */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Real-time Risk Monitoring</Text>
          <View style={styles.riskCard}>
            <View style={styles.mapContainer}>
              <ImageBackground 
                source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBiJph60ZNQDmRURhqIu5B32MFI3u9TuWtFbjMAoktbMR6NemYlooYtWxSLRAhRkPjUMQSmIZ783Nv-I911axfRZ3sedx1nzFaOdpDnOgapIvJOLUggAdxG4XjqJZTPEQUwrND566YyPccdco3FWMQtJOdx5Nm5jjBEelWGo5JTaSxPB-UsKbBXOuPwN-kV_WOCiPgyOVdMrVKKHQscB7ZdHwxLafuofaqhvazl-rKFyBT6VtnRHCOHgZcXCWI-sYucbTn_lGyWd7bl' }}
                style={styles.mapBg}
              />
              <View style={styles.mapOverlay}>
                <View style={styles.hexMarker}>
                  <Ionicons name="scan-outline" size={32} color={Theme.colors.primary} />
                </View>
              </View>
            </View>
            <View style={styles.riskContent}>
              <View style={styles.riskHeaderRow}>
                <View>
                  <Text style={styles.riskOverline}>CURRENT H3 ZONE</Text>
                  <Text style={styles.riskZoneName}>HSR Layout - Sector 7</Text>
                  <Text style={styles.riskCellId}>Cell ID: 8g3d45fffffffff</Text>
                </View>
                <View style={styles.riskBadgeCol}>
                  <View style={styles.riskBadge}>
                    <Text style={styles.riskBadgeText}>MEDIUM RISK</Text>
                  </View>
                  <Text style={styles.riskUpdateTime}>Updated 2m ago</Text>
                </View>
              </View>

              <View style={styles.riskStatsRow}>
                <View style={styles.riskStatBox}>
                  <Text style={styles.riskStatLabel}>TRAFFIC</Text>
                  <Text style={styles.riskStatValue}>High</Text>
                </View>
                <View style={styles.riskStatBox}>
                  <Text style={styles.riskStatLabel}>ACCIDENT %</Text>
                  <Text style={styles.riskStatValue}>1.2%</Text>
                </View>
                <View style={styles.riskStatBox}>
                  <Text style={styles.riskStatLabel}>DEMAND</Text>
                  <Text style={styles.riskStatValue}>Peak</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Quick Actions Grid */}
        <View style={styles.actionGrid}>
          <TouchableOpacity style={styles.actionBtn}>
            <View style={[styles.actionIconBg, { backgroundColor: '#eff6ff' }]}>
              <Ionicons name="map-outline" size={20} color="#2563eb" />
            </View>
            <Text style={styles.actionText}>View Map</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn}>
            <View style={[styles.actionIconBg, { backgroundColor: '#faf5ff' }]}>
              <Ionicons name="pulse-outline" size={20} color="#9333ea" />
            </View>
            <Text style={styles.actionText}>Monitoring</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('Wallet')}>
            <View style={[styles.actionIconBg, { backgroundColor: '#ecfdf5' }]}>
              <Ionicons name="wallet-outline" size={20} color="#059669" />
            </View>
            <Text style={styles.actionText}>Wallet</Text>
          </TouchableOpacity>
        </View>

        {/* Protected Earnings Summary */}
        <View style={styles.section}>
          <View style={styles.earningsCard}>
            <View style={styles.earningsHeaderRow}>
              <View>
                <Text style={styles.earningsOverline}>PROTECTED EARNINGS</Text>
                <Text style={styles.earningsAmount}>₹14,250.50</Text>
              </View>
              <Ionicons name="cash-outline" size={36} color="rgba(191,219,254,0.5)" />
            </View>
            <View style={styles.earningsDivider} />
            <View style={styles.earningsStatsRow}>
              <View>
                <Text style={styles.earningsStatLabel}>THIS MONTH</Text>
                <Text style={styles.earningsStatValue}>+₹2,400.00</Text>
              </View>
              <View style={styles.verticalDivider} />
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.earningsStatLabel}>PROTECTION FEE</Text>
                <Text style={styles.earningsStatValue}>₹120.00</Text>
              </View>
            </View>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Theme.colors.surface },
  container: { paddingBottom: 60 },
  section: { paddingHorizontal: Theme.spacing.lg, paddingTop: Theme.spacing.lg },

  policyCard: { flexDirection: 'row', alignItems: 'stretch', justifyContent: 'space-between', backgroundColor: '#fff', padding: 20, borderRadius: Theme.borderRadius.xl, borderWidth: 1, borderColor: Theme.colors.border },
  policyTextContainer: { flex: 3, gap: 12 },
  policyStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pulseDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#10b981' },
  policyStatusText: { fontSize: 10, fontWeight: '700', color: '#64748b', letterSpacing: 1 },
  policyTitle: { fontSize: 20, fontWeight: '800', color: '#0f172a' },
  policyExpiry: { fontSize: 14, color: '#64748b' },
  manageBtn: { backgroundColor: `${Theme.colors.primary}15`, paddingHorizontal: 16, paddingVertical: 8, borderRadius: Theme.borderRadius.md, alignSelf: 'flex-start' },
  manageBtnText: { color: Theme.colors.primary, fontSize: 14, fontWeight: '700' },
  progressCircleContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  ringOuter: { width: 72, height: 72, borderRadius: 36, borderWidth: 6, borderColor: `${Theme.colors.primary}33`, backgroundColor: `${Theme.colors.primary}08`, alignItems: 'center', justifyContent: 'center' },
  ringInner: { alignItems: 'center', justifyContent: 'center' },
  progressText: { fontSize: 13, fontWeight: '800', color: Theme.colors.primary, lineHeight: 16 },
  progressSub: { fontSize: 9, fontWeight: '600', color: '#64748b', textTransform: 'uppercase' },

  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a', marginBottom: 16 },
  riskCard: { backgroundColor: '#fff', borderRadius: Theme.borderRadius.xl, borderWidth: 1, borderColor: Theme.colors.border, overflow: 'hidden' },
  mapContainer: { height: 160, width: '100%', position: 'relative' },
  mapBg: { width: '100%', height: '100%' },
  mapOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  hexMarker: { width: 80, height: 80, backgroundColor: `${Theme.colors.primary}33`, borderWidth: 2, borderColor: Theme.colors.primary, borderRadius: Theme.borderRadius.lg, alignItems: 'center', justifyContent: 'center' },
  riskContent: { padding: Theme.spacing.lg, gap: 16 },
  riskHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  riskOverline: { fontSize: 10, fontWeight: '700', color: '#64748b', letterSpacing: 0.5, marginBottom: 4 },
  riskZoneName: { fontSize: 16, fontWeight: '800', color: '#0f172a', lineHeight: 22 },
  riskCellId: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  riskBadgeCol: { alignItems: 'flex-end' },
  riskBadge: { backgroundColor: '#fef3c7', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: '#fde68a' },
  riskBadgeText: { fontSize: 10, fontWeight: '800', color: '#d97706', letterSpacing: 0.5 },
  riskUpdateTime: { fontSize: 10, color: '#94a3b8', fontStyle: 'italic', marginTop: 4 },
  riskStatsRow: { flexDirection: 'row', gap: 8 },
  riskStatBox: { flex: 1, backgroundColor: Theme.colors.surface, padding: 8, borderRadius: Theme.borderRadius.md, alignItems: 'center' },
  riskStatLabel: { fontSize: 10, fontWeight: '800', color: '#64748b' },
  riskStatValue: { fontSize: 14, fontWeight: '800', color: '#0f172a', marginTop: 2 },

  actionGrid: { flexDirection: 'row', gap: 12, paddingHorizontal: Theme.spacing.lg, paddingTop: Theme.spacing.md },
  actionBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, padding: Theme.spacing.md, backgroundColor: '#fff', borderRadius: Theme.borderRadius.xl, borderWidth: 1, borderColor: Theme.colors.border },
  actionIconBg: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  actionText: { fontSize: 12, fontWeight: '800', color: '#334155' },

  earningsCard: { backgroundColor: Theme.colors.primary, borderRadius: Theme.borderRadius.xl, padding: 20, shadowColor: Theme.colors.primary, shadowOpacity: 0.2, shadowRadius: 10, shadowOffset: { width: 0, height: 5 } },
  earningsHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  earningsOverline: { fontSize: 10, fontWeight: '800', color: 'rgba(219,234,254,0.8)', letterSpacing: 1, marginBottom: 4 },
  earningsAmount: { fontSize: 30, fontWeight: '900', color: '#fff', letterSpacing: -0.5 },
  earningsDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginBottom: 16 },
  earningsStatsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  earningsStatLabel: { fontSize: 10, fontWeight: '800', color: 'rgba(219,234,254,0.6)', textTransform: 'uppercase' },
  earningsStatValue: { fontSize: 14, fontWeight: '800', color: '#fff', marginTop: 2 },
  verticalDivider: { width: 1, height: 32, backgroundColor: 'rgba(255,255,255,0.1)' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.1)', justifyContent: 'flex-start', alignItems: 'flex-end', paddingRight: Theme.spacing.lg, paddingTop: 60 },
  profileMenuBox: { backgroundColor: '#fff', borderRadius: Theme.borderRadius.lg, padding: 8, width: 200, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 5 },
  profileMenuHeader: { padding: Theme.spacing.md, borderBottomWidth: 1, borderBottomColor: Theme.colors.border, marginBottom: 8 },
  profileMenuEmail: { fontSize: 13, fontWeight: '700', color: '#64748b' },
  profileMenuItem: { flexDirection: 'row', alignItems: 'center', padding: Theme.spacing.md, gap: 12, borderRadius: Theme.borderRadius.md, backgroundColor: '#fef2f2' },
  profileMenuTextLogout: { fontSize: 14, fontWeight: '700', color: '#ef4444' },
});
