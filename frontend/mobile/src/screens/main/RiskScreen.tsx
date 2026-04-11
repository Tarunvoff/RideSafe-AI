import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import LoadingOverlay from '../../components/LoadingOverlay';
import MainTopNavbar from '../../components/MainTopNavbar';
import { fraudApi, telemetryApi } from '../../services/api';
import { Theme } from '../../theme';
import { useAuth } from '../../context/AuthContext';
import { useLocation } from '../../context/LocationContext';
// react-native-svg removed — using pure RN ring

export default function RiskScreen({ navigation }: any) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { location, refreshLocation } = useLocation();
  const [zoneRisk, setZoneRisk] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const hasValidLocation = location.isValid && location.latitude != null && location.longitude != null;

  const loadRisk = useCallback(async () => {
    setLoading(true);
    try {
      if (!user?.id) return;
      if (!hasValidLocation) {
        setZoneRisk(null);
        return;
      }
      await telemetryApi.sendGps({
        driverId: user.id,
        lat: location.latitude as number,
        lng: location.longitude as number,
        platform: 'mobile-app',
      });
      const res = await fraudApi.getZoneRisk(location.latitude as number, location.longitude as number);
      setZoneRisk(res ?? null);
    } catch {
      setZoneRisk(null);
    } finally {
      setLoading(false);
    }
  }, [hasValidLocation, location.latitude, location.longitude, user?.id]);

  useEffect(() => {
    void loadRisk();
  }, [loadRisk]);

  // Prefer riskScore from new-format endpoints; fall back to legacy lf_score (zone-risk endpoint via Kafka)
  const riskScore = zoneRisk?.riskScore != null
    ? Number(zoneRisk.riskScore)
    : Math.round(Number(zoneRisk?.Lf ?? zoneRisk?.lf_score ?? 0) * 100);
  const locationBlocked = !hasValidLocation && !location.loading;
  const riskLabel = locationBlocked
    ? t('dashboard.loc_required_upper')
    : riskScore >= 70 ? t('dashboard.high_risk_upper') : riskScore >= 40 ? t('dashboard.mod_risk_upper') : t('dashboard.low_risk_upper');
  const weatherSafe = Math.max(0, 100 - Math.round(Number(zoneRisk?.rainfall ?? 0)));
  const densitySafe = Math.max(0, 100 - Math.round(Number(zoneRisk?.active_riders ?? 0)));
  const platformSafe = Math.max(0, 100 - Math.round(riskScore / 2));
  const premiumHint = Math.round((riskScore / 100) * 100) / 100;
  return (
    <SafeAreaView style={styles.safeArea}>
      <MainTopNavbar />
      <LoadingOverlay visible={loading} message={t('dashboard.analyzing_risk')} />

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {locationBlocked && (
          <View style={styles.locationNotice}>
            <Ionicons name="location-outline" size={18} color={Theme.colors.primary} />
            <Text style={styles.locationNoticeText}>{t('dashboard.enable_gps_risk')}</Text>
            <TouchableOpacity style={styles.locationNoticeBtn} onPress={() => void refreshLocation()}>
              <Ionicons name="refresh" size={14} color="#0f172a" />
              <Text style={styles.locationNoticeBtnText}>{t('common.recheck')}</Text>
            </TouchableOpacity>
          </View>
        )}
        {/* Hero Score Section */}
        <View style={styles.heroSection}>
          <View style={styles.scoreContainer}>
            {/* Outer decorative ring */}
            <View style={styles.ringOuter}>
              <View style={styles.ringInner}>
                <Text style={styles.scoreValue}>{riskScore}</Text>
                <Text style={styles.scoreLabel}>{t('dashboard.out_of_100')}</Text>
              </View>
            </View>
          </View>
          
          <View style={styles.riskBadge}>
            <Text style={styles.riskBadgeText}>{riskLabel}</Text>
          </View>

          <Text style={styles.heroDesc}>
            {t('dashboard.risk_hero_desc')}
          </Text>
        </View>

        {/* Factors Breakdown */}
        <View style={styles.factorsSection}>
          <Text style={styles.sectionTitle}>{t('dashboard.risk_factors_breakdown')}</Text>
          
          {/* Factor 1 */}
          <View style={styles.factorCard}>
            <View style={styles.factorHeader}>
              <View style={styles.factorTitleRow}>
                <Ionicons name="partly-sunny" size={20} color={Theme.colors.primary} />
                <Text style={styles.factorTitle}>{t('dashboard.historical_weather')}</Text>
              </View>
              <Text style={styles.factorScore}>{t('dashboard.safe_percentage', { percent: weatherSafe })}</Text>
            </View>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${weatherSafe}%` }]} />
            </View>
            <Text style={styles.factorDesc}>{t('dashboard.weather_desc')}</Text>
          </View>

          {/* Factor 2 */}
          <View style={styles.factorCard}>
            <View style={styles.factorHeader}>
              <View style={styles.factorTitleRow}>
                <Ionicons name="git-network-outline" size={20} color={Theme.colors.primary} />
                <Text style={styles.factorTitle}>{t('dashboard.zone_density')}</Text>
              </View>
              <Text style={styles.factorScore}>{t('dashboard.safe_percentage', { percent: densitySafe })}</Text>
            </View>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${densitySafe}%` }]} />
            </View>
            <Text style={styles.factorDesc}>{t('dashboard.density_desc')}</Text>
          </View>

          {/* Factor 3 */}
          <View style={styles.factorCard}>
            <View style={styles.factorHeader}>
              <View style={styles.factorTitleRow}>
                <Ionicons name="shield-checkmark" size={20} color={Theme.colors.primary} />
                <Text style={styles.factorTitle}>{t('dashboard.platform_reliability')}</Text>
              </View>
              <Text style={styles.factorScore}>{t('dashboard.safe_percentage', { percent: platformSafe })}</Text>
            </View>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${platformSafe}%` }]} />
            </View>
            <Text style={styles.factorDesc}>{t('dashboard.platform_desc')}</Text>
          </View>
        </View>

        {/* Premium Explanation */}
        <View style={styles.premiumSection}>
          <View style={styles.premiumBox}>
            <View style={styles.premiumRow}>
              <Ionicons name="cash-outline" size={24} color={Theme.colors.primary} style={{ marginTop: 2 }} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.premiumTitle}>{t('dashboard.impact_premium')}</Text>
                <Text style={styles.premiumDesc}>
                  {t('dashboard.premium_multiplier_desc', { score: riskScore, multiplier: premiumHint })}
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
  locationNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: Theme.spacing.lg,
    marginTop: 16,
    padding: 12,
    borderRadius: Theme.borderRadius.lg,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  locationNoticeText: { fontSize: 12, color: '#475569', flex: 1 },
  locationNoticeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#e2e8f0',
  },
  locationNoticeBtnText: { fontSize: 12, fontWeight: '700', color: '#0f172a' },
  
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
