import { Ionicons } from '@expo/vector-icons';
import { ResizeMode, Video } from 'expo-av';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { Theme } from '../../theme';

export default function LoginScreen({ navigation }: any) {
  const { login, register } = useAuth();
  const [modalVisible, setModalVisible] = useState(false);
  const [demoVisible, setDemoVisible] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const demoVideoRef = useRef<any>(null);

  // Some platforms (especially with Modal mount + autoplay policies) won't reliably start with `shouldPlay`.
  // Calling playAsync() right after opening the modal makes playback deterministic.
  useEffect(() => {
    if (!demoVisible) return;
    const t = setTimeout(() => {
      demoVideoRef.current?.playAsync?.();
    }, 80);
    return () => clearTimeout(t);
  }, [demoVisible]);

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
    setDemoVisible(true);
  };

  const closeDemo = () => {
    setDemoVisible(false);
  };

  const openHelp = () => {
    Alert.alert('Help', 'Need support? Reach out to Aegis support.');
  };

  const openNotifications = () => {
    Alert.alert('Notifications', 'No new alerts right now.');
  };

  const handleOAuthLogin = async (platform: string) => {
    setLoading(true);
    try {
      const mockEmail = `${platform.toLowerCase().replace(/\s+/g, '')}@oauth.com`;
      const mockPassword = 'oauth-mock-password';
      try {
        await login(mockEmail, mockPassword);
      } catch {
        await register(mockEmail, mockPassword, undefined, true);
      }
      closeAuthModal();
      Alert.alert(
        'Identity Verified',
        `Successfully signed in as ${platform} Driver. Your platform identity is verified.`
      );
    } catch (error: any) {
      Alert.alert('OAuth Error', error?.response?.data?.message || 'Failed to authenticate');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <Modal visible={demoVisible} transparent animationType="fade" onRequestClose={closeDemo}>
        <View style={styles.demoOverlay}>
          <View style={styles.demoShell}>
            <TouchableOpacity style={styles.demoClose} onPress={closeDemo}>
              <Ionicons name="close" size={22} color="#fff" />
            </TouchableOpacity>
            <View style={styles.demoCard}>
              <Video
                ref={demoVideoRef}
                style={styles.demoVideo}
                source={require('../../../assets/videos/demo.mp4')}
                useNativeControls
                shouldPlay
                isMuted={false}
                resizeMode={ResizeMode.CONTAIN}
              />
            </View>
          </View>
        </View>
      </Modal>

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

            {!isRegistering && (
              <View style={styles.oauthContainer}>
                <View style={styles.oauthDivider}>
                  <View style={styles.oauthLine} />
                  <Text style={styles.oauthDividerText}>OR LOGIN WITH</Text>
                  <View style={styles.oauthLine} />
                </View>
                <View style={styles.oauthButtonsRow}>
                  <OAuthButton 
                    name="Zepto" 
                    color="#29075c" 
                    iconSource={require('../../../assets/images/Logo_of_Zepto.png')} 
                    imagePadding={8}
                    onPress={() => handleOAuthLogin('Zepto')} 
                  />
                  <OAuthButton 
                    name="Blinkit" 
                    color="#F8CB19" 
                    iconSource={require('../../../assets/images/BlinkitLogo.jpg')} 
                    imagePadding={0}
                    onPress={() => handleOAuthLogin('Blinkit')} 
                  />
                  <OAuthButton 
                    name="Instamart" 
                    color="#fff" 
                    iconSource={require('../../../assets/images/instaMart.png')} 
                    imagePadding={0}
                    onPress={() => handleOAuthLogin('Instamart')} 
                  />
                  <OAuthButton 
                    name="BigBasket" 
                    color="#fff" 
                    iconSource={require('../../../assets/images/bigBasket.png')} 
                    imagePadding={0}
                    onPress={() => handleOAuthLogin('BigBasket')} 
                  />
                  <OAuthButton 
                    name="JioMart" 
                    color="#fff" 
                    iconSource={require('../../../assets/images/jioMart.png')} 
                    imagePadding={0}
                    onPress={() => handleOAuthLogin('JioMart')} 
                  />
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>

      <View style={styles.header}>
        <View style={styles.headerLogo}>
          <Image source={require('../../../assets/images/ProductLogo.png')} style={styles.headerLogoIcon} resizeMode="contain" />
          <Text style={styles.headerTitle}>Aegis</Text>
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

      <View style={styles.container}>
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
              <Ionicons name="person" size={52} color={Theme.colors.primary} />
            </View>
            <Text style={styles.cardTitle}>Driver Login</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.largeCard}
            onPress={() => navigation.navigate('AdminLogin')}
            activeOpacity={0.85}
          >
            <View style={[styles.cardHeroIconBox, { backgroundColor: `${Theme.colors.primary}15` }]}>
              <Ionicons name="shield-half" size={52} color={Theme.colors.primary} />
            </View>
            <Text style={styles.cardTitle}>Admin Portal</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.wideCard} onPress={() => setModalVisible(true)} activeOpacity={0.85}>
            <View style={styles.wideCardLeft}>
              <View style={styles.wideCardIcon}>
                <Ionicons name="finger-print" size={20} color={Theme.colors.primary} />
              </View>
              <View>
                <Text style={styles.wideCardTitle}>Complete KYC</Text>
                <Text style={styles.wideCardSubtitle}>Verify identity to unlock claims</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Theme.colors.textSecondary} />
          </TouchableOpacity>
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

        <View style={styles.valueGrid}>
          <View style={styles.valueChip}>
            <Ionicons name="calendar" size={20} color={Theme.colors.primary} />
            <Text style={styles.valueChipText}>Weekly Protection</Text>
          </View>
          <View style={styles.valueChip}>
            <Ionicons name="navigate" size={20} color={Theme.colors.primary} />
            <Text style={styles.valueChipText}>Hyperlocal Detection</Text>
          </View>
          <View style={styles.valueChip}>
            <Ionicons name="flash" size={20} color={Theme.colors.primary} />
            <Text style={styles.valueChipText}>Instant Claims</Text>
          </View>
          <View style={styles.valueChip}>
            <Ionicons name="pulse" size={20} color={Theme.colors.primary} />
            <Text style={styles.valueChipText}>AI Monitoring</Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

function OAuthButton({ 
  name, 
  color, 
  iconSource, 
  imagePadding = 0,
  onPress 
}: { 
  name: string; 
  color: string; 
  iconSource: any; 
  imagePadding?: number;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={[styles.oauthBtn, { backgroundColor: color, overflow: 'hidden' }]} onPress={onPress}>
      <Image 
        source={iconSource} 
        style={{ width: 44 - imagePadding * 2, height: 44 - imagePadding * 2, borderRadius: imagePadding === 0 ? 22 : 0 }} 
        resizeMode="contain" 
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Theme.spacing.lg,
    paddingTop: Theme.spacing.md,
    paddingBottom: Theme.spacing.sm,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#edf0f2',
  },
  headerLogo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerLogoIcon: { width: 28, height: 28 },
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
    flex: 1,
    backgroundColor: '#f8f9fa',
    paddingHorizontal: Theme.spacing.lg,
    paddingTop: Theme.spacing.md,
    paddingBottom: Theme.spacing.md,
    justifyContent: 'space-between',
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
    marginBottom: 8,
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
    marginBottom: 8,
  },
  heroTitle: {
    fontSize: 30,
    lineHeight: 35,
    fontWeight: '900',
    color: '#0f172a',
    marginBottom: 6,
  },
  heroSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    color: '#64748b',
    maxWidth: 290,
  },
  centerActionWrap: {
    alignItems: 'center',
    marginBottom: 10,
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
    gap: 10,
    marginBottom: 10,
  },
  largeCard: {
    width: '48%',
    aspectRatio: 0.8,
    backgroundColor: '#fff',
    borderRadius: Theme.borderRadius.xl,
    borderWidth: 1,
    borderColor: '#edf1f4',
    padding: 10,
    justifyContent: 'space-between',
  },
  cardHeroIconBox: {
    flex: 1,
    width: '100%',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
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
    paddingVertical: 10,
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
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#dbe8ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  wideCardTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0f172a',
  },
  wideCardSubtitle: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 2,
  },
  valueGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    minHeight: 176,
    alignContent: 'space-between',
    marginBottom: Theme.spacing.sm,
  },
  valueChip: {
    width: '48.6%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    minHeight: 82,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#e9eef2',
    borderWidth: 1,
    borderColor: '#dde5ec',
  },
  valueChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#445365',
    flex: 1,
  },
  howItWorksStrip: {
    backgroundColor: '#fff',
    borderRadius: Theme.borderRadius.xl,
    borderWidth: 1,
    borderColor: '#edf1f4',
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stripStepWrap: {
    alignItems: 'center',
    gap: 3,
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
  demoOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Theme.spacing.lg,
  },
  demoShell: {
    width: '100%',
    alignItems: 'flex-end',
  },
  demoCard: {
    width: '100%',
    aspectRatio: 16 / 9,
    maxHeight: '78%',
    backgroundColor: '#000',
    borderRadius: Theme.borderRadius.xl,
    overflow: 'hidden',
  },
  demoVideo: {
    width: '100%',
    height: '100%',
  },
  demoClose: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
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
  oauthContainer: { width: '100%', marginTop: Theme.spacing.xl },
  oauthDivider: { flexDirection: 'row', alignItems: 'center', marginBottom: Theme.spacing.md },
  oauthLine: { flex: 1, height: 1, backgroundColor: Theme.colors.border },
  oauthDividerText: { marginHorizontal: Theme.spacing.sm, fontSize: 12, color: Theme.colors.textSecondary, fontWeight: '700' },
  oauthButtonsRow: { flexDirection: 'row', justifyContent: 'center', gap: 14 },
  oauthBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.1, shadowOffset: { width: 0, height: 2 }, shadowRadius: 3, elevation: 2 },
  oauthBtnText: { color: '#fff', fontSize: 18, fontWeight: '900' },
});
