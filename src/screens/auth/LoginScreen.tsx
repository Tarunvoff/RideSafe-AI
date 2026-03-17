import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Dimensions, Image, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View, Modal, TextInput, Alert, ActivityIndicator } from 'react-native';
import { Theme } from '../../theme';
import { useAuth } from '../../context/AuthContext';

const { width } = Dimensions.get('window');

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
        // register() auto-logs in; just close the modal
        closeResetModal();
      } else {
        await login(email, password);
      }
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || error.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const closeResetModal = () => {
    setModalVisible(false);
    setIsRegistering(false);
    setEmail('');
    setPassword('');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Auth Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={closeResetModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity style={styles.modalClose} onPress={closeResetModal}>
              <Ionicons name="close" size={24} color={Theme.colors.textSecondary} />
            </TouchableOpacity>

            <Text style={styles.modalTitle}>
              {isRegistering ? 'Create Account' : 'Welcome Back'}
            </Text>

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

            <TouchableOpacity 
              style={styles.modalButton} 
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.modalButtonText}>
                  {isRegistering ? 'Register' : 'Login'}
                </Text>
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

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLogo}>
          <Ionicons name="shield-checkmark" size={28} color={Theme.colors.primary} />
          <Text style={styles.headerTitle}>GigShield</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerIconBtn}>
            <Ionicons name="help-circle-outline" size={24} color={Theme.colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerIconBtn}>
            <Ionicons name="notifications-outline" size={24} color={Theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.heroImageContainer}>
            <Image 
              source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB5bqEdPw8nIlYx1To2NF4CkM6AeZ_m2MerkiQ5Kq1_2lcoqngZWAmPLjFBX79pjREf7hIQGZghXtWqFDRAyqzrUhmC9uNh5nVS0hWGBRezD5WAK4T8AKdoaDRV9nuW0eud9shsAdoBZMe3-87bZtvXK3ZLN_YPOVA8bM3_sRDRXRG05yLdeJuSeR1SRv13pe7xqXScegC6MPyubPuWtmTsEyp9dBXrfPyHCltn8RPSBYZLvj2JkrHe-ScgECBV7vpWU_19L3jcYNkh' }} 
              style={styles.heroImage}
              resizeMode="cover"
            />
            <View style={styles.heroOverlay} />
            <View style={styles.liveNoticeCard}>
              <View style={styles.liveNoticeRow}>
                <Ionicons name="flash" size={20} color={Theme.colors.primary} />
                <View style={{ marginLeft: 8, flex: 1 }}>
                  <Text style={styles.liveNoticeOverline}>Live Protection</Text>
                  <Text style={styles.liveNoticeTitle}>Rain detected in Brooklyn. Coverage active.</Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.heroTextContent}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>AI-POWERED DEFENSE</Text>
            </View>
            <Text style={styles.heroTitle}>Protect Your Weekly Earnings</Text>
            <Text style={styles.heroSubtitle}>
              AI-powered income protection for disruptions like rain, heat, and network outages. Never miss a payday.
            </Text>

            <View style={styles.heroButtonsRow}>
              <TouchableOpacity style={styles.primaryHeroBtn} onPress={() => setModalVisible(true)}>
                <Text style={styles.primaryHeroBtnText}>Start Free Trial</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.secondaryHeroBtn}>
                <Text style={styles.secondaryHeroBtnText}>Watch Demo</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <View style={styles.titleDot} />
          </View>

          <View style={styles.gridContainer}>
            {/* Driver Login */}
            <TouchableOpacity 
              style={styles.gridItem} 
              onPress={() => setModalVisible(true)}
              activeOpacity={0.7}
            >
              <View style={[styles.gridIconContainer, { backgroundColor: `${Theme.colors.primary}15` }]}>
                <Ionicons name="person" size={24} color={Theme.colors.primary} />
              </View>
              <Text style={styles.gridItemText}>Driver Login</Text>
            </TouchableOpacity>

            {/* Admin Portal */}
            <TouchableOpacity 
              style={styles.gridItem} 
              onPress={() => navigation.navigate('AdminLogin')}
              activeOpacity={0.7}
            >
              <View style={[styles.gridIconContainer, { backgroundColor: '#f1f5f9' }]}>
                <Ionicons name="shield-half" size={24} color="#475569" />
              </View>
              <Text style={styles.gridItemText}>Admin Portal</Text>
            </TouchableOpacity>

            {/* Complete KYC */}
            <TouchableOpacity 
              style={styles.gridItem} 
              onPress={() => setModalVisible(true)}
              activeOpacity={0.7}
            >
              <View style={[styles.gridIconContainer, { backgroundColor: '#dcfce7' }]}>
                <Ionicons name="checkmark-done-circle" size={24} color="#16a34a" />
              </View>
              <Text style={styles.gridItemText}>Complete KYC</Text>
            </TouchableOpacity>

            {/* Protection Plans */}
            <TouchableOpacity 
              style={styles.gridItem} 
              onPress={() => setModalVisible(true)}
              activeOpacity={0.7}
            >
              <View style={[styles.gridIconContainer, { backgroundColor: `${Theme.colors.primary}15` }]}>
                <Ionicons name="umbrella" size={24} color={Theme.colors.primary} />
              </View>
              <Text style={styles.gridItemText}>Protection Plans</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.howItWorksBanner}>
            <View>
              <Text style={styles.howItWorksTitle}>How It Works</Text>
              <Text style={styles.howItWorksSubtitle}>See how AI protects you</Text>
            </View>
            <View style={styles.playButtonCircle}>
              <Ionicons name="play" size={20} color="#fff" />
            </View>
          </TouchableOpacity>
        </View>

        {/* Why GigShield */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Why GigShield?</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll} contentContainerStyle={styles.horizontalScrollContent}>
            
            <View style={styles.featureCard}>
              <Ionicons name="calendar" size={24} color={Theme.colors.primary} style={styles.featureIcon} />
              <Text style={styles.featureTitle}>Weekly Protection</Text>
            </View>

            <View style={styles.featureCard}>
              <Ionicons name="navigate" size={24} color={Theme.colors.primary} style={styles.featureIcon} />
              <Text style={styles.featureTitle}>Hyperlocal Detection</Text>
            </View>

            <View style={styles.featureCard}>
              <Ionicons name="flash" size={24} color={Theme.colors.primary} style={styles.featureIcon} />
              <Text style={styles.featureTitle}>Automatic Claims</Text>
            </View>

          </ScrollView>
        </View>

        {/* Path to Security */}
        <View style={[styles.section, styles.pathSection]}>
          <Text style={[styles.sectionTitle, { textAlign: 'center', marginBottom: 24 }]}>Your path to security</Text>
          
          <View style={styles.pathSteps}>
            <View style={styles.pathLine} />
            
            <View style={styles.pathStep}>
              <View style={[styles.stepNumberCircle, styles.stepNumberActive]}>
                <Text style={styles.stepNumberTextActive}>1</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Connect Account</Text>
                <Text style={styles.stepDesc}>Link your Uber, DoorDash or Lyft ID in seconds.</Text>
              </View>
            </View>

            <View style={styles.pathStep}>
              <View style={styles.stepNumberCircle}>
                <Text style={styles.stepNumberText}>2</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Select Your Plan</Text>
                <Text style={styles.stepDesc}>Choose your coverage limit and disruption types.</Text>
              </View>
            </View>

            <View style={styles.pathStep}>
              <View style={styles.stepNumberCircle}>
                <Text style={styles.stepNumberText}>3</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>AI Monitoring</Text>
                <Text style={styles.stepDesc}>Our AI tracks weather and app outages in real-time.</Text>
              </View>
            </View>

            <View style={styles.pathStep}>
              <View style={styles.stepNumberCircle}>
                <Text style={styles.stepNumberText}>4</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Instant Payout</Text>
                <Text style={styles.stepDesc}>Earnings dropped? We credit your wallet automatically.</Text>
              </View>
            </View>
          </View>
        </View>

      </ScrollView>

      {/* Footer Nav Bar is omitted because this is a login screen and they have to log in first. Or we can add it if requested. Let's keep it simple and clean. */}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fcfcfc' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Theme.spacing.lg,
    paddingVertical: Theme.spacing.sm,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
    zIndex: 10,
  },
  headerLogo: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerTitle: { ...Theme.typography.h3, color: '#0f172a', fontWeight: '900' as const },
  headerActions: { flexDirection: 'row', gap: Theme.spacing.sm },
  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: { paddingBottom: 60 },
  
  heroSection: {
    padding: Theme.spacing.lg,
  },
  heroImageContainer: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: Theme.borderRadius.xl,
    overflow: 'hidden',
    backgroundColor: `${Theme.colors.primary}15`,
    marginBottom: Theme.spacing.xl,
    position: 'relative',
  },
  heroImage: { width: '100%', height: '100%', opacity: 0.8 },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: `${Theme.colors.primary}40`,
  },
  liveNoticeCard: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: Theme.borderRadius.md,
    padding: Theme.spacing.sm,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  liveNoticeRow: { flexDirection: 'row', alignItems: 'center' },
  liveNoticeOverline: { fontSize: 10, fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 },
  liveNoticeTitle: { fontSize: 12, fontWeight: '700', color: '#0f172a' },
  
  heroTextContent: { gap: 16 },
  badge: {
    backgroundColor: `${Theme.colors.primary}15`,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  badgeText: { fontSize: 10, fontWeight: '800', color: Theme.colors.primary, letterSpacing: 1 },
  heroTitle: { fontSize: 32, fontWeight: '900', color: '#0f172a', lineHeight: 38 },
  heroSubtitle: { fontSize: 15, fontWeight: '500', color: '#475569', lineHeight: 22 },
  
  heroButtonsRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  primaryHeroBtn: {
    flex: 1,
    backgroundColor: Theme.colors.primary,
    height: 52,
    borderRadius: Theme.borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Theme.colors.primary,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  primaryHeroBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  secondaryHeroBtn: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: Theme.colors.border,
    height: 52,
    borderRadius: Theme.borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryHeroBtnText: { color: '#0f172a', fontSize: 15, fontWeight: '700' },

  section: { paddingHorizontal: Theme.spacing.lg, paddingVertical: Theme.spacing.lg },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: Theme.spacing.lg, gap: 8 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  titleDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Theme.colors.primary },
  
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: Theme.spacing.lg,
  },
  gridItem: {
    width: (width - Theme.spacing.lg * 2 - 12) / 2, // 2 columns with 12px gap
    backgroundColor: '#fff',
    borderRadius: Theme.borderRadius.xl,
    padding: Theme.spacing.lg,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  gridIconContainer: {
    width: 48,
    height: 48,
    borderRadius: Theme.borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  gridItemText: { fontSize: 14, fontWeight: '800', color: '#0f172a' },
  
  howItWorksBanner: {
    backgroundColor: Theme.colors.primary,
    borderRadius: Theme.borderRadius.xl,
    padding: Theme.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: Theme.colors.primary,
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
  },
  howItWorksTitle: { fontSize: 16, fontWeight: '800', color: '#fff' },
  howItWorksSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  playButtonCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 2, // optical center for play icon
  },

  horizontalScroll: { marginHorizontal: -Theme.spacing.lg },
  horizontalScrollContent: { paddingHorizontal: Theme.spacing.lg, gap: 12 },
  featureCard: {
    width: 140,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    borderRadius: Theme.borderRadius.xl,
    padding: Theme.spacing.lg,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
  },
  featureIcon: { marginBottom: 12 },
  featureTitle: { fontSize: 13, fontWeight: '800', color: '#0f172a' },

  pathSection: { backgroundColor: '#f8fafc', marginVertical: Theme.spacing.md },
  pathSteps: { position: 'relative', paddingLeft: 8 },
  pathLine: {
    position: 'absolute',
    left: 31,
    top: 24,
    bottom: 40,
    width: 2,
    backgroundColor: '#e2e8f0',
    zIndex: 0,
  },
  pathStep: {
    flexDirection: 'row',
    marginBottom: 32,
    position: 'relative',
    zIndex: 1,
  },
  stepNumberCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: Theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  stepNumberActive: {
    backgroundColor: Theme.colors.primary,
    shadowColor: Theme.colors.primary,
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  stepNumberText: { fontSize: 18, fontWeight: '800', color: Theme.colors.primary },
  stepNumberTextActive: { fontSize: 18, fontWeight: '800', color: '#fff' },
  stepContent: { flex: 1, justifyContent: 'center' },
  stepTitle: { fontSize: 15, fontWeight: '800', color: '#0f172a', marginBottom: 2 },
  stepDesc: { fontSize: 13, color: '#64748b', lineHeight: 20 },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
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
