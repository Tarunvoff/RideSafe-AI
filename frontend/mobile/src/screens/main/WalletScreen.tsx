import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import Button from '../../components/Button';
import Card from '../../components/Card';
import MainTopNavbar from '../../components/MainTopNavbar';
import { useAuth } from '../../context/AuthContext';
import { payoutsApi, type PayoutRecord } from '../../services/api';
import { Theme } from '../../theme';

export default function WalletScreen() {
  const { user } = useAuth();
  const [payouts, setPayouts] = useState<PayoutRecord[]>([]);
  const [loading, setLoading] = useState(false);

  const driverId = user?.id ?? user?.email ?? null;

  const loadPayouts = useCallback(async () => {
    if (!driverId) return;
    setLoading(true);
    try {
      const res = await payoutsApi.list(driverId);
      setPayouts(Array.isArray(res) ? res : []);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to load payouts');
    } finally {
      setLoading(false);
    }
  }, [driverId]);

  useEffect(() => {
    void loadPayouts();
  }, [loadPayouts]);

  const balance = payouts.reduce((sum, p) => sum + Number(p.amount || 0), 0);

  return (
    <SafeAreaView style={styles.safeArea}>
      <MainTopNavbar />
      <ScrollView contentContainerStyle={styles.container}>
        
        <Card style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Available Balance</Text>
          <Text style={styles.balanceAmount}>₹{Number(balance || 0).toLocaleString('en-IN')}</Text>
          <Button title={loading ? 'Loading...' : 'Cash Out'} onPress={() => {}} style={styles.cashOutBtn} />
        </Card>

        <Text style={styles.sectionTitle}>Recent Transactions</Text>
        
        <View style={styles.transactionList}>
          {payouts.length === 0 ? (
            <View style={styles.transactionItem}>
              <View style={styles.iconCircle}>
                <Ionicons name="cash-outline" size={20} color={Theme.colors.primary} />
              </View>
              <View style={styles.transactionDetails}>
                <Text style={styles.transactionTitle}>No payouts yet</Text>
                <Text style={styles.transactionDate}>Trigger a claim to see payouts</Text>
              </View>
              <Text style={styles.transactionAmountPos}>₹0</Text>
            </View>
          ) : (
            payouts.map((payout) => {
              const isSuccess = payout.status === 'APPROVED' || payout.status === 'SUCCESS';
              return (
                <View style={styles.transactionItem} key={payout.payoutId}>
                  <View style={{
                    ...styles.iconCircle,
                    backgroundColor: isSuccess ? '#e6f4ea' : '#fdecea',
                  }}>
                    <Ionicons
                      name={isSuccess ? 'cash-outline' : 'alert-circle-outline'}
                      size={20}
                      color={isSuccess ? Theme.colors.success : Theme.colors.error}
                    />
                  </View>
                  <View style={styles.transactionDetails}>
                    <Text style={styles.transactionTitle}>{isSuccess ? 'Payout credited' : 'Payout pending'}</Text>
                    <Text style={styles.transactionDate}>
                      {payout.createdAt ? new Date(payout.createdAt).toLocaleString() : '—'}
                    </Text>
                  </View>
                  <Text style={isSuccess ? styles.transactionAmountPos : styles.transactionAmountNeg}>
                    ₹{Number(payout.amount || 0).toLocaleString('en-IN')}
                  </Text>
                </View>
              );
            })
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Theme.colors.surface },
  container: { padding: Theme.spacing.lg },
  balanceCard: { 
    backgroundColor: Theme.colors.text, 
    padding: Theme.spacing.xl, 
    borderRadius: Theme.roundness * 2,
    alignItems: 'center',
    marginBottom: Theme.spacing.xl,
  },
  balanceLabel: { ...Theme.typography.body, color: Theme.colors.textSecondary, marginBottom: Theme.spacing.xs },
  balanceAmount: { ...Theme.typography.h1, color: '#fff', fontSize: 40, marginBottom: Theme.spacing.lg },
  cashOutBtn: { width: '100%' },
  sectionTitle: { ...Theme.typography.h3, marginBottom: Theme.spacing.md },
  transactionList: { backgroundColor: Theme.colors.background, borderRadius: Theme.roundness, padding: Theme.spacing.md },
  transactionItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: Theme.spacing.md, borderBottomWidth: 1, borderBottomColor: Theme.colors.surface },
  iconCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#e6f0ff', alignItems: 'center', justifyContent: 'center' },
  transactionDetails: { flex: 1, marginLeft: Theme.spacing.md },
  transactionTitle: { ...Theme.typography.body, color: Theme.colors.text, fontWeight: '500' },
  transactionDate: { ...Theme.typography.caption, color: Theme.colors.textSecondary, marginTop: 2 },
  transactionAmountPos: { ...Theme.typography.body, color: Theme.colors.success, fontWeight: '700' },
  transactionAmountNeg: { ...Theme.typography.body, color: Theme.colors.text, fontWeight: '700' }
});
