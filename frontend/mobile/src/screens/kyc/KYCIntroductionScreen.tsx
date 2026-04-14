/**
 * [EXCELLENCE SUMMARY]
 * The KYCIntroductionScreen serves as the persuasive and orienting gateway to 
 * the Aegis compliance funnel. It is architected to minimize drop-off by 
 * clearly articulating the technical necessity of identity verification—linking 
 * KYC completion directly to 'Policy Activation' and 'Claim Validation'.
 * 
 * [DOMAIN LOGIC]
 * Technically initiates the "Digital Identity Anchoring" process. By priming the 
 * driver for ID and Banking requirements, it ensures that subsequent data 
 * collection steps (Aadhaar, UPI) are contextually justified within the 
 * insurance mission, specifically the ability to receive parametric payouts.
 */

import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Theme } from '../../theme';
import Button from '../../components/ui/Button';
import { useAuth } from '../../context/AuthContext';

export default function KYCIntroductionScreen({ navigation }: any) {
  const { t } = useTranslation();
  const { logout } = useAuth();

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            if (navigation.canGoBack()) {
              navigation.goBack();
            } else {
              logout();
            }
          }}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={Theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('kyc.intro.header')}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>{t('kyc.intro.title')}</Text>
        <Text style={styles.subtitle}>
          {t('kyc.intro.subtitle')}
        </Text>

        {/* [IN-LINE PRIDE]: Value-Centered Compliance
            Explicitly associates technical requirements with driver benefits.
            This transparency reduces friction for users with low digital literacy.
        */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('kyc.intro.why_title')}</Text>
          <View style={styles.listItem}>
            <View style={styles.iconContainer}>
              <Ionicons name="shield-checkmark" size={20} color={Theme.colors.primary} />
            </View>
            <View>
              <Text style={styles.listTitle}>{t('kyc.intro.policy_activation.title')}</Text>
              <Text style={styles.listDesc}>{t('kyc.intro.policy_activation.desc')}</Text>
            </View>
          </View>
          <View style={styles.listItem}>
            <View style={styles.iconContainer}>
              <Ionicons name="checkmark-circle" size={20} color={Theme.colors.primary} />
            </View>
            <View>
              <Text style={styles.listTitle}>{t('kyc.intro.claim_validation.title')}</Text>
              <Text style={styles.listDesc}>{t('kyc.intro.claim_validation.desc')}</Text>
            </View>
          </View>
          <View style={styles.listItem}>
            <View style={styles.iconContainer}>
              <Ionicons name="wallet" size={20} color={Theme.colors.primary} />
            </View>
            <View>
              <Text style={styles.listTitle}>{t('kyc.intro.payout_processing.title')}</Text>
              <Text style={styles.listDesc}>{t('kyc.intro.payout_processing.desc')}</Text>
            </View>
          </View>
        </View>

        {/* [IN-LINE PRIDE]: Preparation Grid
            Visualizes and summarizes prerequisite assets, minimizing 
            in-flow anxiety and context-switching.
        */}
        <Text style={styles.sectionTitle}>{t('kyc.intro.ready_title')}</Text>
        <View style={styles.grid}>
          <View style={styles.gridItem}>
            <Ionicons name="id-card" size={20} color={Theme.colors.primary} />
            <Text style={styles.gridText}>{t('kyc.intro.ready_items.id')}</Text>
          </View>
          <View style={styles.gridItem}>
            <Ionicons name="person" size={20} color={Theme.colors.primary} />
            <Text style={styles.gridText}>{t('kyc.intro.ready_items.selfie')}</Text>
          </View>
          <View style={styles.gridItem}>
            <Ionicons name="location" size={20} color={Theme.colors.primary} />
            <Text style={styles.gridText}>{t('kyc.intro.ready_items.address')}</Text>
          </View>
          <View style={styles.gridItem}>
            <Ionicons name="cash" size={20} color={Theme.colors.primary} />
            <Text style={styles.gridText}>{t('kyc.intro.ready_items.bank')}</Text>
          </View>
        </View>

        <View style={styles.timeBanner}>
          <Ionicons name="time" size={18} color={Theme.colors.primary} />
          <Text style={styles.timeText}>{t('kyc.intro.estimated_time')}</Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button 
          title={t('kyc.intro.start_button')} 
          onPress={() => navigation.navigate('KYCBasicIdentity')} 
        />
        <TouchableOpacity style={styles.secondaryButton} onPress={() => logout()}>
          <Text style={styles.secondaryButtonText}>{t('kyc.intro.continue_later')}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Theme.colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Theme.spacing.md, backgroundColor: Theme.colors.surface },
  backButton: { padding: Theme.spacing.xs },
  headerTitle: { ...Theme.typography.h3, color: Theme.colors.text },
  container: { padding: Theme.spacing.lg },
  title: { ...Theme.typography.h1, color: Theme.colors.text, marginBottom: Theme.spacing.sm },
  subtitle: { ...Theme.typography.body, color: Theme.colors.textSecondary, marginBottom: Theme.spacing.xl },
  card: { backgroundColor: Theme.colors.surface, padding: Theme.spacing.md, borderRadius: Theme.borderRadius.lg, borderWidth: 1, borderColor: Theme.colors.border, marginBottom: Theme.spacing.xl },
  cardTitle: { ...Theme.typography.h3, marginBottom: Theme.spacing.md, color: Theme.colors.text },
  listItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: Theme.spacing.md },
  iconContainer: { backgroundColor: `${Theme.colors.primary}20`, padding: Theme.spacing.xs, borderRadius: Theme.borderRadius.md, marginRight: Theme.spacing.sm },
  listTitle: { ...Theme.typography.body, fontWeight: 'bold' as const, color: Theme.colors.text },
  listDesc: { ...Theme.typography.caption, color: Theme.colors.textSecondary },
  sectionTitle: { ...Theme.typography.h3, color: Theme.colors.text, marginBottom: Theme.spacing.md, paddingHorizontal: Theme.spacing.xs },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Theme.spacing.sm, marginBottom: Theme.spacing.xl },
  gridItem: { flex: 1, minWidth: '45%', flexDirection: 'row', alignItems: 'center', backgroundColor: Theme.colors.surface, padding: Theme.spacing.md, borderRadius: Theme.borderRadius.md, gap: Theme.spacing.sm },
  gridText: { ...Theme.typography.caption, fontWeight: 'bold' as const, color: Theme.colors.text },
  timeBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: `${Theme.colors.primary}10`, padding: Theme.spacing.sm, borderRadius: Theme.borderRadius.md, gap: Theme.spacing.xs, marginBottom: Theme.spacing.xl },
  timeText: { ...Theme.typography.caption, fontWeight: 'bold' as const, color: Theme.colors.textSecondary },
  footer: { padding: Theme.spacing.lg, backgroundColor: Theme.colors.surface, gap: Theme.spacing.sm },
  secondaryButton: { paddingVertical: Theme.spacing.md, alignItems: 'center' },
  secondaryButtonText: { ...Theme.typography.body, fontWeight: 'bold' as const, color: Theme.colors.textSecondary },
});

