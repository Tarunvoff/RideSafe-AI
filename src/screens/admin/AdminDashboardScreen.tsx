import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ImageBackground, Modal, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '../../theme';
import { useAuth } from '../../context/AuthContext';

export default function AdminDashboardScreen({ navigation }: any) {
  const { logout, user } = useAuth();
  const [profileMenuVisible, setProfileMenuVisible] = useState(false);

  const handleLogout = async () => {
    setProfileMenuVisible(false);
    try {
      await logout();
    } catch (e) {
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
        <Ionicons name="stats-chart" size={80} color={Theme.colors.border} />
        <Text style={styles.title}>Admin Dashboard Central</Text>
        <Text style={styles.subtitle}>Welcome to operations. More features coming soon.</Text>
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
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Theme.spacing.xl },
  title: { ...Theme.typography.h2, color: Theme.colors.text, marginTop: Theme.spacing.lg, marginBottom: Theme.spacing.sm, textAlign: 'center' },
  subtitle: { ...Theme.typography.body, color: Theme.colors.textSecondary, textAlign: 'center' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.1)', justifyContent: 'flex-start', alignItems: 'flex-end', paddingRight: Theme.spacing.lg, paddingTop: 60 },
  profileMenuBox: { backgroundColor: '#fff', borderRadius: Theme.borderRadius.lg, padding: 8, width: 220, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 5 },
  profileMenuHeader: { padding: Theme.spacing.md, borderBottomWidth: 1, borderBottomColor: Theme.colors.border, marginBottom: 8 },
  profileMenuEmail: { fontSize: 13, fontWeight: '700', color: '#64748b' },
  profileMenuItem: { flexDirection: 'row', alignItems: 'center', padding: Theme.spacing.md, gap: 12, borderRadius: Theme.borderRadius.md, backgroundColor: '#fef2f2' },
  profileMenuTextLogout: { fontSize: 14, fontWeight: '700', color: '#ef4444' },
});
