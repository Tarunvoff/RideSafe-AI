import React, { useCallback, useState } from 'react';
import { Alert, SafeAreaView, StyleSheet, View } from 'react-native';
import MainTopNavbar from './MainTopNavbar';
import DriverLogoutMenu from './DriverLogoutMenu';
import AdminBottomNavbar, { type AdminBottomNavKey } from './AdminBottomNavbar';
import { useAuth } from '../context/AuthContext';
import { Theme } from '../theme';

type AdminShellProps = {
  navigation: any;
  activeKey: AdminBottomNavKey;
  children: React.ReactNode;
};

export default function AdminShell({ navigation, activeKey, children }: AdminShellProps) {
  const { logout, user } = useAuth();
  const [profileMenuVisible, setProfileMenuVisible] = useState(false);

  const handleLogout = useCallback(async () => {
    try {
      await logout();
    } catch {
      // Ignore; AuthContext handles clearing session.
    } finally {
      setProfileMenuVisible(false);
    }
  }, [logout]);

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Sticky top admin navbar (stays outside of scroll views) */}
      <MainTopNavbar
        onProfilePress={() => setProfileMenuVisible(true)}
        onNotificationPress={() => Alert.alert('Notifications', 'No new notifications right now.')}
      />

      <DriverLogoutMenu
        visible={profileMenuVisible}
        userEmail={user?.email ?? null}
        onClose={() => setProfileMenuVisible(false)}
        onLogout={handleLogout}
      />

      {/* Page content */}
      <View style={styles.content}>{children}</View>

      {/* Shared bottom navbar */}
      <AdminBottomNavbar navigation={navigation} activeKey={activeKey} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Theme.colors.background },
  content: { flex: 1 },
});

