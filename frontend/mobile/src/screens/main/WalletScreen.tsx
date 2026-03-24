import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import Button from '../../components/Button';
import Card from '../../components/Card';
import MainTopNavbar from '../../components/MainTopNavbar';
import { Theme } from '../../theme';

export default function WalletScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <MainTopNavbar />
      <ScrollView contentContainerStyle={styles.container}>
        
        <Card style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Available Balance</Text>
          <Text style={styles.balanceAmount}>$342.50</Text>
          <Button title="Cash Out" onPress={() => {}} style={styles.cashOutBtn} />
        </Card>

        <Text style={styles.sectionTitle}>Recent Transactions</Text>
        
        <View style={styles.transactionList}>
          <View style={styles.transactionItem}>
            <View style={styles.iconCircle}>
              <Ionicons name="car-outline" size={20} color={Theme.colors.primary} />
            </View>
            <View style={styles.transactionDetails}>
              <Text style={styles.transactionTitle}>Uber Ride - Dropoff</Text>
              <Text style={styles.transactionDate}>Today, 10:42 AM</Text>
            </View>
            <Text style={styles.transactionAmountPos}>+$24.50</Text>
          </View>

          <View style={styles.transactionItem}>
            <View style={styles.iconCircle}>
              <Ionicons name="car-outline" size={20} color={Theme.colors.primary} />
            </View>
            <View style={styles.transactionDetails}>
              <Text style={styles.transactionTitle}>Uber Ride - Dropoff</Text>
              <Text style={styles.transactionDate}>Today, 09:15 AM</Text>
            </View>
            <Text style={styles.transactionAmountPos}>+$18.00</Text>
          </View>

          <View style={styles.transactionItem}>
            <View style={{...styles.iconCircle, backgroundColor: '#fdecea'}}>
               <Ionicons name="shield-outline" size={20} color={Theme.colors.error} />
            </View>
            <View style={styles.transactionDetails}>
              <Text style={styles.transactionTitle}>RideSafe Premium</Text>
              <Text style={styles.transactionDate}>Yesterday, 12:00 PM</Text>
            </View>
            <Text style={styles.transactionAmountNeg}>-$12.00</Text>
          </View>

          <View style={styles.transactionItem}>
            <View style={{...styles.iconCircle, backgroundColor: '#e6f4ea'}}>
               <Ionicons name="cash-outline" size={20} color={Theme.colors.success} />
            </View>
            <View style={styles.transactionDetails}>
              <Text style={styles.transactionTitle}>Bank Transfer</Text>
              <Text style={styles.transactionDate}>Oct 12, 2026</Text>
            </View>
            <Text style={styles.transactionAmountNeg}>-$140.00</Text>
          </View>
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
