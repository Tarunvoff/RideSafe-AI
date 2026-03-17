import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Alert, Modal, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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
    } catch (e) {
      setProfileMenuVisible(false);
      Alert.alert('Error', 'Failed to log out');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.logoRow}>
          <Ionicons name="shield-checkmark" size={24} color={Theme.colors.primary} />
          <Text style={styles.headerTitle}>Admin Portal</Text>
        </View>
        
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.iconBtn}>
            <Ionicons name="notifications-outline" size={24} color={Theme.colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.avatarContainer} onPress={() => setProfileMenuVisible(true)}>
            <View style={styles.adminAvatarPlaceholder}>
              <Ionicons name="shield-half" size={16} color="#fff" />
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* Profile Menu Popup Modal */}
      <Modal visible={profileMenuVisible} transparent animationType="fade" onRequestClose={() => setProfileMenuVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setProfileMenuVisible(false)}>
          <View style={styles.profileMenuBox}>
            <View style={styles.profileMenuHeader}>
              <Text style={styles.profileMenuEmail} numberOfLines={1}>{user?.email || 'Admin'}</Text>
            </View>
            <TouchableOpacity style={styles.profileMenuItem} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={20} color="#ef4444" />
              <Text style={styles.profileMenuTextLogout}>Log Out</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <View style={styles.container}>
        <View style={styles.statsOverview}>
          <TouchableOpacity 
            style={styles.actionCard}
            onPress={() => navigation.navigate('AdminFraudReview')}
          >
            <View style={[styles.cardIcon, { backgroundColor: '#fef3c7' }]}>
               <Ionicons name="shield" size={32} color={Theme.colors.primary} />
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>Fraud Reviews</Text>
              <Text style={styles.cardSubtitle}>Monitor and manual review GPS spoofing alerts</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={Theme.colors.border} />
          </TouchableOpacity>
        </View>

        <View style={styles.emptyState}>
          <Ionicons name="stats-chart" size={48} color={Theme.colors.border} />
          <Text style={styles.emptyTitle}>Operational Metrics</Text>
          <Text style={styles.emptySub}>Detailed analytics and driver reports will appear here as the system gathers more data.</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Theme.colors.surface },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Theme.spacing.lg, paddingVertical: Theme.spacing.md, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: Theme.colors.border, zIndex: 10 },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: Theme.spacing.sm },
  headerTitle: { ...Theme.typography.h3, color: '#0f172a', fontWeight: '800' as const },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20 },
  avatarContainer: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, borderColor: `${Theme.colors.primary}33`, overflow: 'hidden' },
  adminAvatarPlaceholder: { flex: 1, backgroundColor: '#475569', alignItems: 'center', justifyContent: 'center' },
  container: { flex: 1, padding: Theme.spacing.lg, gap: 20 },
  statsOverview: { width: '100%' },
  actionCard: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 16, 
    backgroundColor: '#fff', 
    borderRadius: 16, 
    borderWidth: 1, 
    borderColor: Theme.colors.border,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardIcon: { width: 56, height: 56, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cardContent: { flex: 1, marginLeft: 16 },
  cardTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  cardSubtitle: { fontSize: 12, color: '#64748b', marginTop: 2 },
  
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Theme.spacing.xl, backgroundColor: '#f9fafb', borderRadius: 24, borderStyle: 'dashed', borderWidth: 2, borderColor: '#e5e7eb', marginTop: 10 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: '#374151', marginTop: 16 },
  emptySub: { fontSize: 13, color: '#6b7280', textAlign: 'center', marginTop: 8, lineHeight: 20 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.1)', justifyContent: 'flex-start', alignItems: 'flex-end', paddingRight: Theme.spacing.lg, paddingTop: 60 },
  profileMenuBox: { backgroundColor: '#fff', borderRadius: Theme.borderRadius.lg, padding: 8, width: 220, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 5 },
  profileMenuHeader: { padding: Theme.spacing.md, borderBottomWidth: 1, borderBottomColor: Theme.colors.border, marginBottom: 8 },
  profileMenuEmail: { fontSize: 13, fontWeight: '700', color: '#64748b' },
  profileMenuItem: { flexDirection: 'row', alignItems: 'center', padding: Theme.spacing.md, gap: 12, borderRadius: Theme.borderRadius.md, backgroundColor: '#fef2f2' },
  profileMenuTextLogout: { fontSize: 14, fontWeight: '700', color: '#ef4444' },
});
