import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
  Alert,
    Animated,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { Circle, Svg } from 'react-native-svg';
import AdminShell from '../../components/layout/AdminShell';
import { fraudApi } from '../../services/api';
import { Theme } from '../../theme';

const PRIMARY = Theme.colors.primary;
const AMBER = Theme.colors.primary;
const SLATE_900 = Theme.colors.text;
const SLATE_500 = Theme.colors.textSecondary;
const SLATE_100 = Theme.colors.surface;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export default function AdminFraudDetailScreen({ route, navigation }: any) {
  const { userId } = route.params;
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const riskAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let isActive = true;
    const loadDetails = async () => {
      setIsLoading(true);
      try {
        const response = await fraudApi.getSubmissionDetails(userId);
        if (isActive) setData(response);
      } catch (e: any) {
        if (isActive) Alert.alert('Error', e?.message ?? 'Failed to load fraud details');
      } finally {
        if (isActive) setIsLoading(false);
      }
    };
    void loadDetails();
    
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.25, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ])
    ).start();
    return () => {
      isActive = false;
    };
  }, [userId]);

  useEffect(() => {
    if (!data) return;
    Animated.timing(riskAnim, {
      toValue: data.analysis.riskScore,
      duration: 1500,
      useNativeDriver: false,
    }).start();
  }, [data, riskAnim]);

  const handleEscalate = async () => {
    setIsLoading(true);
    try {
      await fraudApi.escalateSubmission(userId, 'Escalated from fraud detail view');
      Alert.alert('Escalated', 'Submission sent to fraud analyst');
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to escalate submission');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading || !data) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={PRIMARY} />
      </View>
    );
  }

  const { analysis, user } = data;
  const riskScore = analysis.riskScore;
  const radius = 28;
  const circumference = 2 * Math.PI * radius;

  const strokeDashoffset = riskAnim.interpolate({
    inputRange: [0, 100],
    outputRange: [circumference, 0],
  });

  return (
    <AdminShell navigation={navigation} activeKey="dash">
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={SLATE_900} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Fraud Detection System</Text>
        <TouchableOpacity style={styles.iconBtn}>
          <Ionicons name="ellipsis-vertical" size={24} color={SLATE_900} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Title Section */}
        <View style={styles.titleSection}>
          <View style={styles.badgeRow}>
            <Ionicons name="calendar-outline" size={14} color={AMBER} />
            <Text style={styles.badgeText}>MANUAL REVIEW REQUIRED</Text>
          </View>
          <Text style={styles.pageTitle}>GPS Spoofing Analysis</Text>
          <Text style={styles.sessionId}>Session ID: #{analysis.id.slice(-8).toUpperCase()}</Text>
        </View>

        {/* State Card */}
        <View style={styles.stateCard}>
          <View style={styles.mapContainer}>
            <Image 
              source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBpCF55MrP_pOLTtqK8KERIj2lSeaClAU8Rlw6ypwCAiYmRzjnLfmFz_D0VN2ge86aB_dMdgftW8lFXFKIStgkWC2gwSZIvZBnrOG3nHPak-LVLt8a7hmq8Ymo56rO2QReUgZGYcpiOnpIQKOMiKEI_1wuH8B930si6xD8a7eQP8StdTrEQcp8xnxC_9atBA2TiRh3H-O3CXYBDMqjg-McHTyeXWzto8XwstWBZ4_vUQNhRDO_XPJ07wBxOWP2XUlIokT6je-FXcpw' }} 
              style={styles.mapImage}
            />
            <View style={styles.mapOverlay} />
            <View style={styles.mapPin}>
              <Animated.View style={[styles.pulse, { transform: [{ scale: pulseAnim }] }]} />
              <View style={styles.pinIcon}>
                <Ionicons name="locate" size={32} color={AMBER} />
              </View>
            </View>
          </View>

          <View style={styles.contentArea}>
            <View style={styles.statusRow}>
              <View style={styles.statusPill}>
                <Text style={styles.statusPillText}>Status: {analysis.status}</Text>
              </View>
              <Text style={styles.updatedText}>
                Last updated: {analysis.createdAt ? new Date(analysis.createdAt).toLocaleString() : 'Unknown'}
              </Text>
            </View>

            <Text style={styles.analysisTitle}>Inconclusive Patterns Detected</Text>
            <Text style={styles.analysisDesc}>
              The analysis shows moderate risk indicators. GPS signals exhibit inconsistent timing offsets and non-linear movement telemetry that require human intervention.
            </Text>

            {/* Risk Metric Box */}
            <View style={styles.riskMetricBox}>
              <View style={{ flex: 1 }}>
                <Text style={styles.riskMetricLabel}>FRAUD RISK INDEX</Text>
                <View style={styles.riskValueRow}>
                  <Text style={styles.riskValueText}>{riskScore}%</Text>
                  <Text style={styles.riskSubtext}>+12% from avg</Text>
                </View>
              </View>
              
              <View style={styles.circularProgress}>
                <Svg width="64" height="64" viewBox="0 0 64 64">
                  <Circle
                    cx="32"
                    cy="32"
                    r={radius}
                    stroke={SLATE_100}
                    strokeWidth="6"
                    fill="none"
                  />
                  <AnimatedCircle
                    cx="32"
                    cy="32"
                    r={radius}
                    stroke={AMBER}
                    strokeWidth="6"
                    fill="none"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    rotation="-90"
                    origin="32, 32"
                  />
                </Svg>
                <View style={styles.warningIcon}>
                  <Ionicons name="warning" size={20} color={AMBER} />
                </View>
              </View>
            </View>

            {/* Buttons */}
            <View style={styles.btnRow}>
              <TouchableOpacity style={styles.primaryBtn} onPress={() => void handleEscalate()}>
                <Ionicons name="person-add" size={18} color="#fff" />
                <Text style={styles.primaryBtnText}>Escalate to Analyst</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.secondaryBtn}>
                <Text style={styles.secondaryBtnText}>Request Verification</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Detail Grid */}
        <View style={styles.grid}>
          <View style={styles.gridItem}>
            <Text style={styles.gridLabel}>DEVICE INTEGRITY</Text>
            <View style={styles.gridValueRow}>
              <Ionicons name="lock-open" size={20} color={AMBER} />
              <Text style={styles.gridValueText}>{analysis.deviceIntegrity || 'Unknown'}</Text>
            </View>
          </View>
          <View style={styles.gridItem}>
            <Text style={styles.gridLabel}>NETWORK TYPE</Text>
            <View style={styles.gridValueRow}>
              <Ionicons name="globe-outline" size={20} color={SLATE_500} />
              <Text style={styles.gridValueText}>{analysis.networkType || 'Normal'}</Text>
            </View>
          </View>
          <View style={styles.gridItem}>
            <Text style={styles.gridLabel}>VELOCITY CHECK</Text>
            <View style={styles.gridValueRow}>
              <Ionicons name="checkmark-circle" size={20} color={Theme.colors.success} />
              <Text style={styles.gridValueText}>{analysis.velocityCheck || 'Within Range'}</Text>
            </View>
          </View>
        </View>

        {/* User Info Card */}
        <View style={styles.userCard}>
          <Text style={styles.gridLabel}>USER DETAILS</Text>
          <View style={styles.userRow}>
             <Ionicons name="mail-outline" size={16} color={SLATE_500} />
             <Text style={styles.userText}>{user.email}</Text>
          </View>
          <View style={styles.userRow}>
             <Ionicons name="phone-portrait-outline" size={16} color={SLATE_500} />
             <Text style={styles.userText}>{user.phone || 'No phone'}</Text>
          </View>
        </View>
        
        <TouchableOpacity 
          style={styles.fullReportBtn}
          onPress={() => navigation.navigate('AdminFraudReport', { userId: user.id })}
        >
          <Text style={styles.fullReportBtnText}>View Detection Report Details</Text>
          <Ionicons name="arrow-forward" size={16} color={PRIMARY} />
        </TouchableOpacity>
      </ScrollView>
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f8f6f6' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
  headerTitle: { fontSize: 16, fontWeight: '800', color: SLATE_900 },
  
  scroll: { padding: 16, gap: 20 },
  
  titleSection: { gap: 4 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  badgeText: { fontSize: 10, fontWeight: '800', color: AMBER, letterSpacing: 1 },
  pageTitle: { fontSize: 28, fontWeight: '800', color: SLATE_900 },
  sessionId: { fontSize: 13, color: SLATE_500, fontWeight: '500' },
  
  stateCard: { backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#fef3c7', elevation: 2, shadowColor: AMBER, shadowOpacity: 0.05, shadowRadius: 10 },
  mapContainer: { height: 240, position: 'relative' },
  mapImage: { width: '100%', height: '100%' },
  mapOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(217, 119, 6, 0.05)' },
  mapPin: { position: 'absolute', top: '50%', left: '50%', transform: [{ translateX: -32 }, { translateY: -32 }], width: 64, height: 64, alignItems: 'center', justifyContent: 'center' },
  pulse: { position: 'absolute', width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(217, 119, 6, 0.15)', borderWidth: 1, borderColor: 'rgba(217, 119, 6, 0.3)' },
  pinIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  
  contentArea: { padding: 20, gap: 16 },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusPill: { backgroundColor: '#fef3c7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusPillText: { fontSize: 11, fontWeight: '700', color: '#92400e' },
  updatedText: { fontSize: 11, color: SLATE_500, fontWeight: '600' },
  
  analysisTitle: { fontSize: 20, fontWeight: '800', color: SLATE_900 },
  analysisDesc: { fontSize: 14, color: '#475569', lineHeight: 22 },
  
  riskMetricBox: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#fffbeb', borderRadius: 12, borderWidth: 1, borderColor: '#fef3c7' },
  riskMetricLabel: { fontSize: 10, fontWeight: '800', color: '#92400e', letterSpacing: 1 },
  riskValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 4 },
  riskValueText: { fontSize: 32, fontWeight: '800', color: SLATE_900 },
  riskSubtext: { fontSize: 13, fontWeight: '600', color: AMBER },
  
  circularProgress: { width: 64, height: 64, alignItems: 'center', justifyContent: 'center' },
  warningIcon: { position: 'absolute' },
  
  btnRow: { gap: 10, marginTop: 8 },
  primaryBtn: { height: 52, backgroundColor: PRIMARY, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  secondaryBtn: { height: 52, backgroundColor: SLATE_100, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#e2e8f0' },
  secondaryBtnText: { color: SLATE_900, fontSize: 15, fontWeight: '700' },
  
  grid: { gap: 10 },
  gridItem: { padding: 16, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  gridLabel: { fontSize: 10, fontWeight: '800', color: SLATE_500, letterSpacing: 1, marginBottom: 8 },
  gridValueRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  gridValueText: { fontSize: 16, fontWeight: '700', color: SLATE_900 },

  userCard: { padding: 16, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  userText: { fontSize: 14, fontWeight: '600', color: SLATE_900 },

  fullReportBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12 },
  fullReportBtnText: { fontSize: 14, fontWeight: '800', color: PRIMARY },
});

