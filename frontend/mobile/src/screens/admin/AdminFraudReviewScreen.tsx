/**
 * [EXCELLENCE SUMMARY]
 * The AdminFraudReviewScreen serves as the high-stakes 'Forensic Inbox' 
 * for the Aegis platform. It centralizes all profiles and claims flagged 
 * by the H3-Risk actuarial engine that require human adjudication. 
 * Designed with a 'Focus-First' aesthetic, it allows administrators 
 * to rapidly triage potential anomalies while maintaining high confidence 
 * in data integrity and system transparency.
 * 
 * [DOMAIN LOGIC]
 * Orchestrates the 'Human-in-the-Loop' (HITL) fraud mitigation workflow. 
 * By surfacing the 'Risk Score' (0-100%) synthesized from geospatial 
 * telemetry and payout history, it empowers administrators to preserve 
 * the platform's financial resilience against institutional identity fraud 
 * and payout abuse.
 */

import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import AdminShell from '../../components/layout/AdminShell';
import LoadingOverlay from '../../components/ui/LoadingOverlay';
import { fraudApi } from '../../services/api';
import { Theme } from '../../theme';

const PRIMARY = Theme.colors.primary;
const SLATE_900 = Theme.colors.text;
const SLATE_500 = Theme.colors.textSecondary;
const SLATE_100 = Theme.colors.surface;

interface FraudSubmission {
  analysisId: string;
  userId: string;
  email: string;
  phone: string;
  riskScore: number;
  status: string;
  createdAt: string;
}

export default function AdminFraudReviewScreen({ navigation }: any) {
  const [submissions, setSubmissions] = useState<FraudSubmission[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const getRiskColor = (_score: number) => {
    // Keep the admin UI strictly on black/white/green. Risk is shown with the same accent.
    return PRIMARY;
  };

  /**
   * [IN-LINE PRIDE]: Reactive Triage Synchronization
   * Fetches the latest 'Submissions' ledger directly from the forensic 
   * persistence layer. The loading state is managed as a first-class citizen, 
   * ensuring that the administrator is never left in an ambiguous UI state 
   * during network transit.
   */
  const loadSubmissions = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fraudApi.getSubmissions();
      setSubmissions(res?.submissions ?? []);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to load submissions');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSubmissions();
  }, [loadSubmissions]);

  /**
   * [IN-LINE PRIDE]: Information Density Management
   * Renders each submission as a high-fidelity card. By combining 
   * the user's primary identifiers (Email/Phone) with the synthesized 
   * risk score, we enable 'At-a-glance' cognitive analysis, reducing 
   * the time-to-decision for the operations team.
   */
  const renderSubmission = ({ item }: { item: FraudSubmission }) => (
    <TouchableOpacity
      style={styles.submissionCard}
      onPress={() => navigation.navigate('AdminFraudDetail', { userId: item.userId })}
    >
      <View style={styles.cardHeader}>
        <View style={styles.userInfo}>
          <Text style={styles.userEmail}>{item.email}</Text>
          <Text style={styles.userPhone}>{item.phone || 'No phone provided'}</Text>
        </View>
        <View style={[styles.riskBadge, { backgroundColor: `${getRiskColor(item.riskScore)}10` }]}>
          <Text style={[styles.riskText, { color: getRiskColor(item.riskScore) }]}>{item.riskScore}%</Text>
        </View>
      </View>
      
      <View style={styles.cardFooter}>
        <View style={styles.statusBox}>
           <View style={[styles.statusDot, { backgroundColor: getRiskColor(item.riskScore) }]} />
           <Text style={styles.submissionStatus}>{item.status}</Text>
        </View>
        <Text style={styles.dateText}>{new Date(item.createdAt).toLocaleDateString()}</Text>
        <Ionicons name="chevron-forward" size={16} color={SLATE_500} />
      </View>
    </TouchableOpacity>
  );

  return (
    <AdminShell navigation={navigation} activeKey="dash">
      <LoadingOverlay visible={isLoading} message="Loading fraud submissions..." />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={SLATE_900} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Fraud Reviews</Text>
           <TouchableOpacity onPress={() => void loadSubmissions()} style={styles.backButton}>
             <Ionicons name="refresh" size={20} color={SLATE_500} />
        </TouchableOpacity>
      </View>

      <View style={styles.banner}>
        <Text style={styles.bannerText}>
           {submissions.length} submissions requiring review
        </Text>
      </View>

      {!isLoading && submissions.length === 0 ? (
        <View style={styles.centerContainer}>
          <View style={styles.emptyIconBox}>
             <Ionicons name="checkmark-circle" size={64} color={PRIMARY} />
          </View>
          <Text style={styles.emptyTitle}>All Clear</Text>
          <Text style={styles.emptySubtitle}>No fraud submissions pending review</Text>
           <TouchableOpacity style={styles.refreshBtn} onPress={() => void loadSubmissions()}>
              <Text style={styles.refreshBtnText}>Check Again</Text>
          </TouchableOpacity>
        </View>
      ) : !isLoading ? (
        <FlatList
          data={submissions}
          renderItem={renderSubmission}
          keyExtractor={item => item.analysisId}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      ) : null}
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Theme.colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, height: 56, backgroundColor: Theme.colors.background, borderBottomWidth: 1, borderBottomColor: Theme.colors.border },
  backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '800', color: SLATE_900 },
  
  banner: { padding: 12, backgroundColor: `${PRIMARY}10`, alignItems: 'center' },
  bannerText: { fontSize: 12, fontWeight: '700', color: PRIMARY, letterSpacing: 0.5 },

  centerContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyIconBox: { width: 100, height: 100, borderRadius: 50, backgroundColor: `${PRIMARY}10`, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  emptyTitle: { fontSize: 22, fontWeight: '800', color: SLATE_900, marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: SLATE_500, textAlign: 'center', lineHeight: 22 },
  refreshBtn: { marginTop: 24, paddingHorizontal: 24, paddingVertical: 12, backgroundColor: PRIMARY, borderRadius: 12 },
  refreshBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  listContainer: { padding: 16, gap: 12 },
  submissionCard: { backgroundColor: Theme.colors.background, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: Theme.colors.border, elevation: 1 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  userInfo: { flex: 1 },
  userEmail: { fontSize: 15, fontWeight: '700', color: SLATE_900 },
  userPhone: { fontSize: 12, color: SLATE_500, marginTop: 4 },
  riskBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  riskText: { fontSize: 14, fontWeight: '900' },
  
  cardFooter: { flexDirection: 'row', alignItems: 'center', marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: SLATE_100 },
  statusBox: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  submissionStatus: { fontSize: 11, fontWeight: '800', color: SLATE_500, letterSpacing: 0.5 },
  dateText: { fontSize: 11, fontWeight: '600', color: SLATE_500, marginRight: 8 },
});


