import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Alert, FlatList, SafeAreaView, StyleSheet, Text, TouchableOpacity, View, ActivityIndicator } from 'react-native';
import { fraudApi } from '../../services/api';
import { Theme } from '../../theme';

const PRIMARY = '#ec5b13';
const SLATE_900 = '#0f172a';
const SLATE_500 = '#64748b';
const SLATE_100 = '#f1f5f9';

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
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSubmissions();
  }, []);

  const loadSubmissions = async () => {
    setIsLoading(true);
    try {
      const response = await fraudApi.getSubmissions();
      setSubmissions(response.submissions);
    } catch (error) {
      Alert.alert('Error', 'Failed to load fraud submissions');
    } finally {
      setIsLoading(false);
    }
  };

  const getRiskColor = (score: number) => {
    if (score < 30) return '#10b981';
    if (score < 60) return '#f59e0b';
    return '#dc2626';
  };

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
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={SLATE_900} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Fraud Reviews</Text>
        <TouchableOpacity onPress={loadSubmissions} style={styles.backButton}>
             <Ionicons name="refresh" size={20} color={SLATE_500} />
        </TouchableOpacity>
      </View>

      <View style={styles.banner}>
        <Text style={styles.bannerText}>
           {submissions.length} submissions requiring review
        </Text>
      </View>

      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={PRIMARY} />
        </View>
      ) : submissions.length === 0 ? (
        <View style={styles.centerContainer}>
          <View style={styles.emptyIconBox}>
             <Ionicons name="checkmark-circle" size={64} color="#10b981" />
          </View>
          <Text style={styles.emptyTitle}>All Clear</Text>
          <Text style={styles.emptySubtitle}>No fraud submissions pending review</Text>
          <TouchableOpacity style={styles.refreshBtn} onPress={loadSubmissions}>
             <Text style={styles.refreshBtnText}>Check Again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={submissions}
          renderItem={renderSubmission}
          keyExtractor={item => item.analysisId}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f8f6f6' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, height: 56, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '800', color: SLATE_900 },
  
  banner: { padding: 12, backgroundColor: `${PRIMARY}10`, alignItems: 'center' },
  bannerText: { fontSize: 12, fontWeight: '700', color: PRIMARY, letterSpacing: 0.5 },

  centerContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyIconBox: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#ecfdf5', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  emptyTitle: { fontSize: 22, fontWeight: '800', color: SLATE_900, marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: SLATE_500, textAlign: 'center', lineHeight: 22 },
  refreshBtn: { marginTop: 24, paddingHorizontal: 24, paddingVertical: 12, backgroundColor: PRIMARY, borderRadius: 12 },
  refreshBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  listContainer: { padding: 16, gap: 12 },
  submissionCard: { backgroundColor: '#fff', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0', elevation: 1 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  userInfo: { flex: 1 },
  userEmail: { fontSize: 15, fontWeight: '700', color: SLATE_900 },
  userPhone: { fontSize: 12, color: SLATE_500, marginTop: 4 },
  riskBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  riskText: { fontSize: 14, fontWeight: '900' },
  
  cardFooter: { flexDirection: 'row', alignItems: 'center', marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  statusBox: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  submissionStatus: { fontSize: 11, fontWeight: '800', color: SLATE_500, letterSpacing: 0.5 },
  dateText: { fontSize: 11, fontWeight: '600', color: SLATE_500, marginRight: 8 },
});

