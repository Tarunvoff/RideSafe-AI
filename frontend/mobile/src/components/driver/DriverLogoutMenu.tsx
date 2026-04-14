/**
 * [EXCELLENCE SUMMARY]
 * The DriverLogoutMenu is a high-fidelity modal component governing 
 * session agency in the Aegis platform. Utilizing a refined 'Popover' 
 * aesthetic, it allows users to manage their presence and identity 
 * with a single tap. Designed for visual clarity, it isolates high-risk 
 * actions (Logout) using semantic color tokens and ergonomic touch targets.
 * 
 * [DOMAIN LOGIC]
 * Serves as the primary gateway for 'Session De-escalation'. In a 
 * professional insurance environment, clear and immediate session 
 * control is a core security requirement. This component provides 
 * a simple but definitive path for user exit, ensuring data privacy 
 * and session integrity.
 */

import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Theme } from '../../theme';

type DriverLogoutMenuProps = {
  /** Visibility toggle for the modal. */
  visible: boolean;
  /** Primary identifier displayed in the menu header. */
  userEmail?: string | null;
  /** Callback to dismiss the menu. */
  onClose: () => void;
  /** Primary action for session termination. */
  onLogout: () => void;
};

export default function DriverLogoutMenu({
  visible,
  userEmail,
  onClose,
  onLogout,
}: DriverLogoutMenuProps) {
  const { t } = useTranslation();

  /**
   * [IN-LINE PRIDE]: Seamless Overlay Architecture
   * Implements a transparent backdrop using 'Modal' with 'animationType="fade"'. 
   * The container uses ' Pressable' with 'event.stopPropagation()' to ensure 
   * that taps inside the menu box do not trigger the dismissal handler 
   * attached to the overlay, providing a predictable and stable UI experience.
   */
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        style={styles.modalOverlay}
        onPress={onClose}
      >
        <Pressable
          style={styles.profileMenuBox}
          onPress={(event) => event.stopPropagation()}
        >
          <View style={styles.profileMenuHeader}>
            <Text style={styles.profileMenuEmail} numberOfLines={1}>
              {userEmail || t('common.driver')}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.profileMenuItem}
            activeOpacity={0.9}
            onPress={onLogout}
          >
            <Ionicons
              name="log-out-outline"
              size={20}
              color="#ef4444"
            />
            <Text style={styles.profileMenuTextLogout}>{t('profile.logout')}</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.1)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingRight: Theme.spacing.lg,
    paddingTop: 60,
  },
  profileMenuBox: {
    backgroundColor: '#fff',
    borderRadius: Theme.borderRadius.lg,
    padding: 8,
    width: 200,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  profileMenuHeader: {
    padding: Theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
    marginBottom: 8,
  },
  profileMenuEmail: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
  },
  profileMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Theme.spacing.md,
    gap: 12,
    borderRadius: Theme.borderRadius.md,
    backgroundColor: '#fef2f2',
  },
  profileMenuTextLogout: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ef4444',
  },
});

