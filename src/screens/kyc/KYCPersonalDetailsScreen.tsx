import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '../../theme';
import Button from '../../components/Button';
import Input from '../../components/Input';
import { kycApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export default function KYCPersonalDetailsScreen({ navigation }: any) {
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { refreshKycStatus } = useAuth();

  const handleContinue = async () => {
    if (!address || !city || !state || !pincode) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setIsLoading(true);
    try {
      await kycApi.savePersonalDetails({
        address,
        city,
        state,
        pincode,
      });
      await refreshKycStatus();
      navigation.navigate('KYCIdentityVerification');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to save personal details');
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
        <Text style={styles.headerTitle}>Step 2 of 4</Text>
        <View style={{ width: 24 }} />
      </View>
      <View style={styles.progressContainer}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressText}>Personal Details</Text>
          <Text style={styles.progressPercent}>50%</Text>
        </View>
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: '50%' }]} />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Where do you live?</Text>
        <Text style={styles.subtitle}>Enter your residential address for official records.</Text>

        <View style={styles.form}>
          <Input
            label="Street Address"
            placeholder="123 Main Street"
            value={address}
            onChangeText={setAddress}
          />

          <Input
            label="City"
            placeholder="New York"
            value={city}
            onChangeText={setCity}
          />

          <View style={styles.row}>
            <View style={styles.halfWidth}>
              <Input
                label="State"
                placeholder="NY"
                value={state}
                onChangeText={setState}
              />
            </View>
            <View style={styles.halfWidth}>
              <Input
                label="Pincode"
                placeholder="10001"
                value={pincode}
                onChangeText={setPincode}
                keyboardType="numeric"
              />
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title={isLoading ? 'Saving...' : 'Continue'}
          onPress={handleContinue}
          disabled={!address || !city || !state || !pincode || isLoading}
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
  row: { flexDirection: 'row', gap: Theme.spacing.md },
  halfWidth: { flex: 1 },
  title: { ...Theme.typography.h1, color: Theme.colors.text, marginBottom: Theme.spacing.sm },
  subtitle: { ...Theme.typography.body, color: Theme.colors.textSecondary, marginBottom: Theme.spacing.lg },
  footer: { padding: Theme.spacing.lg, backgroundColor: Theme.colors.surface, borderTopWidth: 1, borderTopColor: Theme.colors.border },
});
