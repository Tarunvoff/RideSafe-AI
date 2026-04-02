import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Button from '../../components/Button';
import Card from '../../components/Card';
import MainTopNavbar from '../../components/MainTopNavbar';
import { useAuth } from '../../context/AuthContext';
import { claimsApi, insuranceApi, type ClaimRecord } from '../../services/api';
import { Theme } from '../../theme';

export default function ClaimsScreen() {
  const { user } = useAuth();
  const [claims, setClaims] = useState<ClaimRecord[]>([]);
  const [loading, setLoading] = useState(false);

  const driverId = user?.id ?? user?.email ?? null;

  const loadClaims = useCallback(async () => {
    if (!driverId) return;
    setLoading(true);
    try {
      const res = await claimsApi.list(driverId);
      setClaims(Array.isArray(res) ? res : []);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to load claims');
    } finally {
      setLoading(false);
    }
  }, [driverId]);

  useEffect(() => {
    void loadClaims();
  }, [loadClaims]);

  const triggerClaim = async () => {
    if (!driverId) return;
    setLoading(true);
    try {
      const res = await insuranceApi.process(driverId, {
        claimAmount: 450,
        eventType: 'AQI_SPIKE',
      });
      const decision = res?.decision ?? 'HOLD';
      const payout = res?.payout ?? 0;
      Alert.alert(
        'Claim Triggered',
        decision === 'APPROVED'
          ? `₹${payout} credited`
          : `Decision: ${decision}`,
      );
      await loadClaims();
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to process claim');
    } finally {
      setLoading(false);
    }
  };

  const renderStatusStyle = (status: string) =>
    status === 'APPROVED'
      ? [styles.claimStatusResolved, styles.claimStatusTextResolved]
      : [styles.claimStatusPending, styles.claimStatusTextPending];

  return (
    <SafeAreaView style={styles.safeArea}>
      <MainTopNavbar />
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Your Claims</Text>
          <Button title={loading ? 'Processing...' : 'New Claim'} onPress={() => void triggerClaim()} style={styles.newClaimBtn} />
        </View>

        {claims.length === 0 ? (
          <Card style={styles.claimCard}>
            <Text style={styles.claimTitle}>No claims yet</Text>
            <Text style={styles.claimId}>Trigger a parametric claim to see it here.</Text>
          </Card>
        ) : (
          claims.map((claim) => {
            const [badgeStyle, badgeTextStyle] = renderStatusStyle(claim.status);
            return (
              <Card style={styles.claimCard} key={claim.claimId}>
                <View style={styles.claimHeader}>
                  <View style={badgeStyle}>
                    <Text style={badgeTextStyle}>{claim.status}</Text>
                  </View>
                  <Text style={styles.claimDate}>
                    {claim.createdAt ? new Date(claim.createdAt).toLocaleDateString() : '—'}
                  </Text>
                </View>
                <Text style={styles.claimTitle}>{claim.trigger}</Text>
                <Text style={styles.claimId}>Claim #{claim.claimId}</Text>
                <View style={styles.divider} />
                <TouchableOpacity style={styles.viewDetailsRow}>
                  <Text style={styles.viewDetailsText}>Amount: ₹{Number(claim.amount || 0).toLocaleString('en-IN')}</Text>
                  <Ionicons name="chevron-forward" size={16} color={Theme.colors.primary} />
                </TouchableOpacity>
              </Card>
            );
          })
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Theme.colors.surface },
  container: { padding: Theme.spacing.lg },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: Theme.spacing.xl,
  },
  title: { ...Theme.typography.h1, color: Theme.colors.text },
  newClaimBtn: { height: 36, paddingHorizontal: Theme.spacing.md },
  claimCard: { marginBottom: Theme.spacing.lg },
  claimHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Theme.spacing.sm },
  claimStatusPending: { backgroundColor: '#fff3cd', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  claimStatusTextPending: { color: '#856404', ...Theme.typography.caption, fontWeight: '600' },
  claimStatusResolved: { backgroundColor: '#d4edda', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  claimStatusTextResolved: { color: '#155724', ...Theme.typography.caption, fontWeight: '600' },
  claimDate: { ...Theme.typography.caption, color: Theme.colors.textSecondary },
  claimTitle: { ...Theme.typography.h3, color: Theme.colors.text, marginBottom: 4 },
  claimId: { ...Theme.typography.caption, color: Theme.colors.textSecondary },
  divider: { height: 1, backgroundColor: Theme.colors.border, marginVertical: Theme.spacing.md },
  viewDetailsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  viewDetailsText: { ...Theme.typography.body, color: Theme.colors.primary, fontWeight: '500' }
});
