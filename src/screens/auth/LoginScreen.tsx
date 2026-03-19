import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { Theme } from '../../theme';

export default function LoginScreen({ navigation }: any) {
  const { login, register } = useAuth();
  const [modalVisible, setModalVisible] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    try {
      setLoading(true);
      if (isRegistering) {
        await register(email, password);
        closeAuthModal();
      } else {
        await login(email, password);
      }
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || error.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const closeAuthModal = () => {
    setModalVisible(false);
    setIsRegistering(false);
    setEmail('');
    setPassword('');
  };

  const showDemo = () => {
    Alert.alert('Watch Demo', 'Demo playback will be connected here.');
  };

  const openHelp = () => {
    Alert.alert('Help', 'Need support? Reach out to GigShield support.');
  };

  const openNotifications = () => {
    Alert.alert('Notifications', 'No new alerts right now.');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={closeAuthModal}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity style={styles.modalClose} onPress={closeAuthModal}>
              <Ionicons name="close" size={24} color={Theme.colors.textSecondary} />
            </TouchableOpacity>

            <Text style={styles.modalTitle}>{isRegistering ? 'Create Account' : 'Welcome Back'}</Text>

            <TextInput
              style={styles.input}
              placeholder="Email address"
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />

            <TextInput
              style={styles.input}
              placeholder="Password"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />

            <TouchableOpacity style={styles.modalButton} onPress={handleSubmit} disabled={loading}>
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.modalButtonText}>{isRegistering ? 'Register' : 'Login'}</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setIsRegistering(!isRegistering)}>
              <Text style={styles.switchModeText}>
                {isRegistering ? 'Already have an account? Login' : "Don't have an account? Register"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <View style={styles.header}>
        <View style={styles.headerLogo}>
          <Ionicons name="shield-checkmark" size={26} color={Theme.colors.primary} />
          <Text style={styles.headerTitle}>GigShield</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerIconBtn} onPress={openHelp}>
            <Ionicons name="help-circle-outline" size={22} color={Theme.colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerIconBtn} onPress={openNotifications}>
            <Ionicons name="notifications-outline" size={22} color={Theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.liveBadgeRow}>
          <View style={styles.liveDot} />
          <Text style={styles.liveBadgeText}>Live Protection Active</Text>
        </View>

        <View style={styles.heroSection}>
          <Text style={styles.heroTitle}>Protect Your{`\n`}Weekly Earnings</Text>
          <Text style={styles.heroSubtitle}>
            AI-powered income protection for rain, heat, and outages.
          </Text>
        </View>

        <View style={styles.centerActionWrap}>
          <TouchableOpacity style={styles.watchDemoBtn} onPress={showDemo} activeOpacity={0.85}>
            <Ionicons name="play-circle" size={18} color="#0f172a" />
            <Text style={styles.watchDemoBtnText}>Watch Demo</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.quickGrid}>
          <TouchableOpacity style={styles.largeCard} onPress={() => setModalVisible(true)} activeOpacity={0.85}>
            <View style={[styles.cardHeroIconBox, { backgroundColor: `${Theme.colors.primary}15` }]}>
              <Ionicons name="person" size={54} color={Theme.colors.primary} />
            </View>
            <Text style={styles.cardTitle}>Driver Login</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.largeCard}
            onPress={() => navigation.navigate('AdminLogin')}
            activeOpacity={0.85}
          >
            <View style={[styles.cardHeroIconBox, { backgroundColor: '#eef2f7' }]}>
              <Ionicons name="shield-half" size={54} color="#475569" />
            </View>
            <Text style={styles.cardTitle}>Admin Portal</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.wideCard} onPress={() => setModalVisible(true)} activeOpacity={0.85}>
            <View style={styles.wideCardLeft}>
              <View style={styles.wideCardIcon}>
                <Ionicons name="finger-print" size={22} color={Theme.colors.primary} />
              </View>
              <View>
                <Text style={styles.wideCardTitle}>Complete KYC</Text>
                <Text style={styles.wideCardSubtitle}>Verify identity to unlock claims</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <View style={styles.valueGrid}>
          <View style={styles.valueChip}>
            <Ionicons name="calendar" size={15} color={Theme.colors.primary} />
            <Text style={styles.valueChipText}>Weekly Protection</Text>
          </View>
          <View style={styles.valueChip}>
            <Ionicons name="navigate" size={15} color={Theme.colors.primary} />
            <Text style={styles.valueChipText}>Hyperlocal Detection</Text>
          </View>
          <View style={styles.valueChip}>
            <Ionicons name="flash" size={15} color={Theme.colors.primary} />
            <Text style={styles.valueChipText}>Instant Claims</Text>
          </View>
          <View style={styles.valueChip}>
            <Ionicons name="pulse" size={15} color={Theme.colors.primary} />
            <Text style={styles.valueChipText}>AI Monitoring</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.howItWorksStrip} onPress={showDemo} activeOpacity={0.9}>
          <View style={styles.stripStepWrap}>
            <Text style={styles.stripStepActive}>Connect</Text>
            <View style={[styles.stripLine, styles.stripLineActive]} />
          </View>
          <Ionicons name="arrow-forward" size={14} color={Theme.colors.textSecondary} />
          <View style={styles.stripStepWrap}>
            <Text style={styles.stripStep}>Monitor</Text>
            <View style={styles.stripLine} />
          </View>
          <Ionicons name="arrow-forward" size={14} color={Theme.colors.textSecondary} />
          <View style={styles.stripStepWrap}>
            <Text style={styles.stripStep}>Payout</Text>
            <View style={styles.stripLine} />
          </View>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Theme.spacing.lg,
    paddingVertical: Theme.spacing.sm,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#edf0f2',
  },
  headerLogo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    ...Theme.typography.h3,
    color: '#0f172a',
    fontWeight: '900' as const,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    paddingHorizontal: Theme.spacing.lg,
    paddingTop: Theme.spacing.md,
    paddingBottom: Theme.spacing.xxl,
  },
  liveBadgeRow: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#eef2ff',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: Theme.spacing.lg,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2563eb',
  },
  liveBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: '#475569',
    textTransform: 'uppercase',
  },
  heroSection: {
    marginBottom: Theme.spacing.lg,
  },
  heroTitle: {
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '900',
    color: '#0f172a',
    marginBottom: 10,
  },
  heroSubtitle: {
    fontSize: 14,
    lineHeight: 21,
    color: '#64748b',
    maxWidth: 290,
  },
  centerActionWrap: {
    alignItems: 'center',
    marginBottom: Theme.spacing.xl,
  },
  watchDemoBtn: {
    minWidth: 190,
    height: 50,
    borderRadius: Theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: '#d7dde3',
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  watchDemoBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: Theme.spacing.xl,
  },
  largeCard: {
    width: '48%',
    aspectRatio: 1,
    backgroundColor: '#fff',
    borderRadius: Theme.borderRadius.xl,
    borderWidth: 1,
    borderColor: '#edf1f4',
    padding: 12,
    justifyContent: 'space-between',
  },
  cardHeroIconBox: {
    flex: 1,
    width: '100%',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
  },
  wideCard: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: Theme.borderRadius.xl,
    borderWidth: 1,
    borderColor: '#edf1f4',
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  wideCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  wideCardIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#dbe8ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  wideCardTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
  },
  wideCardSubtitle: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  valueGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: Theme.spacing.xl,
  },
  valueChip: {
    width: '48.5%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#eef1f3',
  },
  valueChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#526070',
  },
  howItWorksStrip: {
    backgroundColor: '#fff',
    borderRadius: Theme.borderRadius.xl,
    borderWidth: 1,
    borderColor: '#edf1f4',
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stripStepWrap: {
    alignItems: 'center',
    gap: 4,
  },
  stripStepActive: {
    fontSize: 10,
    fontWeight: '800',
    color: Theme.colors.primary,
    textTransform: 'uppercase',
  },
  stripStep: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748b',
    textTransform: 'uppercase',
  },
  stripLine: {
    width: 30,
    height: 4,
    borderRadius: 4,
    backgroundColor: '#cbd5e1',
  },
  stripLineActive: {
    backgroundColor: Theme.colors.primary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Theme.spacing.lg,
  },
  modalContent: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: Theme.borderRadius.xl,
    padding: Theme.spacing.xl,
    alignItems: 'center',
  },
  modalClose: {
    position: 'absolute',
    top: Theme.spacing.lg,
    right: Theme.spacing.lg,
    zIndex: 1,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: Theme.spacing.xl,
    marginTop: Theme.spacing.md,
  },
  input: {
    width: '100%',
    height: 52,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderRadius: Theme.borderRadius.lg,
    paddingHorizontal: Theme.spacing.md,
    marginBottom: Theme.spacing.md,
    fontSize: 15,
    color: '#0f172a',
  },
  modalButton: {
    width: '100%',
    height: 52,
    backgroundColor: Theme.colors.primary,
    borderRadius: Theme.borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Theme.spacing.md,
    marginBottom: Theme.spacing.lg,
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  switchModeText: {
    color: Theme.colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
});
