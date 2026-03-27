import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Alert, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Button from '../../components/Button';
import Input from '../../components/Input';
import { useAuth } from '../../context/AuthContext';
import { kycApi } from '../../services/api';
import { Theme } from '../../theme';

export default function KYCPayoutSetupScreen({ navigation }: any) {
  const [method, setMethod] = useState('UPI');
  const [upiId, setUpiId] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [accountHolder, setAccountHolder] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { refreshKycStatus } = useAuth();

  const handleContinue = async () => {
    if (method === 'UPI' && !upiId) {
      Alert.alert('Error', 'Please enter your UPI ID');
      return;
    }

    if (method === 'BANK' && (!accountNumber || !ifscCode || !accountHolder)) {
      Alert.alert('Error', 'Please fill in all bank details');
      return;
    }

    setIsLoading(true);
    try {
      await kycApi.savePayoutSetup({
        method: method as 'UPI' | 'BANK',
        ...(method === 'UPI' ? { upiId } : { accountNumber, ifscCode, accountHolder }),
      });
      await refreshKycStatus();
      navigation.navigate('KYCFraudDetection');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to save payout setup');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        {navigation.canGoBack() ? (
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={Theme.colors.text} />
          </TouchableOpacity>
        ) : (
          <View style={styles.backButton} />
        )}
        <Text style={styles.headerTitle}>Step 4 of 4</Text>
        <View style={{ width: 24 }} />
      </View>
      <View style={styles.progressContainer}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressText}>Payout Method</Text>
          <Text style={styles.progressPercent}>100%</Text>
        </View>
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: '100%' }]} />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>How do you want to get paid?</Text>
        <Text style={styles.subtitle}>Choose where your weekly earnings will be sent.</Text>

        <View style={styles.tabsRow}>
          <TouchableOpacity
            style={[styles.tab, method === 'UPI' && styles.tabActive]}
            onPress={() => setMethod('UPI')}
          >
            <Text style={[styles.tabText, method === 'UPI' && styles.tabTextActive]}>UPI</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, method === 'BANK' && styles.tabActive]}
            onPress={() => setMethod('BANK')}
          >
            <Text style={[styles.tabText, method === 'BANK' && styles.tabTextActive]}>BANK</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.form}>
          {method === 'UPI' ? (
            <View>
              <Input
                label="UPI ID"
                placeholder="yourname@gpay"
                value={upiId}
                onChangeText={setUpiId}
              />
              <Text style={styles.helperText}>
                Find it in your GPay, PhonePe, or Paytm app under Settings → Profile → UPI ID
              </Text>
            </View>
          ) : (
            <View>
              <Input
                label="Account Holder Name"
                placeholder="Your Name"
                value={accountHolder}
                onChangeText={setAccountHolder}
              />
              <Input
                label="Account Number"
                placeholder="1234567890123456"
                value={accountNumber}
                onChangeText={setAccountNumber}
                keyboardType="numeric"
              />
              <Input
                label="IFSC Code"
                placeholder="SBIN0001234"
                value={ifscCode}
                onChangeText={setIfscCode}
                autoCapitalize="characters"
              />
            </View>
          )}

          <View style={styles.secureNotice}>
            <Ionicons name="shield-checkmark" size={20} color={Theme.colors.success} />
            <Text style={styles.secureText}>
              Your bank details are encrypted and processed securely every Tuesday at 9 AM.
            </Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title={isLoading ? 'Saving...' : 'Finish & Submit'}
          onPress={handleContinue}
          disabled={isLoading || (method === 'UPI' && !upiId) || (method === 'BANK' && (!accountNumber || !ifscCode || !accountHolder))}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Theme.colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Theme.spacing.md, backgroundColor: Theme.colors.surface, borderBottomWidth: 1, borderBottomColor: Theme.colors.border },
  backButton: { padding: Theme.spacing.xs },
  headerTitle: { ...Theme.typography.h3, color: Theme.colors.text },
  progressContainer: { paddingHorizontal: Theme.spacing.lg, paddingVertical: Theme.spacing.md, backgroundColor: Theme.colors.surface },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Theme.spacing.sm },
  progressText: { ...Theme.typography.caption, fontWeight: 'bold', color: Theme.colors.text },
  progressPercent: { ...Theme.typography.caption, fontWeight: 'bold', color: Theme.colors.textSecondary },
  progressBarBg: { height: 6, backgroundColor: Theme.colors.border, borderRadius: Theme.borderRadius.full },
  progressBarFill: { height: 6, backgroundColor: Theme.colors.success, borderRadius: Theme.borderRadius.full },
  container: { padding: Theme.spacing.lg },
  form: { gap: Theme.spacing.md },
  title: { ...Theme.typography.h1, color: Theme.colors.text, marginBottom: Theme.spacing.sm },
  subtitle: { ...Theme.typography.body, color: Theme.colors.textSecondary, marginBottom: Theme.spacing.lg },
  tabsRow: { flexDirection: 'row', backgroundColor: Theme.colors.surface, padding: 4, borderRadius: Theme.borderRadius.md, marginBottom: Theme.spacing.lg },
  tab: { flex: 1, paddingVertical: Theme.spacing.md, alignItems: 'center', borderRadius: Theme.borderRadius.sm },
  tabActive: { backgroundColor: Theme.colors.background },
  tabText: { ...Theme.typography.caption, fontWeight: 'bold', color: Theme.colors.textSecondary },
  tabTextActive: { color: Theme.colors.text },
  helperText: { ...Theme.typography.caption, color: Theme.colors.textSecondary, marginTop: Theme.spacing.xs },
  secureNotice: { flexDirection: 'row', gap: Theme.spacing.sm, padding: Theme.spacing.md, backgroundColor: `${Theme.colors.success}10`, borderRadius: Theme.borderRadius.md },
  secureText: { flex: 1, ...Theme.typography.caption, color: Theme.colors.textSecondary, lineHeight: 18 },
  footer: { padding: Theme.spacing.lg, backgroundColor: Theme.colors.surface, borderTopWidth: 1, borderTopColor: Theme.colors.border },
});
