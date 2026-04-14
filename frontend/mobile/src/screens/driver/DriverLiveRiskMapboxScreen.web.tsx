import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import DriverLogoutMenu from '../../components/driver/DriverLogoutMenu';
import { useAuth } from '../../context/AuthContext';

const BRAND_BG = '#ff6b53';
const CARD_BG = '#f0ecce';

export default function DriverLiveRiskScreenWeb() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const [profileMenuVisible, setProfileMenuVisible] = React.useState(false);

  const handleLogout = async () => {
    try {
      setProfileMenuVisible(false);
      await logout();
    } catch {
      Alert.alert(t('common.error'), t('common.logout_failed'));
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <DriverLogoutMenu
        visible={profileMenuVisible}
        userEmail={user?.email}
        onClose={() => setProfileMenuVisible(false)}
        onLogout={() => { void handleLogout(); }}
      />

      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="umbrella" size={28} color="#000" style={{ transform: [{ rotate: '-15deg' }] }} />
          <Text style={styles.headerTitle}>Aegis</Text>
        </View>
        <TouchableOpacity style={styles.avatarContainer} onPress={() => setProfileMenuVisible(true)}>
          <Ionicons name="person-circle-outline" size={30} color="#111827" />
        </TouchableOpacity>
      </View>

      <View style={styles.container}>
        <View style={[styles.neoCard, styles.mapCardWrapper]}>
          <Ionicons name="desktop-outline" size={34} color="#111827" />
          <Text style={styles.title}>{t('live_risk.title', { defaultValue: 'Live Risk Map' })}</Text>
          <Text style={styles.description}>
            Web preview mode is active. Native map rendering is available on Android and iOS builds.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BRAND_BG,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#111827',
  },
  avatarContainer: {
    borderWidth: 2,
    borderColor: '#111827',
    borderRadius: 22,
    padding: 6,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
    padding: 20,
  },
  neoCard: {
    backgroundColor: CARD_BG,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#111827',
    shadowColor: '#111827',
    shadowOpacity: 0.14,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  mapCardWrapper: {
    flex: 1,
    minHeight: 220,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    color: '#111827',
  },
  description: {
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 20,
    color: '#1f2937',
  },
});
