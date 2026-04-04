import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Dimensions,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Sharing from 'expo-sharing';
import { Asset } from 'expo-asset';
import { useAuth } from '../../context/AuthContext';
import { Theme } from '../../theme';
import Button from '../../components/Button';

const { width } = Dimensions.get('window');

export default function TermsAndConditionsScreen() {
  const { acceptTerms } = useAuth();
  const [isTicked, setIsTicked] = useState(false);

  const handleAccept = async () => {
    if (isTicked) {
      await acceptTerms();
    }
  };

  const handleViewPdf = async () => {
    try {
      // Resolve the local asset
      const asset = Asset.fromModule(require('../../../assets/policyDocument/Policy.pdf'));
      await asset.downloadAsync();
      
      // Open in system browser/viewer
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(asset.localUri || asset.uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Aegis Driver Policy',
        });
      }
    } catch (error) {
      console.error('Error opening PDF:', error);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header Section */}
        <View style={styles.header}>
          <View style={styles.iconCircle}>
            <Ionicons name="shield-checkmark" size={32} color={Theme.colors.primary} />
          </View>
          <Text style={styles.title}>Professional Driver Agreement</Text>
          <Text style={styles.subtitle}>
            Please review the policy document and accept the terms to activate your driver dashboard.
          </Text>
        </View>

        {/* Scrollable Terms Content */}
        <View style={styles.termsBox}>
          <ScrollView 
            style={styles.scrollView} 
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={true}
          >
            <Text style={styles.sectionTitle}>1. Data Usage & Telemetry</Text>
            <Text style={styles.bodyText}>
              By using Aegis, you agree to allow the platform to collect and process your GPS and telemetry data in real-time. This data is used solely for hazard detection, risk assessment, and automated claim verification.
            </Text>

            <Text style={styles.sectionTitle}>2. Hazard Monitoring</Text>
            <Text style={styles.bodyText}>
              The application provides real-time environmental hazard maps. While we strive for accuracy, the data is advisory. Driver safety and adherence to local traffic laws remain your primary responsibility.
            </Text>

            <Text style={styles.sectionTitle}>3. Payout Eligibility</Text>
            <Text style={styles.bodyText}>
              Purchased plans provide coverage for verified disruptions. Payouts are triggered automatically based on platform signaling and environmental data. Fraudulent behavior will result in immediate account suspension.
            </Text>

            <Text style={styles.sectionTitle}>4. Privacy & Security</Text>
            <Text style={styles.bodyText}>
              Aegis is committed to protecting your data. All communication is encrypted, and your personal information is never sold to third parties. We comply with standard data protection regulations.
            </Text>
            
            <View style={styles.fullPolicyLinkContainer}>
              <TouchableOpacity style={styles.fullPolicyBtn} onPress={handleViewPdf}>
                <Ionicons name="document-text-outline" size={18} color={Theme.colors.primary} />
                <Text style={styles.fullPolicyBtnText}>View Full PDF Policy</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>

        {/* Acceptance Section */}
        <View style={styles.footer}>
          <TouchableOpacity 
            style={styles.checkboxContainer} 
            activeOpacity={0.8}
            onPress={() => setIsTicked(!isTicked)}
          >
            <View style={[styles.checkbox, isTicked && styles.checkboxActive]}>
              {isTicked && <Ionicons name="checkmark" size={16} color="#fff" />}
            </View>
            <Text style={styles.checkboxLabel}>
              I have read, understood, and agree to the terms and conditions mentioned above.
            </Text>
          </TouchableOpacity>

          <Button
            title="Accept & Continue"
            onPress={handleAccept}
            disabled={!isTicked}
            style={[styles.continueBtn, !isTicked && styles.continueBtnDisabled]}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: `${Theme.colors.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    ...Theme.typography.h2,
    textAlign: 'center',
    color: Theme.colors.text,
  },
  subtitle: {
    ...Theme.typography.body,
    textAlign: 'center',
    color: Theme.colors.textSecondary,
    marginTop: 8,
    lineHeight: 20,
  },
  termsBox: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    padding: 2,
    overflow: 'hidden',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  sectionTitle: {
    ...Theme.typography.h3,
    color: Theme.colors.text,
    fontSize: 14,
    marginTop: 16,
    marginBottom: 8,
  },
  bodyText: {
    ...Theme.typography.body,
    color: Theme.colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  fullPolicyLinkContainer: {
    marginTop: 24,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 16,
  },
  fullPolicyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  fullPolicyBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: Theme.colors.primary,
  },
  footer: {
    marginTop: 24,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 20,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxActive: {
    backgroundColor: Theme.colors.primary,
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 12,
    color: Theme.colors.text,
    lineHeight: 18,
    fontWeight: '500',
  },
  continueBtn: {
    width: '100%',
    height: 56,
  },
  continueBtnDisabled: {
    opacity: 0.5,
  },
});
