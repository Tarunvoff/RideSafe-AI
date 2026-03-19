import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ImageBackground, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Theme } from '../theme';

type MainTopNavbarProps = {
  onProfilePress?: () => void;
  onNotificationPress?: () => void;
};

export default function MainTopNavbar({ onProfilePress, onNotificationPress }: MainTopNavbarProps) {
  return (
    <View style={styles.header}>
      <Ionicons name="shield-checkmark" size={26} color={Theme.colors.primary} style={styles.headerBrandIcon} />
      <Text style={styles.headerTitle}>GigShield</Text>
      <View style={styles.headerActions}>
        <TouchableOpacity style={styles.iconBtn} onPress={onNotificationPress}>
          <Ionicons name="notifications-outline" size={24} color={Theme.colors.textSecondary} />
        </TouchableOpacity>
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
    paddingTop: Theme.spacing.md,
    paddingBottom: Theme.spacing.xl,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
    zIndex: 10,
  },
  headerBrandIcon: { transform: [{ translateY: 22 }] },
  headerTitle: {
    flex: 1,
    marginLeft: 8,
    ...Theme.typography.h3,
    color: '#0f172a',
    fontWeight: '800' as const,
    transform: [{ translateY: 22 }],
  },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8, transform: [{ translateY: 22 }] },
  iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20 },
  avatarContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: `${Theme.colors.primary}33`,
    overflow: 'hidden',
  },
  avatar: { width: '100%', height: '100%' },
});
