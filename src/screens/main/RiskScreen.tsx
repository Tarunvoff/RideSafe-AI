import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import MainTopNavbar from '../../components/MainTopNavbar';
import { Theme } from '../../theme';
// react-native-svg removed — using pure RN ring

export default function RiskScreen({ navigation }: any) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <MainTopNavbar />

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Hero Score Section */}
        <View style={styles.heroSection}>
          <View style={styles.scoreContainer}>
            {/* Outer decorative ring */}
            <View style={styles.ringOuter}>
              <View style={styles.ringInner}>
                <Text style={styles.scoreValue}>72</Text>
                <Text style={styles.scoreLabel}>out of 100</Text>
              </View>
            </View>
          </View>
          
          <View style={styles.riskBadge}>
            <Text style={styles.riskBadgeText}>MODERATE RISK</Text>
          </View>

          <Text style={styles.heroDesc}>
            Your risk score is calculated based on real-time data from your active zones and platform metrics.
          </Text>
        </View>

        {/* Factors Breakdown */}
        <View style={styles.factorsSection}>
          <Text style={styles.sectionTitle}>Risk Factors Breakdown</Text>
          
          {/* Factor 1 */}
          <View style={styles.factorCard}>
            <View style={styles.factorHeader}>
              <View style={styles.factorTitleRow}>
                <Ionicons name="partly-sunny" size={20} color={Theme.colors.primary} />
                <Text style={styles.factorTitle}>Historical Weather</Text>
              </View>
              <Text style={styles.factorScore}>85% Safe</Text>
            </View>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: '85%' }]} />
            </View>
            <Text style={styles.factorDesc}>Based on average precipitation and road conditions in your primary zones.</Text>
          </View>

          {/* Factor 2 */}
          <View style={styles.factorCard}>
            <View style={styles.factorHeader}>
              <View style={styles.factorTitleRow}>
                <Ionicons name="git-network-outline" size={20} color={Theme.colors.primary} />
                <Text style={styles.factorTitle}>Zone Density</Text>
              </View>
              <Text style={styles.factorScore}>62% Safe</Text>
            </View>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: '62%' }]} />
            </View>
            <Text style={styles.factorDesc}>High traffic congestion detected in Downtown and Eastside hubs.</Text>
          </View>

          {/* Factor 3 */}
          <View style={styles.factorCard}>
            <View style={styles.factorHeader}>
              <View style={styles.factorTitleRow}>
                <Ionicons name="shield-checkmark" size={20} color={Theme.colors.primary} />
                <Text style={styles.factorTitle}>Platform Reliability</Text>
              </View>
              <Text style={styles.factorScore}>94% Safe</Text>
            </View>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: '94%' }]} />
            </View>
            <Text style={styles.factorDesc}>Your delivery completion rate and app stability are excellent.</Text>
          </View>
        </View>

        {/* Premium Explanation */}
        <View style={styles.premiumSection}>
          <View style={styles.premiumBox}>
            <View style={styles.premiumRow}>
              <Ionicons name="cash-outline" size={24} color={Theme.colors.primary} style={{ marginTop: 2 }} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.premiumTitle}>Impact on Premium</Text>
                <Text style={styles.premiumDesc}>
                  Since your risk score is <Text style={{ fontWeight: 'bold', color: Theme.colors.primary }}>72</Text>, your weekly premium is adjusted to <Text style={{ fontWeight: 'bold', color: Theme.colors.text }}>$18.50</Text>. By avoiding high-density zones during peak hours, you can increase your score and lower next week's cost!
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Theme.colors.surface },
  container: { paddingBottom: 24, backgroundColor: Theme.colors.surface },
  
  heroSection: { padding: 32, alignItems: 'center', backgroundColor: '#fff', marginBottom: 8 },
  scoreContainer: { alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  ringOuter: { width: 160, height: 160, borderRadius: 80, borderWidth: 10, borderColor: `${Theme.colors.primary}30`, backgroundColor: `${Theme.colors.primary}08`, alignItems: 'center', justifyContent: 'center' },
  ringInner: { alignItems: 'center', justifyContent: 'center' },
  scoreValue: { fontSize: 48, fontWeight: '800', color: '#0f172a', lineHeight: 48 },
  scoreLabel: { fontSize: 14, fontWeight: '500', color: '#64748b' },
  riskBadge: { backgroundColor: `${Theme.colors.primary}15`, paddingHorizontal: 16, paddingVertical: 6, borderRadius: 24 },
  riskBadgeText: { color: Theme.colors.primary, fontSize: 14, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },
  heroDesc: { marginTop: 16, textAlign: 'center', fontSize: 14, color: '#475569', lineHeight: 20 },

  factorsSection: { paddingHorizontal: Theme.spacing.lg, paddingVertical: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a', marginBottom: 24 },
  factorCard: { backgroundColor: '#fff', padding: 16, borderRadius: Theme.borderRadius.xl, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 16 },
  factorHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  factorTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  factorTitle: { fontSize: 16, fontWeight: '600', color: '#0f172a' },
  factorScore: { fontSize: 14, fontWeight: '800', color: '#0f172a' },
  progressBarBg: { height: 10, backgroundColor: '#f1f5f9', borderRadius: 5, overflow: 'hidden', marginBottom: 12 },
  progressBarFill: { height: '100%', backgroundColor: Theme.colors.primary, borderRadius: 5 },
  factorDesc: { fontSize: 12, color: '#64748b', lineHeight: 18 },

  premiumSection: { paddingHorizontal: Theme.spacing.lg, paddingBottom: 32 },
  premiumBox: { backgroundColor: `${Theme.colors.primary}0D`, padding: 20, borderRadius: Theme.borderRadius.xl, borderWidth: 1, borderColor: `${Theme.colors.primary}33` },
  premiumRow: { flexDirection: 'row', alignItems: 'flex-start' },
  premiumTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a', marginBottom: 4 },
  premiumDesc: { fontSize: 14, color: '#475569', lineHeight: 22 },
});
