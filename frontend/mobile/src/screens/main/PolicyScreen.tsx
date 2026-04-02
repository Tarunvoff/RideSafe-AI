import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { Animated, ImageBackground, PanResponder, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import LoadingOverlay from '../../components/LoadingOverlay';
import MainTopNavbar from '../../components/MainTopNavbar';
import { useAuth } from '../../context/AuthContext';
import { plansApi, policyApi } from '../../services/api';
import { Theme } from '../../theme';

export default function PolicyScreen({ navigation }: any) {
  const { user } = useAuth();
  const slideAnim = useRef(new Animated.Value(0)).current;
  const [policy, setPolicy] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState('Updating policy...');

  const driverId = user?.id ?? user?.email ?? null;

  const loadPolicy = useCallback(async () => {
    setLoading(true);
    try {
      const res = await plansApi.getPurchasedPlans();
      const purchased = res?.purchasedPolicies ?? [];
      setPolicy(purchased[0] ?? null);
    } catch {
      setPolicy(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPolicy();
  }, [loadPolicy]);

  const doCancelPolicy = async () => {
    if (!driverId) {
      Alert.alert('Unable to cancel', 'Missing driver identity. Please log in again.');
      return;
    }
    setActionMessage('Cancelling policy...');
    setActionLoading(true);
    try {
      await policyApi.cancel(String(driverId), 'Cancelled from mobile policy screen');
      await loadPolicy();
      Alert.alert('Policy cancelled', 'Your current policy has been cancelled successfully.');
    } catch (e: any) {
      Alert.alert('Cancel failed', e?.message ?? 'Could not cancel policy right now.');
    } finally {
      setActionLoading(false);
    }
  };

  const doRenewPolicy = async () => {
    if (!driverId) {
      Alert.alert('Unable to renew', 'Missing driver identity. Please log in again.');
      return;
    }
    setActionMessage('Renewing policy...');
    setActionLoading(true);
    try {
      await policyApi.renew(String(driverId));
      await loadPolicy();
      Alert.alert('Policy renewed', 'Your policy has been renewed successfully.');
    } catch (e: any) {
      Alert.alert('Renew failed', e?.message ?? 'Could not renew policy right now.');
    } finally {
      setActionLoading(false);
    }
  };

  const onPressCancelPolicy = () => {
    Alert.alert(
      'Cancel Policy',
      'Are you sure you want to cancel your current policy?',
      [
        { text: 'No', style: 'cancel' },
        { text: 'Yes, Cancel', style: 'destructive', onPress: () => void doCancelPolicy() },
      ],
    );
  };

  const onPressRenewPolicy = () => {
    Alert.alert(
      'Renew Policy',
      'Do you want to renew your policy now?',
      [
        { text: 'Not Now', style: 'cancel' },
        { text: 'Renew', onPress: () => void doRenewPolicy() },
      ],
    );
  };

  // Simple slide to activate logic
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dx >= 0 && gestureState.dx <= 260) {
          slideAnim.setValue(gestureState.dx);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx > 180) {
          Animated.spring(slideAnim, { toValue: 260, useNativeDriver: true }).start();
          // Trigger activation logic here
          setTimeout(() => {
            navigation.navigate('Dashboard');
          }, 800);
        } else {
          Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true }).start();
        }
      },
    })
  ).current;

  return (
    <SafeAreaView style={styles.safeArea}>
      <MainTopNavbar />
      <LoadingOverlay visible={loading || actionLoading} message={actionLoading ? actionMessage : 'Loading policy details...'} />

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.heroSection}>
          <Text style={styles.heroTitle}>Aegis Protection</Text>
          <Text style={styles.heroDesc}>Secure your income and liability in one tap</Text>
        </View>

        <View style={styles.planCardSection}>
          <View style={styles.planCard}>
            <ImageBackground 
              source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBi64nHHYT8KZE8li4enaFhcStAbbE6MdyvgXUkvB5olBT849lLM01O-A7J8FfTmHEfOHNeqMMpp23R-gS_hrEjkjhf5GOo2DRul5IpVmr-Ma_UYf0gYbubd0k-Hmuo-scbd_KpzK1SDAxSgNuo2Q76uwdBd81vID4rSlyYI2H0oyEFAk3EZ7BpsaaOVekdyJCuDn4_C4a0heZA3D2HonhNsgecFigqVGh_Hla4L5g_uXhK72Te84OyT-euxP_05DocPD_nZRq08deD' }}
              style={styles.planImage}
            />
            <View style={styles.planContent}>
              <View style={styles.planBadge}>
                <Text style={styles.planBadgeText}>{policy?.plan?.key ?? 'NO PLAN'}</Text>
              </View>
              <Text style={styles.planTitle}>{policy?.plan?.name ?? 'No active plan'}</Text>
              
              <View style={styles.planPriceBox}>
                <Text style={styles.planPrice}>₹{Number(policy?.plan?.price ?? 0).toLocaleString('en-IN')} <Text style={styles.planPricePeriod}>/ week</Text></Text>
                <Text style={styles.planDesc}>Weekly protection with auto-claim payouts during verified disruptions.</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.summarySection}>
          <Text style={styles.sectionTitle}>Plan Summary</Text>
          
          <View style={styles.summaryRow}>
            <View style={styles.summaryLabelRow}>
              <Ionicons name="shield-checkmark" size={20} color={Theme.colors.primary} />
              <Text style={styles.summaryLabel}>Coverage Limit</Text>
            </View>
            <Text style={styles.summaryValue}>₹{Number(policy?.plan?.maxPayout ?? 0).toLocaleString('en-IN')}</Text>
          </View>
          
          <View style={styles.summaryRow}>
            <View style={styles.summaryLabelRow}>
              <Ionicons name="wallet" size={20} color={Theme.colors.primary} />
              <Text style={styles.summaryLabel}>Deductible</Text>
            </View>
            <Text style={styles.summaryValue}>₹0</Text>
          </View>
          
          <View style={styles.summaryRow}>
            <View style={styles.summaryLabelRow}>
              <Ionicons name="calendar" size={20} color={Theme.colors.primary} />
              <Text style={styles.summaryLabel}>Next Billing</Text>
            </View>
            <Text style={styles.summaryValue}>{policy?.endDate ? new Date(policy.endDate).toLocaleDateString() : '—'}</Text>
          </View>
        </View>

        <View style={styles.autoClaimSection}>
          <View style={styles.autoClaimBox}>
            <Ionicons name="checkmark-circle" size={24} color={Theme.colors.primary} style={{ marginTop: 2, marginRight: 12 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.autoClaimTitle}>Auto-Claim Monitoring Active</Text>
              <Text style={styles.autoClaimDesc}>We'll automatically detect platform deactivations or accidents through your linked accounts and start your claim process instantly.</Text>
            </View>
          </View>
        </View>

        <View style={styles.actionSection}>
          <View style={styles.lifecycleRow}>
            <TouchableOpacity
              style={[styles.lifecycleBtn, styles.cancelBtn, (!policy || actionLoading) && styles.lifecycleBtnDisabled]}
              onPress={onPressCancelPolicy}
              disabled={!policy || actionLoading}
              activeOpacity={0.85}
            >
              <Ionicons name="close-circle-outline" size={18} color="#b91c1c" />
              <Text style={styles.cancelBtnText}>Cancel Policy</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.lifecycleBtn, styles.renewBtn, actionLoading && styles.lifecycleBtnDisabled]}
              onPress={onPressRenewPolicy}
              disabled={actionLoading}
              activeOpacity={0.85}
            >
              <Ionicons name="refresh-outline" size={18} color="#166534" />
              <Text style={styles.renewBtnText}>Renew Policy</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.sliderTrack}>
            <Text style={styles.sliderText}>SLIDE TO ACTIVATE</Text>
            <Animated.View {...panResponder.panHandlers} style={[styles.sliderThumb, { transform: [{ translateX: slideAnim }] }]}>
              <Ionicons name="chevron-forward" size={24} color="#fff" />
              <Ionicons name="chevron-forward" size={24} color="#fff" style={{ marginLeft: -12 }} />
            </Animated.View>
          </View>
          
          <TouchableOpacity style={styles.activateBtn} onPress={() => navigation.navigate('Dashboard')}>
            <Text style={styles.activateBtnText}>Activate Policy Now</Text>
          </TouchableOpacity>
          <Text style={styles.termsText}>BY ACTIVATING, YOU AGREE TO OUR TERMS OF SERVICE</Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  container: { paddingBottom: 32 },
  
  heroSection: { paddingHorizontal: 24, paddingTop: 32, paddingBottom: 16, alignItems: 'center' },
  heroTitle: { fontSize: 30, fontWeight: '800', color: '#0f172a', textAlign: 'center' },
  heroDesc: { fontSize: 14, color: '#64748b', textAlign: 'center', marginTop: 8 },

  planCardSection: { padding: 16 },
  planCard: { backgroundColor: '#f8fafc', borderRadius: Theme.borderRadius.xl, borderWidth: 1, borderColor: '#f1f5f9', overflow: 'hidden' },
  planImage: { width: '100%', aspectRatio: 16/9 },
  planContent: { padding: 20 },
  planBadge: { backgroundColor: `${Theme.colors.primary}15`, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, alignSelf: 'flex-start', marginBottom: 4 },
  planBadgeText: { fontSize: 10, fontWeight: '800', color: Theme.colors.primary, letterSpacing: 1 },
  planTitle: { fontSize: 20, fontWeight: '800', color: '#0f172a' },
  planPriceBox: { marginTop: 8 },
  planPrice: { fontSize: 24, fontWeight: '800', color: Theme.colors.primary, marginBottom: 4 },
  planPricePeriod: { fontSize: 14, fontWeight: '400', color: '#64748b' },
  planDesc: { fontSize: 14, color: '#475569', lineHeight: 22 },

  summarySection: { paddingHorizontal: 24, paddingTop: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a', marginBottom: 16 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  summaryLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  summaryLabel: { fontSize: 14, fontWeight: '500', color: '#475569' },
  summaryValue: { fontSize: 14, fontWeight: '800', color: '#0f172a' },

  autoClaimSection: { padding: 24 },
  autoClaimBox: { flexDirection: 'row', backgroundColor: `${Theme.colors.primary}0D`, padding: 16, borderRadius: Theme.borderRadius.xl, borderWidth: 1, borderColor: `${Theme.colors.primary}33` },
  autoClaimTitle: { fontSize: 14, fontWeight: '800', color: '#0f172a', marginBottom: 4 },
  autoClaimDesc: { fontSize: 12, color: '#475569', lineHeight: 18 },

  actionSection: { paddingHorizontal: 24, marginTop: 'auto', paddingTop: 16, gap: 16 },
  lifecycleRow: { flexDirection: 'row', gap: 10 },
  lifecycleBtn: {
    flex: 1,
    height: 48,
    borderRadius: Theme.borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    borderWidth: 1,
  },
  lifecycleBtnDisabled: { opacity: 0.55 },
  cancelBtn: { backgroundColor: '#fef2f2', borderColor: '#fecaca' },
  cancelBtnText: { fontSize: 13, fontWeight: '800', color: '#b91c1c' },
  renewBtn: { backgroundColor: '#ecfdf3', borderColor: '#86efac' },
  renewBtnText: { fontSize: 13, fontWeight: '800', color: '#166534' },
  sliderTrack: { height: 64, backgroundColor: '#f1f5f9', borderRadius: 32, justifyContent: 'center', paddingHorizontal: 4, position: 'relative' },
  sliderText: { position: 'absolute', width: '100%', textAlign: 'center', fontSize: 14, fontWeight: '600', color: '#94a3b8', letterSpacing: 1 },
  sliderThumb: { width: 56, height: 56, borderRadius: 28, backgroundColor: Theme.colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', shadowColor: Theme.colors.primary, shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, zIndex: 10 },
  activateBtn: { backgroundColor: Theme.colors.primary, height: 56, borderRadius: Theme.borderRadius.xl, alignItems: 'center', justifyContent: 'center', shadowColor: Theme.colors.primary, shadowOpacity: 0.25, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
  activateBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  termsText: { textAlign: 'center', fontSize: 10, color: '#94a3b8', fontWeight: '600', letterSpacing: 1 },
});
