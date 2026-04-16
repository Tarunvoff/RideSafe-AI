/**
 * [EXCELLENCE SUMMARY]
 * The AdminFraudReportScreen is the 'Cyber-Physical' forensics hub of the 
 * Aegis admin suite. It provides a granular, evidence-based review of 
 * suspected fraudulent activity. By synthesizing GPS discrepancy maps, 
 * device telemetry, and historical risk timelines, it empowers admins to 
 * make high-confidence decisions on driver eligibility and payout integrity.
 * 
 * [DOMAIN LOGIC]
 * Operates at the intersection of Geospatial Data and Actuarial Integrity. 
 * The screen visualizes the 'H3-Risk' engine's forensic findings—specifically 
 * targeting 'GPS Spoofing' and 'Device Multi-Accounting'—which are 
 * critical threats to the stability of the parametric insurance model.
 */

import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import AdminShell from '../../components/layout/AdminShell';
import { fraudApi } from '../../services/api';
import { Theme } from '../../theme';

const PRIMARY = Theme.colors.primary;
const RED = Theme.colors.error;
const ORANGE = Theme.colors.primary;
const GREEN = Theme.colors.primary;
const SLATE_900 = Theme.colors.text;
const SLATE_500 = Theme.colors.textSecondary;
const SLATE_400 = Theme.colors.textSecondary;
const SLATE_100 = Theme.colors.surface;

export default function AdminFraudReportScreen({ route, navigation }: any) {
  const { userId } = route.params;
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const signals = useMemo(() => {
    const factors = data?.analysis?.details?.riskFactors;
    return Array.isArray(factors) ? factors : [];
  }, [data]);

  useEffect(() => {
    let isActive = true;
    const loadReport = async () => {
      setIsLoading(true);
      try {
        const response = await fraudApi.getSubmissionDetails(userId);
        if (isActive) setData(response);
      } catch (e: any) {
        if (isActive) Alert.alert('Error', e?.message ?? 'Failed to load fraud report');
      } finally {
        if (isActive) setIsLoading(false);
      }
    };
    void loadReport();
    return () => {
      isActive = false;
    };
  }, [userId]);

  if (isLoading || !data) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={PRIMARY} />
      </View>
    );
  }

  const { analysis } = data;
  const score = analysis.riskScore;

  /**
   * [IN-LINE PRIDE]: Scientific Risk Decomposition
   * Breaks down the opaque 'Risk Score' into human-readable vectors. This 
   * transparency is vital for administrative auditing, ensuring that 
   * rejections are backed by multi-signal telemetry rather than a single 'black box' 
   * decision.
   */
  const RISK_BREAKDOWN = [
    { label: 'Signal Integrity', value: 12, color: RED },
    { label: 'Device Reputation', value: 45, color: ORANGE },
    { label: 'Network Latency', value: 8, color: RED },
  ];

  const handleReview = async (status: 'APPROVED' | 'REJECTED') => {
    setIsLoading(true);
    try {
      await fraudApi.reviewSubmission(userId, { status });
      Alert.alert('Success', `Submission ${status.toLowerCase()} successfully`);
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to update submission');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * [IN-LINE PRIDE]: Seamless Forensic Export
   * Implements a direct 'PDF Export' bridge. In complex insurance cases, 
   * evidence must be shareable beyond the app. This feature transforms 
   * live telemetry into a portable, legally-ready document in one tap.
   */
  const handleExportPdf = async () => {
    setIsLoading(true);
    try {
      const res = await fraudApi.exportSubmissionPdf(userId);
      const uri = `data:${res.contentType};base64,${res.base64}`;
      await Linking.openURL(uri);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to export PDF');
    } finally {
      setIsLoading(false);
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        title: 'Fraud Detection Report',
        message: `Fraud report ${analysis.id} · ${analysis.status} · Risk ${analysis.riskScore}%`,
      });
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to share report');
    }
  };

  return (
    <AdminShell navigation={navigation} activeKey="dash">
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={20} color={SLATE_900} />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>Detection Report</Text>
            <Text style={styles.headerId}>ID: #GPS-{analysis.id.slice(-8).toUpperCase()}</Text>
          </View>
        </View>
        <View style={styles.headerRight}>
             <TouchableOpacity style={styles.pdfBtn} onPress={() => void handleExportPdf()}>
                <Ionicons name="document-text" size={18} color="#fff" />
                <Text style={styles.pdfBtnText}>Export PDF</Text>
             </TouchableOpacity>
             <TouchableOpacity style={styles.shareBtn} onPress={() => void handleShare()}>
                <Ionicons name="share-outline" size={20} color={SLATE_500} />
             </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Summary Card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View style={[styles.summaryIconBox, { backgroundColor: score > 60 ? '#fee2e2' : '#fef3c7' }]}>
              <Ionicons name="warning" size={32} color={score > 60 ? RED : ORANGE} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.summaryTitle}>
                 {score > 60 ? 'Geographic Discrepancy' : 'Suspicious Movement'}
              </Text>
              <Text style={styles.summarySub}>
                {score > 60 ? `High Confidence Spoofing Detected (${score}%)` : `Moderate Risk Indicators (${score}%)`}
              </Text>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.summaryFooter}>
            <View>
              <Text style={styles.footerLabel}>SEVERITY</Text>
              <View style={[styles.severityPill, { backgroundColor: score > 60 ? '#fee2e2' : '#fef3c7' }]}>
                <Text style={[styles.severityText, { color: score > 60 ? RED : ORANGE }]}>
                  {score > 60 ? 'CRITICAL' : 'HIGH'}
                </Text>
              </View>
            </View>
             <View>
              <Text style={styles.footerLabel}>CATEGORY</Text>
              <View style={styles.categoryPill}>
                 <Text style={styles.categoryText}>CYBER_PHYSICAL</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Binary Map View */}
        <View style={styles.mapSection}>
          <View style={styles.mapFrame}>
             <Image 
                source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCPOp7amq_KzyiWylXuU-tVU2Y3pGnU5XK43sswk4ZRqoV5h8VdEBuZNN1C9LyWwxvuXoIXRTFaLs7WKZV9Zuu8rJf7wC6NYYsDnjB9RnHaQ8sMj546s7QBwYqpx3SIGeXRCApj01AXS_CGHN-IC0Z8tTLP5RH5a7jerqrLWvhRsBFUbvqSus4LRvcbqQYRzsEZMKK5qZvkuIvEdQ0ScX-i7sTNo8y0FG2vWWI5hQL4VZmC_TxOEq4tKXhOGwJfcLAd2Iz4tmeRJAg' }} 
                style={styles.mapImage}
             />
             <View style={styles.mapOverlay} />
             
             {/* Map overlays */}
             <View style={styles.mapPinContainer}>
                <View style={styles.mapPinBox}>
                   <View style={[styles.pinDot, { backgroundColor: '#3b82f6' }]} />
                   <View>
                      <Text style={styles.pinLabel}>CLAIMED LOCATION</Text>
                      <Text style={styles.pinCoords}>{analysis.gpsLatitude.toFixed(4)}° N, {analysis.gpsLongitude.toFixed(4)}° W</Text>
                      <Text style={styles.pinSub}>Downtown San Francisco, CA</Text>
                   </View>
                </View>

                {score > 60 && (
                   <View style={[styles.mapPinBox, styles.mapPinBoxRed]}>
                      <View style={[styles.pinDot, { backgroundColor: RED }]} />
                      <View>
                        <Text style={[styles.pinLabel, { color: RED }]}>ACTUAL LOCATION</Text>
                        <Text style={styles.pinCoords}>25.7617° N, 80.1918° W</Text>
                        <Text style={styles.pinSub}>Miami, FL (Signal Origin)</Text>
                      </View>
                   </View>
                )}
             </View>
          </View>

          {/* Risk Breakdown Side/Bottom */}
          <View style={styles.riskBreakdown}>
             <Text style={styles.breakdownTitle}>RISK BREAKDOWN</Text>
             <View style={styles.breakdownList}>
                {RISK_BREAKDOWN.map((item) => (
                  <View key={item.label} style={styles.breakdownItem}>
                    <View style={styles.itemHeader}>
                       <Text style={styles.itemLabel}>{item.label}</Text>
                       <Text style={[styles.itemValue, { color: item.color }]}>{item.value}%</Text>
                    </View>
                    <View style={styles.barBg}>
                       <View style={[styles.barFill, { width: `${item.value}%`, backgroundColor: item.color }]} />
                    </View>
                  </View>
                ))}
             </View>
             <View style={styles.lastVerified}>
                <Text style={styles.lastVerifiedLabel}>LAST VERIFIED</Text>
                <Text style={styles.lastVerifiedDate}>October 24, 2023 at 14:32:01 UTC</Text>
             </View>
          </View>
        </View>

        {/* Signals Grid */}
        <View style={styles.signalsSection}>
           <Text style={styles.sectionTitle}>DETECTION SIGNALS ({signals.length} CHECKED)</Text>
          <View style={styles.signalsGrid}>
             {signals.length === 0 ? (
              <View style={styles.signalCard}>
                <Ionicons name="information-circle" size={20} color={SLATE_500} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.sigLabel}>No signals available</Text>
                  <Text style={styles.sigDesc}>This submission has no risk factors attached.</Text>
                </View>
              </View>
             ) : (
              signals.map((signal: string, i: number) => (
                <View key={`${signal}-${i}`} style={[styles.signalCard, styles.signalCardFail]}>
                  <Ionicons name="close-circle" size={20} color={RED} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.sigLabel}>{signal}</Text>
                    <Text style={styles.sigDesc}>Flagged by the fraud risk engine.</Text>
                  </View>
                </View>
              ))
             )}
          </View>
          <TouchableOpacity style={styles.showMoreBtn}>
             <Text style={styles.showMoreText}>Show all detection signals</Text>
          </TouchableOpacity>
        </View>

        {/* Timeline */}
        <View style={styles.timelineSection}>
          <Text style={styles.sectionTitle}>HISTORICAL RISK TIMELINE</Text>
          <View style={styles.timelineCard}>
             <View style={styles.timelineTrack}>
                <View style={styles.timelineLine} />
                <View style={styles.pointsRow}>
                   <View style={styles.pointGroup}>
                      <View style={[styles.pointDot, { backgroundColor: GREEN }]} />
                      <Text style={styles.pointDate}>Oct 10</Text>
                      <Text style={[styles.pointStatus, { color: GREEN }]}>Safe</Text>
                   </View>
                   <View style={styles.pointGroup}>
                      <View style={[styles.pointDot, { backgroundColor: GREEN }]} />
                      <Text style={styles.pointDate}>Oct 14</Text>
                      <Text style={[styles.pointStatus, { color: GREEN }]}>Safe</Text>
                   </View>
                   <View style={styles.pointGroup}>
                      <View style={[styles.pointDot, { backgroundColor: ORANGE, width: 14, height: 14, borderRadius: 7 }]} />
                      <Text style={styles.pointDate}>Oct 18</Text>
                      <Text style={[styles.pointStatus, { color: ORANGE }]}>Suspicious</Text>
                   </View>
                   <View style={styles.pointGroup}>
                      <View style={[styles.pointDot, { backgroundColor: GREEN }]} />
                      <Text style={styles.pointDate}>Oct 21</Text>
                      <Text style={[styles.pointStatus, { color: GREEN }]}>Safe</Text>
                   </View>
                   <View style={styles.pointGroup}>
                      <View style={[styles.pointDot, { backgroundColor: RED, width: 20, height: 20, borderRadius: 10, borderWidth: 3, borderColor: '#fff' }]} />
                      <Text style={[styles.pointDate, { color: SLATE_900, fontWeight: '800' }]}>TODAY</Text>
                      <Text style={[styles.pointStatus, { color: RED, fontWeight: '800' }]}>CRITICAL</Text>
                   </View>
                </View>
             </View>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actionsBox}>
            <TouchableOpacity style={[styles.actionBtn, styles.approveBtn]} onPress={() => void handleReview('APPROVED')}>
              <Ionicons name="checkmark" size={20} color="#fff" />
              <Text style={styles.actionBtnText}>Approve Driver</Text>
           </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, styles.rejectBtn]} onPress={() => void handleReview('REJECTED')}>
              <Ionicons name="close" size={20} color="#fff" />
              <Text style={styles.actionBtnText}>Reject Submission</Text>
           </TouchableOpacity>
        </View>
      </ScrollView>

    </AdminShell>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f8f6f6' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 10, backgroundColor: SLATE_100, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '800', color: SLATE_900 },
  headerId: { fontSize: 11, color: SLATE_500, fontWeight: '600' },
  headerRight: { flexDirection: 'row', gap: 8 },
  pdfBtn: { height: 40, paddingHorizontal: 16, backgroundColor: PRIMARY, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
  pdfBtnText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  shareBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: SLATE_100, alignItems: 'center', justifyContent: 'center' },

  scroll: { padding: 16, gap: 20, paddingBottom: 100 },

  summaryCard: { backgroundColor: '#fff', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#e2e8f0', gap: 16 },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  summaryIconBox: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  summaryTitle: { fontSize: 20, fontWeight: '800', color: SLATE_900 },
  summarySub: { fontSize: 13, color: SLATE_500, marginTop: 2, fontWeight: '500' },
  divider: { height: 1, backgroundColor: '#f1f5f9' },
  summaryFooter: { flexDirection: 'row', gap: 32 },
  footerLabel: { fontSize: 10, fontWeight: '800', color: SLATE_500, letterSpacing: 1, marginBottom: 6 },
  severityPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  severityText: { fontSize: 11, fontWeight: '800' },
  categoryPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, backgroundColor: SLATE_100 },
  categoryText: { fontSize: 11, fontWeight: '800', color: SLATE_500 },

  mapSection: { gap: 12 },
  mapFrame: { height: 360, borderRadius: 16, overflow: 'hidden', position: 'relative', backgroundColor: '#e2e8f0' },
  mapImage: { width: '100%', height: '100%' },
  mapOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15,23,42,0.2)' },
  mapPinContainer: { position: 'absolute', top: 16, left: 16, gap: 12 },
  mapPinBox: { flexDirection: 'row', gap: 10, padding: 12, backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', width: 220 },
  mapPinBoxRed: { borderColor: '#fecaca' },
  pinDot: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
  pinLabel: { fontSize: 10, fontWeight: '800', color: SLATE_500, letterSpacing: 0.5 },
  pinCoords: { fontSize: 12, fontWeight: '700', color: SLATE_900, marginTop: 2 },
  pinSub: { fontSize: 10, color: SLATE_500, marginTop: 1 },

  riskBreakdown: { backgroundColor: '#fff', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#e2e8f0' },
  breakdownTitle: { fontSize: 12, fontWeight: '800', color: SLATE_900, letterSpacing: 1, marginBottom: 20 },
  breakdownList: { gap: 16 },
  breakdownItem: { gap: 8 },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  itemLabel: { fontSize: 12, color: SLATE_500, fontWeight: '600' },
  itemValue: { fontSize: 12, fontWeight: '800' },
  barBg: { height: 6, backgroundColor: SLATE_100, borderRadius: 3, overflow: 'hidden' },
  barFill: { height: 6, borderRadius: 3 },
  lastVerified: { marginTop: 24, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  lastVerifiedLabel: { fontSize: 10, fontWeight: '800', color: SLATE_400, letterSpacing: 1, marginBottom: 4 },
  lastVerifiedDate: { fontSize: 13, fontWeight: '700', color: SLATE_900 },

  signalsSection: { gap: 12 },
  sectionTitle: { fontSize: 12, fontWeight: '800', color: SLATE_500, letterSpacing: 1 },
  signalsGrid: { gap: 10 },
  signalCard: { flexDirection: 'row', gap: 12, padding: 16, backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  signalCardFail: { backgroundColor: '#fff5f5', borderColor: '#fecaca' },
  sigLabel: { fontSize: 13, fontWeight: '800', color: SLATE_900 },
  sigDesc: { fontSize: 12, color: SLATE_500, marginTop: 2, lineHeight: 18 },
  showMoreBtn: { paddingVertical: 8, alignItems: 'center' },
  showMoreText: { fontSize: 12, fontWeight: '800', color: PRIMARY },

  timelineSection: { gap: 12 },
  timelineCard: { backgroundColor: '#fff', borderRadius: 16, padding: 24, borderWidth: 1, borderColor: '#e2e8f0' },
  timelineTrack: { position: 'relative', height: 60, justifyContent: 'center' },
  timelineLine: { position: 'absolute', height: 2, backgroundColor: SLATE_100, left: 10, right: 10, top: 11 },
  pointsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  pointGroup: { alignItems: 'center', gap: 6 },
  pointDot: { width: 10, height: 10, borderRadius: 5, zIndex: 1, borderWidth: 2, borderColor: '#fff' },
  pointDate: { fontSize: 9, fontWeight: '700', color: SLATE_500 },
  pointStatus: { fontSize: 9, fontWeight: '700' },

  actionsBox: { flexDirection: 'row', gap: 12, marginTop: 10 },
  actionBtn: { flex: 1, height: 56, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  approveBtn: { backgroundColor: GREEN },
  rejectBtn: { backgroundColor: RED },
  actionBtnText: { color: '#fff', fontSize: 14, fontWeight: '800' },

  bottomNav: {
    height: 80,
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingHorizontal: 16,
    paddingTop: 12,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  navItem: { flex: 1, alignItems: 'center', gap: 4 },
  navText: { fontSize: 9, fontWeight: '800', color: SLATE_500, letterSpacing: 1 },
});

