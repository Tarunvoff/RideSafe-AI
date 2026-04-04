import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '../../theme';
import Button from '../../components/Button';
import Input from '../../components/Input';
import LoadingOverlay from '../../components/LoadingOverlay';
import { kycApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export default function KYCPersonalDetailsScreen({ navigation }: any) {
  const { t } = useTranslation();
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { refreshKycStatus } = useAuth();

  const handleContinue = async () => {
    if (!address || !city || !state || !pincode) {
      Alert.alert(t('common.error'), t('common.required_fields'));
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
      Alert.alert(t('common.error'), e.message || t('kyc.personal.save_failed'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <LoadingOverlay visible={isLoading} message={t('kyc.personal.saving')} />
      <View style={styles.header}>
        {navigation.canGoBack() ? (
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={Theme.colors.text} />
          </TouchableOpacity>
        ) : (
          <View style={styles.backButton} />
        )}
        <Text style={styles.headerTitle}>{t('kyc.common.step', { current: 2, total: 4 })}</Text>
        <View style={{ width: 24 }} />
      </View>
      <View style={styles.progressContainer}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressText}>{t('kyc.overview.steps.personal.title')}</Text>
          <Text style={styles.progressPercent}>50%</Text>
        </View>
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: '50%' }]} />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>{t('kyc.personal.title')}</Text>
        <Text style={styles.subtitle}>{t('kyc.personal.subtitle')}</Text>

        <View style={styles.form}>
          <Input
            label={t('kyc.personal.address_label')}
            placeholder={t('kyc.personal.address_placeholder')}
            value={address}
            onChangeText={setAddress}
          />

          <Input
            label={t('kyc.personal.city_label')}
            placeholder={t('kyc.personal.city_placeholder')}
            value={city}
            onChangeText={setCity}
          />

          <View style={styles.row}>
            <View style={styles.halfWidth}>
              <Input
                label={t('kyc.personal.state_label')}
                placeholder={t('kyc.personal.state_placeholder')}
                value={state}
                onChangeText={setState}
              />
            </View>
            <View style={styles.halfWidth}>
              <Input
                label={t('kyc.personal.pincode_label')}
                placeholder={t('kyc.personal.pincode_placeholder')}
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
          title={isLoading ? t('common.saving') : t('kyc.common.next')}
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
