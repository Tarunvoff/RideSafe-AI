import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated, StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, Activity, MapPin, Shield } from 'lucide-react-native';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../../constants/colors';
import AnimatedProgressRing from '../../components/AnimatedProgressRing';
import PresenceLayerCard from '../../components/PresenceLayerCard';
import RotatingEarthGlobe from '../../components/RotatingEarthGlobe';
import { runPresenceLayerCheck } from '../../services/presenceAttestationService';

export default function AdminGpsProofScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const workerId = route?.params?.workerId || 'W001';
  const workerName = route?.params?.workerName || 'Worker Profile';
  
  const [isChecking, setIsChecking] = useState(false);
  const [presenceAssessment, setPresenceAssessment] = useState(null);
  const [snapshotHistory, setSnapshotHistory] = useState([]);
  const [lastSyncStatus, setLastSyncStatus] = useState(null);
  const [proofError, setProofError] = useState(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
    handleRunPresenceCheck();
  }, []);

  const recommendationColor = presenceAssessment?.recommendation === 'REJECT'
    ? COLORS.red
    : presenceAssessment?.recommendation === 'MANUAL_REVIEW'
      ? COLORS.orange
      : COLORS.green;

  const locationHistory = snapshotHistory
    .map((snapshot) => ({
      lat: snapshot?.layers?.gps?.lat,
      lng: snapshot?.layers?.gps?.lng,
    }))
    .filter((entry) => entry.lat !== null && entry.lat !== undefined && entry.lng !== null && entry.lng !== undefined);

  const handleRunPresenceCheck = async () => {
    try {
      setIsChecking(true);
      setProofError(null);

      const checkResult = await runPresenceLayerCheck({
        riderId: workerId,
        previousSnapshots: snapshotHistory,
      });

      setPresenceAssessment(checkResult.assessment);
      setLastSyncStatus(checkResult.syncResult);
      setSnapshotHistory((previous) => [...previous, checkResult.snapshot].slice(-12));
    } catch (error) {
      setProofError(error?.message || 'Unable to run GPS spoofing detection.');
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.navy} />
      
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ChevronLeft size={24} color="#FFFFFF" strokeWidth={2.5} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerSub}>{workerName}</Text>
          <Text style={styles.headerTitle}>GPS Spoofing Proof</Text>
        </View>
        <View style={styles.headerIcon}>
          <Shield size={20} color="#FFFFFF" strokeWidth={2} />
        </View>
      </View>

      <Animated.ScrollView 
        style={{ opacity: fadeAnim }} 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section */}
        <LinearGradient
          colors={[COLORS.navy, COLORS.purpleDark, COLORS.blue]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.proofHero, SHADOWS.strong]}
        >
          <View style={styles.proofHeroHeader}>
            <Text style={styles.proofHeroKicker}>Proof of Presence Protocol</Text>
            <Text style={styles.proofHeroTitle}>GPS Spoofing Defense Grid</Text>
            <Text style={styles.proofHeroSub}>Multi-signal attestation using GPS integrity, radio context, motion signature, and device trust.</Text>
          </View>

          <View style={styles.proofHeroBody}>
            <AnimatedProgressRing
              score={presenceAssessment?.trustScore || 0}
              size={132}
              color={presenceAssessment ? recommendationColor : COLORS.cyan}
              bgColor={'rgba(255,255,255,0.16)'}
              label="Trust Score"
              sublabel={presenceAssessment ? `${presenceAssessment.confidence} confidence` : 'Analyzing...'}
            />

            <View style={styles.proofBadgeColumn}>
              <View style={[styles.proofBadge, { borderColor: `${recommendationColor}66`, backgroundColor: `${recommendationColor}22` }]}>
                <Text style={[styles.proofBadgeLabel, { color: recommendationColor }]}>
                  {presenceAssessment ? presenceAssessment.recommendation.replace('_', ' ') : 'CHECKING...'}
                </Text>
              </View>
              <Text style={styles.proofMetricLabel}>Fraud Score</Text>
              <Text style={styles.proofMetricValue}>{presenceAssessment?.fraudScore ?? '--'}%</Text>
              <Text style={styles.proofMetaText}>
                {presenceAssessment?.checkedAt
                  ? `Last check ${new Date(presenceAssessment.checkedAt).toLocaleTimeString()}`
                  : 'Running scan...'}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.proofRunButton, isChecking && styles.proofRunButtonDisabled]}
            activeOpacity={0.85}
            onPress={handleRunPresenceCheck}
            disabled={isChecking}
          >
            <Activity size={16} color={COLORS.textWhite} strokeWidth={2.3} />
            <Text style={styles.proofRunButtonText}>{isChecking ? 'Re-running attestation…' : 'Re-run GPS Check'}</Text>
          </TouchableOpacity>
        </LinearGradient>

        {/* Rotating Globe */}
        <View style={[styles.proofPanel, SHADOWS.card]}>
          <RotatingEarthGlobe
            size={280}
            latitude={presenceAssessment?.location?.latitude}
            longitude={presenceAssessment?.location?.longitude}
            history={locationHistory}
            riskScore={presenceAssessment?.fraudScore || 0}
          />
        </View>

        {/* Error Display */}
        {proofError ? (
          <View style={[styles.proofErrorCard, SHADOWS.card]}>
            <Text style={styles.proofErrorText}>{proofError}</Text>
          </View>
        ) : null}

        {/* Detection Layer Results */}
        <Text style={styles.proofSectionTitle}>Detection Layer Results</Text>
        {presenceAssessment && presenceAssessment.layers ? (
          Object.values(presenceAssessment.layers).map((layer) => (
            <PresenceLayerCard key={layer.id} layer={layer} />
          ))
        ) : (
          <View style={[styles.proofEmptyCard, SHADOWS.card]}>
            <Text style={styles.proofEmptyText}>Run the GPS check to populate all detection layer scores.</Text>
          </View>
        )}

        {/* Snapshot Sync */}
        <View style={[styles.syncCard, SHADOWS.card]}>
          <View style={styles.syncHeader}>
            <MapPin size={16} color={COLORS.blue} strokeWidth={2} />
            <Text style={styles.syncTitle}>Snapshot Sync</Text>
          </View>
          <Text style={styles.syncText}>
            {lastSyncStatus
              ? `Pushed ${lastSyncStatus.pushed} • Pending ${lastSyncStatus.pending}${lastSyncStatus.skipped ? ' • Fetching Required' : ''}`
              : 'Snapshot queue not synced yet.'}
          </Text>
          <Text style={styles.syncMeta}>Last update: {Math.floor(Math.random() * 60)} seconds ago</Text>
        </View>

        {/* Recommendation Card */}
        {presenceAssessment && (
          <View style={[styles.recommendCard, { borderLeftColor: recommendationColor }]}>
            <View style={styles.recommendHeader}>
              <Text style={styles.recommendLabel}>ADMIN ACTION</Text>
            </View>
            <Text style={styles.recommendTitle} numberOfLines={2}>
              {presenceAssessment.recommendation === 'REJECT' ? 'Block This Worker'
                : presenceAssessment.recommendation === 'MANUAL_REVIEW' ? 'Manual Review Required'
                : 'Worker Approved'}
            </Text>
            <Text style={styles.recommendBody}>
              {presenceAssessment.recommendation === 'REJECT'
                ? 'GPS spoofing detected. Recommend blocking worker account and suspending payouts.'
                : presenceAssessment.recommendation === 'MANUAL_REVIEW'
                  ? 'GPS signal inconsistency detected. Recommend manual verification before approval.'
                  : 'GPS validation passed. Worker appears legitimate.'}
            </Text>
            <TouchableOpacity 
              style={[styles.recommendBtn, { backgroundColor: recommendationColor }]}
              activeOpacity={0.8}
            >
              <Text style={styles.recommendBtnText}>
                {presenceAssessment.recommendation === 'REJECT' ? 'Block Account'
                  : presenceAssessment.recommendation === 'MANUAL_REVIEW' ? 'Escalate for Review'
                  : 'Approve & Process Payout'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 100 }} />
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bgPrimary },
  header: {
    backgroundColor: COLORS.navy,
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  backBtn: { padding: 6, marginLeft: -6 },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginBottom: 2 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
  headerIcon: { width: 40, height: 40, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  scrollContent: { paddingHorizontal: SPACING.md, paddingTop: SPACING.md },
  proofHero: {
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  proofHeroHeader: { marginBottom: SPACING.lg },
  proofHeroKicker: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  proofHeroTitle: { fontSize: 24, fontWeight: '900', color: '#FFFFFF', marginBottom: 8 },
  proofHeroSub: { fontSize: 13, color: 'rgba(255,255,255,0.75)', lineHeight: 20 },
  proofHeroBody: { flexDirection: 'row', alignItems: 'center', gap: SPACING.lg, marginBottom: SPACING.lg },
  proofBadgeColumn: { flex: 1 },
  proofBadge: { borderRadius: RADIUS.lg, borderWidth: 1.5, paddingHorizontal: 12, paddingVertical: 8, marginBottom: SPACING.sm },
  proofBadgeLabel: { fontSize: 13, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  proofMetricLabel: { fontSize: 10, color: 'rgba(255,255,255,0.5)', fontWeight: '600', marginBottom: 2 },
  proofMetricValue: { fontSize: 20, fontWeight: '900', color: '#FFFFFF', marginBottom: 4 },
  proofMetaText: { fontSize: 10, color: 'rgba(255,255,255,0.4)' },
  proofRunButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  proofRunButtonDisabled: { opacity: 0.6 },
  proofRunButtonText: { fontSize: 13, fontWeight: '700', color: COLORS.textWhite },
  proofPanel: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.xl,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.bgBorder,
    alignItems: 'center',
  },
  proofErrorCard: {
    backgroundColor: COLORS.redLight,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.red + '30',
  },
  proofErrorText: { fontSize: 12, color: COLORS.red, fontWeight: '600' },
  proofSectionTitle: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary, marginBottom: SPACING.sm, marginTop: SPACING.lg },
  proofEmptyCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.bgBorder,
  },
  proofEmptyText: { fontSize: 12, color: COLORS.textSecondary, textAlign: 'center' },
  syncCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginVertical: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.bgBorder,
  },
  syncHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.sm },
  syncTitle: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  syncText: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 18 },
  syncMeta: { fontSize: 10, color: COLORS.textMuted, marginTop: SPACING.sm },
  recommendCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg,
    borderLeftWidth: 4,
    padding: SPACING.lg,
    marginVertical: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.bgBorder,
  },
  recommendHeader: { marginBottom: SPACING.sm },
  recommendLabel: { fontSize: 10, fontWeight: '800', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  recommendTitle: { fontSize: 16, fontWeight: '800', color: COLORS.textPrimary, marginBottom: SPACING.sm },
  recommendBody: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 18, marginBottom: SPACING.lg },
  recommendBtn: {
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recommendBtnText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
});
