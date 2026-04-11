import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Button from '../../components/Button';
import LoadingOverlay from '../../components/LoadingOverlay';
import { useAuth } from '../../context/AuthContext';
import { fraudApi } from '../../services/api';
import { Theme } from '../../theme';

let Location: any = null;
try {
  Location = require('expo-location');
} catch (e) {
  console.warn('expo-location not available');
}

const PRIMARY = '#ec5b13';
const AMBER = '#d97706';
const RED = '#dc2626';
const GREEN = '#16a34a';
const SLATE_500 = '#64748b';
const SLATE_900 = '#0f172a';
const SLATE_100 = '#f1f5f9';

export default function KYCFraudDetectionScreen({ navigation }: any) {
  const [isLoading, setIsLoading] = useState(false);
  const [riskScore, setRiskScore] = useState<number | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [deviceIntegrity, setDeviceIntegrity] = useState('Normal Device');
  const [networkType, setNetworkType] = useState('Standard Network');
  const [velocityCheck, setVelocityCheck] = useState('Within Range');
  const [analysisDetails, setAnalysisDetails] = useState<string[]>([]);
  const [signals, setSignals] = useState<any[]>([]);
  const [claimedCoords, setClaimedCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locationReady, setLocationReady] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const { refreshKycStatus } = useAuth();

  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    requestLocationPermission();
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.25, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const requestLocationPermission = async () => {
    try {
      if (!Location) {
        setLocationError('Location services are unavailable on this device.');
        setLocationReady(false);
        return;
      }
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationError('Location permission is required for fraud detection.');
        setLocationReady(false);
        Alert.alert('Permission Denied', 'Location permission is required for fraud detection');
        return;
      }
      setLocationError(null);
      setLocationReady(true);
    } catch (error) {
      console.error('Location permission error:', error);
      setLocationError('Could not request location permission. Please try again.');
      setLocationReady(false);
    }
  };

  const handleAnalyze = async () => {
    setIsLoading(true);
    try {
      if (!Location) {
        throw new Error('Location services not available.');
      }

      if (!locationReady) {
        throw new Error(locationError || 'Location permission is required for fraud detection.');
      }
      
      let latitude: number;
      let longitude: number;

      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        if (status !== 'granted') {
          setLocationError('Location permission is required for fraud detection. Please enable it in settings.');
          setLocationReady(false);
          throw new Error('Location permission is required for fraud detection. Please enable it in settings.');
        }

        const location = await Location.getCurrentPositionAsync({});
        latitude = location.coords.latitude;
        longitude = location.coords.longitude;

        if (Math.abs(latitude) < 0.1 && Math.abs(longitude) < 0.1) {
          throw new Error('Suspicious coordinates (0,0) detected. Please ensure GPS lock is established on your device.');
        }
      } catch (locError: any) {
        setLocationError(locError.message || 'Could not fetch device location. Please try again.');
        setLocationReady(false);
        throw new Error(locError.message || 'Could not fetch device location. Please try again.');
      }

      setClaimedCoords({ lat: latitude, lng: longitude });

      const response = await fraudApi.analyze({
        gpsLatitude: latitude,
        gpsLongitude: longitude,
        deviceIntegrity,
        networkType,
        velocityCheck,
      });

      setRiskScore(response.data.riskScore);
      setStatus(response.data.status);
      setAnalysisDetails(response.data.analysis?.riskFactors || []);
      setSignals(response.data.analysis?.signals || []);
      setLocationError(null);
      setLocationReady(true);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to analyze fraud risk');
    } finally {
      setIsLoading(false);
    }
  };

  const handleContinue = async () => {
    if (status === 'INCONCLUSIVE') {
      Alert.alert('Manual Review Required', 'Your submission has been flagged for manual review. Our team will notify you within 24 hours.');
    }
    await refreshKycStatus();
    navigation.navigate('KYCSubmitted');
  };

  const getRiskColor = (score: number) => {
    if (score < 30) return GREEN;
    if (score < 60) return AMBER;
    return RED;
  };

  const getRiskLabel = (score: number) => {
    if (score < 30) return 'Low Risk';
    if (score < 60) return 'Medium Risk';
    return 'High Risk';
  };

  const getStatusLabel = (score: number) => {
    if (score < 30) return 'CLEAR';
    if (score < 60) return 'INCONCLUSIVE';
    return 'CRITICAL';
  };

  // ── PRE-ANALYSIS VIEW ───────────────────────────────────────────────────
  const renderPreAnalysis = () => (
    <>
      {/* Map Visualization */}
      <View style={styles.mapCard}>
        <Image
          source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBpCF55MrP_pOLTtqK8KERIj2lSeaClAU8Rlw6ypwCAiYmRzjnLfmFz_D0VN2ge86aB_dMdgftW8lFXFKIStgkWC2gwSZIvZBnrOG3nHPak-LVLt8a7hmq8Ymo56rO2QReUgZGYcpiOnpIQKOMiKEI_1wuH8B930si6xD8a7eQP8StdTrEQcp8xnxC_9atBA2TiRh3H-O3CXYBDMqjg-McHTyeXWzto8XwstWBZ4_vUQNhRDO_XPJ07wBxOWP2XUlIokT6je-FXcpw' }}
          style={styles.mapImage}
          resizeMode="cover"
        />
        <View style={styles.mapOverlay} />
        <View style={styles.mapCenter}>
          <Animated.View style={[styles.pulseRing, { transform: [{ scale: pulseAnim }] }]} />
          <View style={styles.mapIcon}>
            <Ionicons name="search" size={28} color={AMBER} />
          </View>
        </View>
        <View style={styles.mapLabel}>
          <Ionicons name="scan" size={14} color="#fff" />
          <Text style={styles.mapLabelText}>
            {locationError ? 'Location required' : 'Awaiting GPS Lock…'}
          </Text>
        </View>
      </View>

        {locationError && (
          <View style={styles.locationErrorCard}>
            <Ionicons name="location-outline" size={18} color={AMBER} />
            <View style={{ flex: 1 }}>
              <Text style={styles.locationErrorTitle}>Location needed</Text>
              <Text style={styles.locationErrorText}>{locationError}</Text>
            </View>
            <TouchableOpacity style={styles.locationRetryBtn} onPress={requestLocationPermission}>
              <Ionicons name="refresh" size={14} color={SLATE_900} />
              <Text style={styles.locationRetryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

      {/* Session card */}
      <View style={styles.sessionCard}>
        <View style={styles.sessionRow}>
          <Ionicons name="time-outline" size={16} color={SLATE_500} />
          <Text style={styles.sessionLabel}>Session ID</Text>
          <Text style={styles.sessionValue}>#TRX-9920-X1</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.sessionRow}>
          <Ionicons name="warning-outline" size={16} color={AMBER} />
          <Text style={styles.sessionLabel}>Status</Text>
          <View style={styles.statusPill}>
            <Text style={styles.statusPillText}>PENDING SCAN</Text>
          </View>
        </View>
      </View>

      {/* Device checks */}
      <Text style={styles.sectionTitle}>Security Checks</Text>
      <View style={styles.checksCard}>
        {[
          { icon: 'phone-portrait-outline', label: 'Device Integrity', value: deviceIntegrity, color: Theme.colors.primary },
          { icon: 'wifi-outline', label: 'Network Type', value: networkType, color: Theme.colors.primary },
          { icon: 'checkmark-circle-outline', label: 'Velocity Check', value: velocityCheck, color: GREEN },
        ].map((item, i) => (
          <View key={item.label} style={[styles.checkRow, i < 2 ? styles.checkRowBorder : null]}>
            <View style={styles.checkIcon}>
              <Ionicons name={item.icon as any} size={18} color={item.color} />
            </View>
            <Text style={styles.checkLabel}>{item.label}</Text>
            <Text style={styles.checkValue}>{item.value}</Text>
          </View>
        ))}
      </View>

      <View style={styles.infoBox}>
        <Ionicons name="information-circle" size={20} color={Theme.colors.primary} />
        <Text style={styles.infoText}>
          We analyze GPS signal integrity, device tampering indicators, and network anomalies to detect spoofing in real-time.
        </Text>
      </View>
    </>
  );

  // ── POST-ANALYSIS VIEW ──────────────────────────────────────────────────
  const renderResult = (score: number) => {
    const color = getRiskColor(score);
    const label = getRiskLabel(score);
    const statusLabel = getStatusLabel(score);
    const isInconclusive = score >= 30 && score < 60;
    const isCritical = score >= 60;

    return (
      <>
        {/* Map with location overlay */}
        <View style={styles.mapCard}>
          <Image
            source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCPOp7amq_KzyiWylXuU-tVU2Y3pGnU5XK43sswk4ZRqoV5h8VdEBuZNN1C9LyWwxvuXoIXRTFaLs7WKZV9Zuu8rJf7wC6NYYsDnjB9RnHaQ8sMj546s7QBwYqpx3SIGeXRCApj01AXS_CGHN-IC0Z8tTLP5RH5a7jerqrLWvhRsBFUbvqSus4LRvcbqQYRzsEZMKK5qZvkuIvEdQ0ScX-i7sTNo8y0FG2vWWI5hQL4VZmC_TxOEq4tKXhOGwJfcLAd2Iz4tmeRJAg' }}
            style={styles.mapImage}
            resizeMode="cover"
          />
          <View style={styles.mapOverlay} />

          {/* Location pins overlay */}
          <View style={styles.mapPins}>
            <View style={styles.mapPinCard}>
              <View style={[styles.pinDot, { backgroundColor: '#3b82f6' }]} />
              <View>
                <Text style={styles.pinLabel}>Claimed Location</Text>
                <Text style={styles.pinCoords}>
                  {claimedCoords ? `${claimedCoords.lat.toFixed(4)}° N` : '—'}
                </Text>
                <Text style={styles.pinCity}>GPS Signal Origin</Text>
              </View>
            </View>
            {isCritical && (
              <View style={[styles.mapPinCard, styles.mapPinCardRed]}>
                <View style={[styles.pinDot, { backgroundColor: RED }]} />
                <View>
                  <Text style={[styles.pinLabel, { color: RED }]}>Discrepancy Detected</Text>
                  <Text style={styles.pinCoords}>IP vs GPS Mismatch</Text>
                  <Text style={styles.pinCity}>Possible VPN/Proxy</Text>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Summary card */}
        <View style={[styles.summaryCard, { borderLeftColor: color }]}>
          <View style={styles.summaryTop}>
            <View style={[styles.summaryIcon, { backgroundColor: `${color}20` }]}>
              <Ionicons
                name={score < 30 ? 'shield-checkmark' : score < 60 ? 'warning' : 'alert-circle'}
                size={28}
                color={color}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.summaryTitle}>
                {score < 30 ? 'Clean Signal Detected' : score < 60 ? 'Inconclusive Patterns' : 'Geographic Discrepancy'}
              </Text>
              <Text style={styles.summarySubtitle}>
                {score < 30
                  ? 'GPS integrity verified. No spoofing indicators found.'
                  : score < 60
                  ? 'Moderate risk indicators require manual review.'
                  : `High confidence spoofing detected (${score}%)`}
              </Text>
            </View>
          </View>
          <View style={styles.summaryBadgeRow}>
            <View style={[styles.badge, { backgroundColor: `${color}15` }]}>
              <Text style={[styles.badgeText, { color }]}>{statusLabel}</Text>
            </View>
            {isCritical && (
              <View style={[styles.badge, { backgroundColor: '#f1f5f9' }]}>
                <Text style={[styles.badgeText, { color: SLATE_500 }]}>CYBER_PHYSICAL</Text>
              </View>
            )}
          </View>
        </View>

        {/* Risk Meter */}
        <View style={styles.riskCard}>
          <Text style={styles.riskTitle}>Fraud Risk Index</Text>
          <View style={styles.riskRow}>
            <Text style={[styles.riskScore, { color }]}>{score}%</Text>
            <View style={styles.riskBarContainer}>
              <View style={styles.riskBarBg}>
                <View style={[styles.riskBarFill, { width: `${score}%`, backgroundColor: color }]} />
              </View>
              <Text style={[styles.riskLabel, { color }]}>{label}</Text>
            </View>
          </View>
        </View>

        {/* Risk Breakdown */}
        <Text style={styles.sectionTitle}>Risk Breakdown</Text>
        <View style={styles.breakdownCard}>
          {[
            { label: 'Signal Integrity', value: Math.max(8, 100 - score), color: score > 60 ? RED : GREEN },
            { label: 'Device Reputation', value: Math.min(score + 15, 95), color: score > 40 ? AMBER : GREEN },
            { label: 'Network Latency', value: Math.max(5, score - 20), color: score > 60 ? RED : AMBER },
          ].map((item) => (
            <View key={item.label} style={styles.breakdownRow}>
              <View style={styles.breakdownLabelRow}>
                <Text style={styles.breakdownLabel}>{item.label}</Text>
                <Text style={[styles.breakdownValue, { color: item.color }]}>{item.value}%</Text>
              </View>
              <View style={styles.breakdownBarBg}>
                <View style={[styles.breakdownBarFill, { width: `${item.value}%`, backgroundColor: item.color }]} />
              </View>
            </View>
          ))}
        </View>

        {/* Detection Signals */}
        <Text style={styles.sectionTitle}>Detection Signals</Text>
        <View style={styles.signalsGrid}>
          {signals.length > 0 ? (
            signals.map((sig, i) => (
              <View key={sig.id || `sig-${i}`} style={[styles.signalCard, !sig.pass && styles.signalCardFail]}>
                <Ionicons
                  name={sig.pass ? 'checkmark-circle' : 'close-circle'}
                  size={20}
                  color={sig.pass ? GREEN : RED}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.signalLabel}>{sig.label}</Text>
                  <Text style={styles.signalDesc}>{sig.desc}</Text>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.signalEmpty}>
              <Ionicons name="alert-circle-outline" size={18} color={SLATE_500} />
              <Text style={styles.signalEmptyText}>No signal breakdown returned yet.</Text>
            </View>
          )}
        </View>

        {/* Historical Timeline */}
        <Text style={styles.sectionTitle}>Risk Timeline</Text>
        <View style={styles.timelineCard}>
          <View style={styles.timelineTrack}>
            <View style={styles.timelineLine} />
            {[
              { date: 'Day 1', label: 'Safe', color: GREEN, size: 14 },
              { date: 'Day 3', label: 'Safe', color: GREEN, size: 14 },
              { date: 'Day 5', label: 'Suspicious', color: AMBER, size: 18 },
              { date: 'Day 7', label: 'Safe', color: GREEN, size: 14 },
              { date: 'Today', label: statusLabel, color, size: 22 },
            ].map((point) => (
              <View key={point.date} style={styles.timelinePoint}>
                <View style={[styles.timelineDot, { width: point.size, height: point.size, borderRadius: point.size / 2, backgroundColor: point.color }]} />
                <Text style={[styles.timelineDate, point.date === 'Today' && { fontWeight: '800', color: SLATE_900 }]}>{point.date}</Text>
                <Text style={[styles.timelineLabel, { color: point.color }]}>{point.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Manual review notice */}
        {isInconclusive && (
          <View style={styles.reviewNotice}>
            <Ionicons name="time" size={20} color={AMBER} />
            <View style={{ flex: 1 }}>
              <Text style={styles.reviewTitle}>Manual Review Required</Text>
              <Text style={styles.reviewDesc}>GPS signals exhibit inconsistent timing offsets that require human verification.</Text>
            </View>
          </View>
        )}

        {analysisDetails.length > 0 && (
          <View style={styles.riskFactorsCard}>
            <Text style={styles.sectionTitle}>Risk Factors</Text>
            {analysisDetails.map((d, i) => (
              <View key={i} style={styles.riskFactor}>
                <Ionicons name="alert-circle" size={14} color={RED} />
                <Text style={styles.riskFactorText}>{d}</Text>
              </View>
            ))}
          </View>
        )}
      </>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <LoadingOverlay visible={isLoading} message="Running fraud signal analysis..." />
      {/* Header */}
      <View style={styles.header}>
        {navigation.canGoBack() ? (
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={SLATE_900} />
          </TouchableOpacity>
        ) : (
          <View style={styles.backBtn} />
        )}
        <View>
          <Text style={styles.headerTitle}>Fraud Detection System</Text>
          <Text style={styles.headerSub}>GPS Spoofing Analysis</Text>
        </View>
        <View style={styles.headerRight}>
          <View style={styles.stepBadge}>
            <Text style={styles.stepBadgeText}>5 of 6</Text>
          </View>
        </View>
      </View>

      {/* Progress bar */}
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: '83%' }]} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {riskScore === null ? renderPreAnalysis() : renderResult(riskScore)}
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        {riskScore === null ? (
          <Button
            title={isLoading ? 'Scanning…' : locationReady ? 'Analyze Device' : 'Enable Location to Continue'}
            onPress={handleAnalyze}
            disabled={isLoading || !locationReady}
          />
        ) : (
          <>
            <Button title="Continue to Submission" onPress={handleContinue} />
            <TouchableOpacity style={styles.reanalyzeBtn} onPress={() => setRiskScore(null)}>
              <Ionicons name="refresh" size={16} color={SLATE_500} />
              <Text style={styles.reanalyzeBtnText}>Re-analyze</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f8f6f6' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: SLATE_100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 15, fontWeight: '800', color: SLATE_900 },
  headerSub: { fontSize: 11, color: SLATE_500, fontWeight: '600', marginTop: 1 },
  headerRight: { marginLeft: 'auto' as any },
  stepBadge: {
    backgroundColor: `${PRIMARY}15`,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  stepBadgeText: { fontSize: 11, fontWeight: '800', color: PRIMARY },

  progressBar: { height: 4, backgroundColor: '#e2e8f0' },
  progressFill: { height: 4, backgroundColor: PRIMARY },

  scroll: { padding: 16, gap: 16, paddingBottom: 32 },

  // Map
  mapCard: {
    height: 220,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#e2e8f0',
    position: 'relative',
  },
  mapImage: { width: '100%', height: '100%' },
  mapOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15,23,42,0.35)',
  },
  mapCenter: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -28 }, { translateY: -28 }],
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: `${AMBER}25`,
    borderWidth: 2,
    borderColor: `${AMBER}50`,
  },
  mapIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  mapLabel: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  mapLabelText: { color: '#fff', fontSize: 11, fontWeight: '700' },

  mapPins: { position: 'absolute', top: 12, left: 12, gap: 8 },
  mapPinCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.95)',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    maxWidth: 200,
  },
  mapPinCardRed: { borderColor: '#fecaca' },
  pinDot: { width: 8, height: 8, borderRadius: 4, marginTop: 4 },
  pinLabel: { fontSize: 10, fontWeight: '700', color: SLATE_500, textTransform: 'uppercase' },
  pinCoords: { fontSize: 11, fontWeight: '600', color: SLATE_900 },
  pinCity: { fontSize: 10, color: SLATE_500 },

  // Session
  sessionCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sessionRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  sessionLabel: { fontSize: 13, color: SLATE_500, flex: 1 },
  sessionValue: { fontSize: 13, fontWeight: '700', color: SLATE_900 },
  statusPill: { backgroundColor: `${AMBER}15`, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  statusPillText: { fontSize: 10, fontWeight: '800', color: AMBER, letterSpacing: 0.5 },
  divider: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 4 },

  sectionTitle: { fontSize: 12, fontWeight: '800', color: SLATE_500, textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 4 },

  // Checks
  checksCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  checkRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  checkRowBorder: { borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  checkIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: SLATE_100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkLabel: { fontSize: 13, fontWeight: '600', color: SLATE_900, flex: 1 },
  checkValue: { fontSize: 12, fontWeight: '700', color: SLATE_500 },

  infoBox: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: `${PRIMARY}10`,
    padding: 14,
    borderRadius: 12,
    alignItems: 'flex-start',
  },
  infoText: { fontSize: 12, color: SLATE_900, flex: 1, lineHeight: 18 },
  locationErrorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#fff7ed',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fed7aa',
    padding: 12,
  },
  locationErrorTitle: { fontSize: 12, fontWeight: '800', color: SLATE_900 },
  locationErrorText: { fontSize: 11, color: SLATE_500, marginTop: 2 },
  locationRetryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fde68a',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  locationRetryText: { fontSize: 11, fontWeight: '700', color: SLATE_900 },

  // Summary
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderLeftWidth: 4,
    padding: 16,
    gap: 12,
  },
  summaryTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  summaryIcon: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  summaryTitle: { fontSize: 16, fontWeight: '800', color: SLATE_900, lineHeight: 22 },
  summarySubtitle: { fontSize: 12, color: SLATE_500, marginTop: 2, lineHeight: 18 },
  summaryBadgeRow: { flexDirection: 'row', gap: 8 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  badgeText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },

  // Risk meter
  riskCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16,
  },
  riskTitle: { fontSize: 11, fontWeight: '800', color: SLATE_500, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 },
  riskRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  riskScore: { fontSize: 40, fontWeight: '900', lineHeight: 44 },
  riskBarContainer: { flex: 1, gap: 6 },
  riskBarBg: { height: 8, backgroundColor: SLATE_100, borderRadius: 4, overflow: 'hidden' },
  riskBarFill: { height: 8, borderRadius: 4 },
  riskLabel: { fontSize: 12, fontWeight: '700' },

  // Breakdown
  breakdownCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16,
    gap: 14,
  },
  breakdownRow: { gap: 6 },
  breakdownLabelRow: { flexDirection: 'row', justifyContent: 'space-between' },
  breakdownLabel: { fontSize: 12, color: SLATE_500, fontWeight: '600' },
  breakdownValue: { fontSize: 12, fontWeight: '800' },
  breakdownBarBg: { height: 6, backgroundColor: SLATE_100, borderRadius: 3, overflow: 'hidden' },
  breakdownBarFill: { height: 6, borderRadius: 3 },

  // Signals grid
  signalsGrid: { gap: 8 },
  signalEmpty: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
  },
  signalEmptyText: { fontSize: 12, color: SLATE_500 },
  signalCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
  },
  signalCardFail: { borderColor: '#fecaca', backgroundColor: '#fff5f5' },
  signalLabel: { fontSize: 12, fontWeight: '800', color: SLATE_900 },
  signalDesc: { fontSize: 11, color: SLATE_500, marginTop: 2, lineHeight: 16 },

  // Timeline
  timelineCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 24,
  },
  timelineTrack: { flexDirection: 'row', justifyContent: 'space-between', position: 'relative', alignItems: 'center' },
  timelineLine: {
    position: 'absolute',
    top: 7,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: SLATE_100,
  },
  timelinePoint: { alignItems: 'center', gap: 6 },
  timelineDot: { borderWidth: 3, borderColor: '#fff', zIndex: 1 },
  timelineDate: { fontSize: 9, fontWeight: '700', color: SLATE_500 },
  timelineLabel: { fontSize: 9, fontWeight: '700' },

  // Review notice
  reviewNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: `${AMBER}10`,
    borderWidth: 1,
    borderColor: `${AMBER}30`,
    borderRadius: 14,
    padding: 14,
  },
  reviewTitle: { fontSize: 13, fontWeight: '800', color: AMBER, marginBottom: 2 },
  reviewDesc: { fontSize: 12, color: SLATE_500, lineHeight: 18 },

  riskFactorsCard: { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#e2e8f0', padding: 16, gap: 8 },
  riskFactor: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  riskFactorText: { fontSize: 12, color: SLATE_500, flex: 1, lineHeight: 18 },

  // Footer
  footer: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    gap: 10,
  },
  reanalyzeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8 },
  reanalyzeBtnText: { fontSize: 14, fontWeight: '700', color: SLATE_500 },
});
