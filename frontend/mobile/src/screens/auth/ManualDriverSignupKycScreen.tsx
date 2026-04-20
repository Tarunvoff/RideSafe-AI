import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import React, { useMemo, useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AegisNavbar from '../../components/layout/AegisNavbar';
import Button from '../../components/ui/Button';
import LoadingOverlay from '../../components/ui/LoadingOverlay';
import { useAuth } from '../../context/AuthContext';
import { manualAuthApi, manualKycApi } from '../../services/api';
import { Theme } from '../../theme';

type FormState = {
  fullName: string;
  email: string;
  city: string;
  vehicleType: string;
  platformLinked: 'yes' | 'no';
  platformId: string;
  panImageUrl: string;
  aadhaarFrontUrl: string;
  aadhaarBackUrl: string;
  dlImageUrl: string;
  accountNumber: string;
  ifscCode: string;
  passbookImageUrl: string;
};

const TOTAL_STEPS = 6;

export default function ManualDriverSignupKycScreen({ navigation, route }: any) {
  const { user, refreshKycStatus } = useAuth();
  const { phone: routePhone, verificationToken } = route?.params ?? {};
  const resolvedPhone = String(routePhone || user?.phone || '').trim();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [uploadingField, setUploadingField] = useState('');
  const [error, setError] = useState('');
  const [form, setForm] = useState<FormState>({
    fullName: '',
    email: '',
    city: '',
    vehicleType: '',
    platformLinked: 'no',
    platformId: '',
    panImageUrl: '',
    aadhaarFrontUrl: '',
    aadhaarBackUrl: '',
    dlImageUrl: '',
    accountNumber: '',
    ifscCode: '',
    passbookImageUrl: '',
  });

  const progressPct = useMemo(() => Math.round((step / TOTAL_STEPS) * 100), [step]);
  const safeText = (value: unknown) => String(value ?? '').trim();

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setError('');
  };

  const validateCurrentStep = () => {
    if (step === 1) {
      if (!safeText(form.fullName)) return 'Full name is required.';
      if (!safeText(form.city)) return 'City is required.';
      if (!safeText(form.vehicleType)) return 'Vehicle type is required.';
      if (form.platformLinked === 'yes' && !safeText(form.platformId)) return 'Platform ID is required when linked.';
    }

    if (step === 2 && !safeText(form.panImageUrl)) return 'PAN image upload is required.';
    if (step === 3 && (!safeText(form.aadhaarFrontUrl) || !safeText(form.aadhaarBackUrl))) {
      return 'Both Aadhaar front and back uploads are required.';
    }
    if (step === 4 && !safeText(form.dlImageUrl)) return 'Driving license upload is required.';
    if (step === 5) {
      const hasBankFields = safeText(form.accountNumber) && safeText(form.ifscCode);
      const hasImage = safeText(form.passbookImageUrl);
      if (!hasBankFields && !hasImage) {
        return 'Provide account+IFSC or upload a passbook/cancelled cheque image.';
      }
    }

    return '';
  };

  const nextStep = () => {
    const validationError = validateCurrentStep();
    if (validationError) {
      setError(validationError);
      return;
    }
    setStep(prev => Math.min(prev + 1, TOTAL_STEPS));
  };

  const previousStep = () => {
    setError('');
    setStep(prev => Math.max(prev - 1, 1));
  };

  const pickAndUploadImage = async (
    field: 'panImageUrl' | 'aadhaarFrontUrl' | 'aadhaarBackUrl' | 'dlImageUrl' | 'passbookImageUrl',
    type: 'pan' | 'aadhaar_front' | 'aadhaar_back' | 'dl' | 'bank_passbook',
  ) => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('Media library permission is required to upload documents.');
      return;
    }

    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (picked.canceled || !picked.assets?.[0]?.uri) return;

    setUploadingField(field);
    setError('');
    try {
      const uploaded = await manualKycApi.uploadDocument(picked.assets[0].uri, type, {
        onboardingToken: verificationToken,
      });
      update(field, uploaded.fileUrl);
    } catch (e: any) {
      setError(e?.message || 'Failed to upload image. Please retry.');
    } finally {
      setUploadingField('');
    }
  };

  const submitManualOnboarding = async () => {
    const validationError = validateCurrentStep();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const signup = await manualAuthApi.signupManual(
        {
          name: safeText(form.fullName),
          email: safeText(form.email) || undefined,
          phone: resolvedPhone || undefined,
          city: safeText(form.city),
          vehicleType: safeText(form.vehicleType),
          platformId: form.platformLinked === 'yes' ? safeText(form.platformId) : undefined,
        },
        { onboardingToken: verificationToken },
      );

      const userId = signup.userId;

      await manualKycApi.uploadPan({ userId, panImageUrl: safeText(form.panImageUrl) }, { onboardingToken: verificationToken });
      await manualKycApi.uploadAadhaar(
        {
          userId,
          aadhaarFrontUrl: safeText(form.aadhaarFrontUrl),
          aadhaarBackUrl: safeText(form.aadhaarBackUrl),
        },
        { onboardingToken: verificationToken },
      );
      await manualKycApi.uploadDl({ userId, dlImageUrl: safeText(form.dlImageUrl) }, { onboardingToken: verificationToken });
      await manualKycApi.uploadBank(
        {
          userId,
          bankDetails: {
            accountNumber: safeText(form.accountNumber) || undefined,
            ifscCode: safeText(form.ifscCode) || undefined,
            passbookOrChequeImageUrl: safeText(form.passbookImageUrl) || undefined,
          },
        },
        { onboardingToken: verificationToken },
      );
      await manualKycApi.submit(
        {
          userId,
          platformId: form.platformLinked === 'yes' ? safeText(form.platformId) : undefined,
        },
        { onboardingToken: verificationToken },
      );

      Alert.alert(
        'KYC submitted',
        'Your onboarding is complete. Your account will be activated after admin verification.',
        [{
          text: 'Continue',
          onPress: async () => {
            await refreshKycStatus();
            if (navigation.canGoBack()) navigation.goBack();
          },
        }],
      );
    } catch (e: any) {
      setError(e?.message || 'Submission failed. Please review details and retry.');
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = () => {
    if (step === 1) {
      return (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Driver Profile Initialization</Text>
          <InputRow label="Full Name" value={form.fullName} onChange={value => update('fullName', value)} placeholder="As per official documents" />
          <InputRow label="Email (optional)" value={form.email} onChange={value => update('email', value)} placeholder="name@example.com" keyboardType="email-address" />
          <InputRow label="Verified Mobile" value={resolvedPhone} onChange={() => {}} editable={false} />
          <InputRow label="City / Location" value={form.city} onChange={value => update('city', value)} placeholder="Mumbai" />
          <InputRow label="Vehicle Type" value={form.vehicleType} onChange={value => update('vehicleType', value)} placeholder="2-wheeler / 3-wheeler / EV" />

          <Text style={styles.fieldLabel}>Platform Association</Text>
          <View style={styles.toggleRow}>
            <ToggleChip title="Independent" selected={form.platformLinked === 'no'} onPress={() => update('platformLinked', 'no')} />
            <ToggleChip title="Linked with Partner" selected={form.platformLinked === 'yes'} onPress={() => update('platformLinked', 'yes')} />
          </View>

          {form.platformLinked === 'yes' ? (
            <InputRow
              label="Platform ID"
              value={form.platformId}
              onChange={value => update('platformId', value)}
              placeholder="Required for partner-linked onboarding"
            />
          ) : null}
        </View>
      );
    }

    if (step === 2) {
      return (
        <UploadSection
          title="PAN Card Upload"
          subtitle="Upload PAN card image with clear text visibility."
          url={form.panImageUrl}
          onPick={() => pickAndUploadImage('panImageUrl', 'pan')}
          loading={uploadingField === 'panImageUrl'}
        />
      );
    }

    if (step === 3) {
      return (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Aadhaar Upload</Text>
          <Text style={styles.sectionSubtitle}>Front and back images are mandatory. Raw Aadhaar numbers are not stored in this flow.</Text>
          <UploadField
            label="Aadhaar Front"
            value={form.aadhaarFrontUrl}
            onPick={() => pickAndUploadImage('aadhaarFrontUrl', 'aadhaar_front')}
            loading={uploadingField === 'aadhaarFrontUrl'}
          />
          <UploadField
            label="Aadhaar Back"
            value={form.aadhaarBackUrl}
            onPick={() => pickAndUploadImage('aadhaarBackUrl', 'aadhaar_back')}
            loading={uploadingField === 'aadhaarBackUrl'}
          />
        </View>
      );
    }

    if (step === 4) {
      return (
        <UploadSection
          title="Driving License Upload"
          subtitle="Upload DL image. Ensure number and expiry are readable."
          url={form.dlImageUrl}
          onPick={() => pickAndUploadImage('dlImageUrl', 'dl')}
          loading={uploadingField === 'dlImageUrl'}
        />
      );
    }

    if (step === 5) {
      return (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bank Details</Text>
          <Text style={styles.sectionSubtitle}>Provide account + IFSC, or upload passbook/cancelled cheque image URL.</Text>
          <InputRow
            label="Account Number"
            value={form.accountNumber}
            onChange={value => update('accountNumber', value)}
            keyboardType="number-pad"
          />
          <InputRow label="IFSC Code" value={form.ifscCode} onChange={value => update('ifscCode', value)} placeholder="HDFC0001234" />
          <UploadField
            label="Passbook / Cancelled Cheque"
            value={form.passbookImageUrl}
            onPick={() => pickAndUploadImage('passbookImageUrl', 'bank_passbook')}
            loading={uploadingField === 'passbookImageUrl'}
          />
        </View>
      );
    }

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Review & Submit</Text>
        <Text style={styles.sectionSubtitle}>Verify details before final submission. You can go back and edit any step.</Text>

        <SummaryRow label="Name" value={form.fullName} />
        <SummaryRow label="Email" value={form.email || 'Not provided'} />
        <SummaryRow label="Mobile" value={resolvedPhone} />
        <SummaryRow label="City" value={form.city} />
        <SummaryRow label="Vehicle" value={form.vehicleType} />
        <SummaryRow label="Platform Linked" value={form.platformLinked === 'yes' ? 'Yes' : 'No'} />
        {form.platformLinked === 'yes' ? <SummaryRow label="Platform ID" value={form.platformId} /> : null}
        <SummaryRow label="PAN" value={form.panImageUrl ? 'Uploaded' : 'Missing'} />
        <SummaryRow label="Aadhaar" value={form.aadhaarFrontUrl && form.aadhaarBackUrl ? 'Uploaded' : 'Missing'} />
        <SummaryRow label="Driving License" value={form.dlImageUrl ? 'Uploaded' : 'Missing'} />
        <SummaryRow
          label="Bank"
          value={form.accountNumber && form.ifscCode ? 'Account + IFSC added' : form.passbookImageUrl ? 'Passbook/Cheque uploaded' : 'Missing'}
        />
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <LoadingOverlay visible={loading} message="Submitting onboarding and KYC documents..." />
      <AegisNavbar onBack={() => navigation.goBack()} light />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressTitle}>Manual Driver Onboarding</Text>
          <Text style={styles.progressMeta}>Step {step} of {TOTAL_STEPS} • {progressPct}% complete</Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
          {renderStepContent()}
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </ScrollView>

        <View style={styles.footer}>
          {step > 1 ? (
            <TouchableOpacity style={styles.secondaryButton} onPress={previousStep}>
              <Text style={styles.secondaryButtonText}>Back</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.secondaryButtonPlaceholder} />
          )}

          {step < TOTAL_STEPS ? (
            <Button title="Next" onPress={nextStep} style={styles.primaryButton} />
          ) : (
            <Button title="Submit KYC" onPress={submitManualOnboarding} style={styles.primaryButton} />
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function InputRow({
  label,
  value,
  onChange,
  placeholder,
  keyboardType,
  editable = true,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'number-pad' | 'email-address';
  editable?: boolean;
}) {
  return (
    <View style={styles.inputWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[styles.input, !editable ? styles.inputReadonly : null]}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        keyboardType={keyboardType || 'default'}
        editable={editable}
      />
    </View>
  );
}

function UploadSection({
  title,
  subtitle,
  url,
  onPick,
  loading,
}: {
  title: string;
  subtitle: string;
  url: string;
  onPick: () => void;
  loading?: boolean;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionSubtitle}>{subtitle}</Text>
      <UploadField label="Document Image" value={url} onPick={onPick} loading={loading} />
    </View>
  );
}

function UploadField({
  label,
  value,
  onPick,
  loading,
}: {
  label: string;
  value: string;
  onPick: () => void;
  loading?: boolean;
}) {
  return (
    <View style={styles.inputWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TouchableOpacity style={styles.uploadButton} onPress={onPick} disabled={loading}>
        <Ionicons name="cloud-upload-outline" size={16} color="#000" />
        <Text style={styles.uploadButtonText}>{loading ? 'Uploading...' : value ? 'Re-upload Image' : 'Choose & Upload Image'}</Text>
      </TouchableOpacity>

      {value ? <Text style={styles.uploadedPathText} numberOfLines={1}>{value}</Text> : null}
      {value ? (
        <View style={styles.previewWrap}>
          <Image source={{ uri: value }} style={styles.previewImage} resizeMode="cover" />
          <Text style={styles.previewLabel}>Preview loaded from stored file.</Text>
        </View>
      ) : null}
    </View>
  );
}

function ToggleChip({
  title,
  selected,
  onPress,
}: {
  title: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={[styles.chip, selected ? styles.chipSelected : null]} onPress={onPress}>
      <Ionicons name={selected ? 'checkmark-circle' : 'ellipse-outline'} size={16} color={selected ? '#fff' : '#444'} />
      <Text style={[styles.chipText, selected ? styles.chipTextSelected : null]}>{title}</Text>
    </TouchableOpacity>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value || '-'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FF5C39',
  },
  container: {
    flex: 1,
  },
  progressHeader: {
    backgroundColor: '#EFEBDC',
    marginHorizontal: Theme.spacing.lg,
    marginTop: Theme.spacing.md,
    borderRadius: 16,
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.md,
  },
  progressTitle: {
    ...Theme.typography.h3,
    color: '#000',
  },
  progressMeta: {
    ...Theme.typography.caption,
    color: '#555',
    marginTop: 4,
    marginBottom: 8,
  },
  progressTrack: {
    height: 8,
    borderRadius: 99,
    backgroundColor: 'rgba(0, 0, 0, 0.12)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#111',
  },
  scrollContainer: {
    padding: Theme.spacing.lg,
    paddingBottom: 120,
  },
  section: {
    backgroundColor: '#EFEBDC',
    borderRadius: 18,
    padding: Theme.spacing.md,
  },
  sectionTitle: {
    ...Theme.typography.h3,
    color: '#000',
    marginBottom: 4,
  },
  sectionSubtitle: {
    ...Theme.typography.caption,
    color: '#444',
    marginBottom: Theme.spacing.md,
  },
  inputWrap: {
    marginBottom: 12,
  },
  fieldLabel: {
    ...Theme.typography.caption,
    color: '#222',
    fontWeight: '700',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.18)',
    borderRadius: 12,
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  inputReadonly: {
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.18)',
    borderRadius: 12,
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  uploadButtonText: {
    ...Theme.typography.caption,
    color: '#000',
    fontWeight: '700',
  },
  uploadedPathText: {
    ...Theme.typography.caption,
    marginTop: 8,
    color: '#555',
  },
  toggleRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.2)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#fff',
  },
  chipSelected: {
    backgroundColor: '#111',
    borderColor: '#111',
  },
  chipText: {
    ...Theme.typography.caption,
    color: '#333',
    fontWeight: '700',
  },
  chipTextSelected: {
    color: '#fff',
  },
  previewWrap: {
    marginTop: 8,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.12)',
    backgroundColor: '#fff',
  },
  previewImage: {
    width: '100%',
    height: 120,
    backgroundColor: '#ddd',
  },
  previewLabel: {
    ...Theme.typography.caption,
    padding: 8,
    color: '#555',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.2)',
  },
  summaryLabel: {
    ...Theme.typography.caption,
    color: '#444',
    fontWeight: '700',
  },
  summaryValue: {
    ...Theme.typography.caption,
    color: '#000',
    maxWidth: '60%',
    textAlign: 'right',
  },
  errorText: {
    marginTop: 12,
    color: Theme.colors.error,
    ...Theme.typography.caption,
    fontWeight: '700',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    backgroundColor: 'rgba(239, 235, 220, 0.96)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.08)',
    paddingHorizontal: Theme.spacing.lg,
    paddingVertical: Theme.spacing.md,
  },
  secondaryButtonPlaceholder: {
    width: 90,
  },
  secondaryButton: {
    width: 90,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.2)',
    backgroundColor: '#fff',
  },
  secondaryButtonText: {
    ...Theme.typography.body,
    color: '#111',
    fontWeight: '700',
  },
  primaryButton: {
    flex: 1,
  },
});