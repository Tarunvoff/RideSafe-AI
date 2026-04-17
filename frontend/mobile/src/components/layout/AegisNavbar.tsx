/**
 * [EXCELLENCE SUMMARY]
 * The AegisNavbar is the definitive identity anchor for the Aegis mobile ecosystem. 
 * Converging both Authentication and Operational contexts into a single, high-fidelity 
 * component, it ensures visual parity across the entire driver and admin journey. 
 * Designed with 'Neo-Brutalist' precision, it prioritizes clear brand signaling 
 * and instinctive navigation.
 * 
 * [DOMAIN LOGIC]
 * Serves as the 'Global Interaction Node'. It handles conditional rendering for 
 * back-navigation, profile access, and notification alerts while maintaining a 
 * fixed architectural footprint (64dp height). This stability reduces cognitive 
 * load for operators moving between high-stress logistics environments.
 */

import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { 
  StyleSheet, 
  View, 
  TouchableOpacity, 
  Image, 
  Text, 
  Platform, 
  StatusBar,
  ImageBackground
} from 'react-native';
import { Theme } from '../../theme';

interface AegisNavbarProps {
  /** Optional back button handler. If provided, replaces the logo as the far-left action. */
  onBack?: () => void;
  /** Callback for profile avatar tap. */
  onProfile?: () => void;
  /** Callback for notification bell tap. */
  onNotifications?: () => void;
  /** Custom title. If provided, replaces the brand 'Aegis' text. */
  title?: string;
  /** Override background color. Defaults to #fff. */
  backgroundColor?: string;
  /** Use light text/icons for dark/brilliant backgrounds. */
  light?: boolean;
  /** Force show the logo even if onBack is provided. */
  showLogoWithBack?: boolean;
}

export default function AegisNavbar({ 
  onBack, 
  onProfile, 
  onNotifications, 
  title, 
  backgroundColor, 
  light = false,
  showLogoWithBack = false
}: AegisNavbarProps) {
  const { t } = useTranslation();
  const textColor = '#000'; // Forced black for brand consistency
  const iconColor = '#000'; // Forced black for brand consistency
  const navBg = backgroundColor || Theme.colors.brandOrange;

  return (
    <View style={[styles.container, { backgroundColor: navBg }]}>
      {/* Left Section: [Back] [Logo] */}
      <View style={styles.sectionLeft}>
        {onBack && (
          <TouchableOpacity 
            style={styles.actionBtn} 
            onPress={onBack}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color={iconColor} />
          </TouchableOpacity>
        )}
        
        {(showLogoWithBack || !onBack) && (
          <Image
            source={require('../../../assets/images/productlogo.png')}
            style={[styles.logo, { tintColor: '#000' }]} // Black logo
            resizeMode="contain"
          />
        )}
        
        <Text style={[styles.brandText, { color: textColor }]}>
          {title || t('common.app_name')}
        </Text>
      </View>

      {/* Right Section: [Notifications] [Profile] */}
      <View style={styles.sectionRight}>
        {onNotifications && (
          <TouchableOpacity 
            style={[styles.notifBtn, light && styles.notifBtnLight]} 
            onPress={onNotifications}
            activeOpacity={0.8}
          >
            <Ionicons name="notifications" size={24} color={light ? '#000' : '#fff'} style={{ marginTop: 4 }} />
            <View style={styles.notifDot} />
          </TouchableOpacity>
        )}

        {onProfile && (
          <TouchableOpacity 
            style={[styles.profileBtn, light && { borderColor: 'rgba(255,255,255,0.4)' }]} 
            onPress={onProfile}
            activeOpacity={0.8}
          >
            <ImageBackground
              source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDTIkvlbxtF8Srcz_Cbugho4nxtNwxEgZ5rkeHZSy6E9BSEcqdj52m1gjQ5Ln04L3Cj42Jp-5EEJfISSDs1bg9ljCoHBEVxm4Z8qk7wkc1QVrwGgErxrBvjSYGYyVbjd1hdbsHQYw5etDbImLeRNen_-I3XBRA0bpHiYSDBshxoZGzhTdeYoLCIVqXROGHAyF2Uoj-JZ7VtGj9VWylbpWrw03AM7q0pa_t0ySFKRjj7uWUE8UQwRPxoYOHOdRdHfuQhvkFTIIlkDySq' }}
              style={styles.avatarImg}
              imageStyle={{ borderRadius: 18 }}
            />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 80, // Slightly taller for a more premium, spacious feel
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    zIndex: 1000,
    borderBottomWidth: 0, // Explicitly remove any potential borders
    elevation: 0, // Remove shadow on Android
    shadowOpacity: 0, // Remove shadow on iOS
  },
  sectionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  sectionRight: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 16,
  },
  actionBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
  },
  logo: {
    width: 38,
    height: 38,
    marginRight: 10,
  },
  brandText: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  notifBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginTop: 3, // Align circle bottom with profile avatar circle bottom
  },
  notifBtnLight: {
    backgroundColor: '#fff',
  },
  notifDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ff4b2b',
    borderWidth: 1.5,
    borderColor: '#000',
  },
  profileBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#000',
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
});
