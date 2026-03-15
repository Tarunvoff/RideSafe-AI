import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '../../theme';
import Button from '../../components/Button';

export default function KYCIntroductionScreen({ navigation }: any) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>KYC Verification</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Complete your KYC</Text>
        <Text style={styles.subtitle}>
          Verify your driver identity to unlock all GigShield benefits, ensure instant payouts, and keep your insurance policy active.
        </Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Why is KYC needed?</Text>
          <View style={styles.listItem}>
            <View style={styles.iconContainer}>
              <Ionicons name="shield-checkmark" size={20} color={Theme.colors.primary} />
            </View>
            <View>
              <Text style={styles.listTitle}>Policy Activation</Text>
              <Text style={styles.listDesc}>Required for your insurance coverage to begin.</Text>
            </View>
          </View>
          <View style={styles.listItem}>
            <View style={styles.iconContainer}>
              <Ionicons name="checkmark-circle" size={20} color={Theme.colors.primary} />
            </View>
            <View>
              <Text style={styles.listTitle}>Claim Validation</Text>
              <Text style={styles.listDesc}>Ensures seamless approval during emergencies.</Text>
            </View>
          </View>
          <View style={styles.listItem}>
            <View style={styles.iconContainer}>
              <Ionicons name="wallet" size={20} color={Theme.colors.primary} />
            </View>
            <View>
              <Text style={styles.listTitle}>Payout Processing</Text>
              <Text style={styles.listDesc}>Quick transfers to your bank or UPI account.</Text>
            </View>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Keep these ready</Text>
        <View style={styles.grid}>
          <View style={styles.gridItem}>
            <Ionicons name="id-card" size={20} color={Theme.colors.primary} />
            <Text style={styles.gridText}>Govt ID</Text>
          </View>
          <View style={styles.gridItem}>
            <Ionicons name="person" size={20} color={Theme.colors.primary} />
            <Text style={styles.gridText}>Selfie</Text>
          </View>
          <View style={styles.gridItem}>
            <Ionicons name="location" size={20} color={Theme.colors.primary} />
            <Text style={styles.gridText}>Address</Text>
          </View>
          <View style={styles.gridItem}>
            <Ionicons name="cash" size={20} color={Theme.colors.primary} />
            <Text style={styles.gridText}>Bank/UPI</Text>
          </View>
        </View>

        <View style={styles.timeBanner}>
          <Ionicons name="time" size={18} color={Theme.colors.primary} />
          <Text style={styles.timeText}>Estimated time: 3 mins</Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button 
          title="Start KYC" 
          onPress={() => navigation.navigate('KYCBasicIdentity')} 
        />
        <TouchableOpacity style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>Continue later</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Theme.colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Theme.spacing.md, backgroundColor: Theme.colors.surface },
  backButton: { padding: Theme.spacing.xs },
  headerTitle: { ...Theme.typography.h3, color: Theme.colors.text },
  container: { padding: Theme.spacing.lg },
  title: { ...Theme.typography.h1, color: Theme.colors.text, marginBottom: Theme.spacing.sm },
  subtitle: { ...Theme.typography.body, color: Theme.colors.textSecondary, marginBottom: Theme.spacing.xl },
  card: { backgroundColor: Theme.colors.surface, padding: Theme.spacing.md, borderRadius: Theme.borderRadius.lg, borderWidth: 1, borderColor: Theme.colors.border, marginBottom: Theme.spacing.xl },
  cardTitle: { ...Theme.typography.h3, marginBottom: Theme.spacing.md, color: Theme.colors.text },
  listItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: Theme.spacing.md },
  iconContainer: { backgroundColor: `${Theme.colors.primary}20`, padding: Theme.spacing.xs, borderRadius: Theme.borderRadius.md, marginRight: Theme.spacing.sm },
  listTitle: { ...Theme.typography.body, fontWeight: 'bold' as const, color: Theme.colors.text },
  listDesc: { ...Theme.typography.caption, color: Theme.colors.textSecondary },
  sectionTitle: { ...Theme.typography.h3, color: Theme.colors.text, marginBottom: Theme.spacing.md, paddingHorizontal: Theme.spacing.xs },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Theme.spacing.sm, marginBottom: Theme.spacing.xl },
  gridItem: { flex: 1, minWidth: '45%', flexDirection: 'row', alignItems: 'center', backgroundColor: Theme.colors.surface, padding: Theme.spacing.md, borderRadius: Theme.borderRadius.md, gap: Theme.spacing.sm },
  gridText: { ...Theme.typography.caption, fontWeight: 'bold' as const, color: Theme.colors.text },
  timeBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: `${Theme.colors.primary}10`, padding: Theme.spacing.sm, borderRadius: Theme.borderRadius.md, gap: Theme.spacing.xs, marginBottom: Theme.spacing.xl },
  timeText: { ...Theme.typography.caption, fontWeight: 'bold' as const, color: Theme.colors.textSecondary },
  footer: { padding: Theme.spacing.lg, backgroundColor: Theme.colors.surface, gap: Theme.spacing.sm },
  secondaryButton: { paddingVertical: Theme.spacing.md, alignItems: 'center' },
  secondaryButtonText: { ...Theme.typography.body, fontWeight: 'bold' as const, color: Theme.colors.textSecondary },
});
