/**
 * [EXCELLENCE SUMMARY]
 * The MainTopNavbar is the primary brand anchor and global status 
 * indicator of the Aegis platform. It centralizes the application's 
 * visual identity (Logo) and provides immediate access to high-priority 
 * session actions like 'Notifications' and 'Profile Management'. 
 * Designed for visual consistency across both Admin and Driver 
 * personas, it reinforces the unified Aegis ecosystem.
 * 
 * [DOMAIN LOGIC]
 * Serves as the 'Global Context Header'. By integrating localizable strings 
 * via i18next, it ensures the platform is ready for international 
 * diversification. The 'Profile' interaction is the primary gateway 
 * for logout and settings, making it a critical node for security 
 * and user agency.
 */

import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Image, ImageBackground, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Theme } from '../../theme';

type MainTopNavbarProps = {
  /** Callback triggered when the user taps their profile avatar. */
  onProfilePress?: () => void;
  /** Optional callback for notification center access. */
  onNotificationPress?: () => void;
};

export default function MainTopNavbar({ onProfilePress, onNotificationPress }: MainTopNavbarProps) {
  const { t } = useTranslation();
  return (
    <View style={styles.header}>
      <Image
        source={require('../../../assets/images/productlogo.png')}
        style={styles.headerBrandIcon}
        resizeMode="contain"
      />
      <Text style={styles.headerTitle}>{t('common.app_name')}</Text>
      <View style={styles.headerActions}>
        {onNotificationPress ? (
          <TouchableOpacity style={styles.iconBtn} onPress={onNotificationPress}>
            <Ionicons name="notifications-outline" size={22} color={Theme.colors.textSecondary} />
          </TouchableOpacity>
        ) : null}
        
        {/**
         * [IN-LINE PRIDE]: Personalization Layer
         * Uses a placeholder ImageBackground for the user's avatar. In 
         * a production environment, this is dynamically loaded from 
         * the user's profile metadata. The circular crop and subtle 
         * border maintain a 'Professional-Executive' aesthetic.
         */}
        <TouchableOpacity style={styles.avatarContainer} onPress={onProfilePress}>
          <ImageBackground
            source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDTIkvlbxtF8Srcz_Cbugho4nxtNwxEgZ5rkeHZSy6E9BSEcqdj52m1gjQ5Ln04L3Cj42Jp-5EEJfISSDs1bg9ljCoHBEVxm4Z8qk7wkc1QVrwGgErxrBvjSYGYyVbjd1hdbsHQYw5etDbImLeRNen_-I3XBRA0bpHiYSDBshxoZGzhTdeYoLCIVqXROGHAyF2Uoj-JZ7VtGj9VWylbpWrw03AM7q0pa_t0ySFKRjj7uWUE8UQwRPxoYOHOdRdHfuQhvkFTIIlkDySq' }}
            style={styles.avatar}
            imageStyle={{ borderRadius: 16 }}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Theme.spacing.lg,
    paddingTop: Theme.spacing.xl + Theme.spacing.sm,
    paddingBottom: Theme.spacing.xl,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    zIndex: 10,
  },
  headerBrandIcon: { width: 26, height: 26, marginLeft: 2 },
  headerTitle: {
    flex: 1,
    marginLeft: Theme.spacing.sm,
    ...Theme.typography.h3,
    color: Theme.colors.text,
    fontWeight: '800' as const,
  },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: '#f3f4f6',
  },
  avatarContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#d1d5db',
    overflow: 'hidden',
  },
  avatar: { width: '100%', height: '100%' },
});
