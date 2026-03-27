import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '../../theme';
import Button from '../../components/Button';
import { useAuth } from '../../context/AuthContext';

const STEP_STATUS_CURRENT = 'current' as const;
const STEP_STATUS_PENDING = 'pending' as const;

export default function KYCProgressOverviewScreen({ navigation }: any) {
  const { logout } = useAuth();

  const steps = [
    { title: 'Personal Details', desc: 'Full name, DOB, and contact', icon: 'person' as const, status: STEP_STATUS_CURRENT },
    { title: 'Residential Address', desc: 'Current proof of residence', icon: 'location' as const, status: 'pending' },
    { title: 'Identity Verification', desc: 'Passport or Driving License', icon: 'id-card' as const, status: 'pending' },
    { title: 'Liveness Check', desc: 'Take a quick selfie', icon: 'camera' as const, status: 'pending' },
    { title: 'Payout Setup', desc: 'Bank account for earnings', icon: 'business' as const, status: 'pending' },
    { title: 'Final Review', desc: 'Pending submission', icon: 'clipboard' as const, status: 'pending' },
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
        <Text style={styles.headerTitle}>Verification Progress</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.cardTitle}>Overall Progress</Text>
              <Text style={styles.cardSubtitle}>Not started yet</Text>
            </View>
            <Text style={styles.cardPercent}>0%</Text>
          </View>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: '0%' }]} />
          </View>
        </View>

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
            Your data is encrypted and stored securely. We only use this information for identity verification purposes and to ensure the safety of the Aegis community.
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button 
          title="Start Verification" 
          onPress={() => navigation.navigate('KYCBasicIdentity')} 
        />
        <Button 
          title="Save and continue later" 
          variant="outline"
          onPress={() => { if (navigation.canGoBack()) navigation.goBack(); else logout(); }} 
          style={{ marginTop: Theme.spacing.sm, borderWidth: 2 }}
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
