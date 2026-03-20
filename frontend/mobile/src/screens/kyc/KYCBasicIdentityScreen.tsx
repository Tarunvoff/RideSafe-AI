import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Alert, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Button from '../../components/Button';
import Input from '../../components/Input';
import { useAuth } from '../../context/AuthContext';
import { kycApi } from '../../services/api';
import { Theme } from '../../theme';

const GENDER_OPTIONS = ['Male', 'Female', 'Other'] as const;

export default function KYCBasicIdentityScreen({ navigation }: any) {
  const [fullName, setFullName] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { refreshKycStatus } = useAuth();

  const handleContinue = async () => {
    if (!fullName || !dob || !gender) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    // Validate and convert DD/MM/YYYY to ISO 8601
    let formattedDob = dob;
    const datePattern = /^(\d{2})\/(\d{2})\/(\d{4})$/;
    const match = dob.match(datePattern);
    
    if (match) {
      const [, day, month, year] = match;
      const date = new Date(`${year}-${month}-${day}T00:00:00.000Z`);
      if (isNaN(date.getTime())) {
        Alert.alert('Error', 'Invalid date entered');
        return;
      }
      formattedDob = date.toISOString();
    } else {
      Alert.alert('Error', 'Please enter Date of Birth in DD/MM/YYYY format');
      return;
    }

    setIsLoading(true);
    try {
      await kycApi.saveBasicIdentity({
        fullName,
        dob: formattedDob,
        gender,
      });
      await refreshKycStatus();
      navigation.navigate('KYCPersonalDetails');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to save basic identity');
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
        <Text style={styles.headerTitle}>Step 1 of 4</Text>
        <View style={{ width: 24 }} />
      </View>
      <View style={styles.progressContainer}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressText}>Basic Information</Text>
          <Text style={styles.progressPercent}>25%</Text>
        </View>
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: '25%' }]} />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Tell us about yourself</Text>
        <Text style={styles.subtitle}>Let's start with basic information.</Text>

        <View style={styles.form}>
          <Input
            label="Full Name"
            placeholder="Enter your full name"
            value={fullName}
            onChangeText={setFullName}
          />

          <Input
            label="Date of Birth"
            placeholder="DD/MM/YYYY"
            value={dob}
            onChangeText={setDob}
          />

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Gender</Text>
            <View style={styles.genderRow}>
              {GENDER_OPTIONS.map((g) => (
                <TouchableOpacity
                  key={g}
                  style={[styles.genderBtn, gender === g && styles.genderBtnSelected]}
                  onPress={() => setGender(g)}
                >
                  <Text style={[styles.genderText, gender === g && styles.genderTextSelected]}>
                    {g}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title={isLoading ? 'Saving...' : 'Continue'}
          onPress={handleContinue}
          disabled={!fullName || !dob || !gender || isLoading}
        />
      </View>
    </SafeAreaView>
  );
}

// ...existing code...

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Theme.colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Theme.spacing.md, backgroundColor: Theme.colors.surface },
  backButton: { padding: Theme.spacing.xs },
  headerTitle: { ...Theme.typography.h3, color: Theme.colors.text },
  progressContainer: { paddingHorizontal: Theme.spacing.lg, paddingBottom: Theme.spacing.md, backgroundColor: Theme.colors.surface, borderBottomWidth: 1, borderBottomColor: Theme.colors.border },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Theme.spacing.xs },
  progressText: { ...Theme.typography.caption, fontWeight: 'bold' as const, color: Theme.colors.textSecondary },
  progressPercent: { ...Theme.typography.caption, fontWeight: 'bold' as const, color: Theme.colors.primary },
  progressBarBg: { height: 8, backgroundColor: Theme.colors.border, borderRadius: Theme.borderRadius.full },
  progressBarFill: { height: 8, backgroundColor: Theme.colors.primary, borderRadius: Theme.borderRadius.full },
  container: { padding: Theme.spacing.lg },
  title: { ...Theme.typography.h1, color: Theme.colors.text, marginBottom: Theme.spacing.xs },
  subtitle: { ...Theme.typography.body, color: Theme.colors.textSecondary, marginBottom: Theme.spacing.xl },
  form: { gap: Theme.spacing.lg },
  inputGroup: { gap: Theme.spacing.xs },
  label: { ...Theme.typography.caption, fontWeight: 'bold' as const, color: Theme.colors.text, marginBottom: Theme.spacing.xs },
  disabledInput: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Theme.colors.surface, borderWidth: 1, borderColor: Theme.colors.border, borderRadius: Theme.borderRadius.md, height: 56, paddingHorizontal: Theme.spacing.md },
  disabledText: { ...Theme.typography.body, color: Theme.colors.textSecondary },
  pickerButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Theme.colors.surface, borderWidth: 1, borderColor: Theme.colors.border, borderRadius: Theme.borderRadius.md, height: 56, paddingHorizontal: Theme.spacing.md },
  pickerText: { ...Theme.typography.body, color: Theme.colors.text },
  platformGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Theme.spacing.sm },
  platformCard: { width: '48%', flexDirection: 'row', alignItems: 'center', gap: Theme.spacing.sm, padding: Theme.spacing.sm, borderRadius: Theme.borderRadius.md, borderWidth: 2, borderColor: Theme.colors.border, backgroundColor: Theme.colors.surface },
  platformCardSelected: { borderColor: Theme.colors.primary, backgroundColor: `${Theme.colors.primary}10` },
  platformIconPlaceholder: { width: 40, height: 40, borderRadius: Theme.borderRadius.sm, backgroundColor: Theme.colors.background, alignItems: 'center', justifyContent: 'center' },
  platformIconText: { ...Theme.typography.h3, color: Theme.colors.textSecondary },
  platformName: { ...Theme.typography.caption, fontWeight: 'bold' as const, color: Theme.colors.text },
  platformNameSelected: { color: Theme.colors.text },
  footer: { padding: Theme.spacing.lg, backgroundColor: Theme.colors.surface, borderTopWidth: 1, borderTopColor: Theme.colors.border },
  
  genderRow: { flexDirection: 'row', gap: Theme.spacing.md, marginTop: Theme.spacing.xs },
  genderBtn: { flex: 1, paddingVertical: Theme.spacing.md, borderRadius: Theme.borderRadius.md, borderWidth: 1, borderColor: Theme.colors.border, alignItems: 'center', backgroundColor: Theme.colors.surface },
  genderBtnSelected: { borderColor: Theme.colors.primary, backgroundColor: `${Theme.colors.primary}10` },
  genderText: { ...Theme.typography.body, color: Theme.colors.textSecondary, fontWeight: '600' as const },
  genderTextSelected: { color: Theme.colors.primary, fontWeight: 'bold' as const },
});
