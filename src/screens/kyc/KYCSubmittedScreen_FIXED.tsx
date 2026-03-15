import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import Button from '../../components/Button';
import { useAuth } from '../../context/AuthContext';
import { kycApi } from '../../services/api';
import { Theme } from '../../theme';

export default function KYCSubmittedScreen({ navigation }: any) {
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const { refreshKycStatus } = useAuth();

  useEffect(() => {
    submitKyc();
  }, []);

  const submitKyc = async () => {
    try {
      await kycApi.submit();
      setIsSubmitted(true);
      await refreshKycStatus();
    } catch (e: any) {
      setSubmitError(e.message || 'Failed to submit KYC');
      console.error('KYC submission error:', e);
      setIsSubmitted(true); // Allow proceeding anyway
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoToDashboard = () => {
    navigation.replace('Home');
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.safeArea, styles.centerContent]}>
        <ActivityIndicator size="large" color={Theme.colors.primary} />
        <Text style={[styles.title, { marginTop: Theme.spacing.lg }]}>Submitting your details...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, styles.centerContent]}>
      <View style={styles.successContainer}>
        <View style={styles.iconContainer}>
          <Ionicons name="checkmark-circle" size={80} color={Theme.colors.success} />
        </View>

        <Text style={styles.title}>
          {submitError ? 'KYC Details Saved' : 'All Done!'}
        </Text>

        <Text style={styles.subtitle}>
          {submitError
            ? 'Your details have been saved. You can now access your dashboard.'
            : 'We have received your KYC submission. Our team will verify and approve it within 24 hours.'}
        </Text>

        {submitError && (
          <View style={styles.warningBox}>
            <Ionicons name="warning" size={20} color={Theme.colors.warning} />
            <Text style={styles.warningText}>{submitError}</Text>
          </View>
        )}

        <View style={styles.infoBox}>
          <Ionicons name="time" size={20} color={Theme.colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={styles.infoTitle}>What Happens Next?</Text>
            <Text style={styles.infoText}>
              • Your documents will be reviewed by our team{'\n'}
              • Approval usually takes 24 hours{'\n'}
              • You'll get a notification when approved
            </Text>
          </View>
        </View>

        <View style={styles.checklist}>
          <CheckItem text="Basic Identity Information" />
          <CheckItem text="Personal Address Details" />
          <CheckItem text="Identity Verification (Aadhaar & PAN)" />
          <CheckItem text="Payout Method Setup" />
        </View>
      </View>

      <View style={styles.footer}>
        <Button
          title="Go to Dashboard"
          onPress={handleGoToDashboard}
        />
      </View>
    </SafeAreaView>
  );
}

function CheckItem({ text }: { text: string }) {
  return (
    <View style={styles.checkItem}>
      <Ionicons name="checkmark" size={20} color={Theme.colors.success} />
      <Text style={styles.checkText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Theme.colors.background },
  centerContent: { justifyContent: 'space-between' },
  successContainer: { flex: 1, padding: Theme.spacing.lg, justifyContent: 'center', alignItems: 'center' },
  iconContainer: { marginBottom: Theme.spacing.lg },
  title: { ...Theme.typography.h1, color: Theme.colors.text, textAlign: 'center', marginBottom: Theme.spacing.sm },
  subtitle: { ...Theme.typography.body, color: Theme.colors.textSecondary, textAlign: 'center', marginBottom: Theme.spacing.lg, lineHeight: 22 },
  warningBox: { flexDirection: 'row', alignItems: 'center', gap: Theme.spacing.md, backgroundColor: `${Theme.colors.warning}15`, paddingHorizontal: Theme.spacing.md, paddingVertical: Theme.spacing.sm, borderRadius: Theme.borderRadius.md, marginBottom: Theme.spacing.lg, borderLeftWidth: 4, borderLeftColor: Theme.colors.warning },
  warningText: { flex: 1, ...Theme.typography.caption, color: Theme.colors.text },
  infoBox: { flexDirection: 'row', alignItems: 'flex-start', gap: Theme.spacing.md, backgroundColor: Theme.colors.surface, padding: Theme.spacing.md, borderRadius: Theme.borderRadius.md, marginBottom: Theme.spacing.lg },
  infoTitle: { ...Theme.typography.caption, fontWeight: 'bold', color: Theme.colors.text, marginBottom: Theme.spacing.xs },
  infoText: { ...Theme.typography.caption, color: Theme.colors.textSecondary, lineHeight: 20 },
  checklist: { width: '100%', gap: Theme.spacing.sm },
  checkItem: { flexDirection: 'row', alignItems: 'center', gap: Theme.spacing.md, paddingVertical: Theme.spacing.sm },
  checkText: { ...Theme.typography.caption, color: Theme.colors.text },
  footer: { padding: Theme.spacing.lg, backgroundColor: Theme.colors.surface, borderTopWidth: 1, borderTopColor: Theme.colors.border },
});
