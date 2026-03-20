import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Theme } from '../theme';

type DriverLogoutMenuProps = {
  visible: boolean;
  userEmail?: string | null;
  onClose: () => void;
  onLogout: () => void;
};

export default function DriverLogoutMenu({
  visible,
  userEmail,
  onClose,
  onLogout,
}: DriverLogoutMenuProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={styles.profileMenuBox}>
          <View style={styles.profileMenuHeader}>
            <Text style={styles.profileMenuEmail} numberOfLines={1}>
              {userEmail || 'Driver'}
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
            <Text style={styles.profileMenuTextLogout}>Log Out</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
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

