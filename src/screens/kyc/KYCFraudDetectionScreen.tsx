import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Alert, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Button from '../../components/Button';
import { useAuth } from '../../context/AuthContext';
import { fraudApi } from '../../services/api';
import { Theme } from '../../theme';

let Location: any = null;
try {
  Location = require('expo-location');
} catch (e) {
  console.warn('expo-location not available');
}

export default function KYCFraudDetectionScreen({ navigation }: any) {
  const [isLoading, setIsLoading] = useState(false);
  const [riskScore, setRiskScore] = useState<number | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [deviceIntegrity, setDeviceIntegrity] = useState('Normal Device');
  const [networkType, setNetworkType] = useState('Standard Network');
  const [velocityCheck, setVelocityCheck] = useState('Within Range');
  const [analysisDetails, setAnalysisDetails] = useState<string[]>([]);
  const { refreshKycStatus } = useAuth();

  useEffect(() => {
    requestLocationPermission();
  }, []);

  const requestLocationPermission = async () => {
    try {
      if (!Location) {
        console.warn('Location module not available');
        return;
      }
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required for fraud detection');
      }
    } catch (error) {
      console.error('Location permission error:', error);
    }
  };

  const handleAnalyze = async () => {
    setIsLoading(true);
    try {
      let latitude = 0;
      let longitude = 0;

      try {
        if (Location) {
          const location = await Location.getCurrentPositionAsync({});
          latitude = location.coords.latitude;
          longitude = location.coords.longitude;
        }
      } catch (locError) {
        console.warn('Could not get location, using default:', locError);
      }

      const response = await fraudApi.analyze({
        gpsLatitude: latitude,
        gpsLongitude: longitude,
        deviceIntegrity,
        networkType,
        velocityCheck,
      });

      setRiskScore(response.data.riskScore);
      setStatus(response.data.status);
      setAnalysisDetails(response.data.analysis.riskFactors || []);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to analyze fraud risk');
    } finally {
      setIsLoading(false);
    }
  };

  const handleContinue = async () => {
    if (status === 'INCONCLUSIVE') {
      Alert.alert('Manual Review Required', 'Your submission requires manual review by our team. You will be notified once the review is complete.');
    }
    await refreshKycStatus();
    navigation.navigate('KYCSubmitted');
  };

  const getRiskColor = (score: number) => {
    if (score < 30) return Theme.colors.success;
    if (score < 60) return '#f59e0b';
    return Theme.colors.error;
  };

  const getRiskLabel = (score: number) => {
    if (score < 30) return 'Low Risk';
    if (score < 60) return 'Medium Risk';
    return 'High Risk';
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Step 5 of 6</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.progressContainer}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressText}>Fraud Detection</Text>
          <Text style={styles.progressPercent}>83%</Text>
        </View>
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: '83%' }]} />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>GPS Spoofing Analysis</Text>
        <Text style={styles.subtitle}>We analyze your device for fraud indicators to ensure security.</Text>

        {riskScore === null ? (
          <>
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Ionicons name="shield-checkmark" size={24} color={Theme.colors.primary} />
                <Text style={styles.cardTitle}>Device Security Check</Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Device Integrity</Text>
                <View style={styles.detailValue}>
                  <Ionicons name="lock-closed" size={16} color={Theme.colors.primary} />
                  <Text style={styles.detailText}>{deviceIntegrity}</Text>
                </View>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Network Type</Text>
                <View style={styles.detailValue}>
                  <Ionicons name="wifi" size={16} color={Theme.colors.primary} />
                  <Text style={styles.detailText}>{networkType}</Text>
                </View>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Velocity Check</Text>
                <View style={styles.detailValue}>
                  <Ionicons name="checkmark-circle" size={16} color={Theme.colors.success} />
                  <Text style={styles.detailText}>{velocityCheck}</Text>
                </View>
              </View>
            </View>

            <View style={styles.infoBox}>
              <Ionicons name="information-circle" size={20} color={Theme.colors.primary} />
              <Text style={styles.infoText}>
                This analysis checks for GPS spoofing, device tampering, and suspicious network activity.
              </Text>
            </View>
          </>
        ) : (
          <View style={[styles.resultCard, { borderColor: getRiskColor(riskScore) }]}>
            <View style={styles.resultHeader}>
              <View style={[styles.riskBadge, { backgroundColor: getRiskColor(riskScore) }]}>
                <Ionicons
                  name={riskScore < 30 ? 'checkmark-circle' : riskScore < 60 ? 'warning' : 'alert-circle'}
                  size={20}
                  color="#fff"
                />
              </View>
              <View style={styles.resultTitleContainer}>
                <Text style={styles.resultStatus}>Status: {status}</Text>
                <Text style={[styles.resultRisk, { color: getRiskColor(riskScore) }]}>
                  {getRiskLabel(riskScore)}
                </Text>
              </View>
            </View>

            <View style={styles.scoreContainer}>
              <Text style={styles.scoreLabel}>Fraud Risk Index</Text>
              <Text style={[styles.scoreValue, { color: getRiskColor(riskScore) }]}>
                {riskScore}%
              </Text>
            </View>

            {analysisDetails.length > 0 && (
              <View style={styles.detailsSection}>
                <Text style={styles.detailsTitle}>Analysis Details</Text>
                {analysisDetails.map((detail, idx) => (
                  <View key={idx} style={styles.detailItem}>
                    <Ionicons name="alert-circle" size={16} color={Theme.colors.error} />
                    <Text style={styles.detailItemText}>{detail}</Text>
                  </View>
                ))}
              </View>
            )}

            <View style={styles.resultGrid}>
              <View style={styles.resultGridItem}>
                <Ionicons name="lock-open" size={20} color="#f59e0b" />
                <Text style={styles.resultGridLabel}>Device</Text>
                <Text style={styles.resultGridValue}>{deviceIntegrity}</Text>
              </View>
              <View style={styles.resultGridItem}>
                <Ionicons name="wifi" size={20} color={Theme.colors.textSecondary} />
                <Text style={styles.resultGridLabel}>Network</Text>
                <Text style={styles.resultGridValue}>{networkType}</Text>
              </View>
              <View style={styles.resultGridItem}>
                <Ionicons name="checkmark-circle" size={20} color={Theme.colors.success} />
                <Text style={styles.resultGridLabel}>Velocity</Text>
                <Text style={styles.resultGridValue}>{velocityCheck}</Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        {riskScore === null ? (
          <Button
            title={isLoading ? 'Analyzing...' : 'Analyze Device'}
            onPress={handleAnalyze}
            disabled={isLoading}
          />
        ) : (
          <>
            <Button
              title="Continue"
              onPress={handleContinue}
            />
            <TouchableOpacity style={styles.secondaryButton} onPress={() => setRiskScore(null)}>
              <Text style={styles.secondaryButtonText}>Re-analyze</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

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
  card: { backgroundColor: Theme.colors.surface, padding: Theme.spacing.md, borderRadius: Theme.borderRadius.lg, borderWidth: 1, borderColor: Theme.colors.border, marginBottom: Theme.spacing.xl },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: Theme.spacing.sm, marginBottom: Theme.spacing.lg },
  cardTitle: { ...Theme.typography.h3, color: Theme.colors.text, flex: 1 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Theme.spacing.md, borderBottomWidth: 1, borderBottomColor: Theme.colors.border },
  detailLabel: { ...Theme.typography.caption, fontWeight: 'bold' as const, color: Theme.colors.textSecondary },
  detailValue: { flexDirection: 'row', alignItems: 'center', gap: Theme.spacing.xs },
  detailText: { ...Theme.typography.body, color: Theme.colors.text, fontWeight: '600' as const },
  infoBox: { flexDirection: 'row', alignItems: 'flex-start', gap: Theme.spacing.md, backgroundColor: `${Theme.colors.primary}10`, padding: Theme.spacing.md, borderRadius: Theme.borderRadius.lg, marginBottom: Theme.spacing.xl },
  infoText: { ...Theme.typography.caption, color: Theme.colors.text, flex: 1, lineHeight: 20 },
  resultCard: { backgroundColor: Theme.colors.surface, padding: Theme.spacing.lg, borderRadius: Theme.borderRadius.lg, borderWidth: 2, marginBottom: Theme.spacing.xl },
  resultHeader: { flexDirection: 'row', alignItems: 'center', gap: Theme.spacing.md, marginBottom: Theme.spacing.lg },
  riskBadge: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  resultTitleContainer: { flex: 1 },
  resultStatus: { ...Theme.typography.caption, fontWeight: 'bold' as const, color: Theme.colors.textSecondary },
  resultRisk: { ...Theme.typography.h3, fontWeight: 'bold' as const, marginTop: Theme.spacing.xs },
  scoreContainer: { backgroundColor: `${Theme.colors.primary}10`, padding: Theme.spacing.md, borderRadius: Theme.borderRadius.lg, marginBottom: Theme.spacing.lg },
  scoreLabel: { ...Theme.typography.caption, fontWeight: 'bold' as const, color: Theme.colors.textSecondary, marginBottom: Theme.spacing.xs },
  scoreValue: { ...Theme.typography.h1, fontWeight: 'bold' as const },
  detailsSection: { marginBottom: Theme.spacing.lg },
  detailsTitle: { ...Theme.typography.body, fontWeight: 'bold' as const, color: Theme.colors.text, marginBottom: Theme.spacing.md },
  detailItem: { flexDirection: 'row', alignItems: 'flex-start', gap: Theme.spacing.sm, marginBottom: Theme.spacing.md },
  detailItemText: { ...Theme.typography.caption, color: Theme.colors.text, flex: 1, lineHeight: 18 },
  resultGrid: { flexDirection: 'row', gap: Theme.spacing.md, marginBottom: Theme.spacing.lg },
  resultGridItem: { flex: 1, alignItems: 'center', padding: Theme.spacing.md, backgroundColor: Theme.colors.background, borderRadius: Theme.borderRadius.lg, borderWidth: 1, borderColor: Theme.colors.border },
  resultGridLabel: { ...Theme.typography.caption, fontWeight: 'bold' as const, color: Theme.colors.textSecondary, marginTop: Theme.spacing.xs },
  resultGridValue: { ...Theme.typography.caption, fontWeight: 'bold' as const, color: Theme.colors.text, marginTop: Theme.spacing.xs },
  footer: { padding: Theme.spacing.lg, backgroundColor: Theme.colors.surface, borderTopWidth: 1, borderTopColor: Theme.colors.border, gap: Theme.spacing.sm },
  secondaryButton: { paddingVertical: Theme.spacing.md, alignItems: 'center' },
  secondaryButtonText: { ...Theme.typography.body, fontWeight: 'bold' as const, color: Theme.colors.textSecondary },
});
