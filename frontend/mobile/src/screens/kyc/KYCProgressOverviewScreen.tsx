/**
 * [EXCELLENCE SUMMARY]
 * The KYCProgressOverviewScreen is the roadmap interface for the driver 
 * onboarding journey. It visualizes the multi-step compliance sequence as a 
 * vertical timeline, providing users with a clear sense of progression and 
 * reducing the cognitive fatigue associated with regulatory data collection.
 * 
 * [DOMAIN LOGIC]
 * Serves as the "Compliance Orchestrator" view. By mapping out steps from 
 * 'Personal Identity' to 'Payout Processing' and 'Fraud Analysis', it 
 * contextually prepares the driver for the rigorous verification required 
 * to participate in the Aegis insurance ecosystem.
 */

import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '../../theme';
import Button from '../../components/ui/Button';
import { useAuth } from '../../context/AuthContext';
import { kycApi } from '../../services/api';

const STEP_STATUS_CURRENT = 'current' as const;
const STEP_STATUS_PENDING = 'pending' as const;

export default function KYCProgressOverviewScreen({ navigation }: any) {
  const { t } = useTranslation();
  const { logout } = useAuth();
  const [engagementDays, setEngagementDays] = useState<number | null>(null);
  const [minimumDays, setMinimumDays] = useState<{ standard: number; premium: number } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const status = await kycApi.getStatus();
        if (status.engagementEligibility) {
          setEngagementDays(status.engagementEligibility.engagementDays);
          setMinimumDays(status.engagementEligibility.minimumDays);
        }
      } catch {
        // Non-blocking informational panel.
      }
    })();
  }, []);

  const steps = [
    { title: t('kyc.overview.steps.personal.title'), desc: t('kyc.overview.steps.personal.desc'), icon: 'person' as const, status: STEP_STATUS_CURRENT },
    { title: t('kyc.overview.steps.address.title'), desc: t('kyc.overview.steps.address.desc'), icon: 'location' as const, status: 'pending' },
    { title: t('kyc.overview.steps.identity.title'), desc: t('kyc.overview.steps.identity.desc'), icon: 'id-card' as const, status: 'pending' },
    { title: t('kyc.overview.steps.liveness.title'), desc: t('kyc.overview.steps.liveness.desc'), icon: 'camera' as const, status: 'pending' },
    { title: t('kyc.overview.steps.payout.title'), desc: t('kyc.overview.steps.payout.desc'), icon: 'business' as const, status: 'pending' },
    { title: t('kyc.overview.steps.final.title'), desc: t('kyc.overview.steps.final.desc'), icon: 'clipboard' as const, status: 'pending' },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        {navigation.canGoBack() ? (
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={Theme.colors.text} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={() => logout()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={Theme.colors.text} />
          </TouchableOpacity>
        )}
        <Text style={styles.headerTitle}>{t('kyc.overview.header')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        {/* [IN-LINE PRIDE]: Momentum-Driven Progress Card
            High-contrast visual of the completion percentage reinforces the 
            sense of achievement during the administrative phase.
        */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.cardTitle}>{t('kyc.overview.title')}</Text>
              <Text style={styles.cardSubtitle}>{t('kyc.overview.not_started')}</Text>
            </View>
            <Text style={styles.cardPercent}>0%</Text>
          </View>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: '0%' }]} />
          </View>
        </View>

        {engagementDays != null && minimumDays ? (
          <View style={styles.gatingCard}>
            <Ionicons name="time-outline" size={18} color={Theme.colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.gatingTitle}>Platform engagement eligibility</Text>
              <Text style={styles.gatingText}>
                Current tenure: {engagementDays} days. Minimum required: {minimumDays.standard} days (Standard/Baseline) and {minimumDays.premium} days (Premium).
              </Text>
            </View>
          </View>
        ) : null}

        {/* [IN-LINE PRIDE]: Contextual Step Timeline
            Uses a vertical track to signify a temporal progression through 
            the compliance gates. Icons are carefully chosen to reduce 
            language barriers for dark store logistics personnel.
        */}
        <View style={styles.stepsContainer}>
          {steps.map((step, index) => {
            const isCurrent = step.status === STEP_STATUS_CURRENT;
            const isLast = index === steps.length - 1;
            return (
              <View key={index} style={styles.stepRow}>
                <View style={styles.stepIconCol}>
                  <View style={[styles.stepIcon, isCurrent ? styles.stepIconCurrent : null]}>
                    <Ionicons 
                      name={step.icon} 
                      size={20} 
                      color={isCurrent ? Theme.colors.primary : Theme.colors.textSecondary} 
                    />
                  </View>
                  {!isLast && <View style={styles.stepLine} />}
                </View>
                <View style={styles.stepContent}>
                  <Text style={styles.stepTitle}>{step.title}</Text>
                  <Text style={styles.stepDesc}>{step.desc}</Text>
                </View>
              </View>
            );
          })}
        </View>

        <View style={styles.secureNotice}>
          <Ionicons name="lock-closed" size={20} color={Theme.colors.primary} />
          <Text style={styles.secureText}>
            {t('kyc.overview.secure_box')}
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button 
          title={t('kyc.overview.start_verify')} 
          onPress={() => navigation.navigate('KYCBasicIdentity')} 
        />
        <Button 
          title={t('kyc.overview.save_later')} 
          variant="outline"
          onPress={() => { if (navigation.canGoBack()) navigation.goBack(); else logout(); }} 
          style={{ marginTop: Theme.spacing.sm, borderTopWidth: 2 }}
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
  container: { paddingBottom: Theme.spacing.lg },
  card: { backgroundColor: `${Theme.colors.primary}10`, margin: Theme.spacing.md, padding: Theme.spacing.lg, borderRadius: Theme.borderRadius.lg },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: Theme.spacing.md },
  cardTitle: { ...Theme.typography.h3, color: Theme.colors.text, marginBottom: Theme.spacing.xs },
  cardSubtitle: { ...Theme.typography.caption, color: Theme.colors.textSecondary },
  cardPercent: { ...Theme.typography.h1, color: Theme.colors.primary },
  progressBarBg: { height: 12, backgroundColor: Theme.colors.border, borderRadius: Theme.borderRadius.full, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: Theme.colors.primary, borderRadius: Theme.borderRadius.full },
  gatingCard: { flexDirection: 'row', gap: Theme.spacing.sm, backgroundColor: `${Theme.colors.primary}10`, marginHorizontal: Theme.spacing.md, marginBottom: Theme.spacing.md, padding: Theme.spacing.md, borderRadius: Theme.borderRadius.md },
  gatingTitle: { ...Theme.typography.body, fontWeight: 'bold' as const, color: Theme.colors.text },
  gatingText: { ...Theme.typography.caption, color: Theme.colors.textSecondary, marginTop: 2 },
  stepsContainer: { paddingHorizontal: Theme.spacing.lg, paddingTop: Theme.spacing.md },
  stepRow: { flexDirection: 'row' },
  stepIconCol: { alignItems: 'center', width: 40, marginRight: Theme.spacing.md },
  stepIcon: { width: 40, height: 40, borderRadius: 20, borderWidth: 2, borderColor: Theme.colors.border, backgroundColor: Theme.colors.surface, alignItems: 'center', justifyContent: 'center' },
  stepIconCurrent: { borderColor: `${Theme.colors.primary}40`, backgroundColor: `${Theme.colors.primary}10` },
  stepLine: { width: 2, height: 40, backgroundColor: Theme.colors.border, marginVertical: Theme.spacing.xs },
  stepContent: { flex: 1, paddingTop: Theme.spacing.xs, paddingBottom: 24 },
  stepTitle: { ...Theme.typography.body, fontWeight: 'bold' as const, color: Theme.colors.text, marginBottom: 2 },
  stepDesc: { ...Theme.typography.caption, color: Theme.colors.textSecondary },
  secureNotice: { flexDirection: 'row', backgroundColor: Theme.colors.surface, padding: Theme.spacing.md, marginHorizontal: Theme.spacing.md, borderRadius: Theme.borderRadius.md, gap: Theme.spacing.sm, marginBottom: Theme.spacing.xl },
  secureText: { flex: 1, ...Theme.typography.caption, color: Theme.colors.textSecondary, lineHeight: 20 },
  footer: { padding: Theme.spacing.lg, backgroundColor: Theme.colors.surface, borderTopWidth: 1, borderTopColor: Theme.colors.border },
});

