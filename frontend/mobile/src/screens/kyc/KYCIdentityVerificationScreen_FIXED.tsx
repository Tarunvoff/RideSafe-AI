import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Alert, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Button from '../../components/Button';
import Input from '../../components/Input';
import { useAuth } from '../../context/AuthContext';
import { kycApi } from '../../services/api';
import { Theme } from '../../theme';

export default function KYCIdentityVerificationScreen({ navigation }: any) {
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [panNumber, setPanNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { refreshKycStatus } = useAuth();

  const handleContinue = async () => {
    if (!aadhaarNumber || !panNumber) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (aadhaarNumber.length !== 12) {
      Alert.alert('Error', 'Aadhaar number must be 12 digits');
      return;
    }

    if (panNumber.length !== 10) {
      Alert.alert('Error', 'PAN number must be 10 characters');
      return;
    }

    setIsLoading(true);
    try {
      await kycApi.saveIdentityVerification({
        aadhaarNumber,
        panNumber,
      });
      await refreshKycStatus();
      navigation.navigate('KYCPayoutSetup');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to save identity verification');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Step 3 of 4</Text>
        <View style={{ width: 24 }} />
      </View>
      <View style={styles.progressContainer}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressText}>Identity Verification</Text>
          <Text style={styles.progressPercent}>75%</Text>
        </View>
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: '75%' }]} />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Verify your identity</Text>
        <Text style={styles.subtitle}>Enter your government-issued IDs for verification.</Text>

        <View style={styles.form}>
          <Input
            label="Aadhaar Number"
            placeholder="12 digit number"
            value={aadhaarNumber}
            onChangeText={setAadhaarNumber}
            keyboardType="numeric"
            maxLength={12}
          />

          <Input
            label="PAN Number"
            placeholder="10 character code"
            value={panNumber}
            onChangeText={setPanNumber}
            autoCapitalize="characters"
            maxLength={10}
          />

          <View style={styles.infoBox}>
            <Ionicons name="information-circle" size={20} color={Theme.colors.primary} />
            <Text style={styles.infoText}>
              Your ID information is encrypted and stored securely. It will only be used for verification purposes.
            </Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title={isLoading ? 'Verifying...' : 'Continue'}
          onPress={handleContinue}
          disabled={!aadhaarNumber || !panNumber || isLoading}
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
  infoBox: { flexDirection: 'row', gap: Theme.spacing.sm, padding: Theme.spacing.md, backgroundColor: `${Theme.colors.primary}10`, borderRadius: Theme.borderRadius.md },
  infoText: { flex: 1, ...Theme.typography.caption, color: Theme.colors.textSecondary, lineHeight: 18 },
  footer: { padding: Theme.spacing.lg, backgroundColor: Theme.colors.surface, borderTopWidth: 1, borderTopColor: Theme.colors.border },
});
