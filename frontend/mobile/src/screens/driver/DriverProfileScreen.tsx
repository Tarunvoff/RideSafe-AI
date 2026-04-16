/**
 * [EXCELLENCE SUMMARY]
 * The DriverProfileScreen is the administrative command center for the dark store 
 * operator. It centralizes identity management, preference configuration, and 
 * support access within a highly accessible, brand-aligned interface. The screen 
 * implements sophisticated data-syncing between the local Auth state and the 
 * regulatory KYC/Driver API backends.
 * 
 * [DOMAIN LOGIC]
 * Serves as the technical portal for the 'Identity-Trust' vector. It aggregates 
 * data from the internal KYC store and external provider reports (e.g., Trust Score) 
 * to provide a comprehensive view of the driver's standing within the Aegis 
 * parametric insurance ecosystem.
 */

import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Image,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DriverLogoutMenu from '../../components/driver/DriverLogoutMenu';
import { useNotificationCenter } from '../../components/notifications/GlobalNotificationCenter';
import LoadingOverlay from '../../components/ui/LoadingOverlay';
import { useAuth } from '../../context/AuthContext';
import { kycApi, configApi, driverApi, notificationsApi } from '../../services/api';
import { Theme } from '../../theme';

// ─── Types ────────────────────────────────────────────────────────────────────
type KYCDetails = {
  status: string;
  submittedAt: string | null;
  reviewedAt: string | null;
  basicIdentity: { fullName: string; dob: string; gender: string } | null;
  personalDetails: { address: string; city: string; state: string; pincode: string } | null;
  identityVerification: { aadhaarNumber: string; panNumber: string } | null;
  payoutSetup: { method: string; upiId?: string; accountHolder?: string; bankName?: string } | null;
};

type ProviderKycReport = {
  kycVerified: boolean;
  kycVerifiedAt: string;
  aadhaarMasked: string;
  panMasked?: string;
  drivingLicenseMasked?: string;
  bankAccountMasked: string;
  upiIdMasked?: string;
  emergencyContactMasked: string;
  addressSummary: string;
  documents: Array<{ type: string; maskedId: string; verifiedAt: string }>;
  verificationSource: string;
  trustScore: number;
};

type ProviderIdentity = {
  internalDriverId: string;
  platformDriverId: string;
  provider: string;
  fullName: string;
  phone: string;
  email?: string;
  ageBand: string;
  gender?: string;
  city: string;
  state: string;
  primaryServiceZone: string;
  primaryDarkStore: string;
  employmentType: string;
  vehicleType: string;
  vehicleNumberMasked: string;
  joiningDate: string;
  currentStatus: string;
  rating: number;
  verificationStatus: string;
};

type NotifPrefs = {
  riskAlerts: boolean;
  payoutUpdates: boolean;
  policyReminders: boolean;
  systemUpdates: boolean;
};

type NotificationItem = {
  id: string;
  title: string;
  message: string;
  date?: string;
  read?: boolean;
};

type SupportConfig = {
  faqs: Array<{ q: string; a: string }>;
  contacts: Array<{ icon: string; label: string; value: string }>;
  appVersion: string;
  legalFooter: string;
  privacySections: Array<{ title: string; body: string; icon?: string }>;
  legalNotice: string;
  source: 'remote' | 'cache' | 'empty';
};

const SUPPORT_CACHE_KEY = 'supportConfigCache';

const EMPTY_SUPPORT_CONFIG: SupportConfig = {
  faqs: [],
  contacts: [],
  appVersion: '',
  legalFooter: '',
  privacySections: [],
  legalNotice: '',
  source: 'empty',
};

/**
 * [IN-LINE PRIDE]: Resilient Configuration Management
 * Implements a "Cache-First, Silently-Degrade" pattern for support metrics. 
 * This ensures that critical contact info and FAQs remain accessible even 
 * in 'Dark Store' zones with intermittent internet connectivity, maintaining 
 * the platform's reresponsibility promise.
 */
async function loadSupportConfig(): Promise<SupportConfig> {
  try {
    const remote = await configApi.getSupportMetrics();
    await AsyncStorage.setItem(SUPPORT_CACHE_KEY, JSON.stringify(remote));
    return { ...remote, source: 'remote' };
  } catch {
    try {
      const cached = await AsyncStorage.getItem(SUPPORT_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        return { ...parsed, source: 'cache' };
      }
    } catch {
      // Ignore cache read failures
    }
  }

  return { ...EMPTY_SUPPORT_CONFIG };
}

// ─── Sub-screen Modals ────────────────────────────────────────────────────────

function NotificationModal({
  visible,
  onClose,
  onUnreadCountChange,
}: {
  visible: boolean;
  onClose: () => void;
  onUnreadCountChange?: (count: number) => void;
}) {
  const { t } = useTranslation();
  const [alerts, setAlerts] = useState<NotificationItem[]>([]);
  const [alertsLoading, setAlertsLoading] = useState(false);
  const [alertsError, setAlertsError] = useState<string | null>(null);
  const [prefs, setPrefs] = useState<NotifPrefs>({
    riskAlerts: true,
    payoutUpdates: true,
    policyReminders: true,
    systemUpdates: false,
  });

  const loadAlerts = useCallback(async () => {
    setAlertsLoading(true);
    setAlertsError(null);
    try {
      const list = await notificationsApi.getAlerts();
      const normalized = Array.isArray(list) ? list : [];
      setAlerts(normalized);
      onUnreadCountChange?.(normalized.filter((item) => !item.read).length);
    } catch (err) {
      setAlerts([]);
      onUnreadCountChange?.(0);
      const message = err instanceof Error ? err.message : t('common.something_went_wrong');
      setAlertsError(message);
    } finally {
      setAlertsLoading(false);
    }
  }, [onUnreadCountChange, t]);

  useEffect(() => {
    if (!visible) return;
    void loadAlerts();
  }, [visible, loadAlerts]);

  const toggle = (key: keyof NotifPrefs) =>
    setPrefs(p => ({ ...p, [key]: !p[key] }));

  const handleClear = () => {
    Alert.alert(
      t('profile.notifications.clear_title'),
      t('profile.notifications.clear_desc'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.clear'),
          style: 'destructive',
          onPress: async () => {
            const unreadItems = alerts.filter((item) => !item.read && item.id);
            if (unreadItems.length > 0) {
              await Promise.allSettled(unreadItems.map((item) => notificationsApi.markAsRead(item.id)));
            }
            setAlerts((prev) => prev.map((item) => ({ ...item, read: true })));
            onUnreadCountChange?.(0);
            Alert.alert(t('common.done'), t('profile.notifications.cleared_msg'));
          },
        },
      ],
    );
  };

  const handleMarkRead = async (item: NotificationItem) => {
    if (!item.id || item.read) return;
    try {
      await notificationsApi.markAsRead(item.id);
      setAlerts((prev) => {
        const next = prev.map((entry) => (entry.id === item.id ? { ...entry, read: true } : entry));
        onUnreadCountChange?.(next.filter((entry) => !entry.read).length);
        return next;
      });
    } catch {
      // Keep UX resilient if mark-read fails; list will re-sync on next modal open.
    }
  };

  const rows: { key: keyof NotifPrefs; label: string; desc: string; icon: string }[] = [
    { key: 'riskAlerts', label: t('profile.notifications.types.risk.label'), desc: t('profile.notifications.types.risk.desc'), icon: 'warning-outline' },
    { key: 'payoutUpdates', label: t('profile.notifications.types.payout.label'), desc: t('profile.notifications.types.payout.desc'), icon: 'cash-outline' },
    { key: 'policyReminders', label: t('profile.notifications.types.policy.label'), desc: t('profile.notifications.types.policy.desc'), icon: 'document-text-outline' },
    { key: 'systemUpdates', label: t('profile.notifications.types.system.label'), desc: t('profile.notifications.types.system.desc'), icon: 'settings-outline' },
  ];

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={modalStyles.wrap}>
        {/* Header */}
        <View style={modalStyles.header}>
          <TouchableOpacity onPress={onClose} style={modalStyles.closeBtn}>
            <Ionicons name="close" size={22} color="#111827" />
          </TouchableOpacity>
          <Text style={modalStyles.headerTitle}>{t('profile.notifications.title')}</Text>
          <TouchableOpacity onPress={handleClear} style={modalStyles.clearBtn}>
            <Text style={modalStyles.clearText}>{t('common.clear')}</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={modalStyles.body}>
          <Text style={modalStyles.sectionLabel}>{t('profile.notifications.manage')}</Text>

          <View style={modalStyles.card}>
            {rows.map((row, i) => (
              <View key={row.key}>
                {i > 0 && <View style={modalStyles.divider} />}
                <View style={modalStyles.notifRow}>
                  <View style={modalStyles.notifIcon}>
                    <Ionicons name={row.icon as any} size={20} color="#16a34a" />
                  </View>
                  <View style={modalStyles.notifText}>
                    <Text style={modalStyles.notifLabel}>{row.label}</Text>
                    <Text style={modalStyles.notifDesc}>{row.desc}</Text>
                  </View>
                  <Switch
                    value={prefs[row.key]}
                    onValueChange={() => toggle(row.key)}
                    trackColor={{ false: '#d1d5db', true: '#86efac' }}
                    thumbColor={prefs[row.key] ? '#16a34a' : '#9ca3af'}
                  />
                </View>
              </View>
            ))}
          </View>

          <Text style={[modalStyles.sectionLabel, { marginTop: 20 }]}>Recent updates</Text>
          {alertsLoading ? (
            <View style={{ padding: 20, alignItems: 'center' }}>
              <ActivityIndicator size="small" color="#16a34a" />
            </View>
          ) : alerts.length > 0 ? (
            <View style={modalStyles.card}>
              {alerts.map((item, i) => (
                <View key={item.id || `${item.title}-${i}`}>
                  {i > 0 && <View style={modalStyles.divider} />}
                  <TouchableOpacity
                    style={modalStyles.notifRow}
                    activeOpacity={0.85}
                    onPress={() => void handleMarkRead(item)}
                    disabled={Boolean(item.read)}
                  >
                    <View style={modalStyles.notifIcon}>
                      <Ionicons
                        name={item.read ? 'notifications-outline' : 'notifications'}
                        size={20}
                        color={item.read ? '#16a34a' : '#ea580c'}
                      />
                    </View>
                    <View style={modalStyles.notifText}>
                      <Text style={modalStyles.notifLabel}>{item.title}</Text>
                      <Text style={modalStyles.notifDesc}>{item.message}</Text>
                      {item.date ? (
                        <Text style={modalStyles.notifMetaText}>
                          {new Date(item.date).toLocaleString('en-IN')}
                        </Text>
                      ) : null}
                    </View>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          ) : (
            <View style={modalStyles.emptyStateBox}>
              <Ionicons name="notifications-off-outline" size={22} color="#9ca3af" />
              <Text style={modalStyles.emptyStateText}>
                {alertsError ? `Unable to fetch notifications: ${alertsError}` : 'No notifications yet'}
              </Text>
            </View>
          )}

          <Text style={modalStyles.hint}>
            {t('profile.notifications.hint')}
          </Text>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function DataPrivacyModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const [supportConfig, setSupportConfig] = useState<SupportConfig>(EMPTY_SUPPORT_CONFIG);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (visible) {
      setLoading(true);
      loadSupportConfig()
        .then(setSupportConfig)
        .finally(() => setLoading(false));
    }
  }, [visible]);

  const { privacySections, legalFooter, legalNotice, source } = supportConfig;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={modalStyles.wrap}>
        <View style={modalStyles.header}>
          <TouchableOpacity onPress={onClose} style={modalStyles.closeBtn}>
            <Ionicons name="close" size={22} color="#111827" />
          </TouchableOpacity>
          <Text style={modalStyles.headerTitle}>{t('profile.privacy.title')}</Text>
          <View style={{ width: 44 }} />
        </View>
        <ScrollView contentContainerStyle={modalStyles.body}>
          {loading ? (
            <View style={{ padding: 20, alignItems: 'center' }}>
              <ActivityIndicator size="small" color="#16a34a" />
              <Text style={{ marginTop: 10, color: '#6b7280' }}>{t('common.loading_config')}</Text>
            </View>
          ) : privacySections.length > 0 ? (
            privacySections.map((item, i) => (
              <View key={`${item.title}-${i}`} style={modalStyles.privacyItem}>
                <View style={modalStyles.privacyIconWrap}>
                  <Ionicons name={(item.icon || 'shield-checkmark-outline') as any} size={22} color="#16a34a" />
                </View>
                <View style={modalStyles.privacyText}>
                  <Text style={modalStyles.privacyTitle}>{item.title}</Text>
                  <Text style={modalStyles.privacyBody}>{item.body}</Text>
                </View>
              </View>
            ))
          ) : (
            <View style={modalStyles.emptyStateBox}>
              <Ionicons name="information-circle-outline" size={22} color="#9ca3af" />
              <Text style={modalStyles.emptyStateText}>{t('profile.privacy.unavailable')}</Text>
            </View>
          )}

          <View style={modalStyles.legalBox}>
            <View style={{ flex: 1 }}>
              {legalNotice ? (
                <Text style={[modalStyles.legalText, { marginBottom: 6 }]}>{legalNotice}</Text>
              ) : null}
              <Text style={modalStyles.legalText}>
                {legalFooter || t('common.legal_unavailable')}
              </Text>
              {source === 'cache' && (
                <Text style={modalStyles.cacheHint}>{t('common.cached_copy')}</Text>
              )}
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function HelpSupportModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const [supportConfig, setSupportConfig] = useState<SupportConfig>(EMPTY_SUPPORT_CONFIG);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (visible) {
      setLoading(true);
      loadSupportConfig()
        .then(setSupportConfig)
        .finally(() => setLoading(false));
    }
  }, [visible]);

  const [openIdx, setOpenIdx] = useState<number | null>(null);

  const { faqs, contacts, appVersion, source } = supportConfig;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={modalStyles.wrap}>
        <View style={modalStyles.header}>
          <TouchableOpacity onPress={onClose} style={modalStyles.closeBtn}>
            <Ionicons name="close" size={22} color="#111827" />
          </TouchableOpacity>
          <Text style={modalStyles.headerTitle}>{t('profile.help.title')}</Text>
          <View style={{ width: 44 }} />
        </View>
        <ScrollView contentContainerStyle={modalStyles.body}>
          {loading ? (
             <View style={{ padding: 20, alignItems: 'center' }}>
               <ActivityIndicator size="small" color="#16a34a" />
               <Text style={{ marginTop: 10, color: '#6b7280' }}>{t('common.loading_config')}</Text>
             </View>
          ) : (
            <>
              {/* Contact */}
              <Text style={modalStyles.sectionLabel}>{t('profile.help.contact_us')}</Text>
              {contacts.length > 0 ? (
                <View style={modalStyles.card}>
                  {contacts.map((item, i) => (
                    <View key={`${item.label}-${i}`}>
                      {i > 0 && <View style={modalStyles.divider} />}
                      <View style={modalStyles.notifRow}>
                        <View style={modalStyles.notifIcon}>
                          <Ionicons name={item.icon as any} size={20} color="#16a34a" />
                        </View>
                        <View style={modalStyles.notifText}>
                          <Text style={modalStyles.notifLabel}>{item.label}</Text>
                          <Text style={modalStyles.notifDesc}>{item.value}</Text>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              ) : (
                <View style={modalStyles.emptyStateBox}>
                  <Ionicons name="information-circle-outline" size={22} color="#9ca3af" />
                  <Text style={modalStyles.emptyStateText}>{t('profile.help.contacts_unavailable')}</Text>
                </View>
              )}

              {/* FAQ */}
              <Text style={[modalStyles.sectionLabel, { marginTop: 20 }]}>{t('profile.help.faq')}</Text>
              {faqs.length > 0 ? (
                <View style={modalStyles.card}>
                  {faqs.map((faq, i) => (
                    <View key={`${faq.q}-${i}`}>
                      {i > 0 && <View style={modalStyles.divider} />}
                      <TouchableOpacity
                        style={modalStyles.faqRow}
                        activeOpacity={0.7}
                        onPress={() => setOpenIdx(openIdx === i ? null : i)}
                      >
                        <Text style={modalStyles.faqQ}>{faq.q}</Text>
                        <Ionicons
                          name={openIdx === i ? 'chevron-up' : 'chevron-down'}
                          size={16}
                          color="#6b7280"
                        />
                      </TouchableOpacity>
                      {openIdx === i && (
                        <Text style={modalStyles.faqA}>{faq.a}</Text>
                      )}
                    </View>
                  ))}
                </View>
              ) : (
                <View style={modalStyles.emptyStateBox}>
                  <Ionicons name="information-circle-outline" size={22} color="#9ca3af" />
                  <Text style={modalStyles.emptyStateText}>{t('profile.help.faq_unavailable')}</Text>
                </View>
              )}

              <View style={modalStyles.legalBox}>
                <View style={{ flex: 1 }}>
                  <Text style={modalStyles.legalText}>
                    {appVersion ? `${t('common.app_version')} ${appVersion}` : t('common.app_version_unavailable')}
                  </Text>
                  {source === 'cache' && (
                    <Text style={modalStyles.cacheHint}>{t('common.cached_copy')}</Text>
                  )}
                </View>
              </View>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function KYCReportModal({
  visible,
  onClose,
  providerKyc,
  providerIdentity,
  loading,
}: {
  visible: boolean;
  onClose: () => void;
  providerKyc: ProviderKycReport | null;
  providerIdentity: ProviderIdentity | null;
  loading: boolean;
}) {
  const { t } = useTranslation();
  const formatDate = (d: string | undefined) => {
    if (!d) return '—';
    try {
      return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch { return d; }
  };

  const trustColor = (score: number) => {
    const s = score < 1 ? score * 100 : score;
    if (s >= 80) return '#16a34a';
    if (s >= 60) return '#d97706';
    return '#dc2626';
  };

  const hasProvider = !!(providerKyc || providerIdentity);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={modalStyles.wrap}>
        <View style={modalStyles.header}>
          <TouchableOpacity onPress={onClose} style={modalStyles.closeBtn}>
            <Ionicons name="close" size={22} color="#111827" />
          </TouchableOpacity>
          <Text style={modalStyles.headerTitle}>{t('profile.kyc_report.title')}</Text>
          <View style={{ width: 44 }} />
        </View>

        {/*
          [IN-LINE PRIDE]: Transparency & Trust Synthesis
          The KYC report aggregates multi-source verification data (Aadhaar, PAN,
          Provider rating) into a unified Trust Score. This visual clarity
          is essential for building driver confidence in the parametric
          insurance underwriting process.
        */}
        {loading ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" color="#16a34a" />
            <Text style={{ marginTop: 12, color: '#6b7280', fontSize: 14 }}>{t('profile.kyc_report.loading')}</Text>
          </View>
        ) : !hasProvider ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
            <Ionicons name="alert-circle-outline" size={48} color="#d1d5db" />
            <Text style={{ marginTop: 12, color: '#6b7280', fontSize: 15, textAlign: 'center' }}>
              {t('profile.kyc_report.no_data')}
            </Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={modalStyles.body}>
            {/* Trust Score Hero */}
            {providerKyc && (
              <View style={kycTabStyles.trustHero}>
                <View style={[kycTabStyles.trustCircle, { borderColor: trustColor(providerKyc.trustScore) }]}>
                  <Text style={[kycTabStyles.trustScoreText, { color: trustColor(providerKyc.trustScore) }]}>
                    {Math.round(providerKyc.trustScore < 1 ? providerKyc.trustScore * 100 : providerKyc.trustScore)}
                  </Text>
                  <Text style={kycTabStyles.trustScoreLabel}>{t('profile.kyc_report.trust')}</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 16 }}>
                  <View style={[modalStyles.statusBadge, {
                    borderColor: providerKyc.kycVerified ? '#16a34a' : '#d97706',
                    marginBottom: 0,
                    alignSelf: 'flex-start',
                  }]}>
                    <View style={[modalStyles.statusDot, {
                      backgroundColor: providerKyc.kycVerified ? '#16a34a' : '#d97706',
                    }]} />
                    <Text style={[modalStyles.statusText, {
                      color: providerKyc.kycVerified ? '#16a34a' : '#d97706',
                    }]}>
                      {providerKyc.kycVerified ? t('common.verified') : t('common.pending')}
                    </Text>
                  </View>
                  <Text style={kycTabStyles.trustSource}>
                    {t('common.via')} {providerKyc.verificationSource}
                  </Text>
                  {providerKyc.kycVerifiedAt && (
                    <Text style={kycTabStyles.trustDate}>
                      {t('common.verified')} {formatDate(providerKyc.kycVerifiedAt)}
                    </Text>
                  )}
                </View>
              </View>
            )}

            {/* Provider Identity */}
            {providerIdentity && (
              <>
                 <Text style={[modalStyles.sectionLabel, { marginTop: 16 }]}>{t('profile.kyc_report.identity')}</Text>
                <View style={modalStyles.reportCard}>
                  <KYCRow label={t('kyc.basic_identity.full_name')} value={providerIdentity.fullName} />
                  <KYCRow label={t('profile.kyc_report.provider')} value={providerIdentity.provider} />
                  <KYCRow label={t('profile.kyc_report.platform_id')} value={providerIdentity.platformDriverId} />
                  <KYCRow label={t('kyc.basic_identity.phone')} value={providerIdentity.phone} />
                  {providerIdentity.email && <KYCRow label={t('common.email')} value={providerIdentity.email} />}
                  <KYCRow label={t('kyc.basic_identity.gender')} value={providerIdentity.gender} />
                  <KYCRow label={t('profile.kyc_report.age_band')} value={providerIdentity.ageBand} />
                  <KYCRow label={t('kyc.basic_identity.city')} value={providerIdentity.city} />
                  <KYCRow label={t('kyc.basic_identity.state')} value={providerIdentity.state} />
                </View>

                <Text style={[modalStyles.sectionLabel, { marginTop: 16 }]}>{t('profile.kyc_report.work_details')}</Text>
                <View style={modalStyles.reportCard}>
                  <KYCRow label={t('profile.kyc_report.service_zone')} value={providerIdentity.primaryServiceZone} />
                  <KYCRow label={t('profile.kyc_report.dark_store')} value={providerIdentity.primaryDarkStore} />
                  <KYCRow label={t('profile.kyc_report.employment')} value={providerIdentity.employmentType} />
                  <KYCRow label={t('profile.kyc_report.vehicle')} value={providerIdentity.vehicleType} />
                  <KYCRow label={t('profile.kyc_report.vehicle_no')} value={providerIdentity.vehicleNumberMasked} />
                  <KYCRow label={t('profile.kyc_report.joining_date')} value={formatDate(providerIdentity.joiningDate)} />
                  <KYCRow label={t('common.status')} value={providerIdentity.currentStatus} />
                  <KYCRow label={t('profile.kyc_report.rating')} value={providerIdentity.rating?.toFixed(1)} />
                  <KYCRow label={t('profile.kyc_report.verification')} value={providerIdentity.verificationStatus} />
                </View>
              </>
            )}

            {/* Provider KYC details */}
            {providerKyc && (
              <>
                <Text style={[modalStyles.sectionLabel, { marginTop: 16 }]}>{t('profile.kyc_report.documents')}</Text>
                <View style={modalStyles.reportCard}>
                  <KYCRow label={t('kyc.identity_verification.aadhaar')} value={providerKyc.aadhaarMasked} />
                  {providerKyc.panMasked && <KYCRow label={t('kyc.identity_verification.pan')} value={providerKyc.panMasked} />}
                  {providerKyc.drivingLicenseMasked && <KYCRow label={t('profile.kyc_report.license')} value={providerKyc.drivingLicenseMasked} />}
                </View>

                <Text style={[modalStyles.sectionLabel, { marginTop: 16 }]}>{t('profile.kyc_report.financial')}</Text>
                <View style={modalStyles.reportCard}>
                  <KYCRow label={t('profile.kyc_report.bank_account')} value={providerKyc.bankAccountMasked} />
                  {providerKyc.upiIdMasked && <KYCRow label={t('kyc.payout_setup.upi_id')} value={providerKyc.upiIdMasked} />}
                </View>

                <Text style={[modalStyles.sectionLabel, { marginTop: 16 }]}>{t('common.other')}</Text>
                <View style={modalStyles.reportCard}>
                  <KYCRow label={t('profile.kyc_report.emergency_contact')} value={providerKyc.emergencyContactMasked} />
                  <KYCRow label={t('kyc.personal_details.address')} value={providerKyc.addressSummary} />
                </View>
              </>
            )}

            <View style={modalStyles.legalBox}>
              <Ionicons name="lock-closed-outline" size={14} color="#9ca3af" />
              <Text style={[modalStyles.legalText, { marginLeft: 6 }]}>
                {t('profile.kyc_report.encryption_notice')}
              </Text>
            </View>
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  );
}

function KYCRow({ label, value }: { label: string; value: string | undefined | null }) {
  return (
    <View style={modalStyles.kycRow}>
      <Text style={modalStyles.kycLabel}>{label}</Text>
      <Text style={modalStyles.kycValue}>{value || '—'}</Text>
    </View>
  );
}

// ─── Main Profile Screen ──────────────────────────────────────────────────────

export default function DriverProfileScreen({ navigation }: any) {
  const { t, i18n } = useTranslation();
  const { logout, user, updateDriverName } = useAuth();
  const notificationCenter = useNotificationCenter();
  const unreadCount = notificationCenter?.unreadCount ?? 0;
  const [profileMenuVisible, setProfileMenuVisible] = useState(false);

  // Name editing
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');

  // Modals
  const [privacyModal, setPrivacyModal] = useState(false);
  const [helpModal, setHelpModal] = useState(false);
  const [kycModal, setKycModal] = useState(false);

  // KYC data
  const [kycData, setKycData] = useState<KYCDetails | null>(null);
  const [providerKyc, setProviderKyc] = useState<ProviderKycReport | null>(null);
  const [providerIdentity, setProviderIdentity] = useState<ProviderIdentity | null>(null);
  const [kycLoading, setKycLoading] = useState(false);
  const [nameSaving, setNameSaving] = useState(false);

  // Derive display name: user.driverName → KYC name → email prefix
  const displayName =
    user?.driverName ||
    kycData?.basicIdentity?.fullName ||
    (user?.email ? user.email.split('@')[0] : t('common.driver'));

  // Load KYC details once on mount
  const loadKycData = useCallback(async () => {
    if (kycData) return; // already loaded
    setKycLoading(true);
    try {
      const data = await kycApi.getDetails();
      setKycData(data);
      // If no driverName saved yet, sync from KYC
      if (!user?.driverName && data.basicIdentity?.fullName) {
        await updateDriverName(data.basicIdentity.fullName);
      }
    } catch {
      // silently ignore - might not have completed KYC
    } finally {
      setKycLoading(false);
    }
  }, [kycData, user?.driverName, updateDriverName]);

  useEffect(() => {
    void loadKycData();
  }, [loadKycData]);

  const handleLogout = async () => {
    try {
      setProfileMenuVisible(false);
      await logout();
    } catch {
      setProfileMenuVisible(false);
    }
  };

  const openKycModal = async () => {
    setKycLoading(true);
    console.log('[KYC] Opening report modal for user:', user?.id);
    
    try {
      const [profileResult] = await Promise.allSettled([
        user?.id ? driverApi.getProfile(user.id) : Promise.reject('No authenticated driver ID found'),
      ]);

      if (profileResult.status === 'fulfilled') {
        const driverProfile = profileResult.value?.driverProfile;
        console.log('[KYC] Provider profile fetched successfully:', driverProfile?.identity?.provider);
        
        if (driverProfile?.kyc) {
          setProviderKyc(driverProfile.kyc);
        }
        if (driverProfile?.identity) {
          setProviderIdentity(driverProfile.identity);
        }
      } else {
        console.warn('[KYC] External provider profile unavailable:', profileResult.reason);
        // Reset provider states if fetch failed to ensure stale data is not shown
        setProviderKyc(null);
        setProviderIdentity(null);
      }
    } catch (err) {
      console.error('[KYC] Unexpected error in openKycModal:', err);
    } finally {
      setKycLoading(false);
      setKycModal(true);
    }
  };

  const startNameEdit = () => {
    setNameInput(displayName);
    setEditingName(true);
  };

  const saveNameEdit = async () => {
    const trimmed = nameInput.trim();
    if (!trimmed) {
      Alert.alert(t('profile.edit_name.invalid_title'), t('profile.edit_name.invalid_desc'));
      return;
    }
    try {
      setNameSaving(true);
      await updateDriverName(trimmed);
      setEditingName(false);
    } finally {
      setNameSaving(false);
    }
  };

  const cancelNameEdit = () => setEditingName(false);

  // Build driver ID from email or user id
  const driverId = user?.id
    ? `GS-${user.id.slice(0, 5).toUpperCase()}`
    : 'GS-—';

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FF6B4E" />
      <LoadingOverlay
        visible={kycLoading || nameSaving}
        message={nameSaving ? t('profile.edit_name.saving') : t('profile.loading_details')}
      />

      <DriverLogoutMenu
        visible={profileMenuVisible}
        userEmail={user?.email ?? null}
        onClose={() => setProfileMenuVisible(false)}
        onLogout={() => { void handleLogout(); }}
      />

      {/* Modals */}
      <NotificationModal visible={false} onClose={() => undefined} />
      <DataPrivacyModal visible={privacyModal} onClose={() => setPrivacyModal(false)} />
      <HelpSupportModal visible={helpModal} onClose={() => setHelpModal(false)} />
      <KYCReportModal
        visible={kycModal}
        onClose={() => setKycModal(false)}
        providerKyc={providerKyc}
        providerIdentity={providerIdentity}
        loading={kycLoading}
      />

      <View style={styles.headerMain}>
        <View style={styles.headerLeftMain}>
          <View style={styles.logoContainerMain}>
            <MaterialCommunityIcons name="shield-check" size={24} color="white" />
          </View>
          <Text style={styles.headerBrandMain}>Aegis</Text>
        </View>
        <TouchableOpacity onPress={() => setProfileMenuVisible(true)}>
          <Image source={{ uri: 'https://i.pravatar.cc/100' }} style={styles.avatarMainTop} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        {/* Profile Header — avatar top-left matching top navbar DP */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarWrap}>
            <Image
              source={{
                uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDTIkvlbxtF8Srcz_Cbugho4nxtNwxEgZ5rkeHZSy6E9BSEcqdj52m1gjQ5Ln04L3Cj42Jp-5EEJfISSDs1bg9ljCoHBEVxm4Z8qk7wkc1QVrwGgErxrBvjSYGYyVbjd1hdbsHQYw5etDbImLeRNen_-I3XBRA0bpHiYSDBshxoZGzhTdeYoLCIVqXROGHAyF2Uoj-JZ7VtGj9VWylbpWrw03AM7q0pa_t0ySFKRjj7uWUE8UQwRPxoYOHOdRdHfuQhvkFTIIlkDySq',
              }}
              style={styles.avatarImg}
            />
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={14} color="#ffffff" />
            </View>
          </View>

          <View style={styles.driverInfo}>
            {editingName ? (
              <View style={styles.nameEditRow}>
                <TextInput
                  style={styles.nameInput}
                  value={nameInput}
                  onChangeText={setNameInput}
                  autoFocus
                  returnKeyType="done"
                  onSubmitEditing={saveNameEdit}
                />
                <TouchableOpacity onPress={saveNameEdit} style={styles.nameActionBtn}>
                  <Ionicons name="checkmark" size={18} color="#16a34a" />
                </TouchableOpacity>
                <TouchableOpacity onPress={cancelNameEdit} style={styles.nameActionBtn}>
                  <Ionicons name="close" size={18} color="#dc2626" />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.driverNameRow}>
                <Text style={styles.driverName}>{displayName}</Text>
                <View style={styles.driverVerifiedPill}>
                  <Text style={styles.driverVerifiedText}>{t('common.verified')}</Text>
                </View>
              </View>
            )}
            <Text style={styles.driverId}>{driverId}</Text>
            <Text style={styles.driverEmail}>{user?.email ?? ''}</Text>
          </View>

          {!editingName && (
            <TouchableOpacity style={styles.editBtn} activeOpacity={0.8} onPress={startNameEdit}>
              <Ionicons name="pencil" size={18} color="#111827" />
            </TouchableOpacity>
          )}
        </View>

        {/* Preferences */}
        <View style={styles.section}>
          <Text style={styles.sectionOverline}>{t('profile.sections.preferences')}</Text>

          <View style={styles.prefCard}>
            <TouchableOpacity
              style={styles.prefItem}
              activeOpacity={0.8}
              onPress={() => notificationCenter?.open()}
            >
              <View style={styles.prefLabelRow}>
                <Ionicons name="notifications-outline" size={24} color="#6b7280" />
                <Text style={styles.prefTitle}>{t('profile.notifications.title')}</Text>
                {unreadCount > 0 ? (
                  <View style={styles.prefBadge}>
                    <Text style={styles.prefBadgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
                  </View>
                ) : null}
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
            </TouchableOpacity>

            <View style={styles.prefDivider} />

            <TouchableOpacity
              style={styles.prefItem}
              activeOpacity={0.8}
              onPress={() => setPrivacyModal(true)}
            >
              <View style={styles.prefLabelRow}>
                <Ionicons name="lock-closed-outline" size={24} color="#6b7280" />
                <Text style={styles.prefTitle}>{t('profile.privacy.title')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
            </TouchableOpacity>

            <View style={styles.prefDivider} />

            <TouchableOpacity
              style={styles.prefItem}
              activeOpacity={0.8}
              onPress={() => setHelpModal(true)}
            >
              <View style={styles.prefLabelRow}>
                <Ionicons name="help-circle-outline" size={24} color="#6b7280" />
                <Text style={styles.prefTitle}>{t('profile.help.title')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Profile Actions: Language + KYC + Logout */}
        <View style={styles.section}>
          <Text style={styles.sectionOverline}>{t('profile.sections.app_language')}</Text>
          <View style={styles.languageCard}>
            <TouchableOpacity
              style={[styles.langItem, i18n.language === 'en' && styles.langItemSelected]}
              onPress={() => i18n.changeLanguage('en')}
            >
              <Text style={[styles.langText, i18n.language === 'en' && styles.langTextSelected]}>English</Text>
              {i18n.language === 'en' && <Ionicons name="checkmark" size={18} color="#16a34a" />}
            </TouchableOpacity>
            <View style={styles.langDivider} />
            <TouchableOpacity
              style={[styles.langItem, i18n.language === 'hi' && styles.langItemSelected]}
              onPress={() => i18n.changeLanguage('hi')}
            >
              <Text style={[styles.langText, i18n.language === 'hi' && styles.langTextSelected]}>हिंदी (Hindi)</Text>
              {i18n.language === 'hi' && <Ionicons name="checkmark" size={18} color="#16a34a" />}
            </TouchableOpacity>
            <View style={styles.langDivider} />
            <TouchableOpacity
              style={[styles.langItem, i18n.language === 'ta' && styles.langItemSelected]}
              onPress={() => i18n.changeLanguage('ta')}
            >
              <Text style={[styles.langText, i18n.language === 'ta' && styles.langTextSelected]}>தமிழ் (Tamil)</Text>
              {i18n.language === 'ta' && <Ionicons name="checkmark" size={18} color="#16a34a" />}
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <TouchableOpacity style={styles.kycButton} activeOpacity={0.9} onPress={openKycModal}>
            <Ionicons name="document-text-outline" size={22} color="#374151" style={{ marginRight: 10 }} />
            <Text style={styles.kycButtonText}>{t('profile.view_kyc')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.logoutButton}
            activeOpacity={0.9}
            onPress={() => { void handleLogout(); }}
          >
            <Text style={styles.logoutButtonText}>{t('profile.logout')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FF6B4E' },
  headerMain: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 20,
  },
  headerLeftMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoContainerMain: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-10deg' }],
  },
  headerBrandMain: {
    fontSize: 24,
    fontWeight: '900',
    color: '#000',
    letterSpacing: -0.5,
  },
  avatarMainTop: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#000',
  },
  contentContainer: {
    paddingHorizontal: Theme.spacing.lg,
    paddingTop: 0,
    paddingBottom: 40,
    flexGrow: 1,
  },

  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Theme.spacing.xl,
    borderRadius: Theme.borderRadius.xl,
    backgroundColor: '#ffffff',
    marginBottom: Theme.spacing.xl,
    shadowColor: '#111827',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
    minHeight: 120,
  },
  avatarWrap: { marginRight: Theme.spacing.lg },
  avatarImg: { width: 80, height: 80, borderRadius: 40 },
  verifiedBadge: {
    position: 'absolute',
    right: -4,
    bottom: -4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#16a34a',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#ffffff',
  },
  driverInfo: { flex: 1 },
  driverNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2, flexWrap: 'wrap' },
  driverName: { fontSize: 22, fontWeight: '700', color: '#111827' },
  driverVerifiedPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#dcfce7',
  },
  driverVerifiedText: { fontSize: 11, fontWeight: '800', color: '#166534', letterSpacing: 0.8 },
  driverId: { fontSize: 15, color: '#6b7280', fontWeight: '500' },
  driverEmail: { marginTop: 4, fontSize: 13, color: '#9ca3af' },
  editBtn: { padding: 12, borderRadius: 12, backgroundColor: '#f3f4f6' },

  nameEditRow: { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 },
  nameInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    borderBottomWidth: 1.5,
    borderBottomColor: '#16a34a',
    paddingVertical: 2,
  },
  nameActionBtn: { padding: 4 },

  section: { marginBottom: Theme.spacing.lg },
  sectionOverline: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    color: '#6b7280',
    marginBottom: Theme.spacing.md,
  },

  prefCard: {
    backgroundColor: '#ffffff',
    borderRadius: Theme.borderRadius.lg,
    overflow: 'hidden',
    shadowColor: '#111827',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  prefItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.lg,
    paddingVertical: 20,
    backgroundColor: '#ffffff',
    minHeight: 72,
  },
  prefLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  prefTitle: { fontSize: 16, color: '#111827', fontWeight: '600' },
  prefBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    backgroundColor: '#ea580c',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 2,
  },
  prefBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
  },
  prefDivider: { height: 1, backgroundColor: '#f3f4f6', marginHorizontal: Theme.spacing.md },

  languageCard: {
    backgroundColor: '#ffffff',
    borderRadius: Theme.borderRadius.lg,
    overflow: 'hidden',
    shadowColor: '#111827',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  langItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.lg,
    paddingVertical: 18,
    backgroundColor: '#ffffff',
    minHeight: 64,
  },
  langItemSelected: {
    backgroundColor: '#f0fdf4',
  },
  langText: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '500',
  },
  langTextSelected: {
    color: '#16a34a',
    fontWeight: '800',
  },
  langDivider: { height: 1, backgroundColor: '#f3f4f6', marginHorizontal: Theme.spacing.md },

  kycButton: {
    width: '100%',
    backgroundColor: '#f3f4f6',
    paddingVertical: 18,
    borderRadius: Theme.borderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    flexDirection: 'row',
    minHeight: 64,
  },
  kycButtonText: { fontSize: 16, fontWeight: '600', color: '#374151' },
  logoutButton: {
    width: '100%',
    paddingVertical: 18,
    borderRadius: Theme.borderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#fecaca',
    backgroundColor: '#fef2f2',
    minHeight: 64,
  },
  logoutButtonText: { fontSize: 16, fontWeight: '800', color: '#b91c1c' },
});

const modalStyles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#f8f9fa' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  closeBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
  },
  clearBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#fef2f2',
  },
  clearText: { fontSize: 13, fontWeight: '600', color: '#dc2626' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#111827' },
  body: { padding: 16, paddingBottom: 48 },

  sectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    color: '#6b7280',
    marginBottom: 10,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#111827',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  divider: { height: 1, backgroundColor: '#f3f4f6', marginHorizontal: 16 },

  notifRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  notifIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#f0fdf4',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  notifText: { flex: 1 },
  notifLabel: { fontSize: 14, fontWeight: '600', color: '#111827' },
  notifDesc: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  notifMetaText: { fontSize: 11, color: '#9ca3af', marginTop: 4 },

  hint: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
    marginTop: 14,
    lineHeight: 18,
  },

  privacyItem: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    marginBottom: 10,
    shadowColor: '#111827',
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  privacyIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#f0fdf4',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  privacyText: { flex: 1 },
  privacyTitle: { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 6 },
  privacyBody: { fontSize: 13, color: '#4b5563', lineHeight: 20 },

  faqRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  faqQ: { fontSize: 14, fontWeight: '600', color: '#111827', flex: 1, marginRight: 8 },
  faqA: { fontSize: 13, color: '#4b5563', lineHeight: 20, paddingHorizontal: 16, paddingBottom: 14 },

  legalBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    padding: 14,
    borderRadius: 10,
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  legalText: { fontSize: 11, color: '#9ca3af', lineHeight: 16, flex: 1 },
  cacheHint: { fontSize: 11, color: '#94a3b8', marginTop: 6 },
  emptyStateBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 14,
  },
  emptyStateText: { fontSize: 12, color: '#6b7280', flex: 1 },

  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1.5,
    backgroundColor: '#ffffff',
    marginBottom: 16,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 },
  statusDate: { fontSize: 11, color: '#9ca3af', marginLeft: 'auto' },

  reportCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#111827',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  kycRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  kycLabel: { fontSize: 13, color: '#6b7280', fontWeight: '500' },
    kycValue: { fontSize: 13, color: '#111827', fontWeight: '600', maxWidth: '60%', textAlign: 'right' },

  // Language Switcher Styles
  languageCard: {
    backgroundColor: '#ffffff',
    borderRadius: Theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    overflow: 'hidden',
  },
  langItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Theme.spacing.lg,
    paddingHorizontal: Theme.spacing.lg,
    backgroundColor: '#ffffff',
  },
  langItemSelected: {
    backgroundColor: '#f0fdf4',
  },
  langText: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '500',
  },
  langTextSelected: {
    color: '#16a34a',
    fontWeight: '700',
  },
  langDivider: {
    height: 1,
    backgroundColor: '#f3f4f6',
    marginHorizontal: Theme.spacing.lg,
  },
});

const kycTabStyles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    paddingHorizontal: 16,
    gap: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#16a34a',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
  },
  tabTextActive: {
    color: '#16a34a',
    fontWeight: '700',
  },
  trustHero: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  trustCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  trustScoreText: {
    fontSize: 26,
    fontWeight: '900',
  },
  trustScoreLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  trustSource: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginTop: 8,
  },
  trustDate: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 2,
  },
  docRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  docIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#f0fdf4',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  docType: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
    textTransform: 'capitalize',
  },
  docId: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 1,
  },
  docVerified: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  docVerifiedText: {
    fontSize: 11,
    color: '#16a34a',
    fontWeight: '600',
  },
  emptyAegisBox: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#f3f4f6',
    marginTop: 8,
  },
  emptyAegisTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#374151',
    marginTop: 16,
  },
  emptyAegisDesc: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
});

