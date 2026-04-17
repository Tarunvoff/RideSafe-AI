/**
 * [EXCELLENCE SUMMARY]
 * The AdminShell is the architectural scaffolding for the administrative 
 * experience of the Aegis platform. It centralizes layout concerns, 
 * session management, and cross-screen navigation (Top/Bottom Navbars) 
 * into a single high-order component. This ensure that every admin 
 * screen inherits a consistent structural footprint and security posture.
 * 
 * [DOMAIN LOGIC]
 * Serves as the 'Operational Perimeter'. By wrapping all admin screens, 
 * it ensures that the 'Profile Menu' and 'Logout' functionality are 
 * always accessible, reinforcing the platform's focus on secure 
 * administrative control and operational transparency.
 */

import React, { useCallback, useState } from 'react';
import { SafeAreaView, StyleSheet, View } from 'react-native';
import AegisNavbar from './AegisNavbar';
import DriverLogoutMenu from '../driver/DriverLogoutMenu';
import AdminBottomNavbar, { type AdminBottomNavKey } from './AdminBottomNavbar';
import { useAuth } from '../../context/AuthContext';
import { Theme } from '../../theme';

type AdminShellProps = {
  navigation: any;
  /** Identifies the active segment in the BottomNavbar for visual feedback. */
  activeKey: AdminBottomNavKey;
  children: React.ReactNode;
};

export default function AdminShell({ navigation, activeKey, children }: AdminShellProps) {
  const { logout, user } = useAuth();
  const [profileMenuVisible, setProfileMenuVisible] = useState(false);

  /**
   * [IN-LINE PRIDE]: Graceful Session Termination
   * Manages the logout handshake between the UI and the AuthProvider. 
   * It ensures that the 'ProfileMenu' is cleared immediately while 
   * the persistent session is purged in the background, providing 
   * a seamless transition back to the entry gateway.
   */
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
      <AegisNavbar
        onProfile={() => setProfileMenuVisible(true)}
        onNotifications={() => {}}
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

