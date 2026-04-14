import { Ionicons } from '@expo/vector-icons';
import { ResizeMode, Video } from 'expo-av';
import React, { useEffect, useRef, useState } from 'react';
import {
  Modal,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Dimensions,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import Constants from 'expo-constants';
import { useTranslation } from 'react-i18next';
import LoadingOverlay from '../../components/ui/LoadingOverlay';
import { useAuth } from '../../context/AuthContext';

const { width } = Dimensions.get('window');

// Colors from the image
const COLORS = {
  background: '#FF5C39', // Vibrant Orange-Red
  highlight: '#EFEBDC',  // Cream / Off-white (cards and buttons)
  textPrimary: '#000000',
  backgroundText: 'rgba(0, 0, 0, 0.08)', // Faded black for background text
};

export default function LoginScreen({ navigation }: any) {
  const { t } = useTranslation();
  const [demoVisible, setDemoVisible] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [identifier, setIdentifier] = useState('');
  const [loading, setLoading] = useState(false);
  const { sendDriverOtp } = useAuth();
  const demoVideoRef = useRef<any>(null);

  useEffect(() => {
    if (!demoVisible) return;
    const timer = setTimeout(() => {
      demoVideoRef.current?.playAsync?.();
    }, 80);
    return () => clearTimeout(timer);
  }, [demoVisible]);

  const showDemo = () => setDemoVisible(true);
  const closeDemo = () => setDemoVisible(false);

  const getRedirectUri = () => {
    const override = process.env.EXPO_PUBLIC_OAUTH_REDIRECT_URI?.trim();
    if (override) return override;
    const isExpoGo = Constants.appOwnership === 'expo';
    return isExpoGo
      ? Linking.createURL('oauth-callback')
      : Linking.createURL('oauth-callback', { scheme: 'ridesafe' });
  };

  const handleOAuthLogin = async (platform: string) => {
    setLoading(true);
    try {
      const trimmedIdentifier = identifier.trim();
      if (!trimmedIdentifier) {
        Alert.alert(t('auth.login.modal.missing_identifier'), t('auth.login.modal.enter_identifier'));
        return;
      }
      const provider = platform.trim().toUpperCase();
      const redirectUri = getRedirectUri();
      await sendDriverOtp(trimmedIdentifier);
      setModalVisible(false);
      navigation.navigate('DriverOTP', {
        email: trimmedIdentifier,
        provider,
        redirectUri
      });
    } catch (error: any) {
      console.error('❌ Login Error:', error);
      Alert.alert(t('common.login_error'), error?.message || t('common.oauth_failed'));
    } finally {
      setLoading(false);
    }
  };

  // Background Text List
  const bgWords = [
    'Security',
    'Protection',
    'Aegis',
    'Intelligence',
    'Reliability',
    'Resilience',
    'Trust',
    'Safety',
    'Security',
    'Protection',
    'Aegis',
    'Intelligence',
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <LoadingOverlay visible={loading} message={t('auth.login.modal.authenticating')} />

      {/* Background Decorative Text Layer */}
      <View style={styles.backgroundLayer} pointerEvents="none">
        {bgWords.map((word, index) => (
          <Text key={index} style={styles.bgText}>
            {word}
          </Text>
        ))}
      </View>

      <View style={styles.container}>
        {/* Center Section: Logo & Star */}
        <View style={styles.heroWrapper}>
          <View style={styles.starContainer}>
            <Svg width={width * 0.95} height={width * 1.2} viewBox="0 0 100 130">
              <Path
                d="M 50 0 Q 62 58 100 65 Q 62 72 50 130 Q 38 72 0 65 Q 38 58 50 0 Z"
                fill={COLORS.highlight}
              />
            </Svg>
            <View style={styles.logoOverlay}>
              <Image
                source={require('../../../assets/images/productlogo.png')}
                style={styles.logoImage}
                resizeMode="contain"
              />
            </View>
          </View>

          {/* Watch Demo Button */}
          <TouchableOpacity style={styles.watchDemoBtn} onPress={showDemo} activeOpacity={0.9}>
            <Text style={styles.watchDemoText}>{t('auth.login.watch_demo')}</Text>
            <View style={styles.playIconCircle}>
              <Ionicons name="play" size={16} color={COLORS.highlight} style={{ marginLeft: 2 }} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Bottom Actions: Driver Login & Admin Portal */}
        <View style={styles.actionCardsRow}>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => setModalVisible(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="person-outline" size={60} color="#000" />
            <Text style={styles.cardLabel}>{t('auth.login.driver_login')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('AdminLogin')}
            activeOpacity={0.8}
          >
            <Ionicons name="shield-outline" size={60} color="#000" />
            <Text style={styles.cardLabel}>{t('auth.login.admin_portal')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Auth Modal */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity style={styles.modalClose} onPress={() => setModalVisible(false)}>
              <Ionicons name="close" size={24} color="#000" />
            </TouchableOpacity>

            <Text style={styles.modalTitle}>{t('auth.login.modal.title')}</Text>
            <Text style={styles.modalSubtitle}>{t('auth.login.modal.subtitle')}</Text>

            <TextInput
              style={styles.input}
              placeholder={t('auth.login.modal.placeholder')}
              autoCapitalize="none"
              keyboardType="email-address"
              value={identifier}
              onChangeText={setIdentifier}
            />

            <View style={styles.oauthButtonsRow}>
              <OAuthButton
                name="Zepto"
                color="#29075c"
                iconSource={require('../../../assets/images/zepto.png')}
                imagePadding={8}
                onPress={() => handleOAuthLogin('Zepto')}
              />
              <OAuthButton
                name="Blinkit"
                color="#F8CB19"
                iconSource={require('../../../assets/images/blinkit.png')}
                imagePadding={0}
                onPress={() => handleOAuthLogin('Blinkit')}
              />
              <OAuthButton
                name="Instamart"
                color="#fff"
                iconSource={require('../../../assets/images/instamart.png')}
                imagePadding={0}
                onPress={() => handleOAuthLogin('Instamart')}
              />
              <OAuthButton
                name="BigBasket"
                color="#fff"
                iconSource={require('../../../assets/images/bigbasket.png')}
                imagePadding={0}
                onPress={() => handleOAuthLogin('BigBasket')}
              />
              <OAuthButton
                name="JioMart"
                color="#fff"
                iconSource={require('../../../assets/images/jiomart.png')}
                imagePadding={0}
                onPress={() => handleOAuthLogin('JioMart')}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Demo Modal */}
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
    <TouchableOpacity
      style={[
        styles.oauthBtn,
        {
          backgroundColor: color,
          borderWidth: color === '#fff' ? 1 : 0,
          borderColor: '#e2e8f0',
        }
      ]}
      onPress={onPress}
    >
      <Image
        source={iconSource}
        style={{
          width: 50 - imagePadding * 2,
          height: 50 - imagePadding * 2,
          borderRadius: imagePadding === 0 ? 25 : 0
        }}
        resizeMode="contain"
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  backgroundLayer: {
    ...StyleSheet.absoluteFillObject,
    paddingTop: 0,
    paddingLeft: 20,
    zIndex: -1,
    justifyContent: 'center',
  },
  bgText: {
    fontSize: 100,
    fontWeight: '800',
    color: 'rgba(0, 0, 0, 0.12)',
    lineHeight: 110,
    letterSpacing: -4,
    textTransform: 'none',
    textAlign: 'center',
    width: width,
  },
  container: {
    flex: 1,
    justifyContent: 'space-between',
    paddingBottom: 40,
  },
  heroWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -40,
  },
  starContainer: {
    width: width * 0.95,
    height: width * 1.3,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: -40,
  },
  logoOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: width * 0.1, // Offset slightly upwards to visual center
  },
  logoImage: {
    width: width * 0.28,
    height: width * 0.28,
  },
  watchDemoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.highlight,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 100,
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 5,
  },
  watchDemoText: {
    fontSize: 22,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  playIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionCardsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    paddingHorizontal: 20,
  },
  actionCard: {
    flex: 1,
    aspectRatio: 1,
    maxWidth: (width - 60) / 2,
    backgroundColor: COLORS.highlight,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 8,
  },
  cardLabel: {
    marginTop: 15,
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.highlight,
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    padding: 30,
    paddingBottom: 60,
    alignItems: 'center',
    minHeight: 350,
  },
  modalClose: {
    alignSelf: 'flex-end',
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#000',
    marginBottom: 10,
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    marginBottom: 20,
  },
  input: {
    width: '100%',
    height: 55,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 15,
    paddingHorizontal: 20,
    fontSize: 16,
    marginBottom: 25,
  },
  oauthButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 10,
  },
  oauthBtn: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3
  },
  demoOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  demoShell: {
    width: '100%',
    alignItems: 'flex-end',
  },
  demoCard: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#000',
    borderRadius: 20,
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
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
});