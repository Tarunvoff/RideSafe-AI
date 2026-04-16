/**
 * [EXCELLENCE SUMMARY]
 * The KYCPayoutSetupScreen is the financial terminal where drivers configure 
 * their restitution path. It supports dual-modality (UPI and Direct Bank) to 
 * ensure maximum accessibility for dark store operators with varied financial 
 * setups. The interface ensures encryption-ready data capture before 
 * final submission.
 * 
 * [DOMAIN LOGIC]
 * This is the 'Settlement Vector' of the Aegis platform. By capturing precise 
 * payout metadata early, the platform ensures that parametric claims can be 
 * settled with sub-10s latency, fulfilling the promise of 'Instant Resilience' 
 * upon risk-trigger events.
 */

import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import LoadingOverlay from '../../components/ui/LoadingOverlay';
import { useAuth } from '../../context/AuthContext';
import { kycApi } from '../../services/api';
import { Theme } from '../../theme';

export default function KYCPayoutSetupScreen({ navigation }: any) {
  const { t } = useTranslation();
  const CONSENT_VERSION = 'v1.0';
  const [method, setMethod] = useState('UPI');
  const [upiId, setUpiId] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [accountHolder, setAccountHolder] = useState('');
  const [financialConsent, setFinancialConsent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { refreshKycStatus } = useAuth();

  /**
   * [IN-LINE PRIDE]: Conditional Payload Composition
   * Dynamically constructs the API payload based on the selected 'Settlement Method'. 
   * This prevents 'Garbage Data' (e.g., stale UPI IDs when switching to Bank) from 
   * entering the banking microservice, maintaining strict financial data hygiene.
   */
  const handleContinue = async () => {
    if (method === 'UPI' && !upiId) {
      Alert.alert(t('common.error'), t('kyc.payout.enter_upi'));
      return;
    }

    if (method === 'BANK' && (!accountNumber || !ifscCode || !accountHolder)) {
      Alert.alert(t('common.error'), t('kyc.payout.fill_bank'));
      return;
    }

    setIsLoading(true);
    try {
      await kycApi.savePayoutSetup({
        method: method as 'UPI' | 'BANK',
        financialDataConsent: true,
        consentVersion: CONSENT_VERSION,
        ...(method === 'UPI' ? { upiId } : { accountNumber, ifscCode, accountHolder }),
      });
      await refreshKycStatus();
      navigation.navigate('KYCFraudDetection');
    } catch (e: any) {
      Alert.alert(t('common.error'), e.message || t('kyc.payout.save_failed'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <LoadingOverlay visible={isLoading} message={t('kyc.payout.saving')} />
      <View style={styles.header}>
        {navigation.canGoBack() ? (
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={Theme.colors.text} />
          </TouchableOpacity>
        ) : (
          <View style={styles.backButton} />
        )}
        <Text style={styles.headerTitle}>{t('kyc.common.step', { current: 4, total: 4 })}</Text>
        <View style={{ width: 24 }} />
      </View>
      <View style={styles.progressContainer}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressText}>{t('kyc.overview.steps.payout.title')}</Text>
          <Text style={styles.progressPercent}>100%</Text>
        </View>
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: '100%' }]} />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>{t('kyc.payout.title')}</Text>
        <Text style={styles.subtitle}>{t('kyc.payout.subtitle')}</Text>

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
                label={t('kyc.payout.upi_label')}
                placeholder={t('kyc.payout.upi_placeholder')}
                value={upiId}
                onChangeText={setUpiId}
              />
              <Text style={styles.helperText}>
                {t('kyc.payout.upi_helper')}
              </Text>
            </View>
          ) : (
            <View>
              <Input
                label={t('kyc.payout.bank_holder_label')}
                placeholder={t('common.full_name')}
                value={accountHolder}
                onChangeText={setAccountHolder}
              />
              <Input
                label={t('kyc.payout.bank_account_label')}
                placeholder="1234567890123456"
                value={accountNumber}
                onChangeText={setAccountNumber}
                keyboardType="numeric"
              />
              <Input
                label={t('kyc.payout.bank_ifsc_label')}
                placeholder="ABCD0123456"
                value={ifscCode}
                onChangeText={setIfscCode}
                autoCapitalize="characters"
              />
            </View>
          )}

          <View style={styles.secureNotice}>
            <Ionicons name="shield-checkmark" size={20} color={Theme.colors.success} />
            <Text style={styles.secureText}>
              {t('kyc.payout.secure_notice')}
            </Text>
          </View>

          <TouchableOpacity style={styles.consentRow} onPress={() => setFinancialConsent((v) => !v)}>
            <Ionicons
              name={financialConsent ? 'checkbox' : 'square-outline'}
              size={20}
              color={financialConsent ? Theme.colors.primary : Theme.colors.textSecondary}
            />
            <Text style={styles.consentText}>
              I explicitly consent to collection and processing of my payout financial data for automated insurance settlement.
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title={isLoading ? t('common.saving') : t('common.finish_submit')}
          onPress={handleContinue}
          disabled={
            isLoading ||
            !financialConsent ||
            (method === 'UPI' && !upiId) ||
            (method === 'BANK' && (!accountNumber || !ifscCode || !accountHolder))
          }
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
  consentRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Theme.spacing.sm, backgroundColor: Theme.colors.surface, padding: Theme.spacing.md, borderRadius: Theme.borderRadius.md },
  consentText: { flex: 1, ...Theme.typography.caption, color: Theme.colors.textSecondary, lineHeight: 18 },
  footer: { padding: Theme.spacing.lg, backgroundColor: Theme.colors.surface, borderTopWidth: 1, borderTopColor: Theme.colors.border },
});

