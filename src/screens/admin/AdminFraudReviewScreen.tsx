import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Alert, FlatList, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Theme } from '../../theme';

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
      // Note: This would need to be added to fraudApi
      // For now, we'll show a placeholder
      setSubmissions([]);
    } catch (error) {
      Alert.alert('Error', 'Failed to load fraud submissions');
    } finally {
      setIsLoading(false);
    }
  };

  const getRiskColor = (score: number) => {
    if (score < 30) return Theme.colors.success;
    if (score < 60) return '#f59e0b';
    return Theme.colors.error;
  };

  const renderSubmission = ({ item }: { item: FraudSubmission }) => (
    <TouchableOpacity
      style={styles.submissionCard}
      onPress={() => navigation.navigate('AdminFraudDetail', { userId: item.userId })}
    >
      <View style={styles.submissionHeader}>
        <View style={styles.submissionInfo}>
          <Text style={styles.submissionEmail}>{item.email}</Text>
          <Text style={styles.submissionPhone}>{item.phone}</Text>
        </View>
        <View style={[styles.riskBadge, { backgroundColor: getRiskColor(item.riskScore) }]}>
          <Text style={styles.riskText}>{item.riskScore}%</Text>
        </View>
      </View>
      <View style={styles.submissionFooter}>
        <Text style={styles.submissionStatus}>{item.status}</Text>
        <Ionicons name="chevron-forward" size={20} color={Theme.colors.textSecondary} />
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Fraud Reviews</Text>
        <View style={{ width: 24 }} />
      </View>

      {isLoading ? (
        <View style={styles.centerContainer}>
          <Text style={styles.loadingText}>Loading submissions...</Text>
        </View>
      ) : submissions.length === 0 ? (
        <View style={styles.centerContainer}>
          <Ionicons name="checkmark-circle" size={64} color={Theme.colors.success} />
          <Text style={styles.emptyTitle}>All Clear</Text>
          <Text style={styles.emptySubtitle}>No fraud submissions pending review</Text>
        </View>
      ) : (
        <FlatList
          data={submissions}
          renderItem={renderSubmission}
          keyExtractor={item => item.analysisId}
          contentContainerStyle={styles.listContainer}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Theme.colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Theme.spacing.md, backgroundColor: Theme.colors.surface, borderBottomWidth: 1, borderBottomColor: Theme.colors.border },
  backButton: { padding: Theme.spacing.xs },
  headerTitle: { ...Theme.typography.h3, color: Theme.colors.text },
  centerContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Theme.spacing.xl },
  loadingText: { ...Theme.typography.body, color: Theme.colors.textSecondary },
  emptyTitle: { ...Theme.typography.h2, color: Theme.colors.text, marginTop: Theme.spacing.lg, marginBottom: Theme.spacing.sm },
  emptySubtitle: { ...Theme.typography.body, color: Theme.colors.textSecondary },
  listContainer: { padding: Theme.spacing.lg, gap: Theme.spacing.md },
  submissionCard: { backgroundColor: Theme.colors.surface, padding: Theme.spacing.md, borderRadius: Theme.borderRadius.lg, borderWidth: 1, borderColor: Theme.colors.border },
  submissionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Theme.spacing.md },
  submissionInfo: { flex: 1 },
  submissionEmail: { ...Theme.typography.body, fontWeight: 'bold' as const, color: Theme.colors.text },
  submissionPhone: { ...Theme.typography.caption, color: Theme.colors.textSecondary, marginTop: Theme.spacing.xs },
  riskBadge: { paddingHorizontal: Theme.spacing.md, paddingVertical: Theme.spacing.xs, borderRadius: Theme.borderRadius.full, alignItems: 'center', justifyContent: 'center' },
  riskText: { ...Theme.typography.caption, fontWeight: 'bold' as const, color: '#fff' },
  submissionFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: Theme.spacing.md, borderTopWidth: 1, borderTopColor: Theme.colors.border },
  submissionStatus: { ...Theme.typography.caption, fontWeight: 'bold' as const, color: Theme.colors.primary },
});
