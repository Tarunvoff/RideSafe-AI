import React from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity } from 'react-native';
import { Theme } from '../../theme';
import { Ionicons } from '@expo/vector-icons';
import Card from '../../components/Card';
import Button from '../../components/Button';

export default function ClaimsScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Your Claims</Text>
          <Button title="New Claim" onPress={() => {}} style={styles.newClaimBtn} />
        </View>

        <Card style={styles.claimCard}>
          <View style={styles.claimHeader}>
            <View style={styles.claimStatusPending}>
              <Text style={styles.claimStatusTextPending}>In Review</Text>
            </View>
            <Text style={styles.claimDate}>Oct 02, 2026</Text>
          </View>
          <Text style={styles.claimTitle}>Fender Bender - Market St.</Text>
          <Text style={styles.claimId}>Claim #CLM-98213</Text>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.viewDetailsRow}>
            <Text style={styles.viewDetailsText}>View Details</Text>
            <Ionicons name="chevron-forward" size={16} color={Theme.colors.primary} />
          </TouchableOpacity>
        </Card>

        <Card style={styles.claimCard}>
          <View style={styles.claimHeader}>
            <View style={styles.claimStatusResolved}>
              <Text style={styles.claimStatusTextResolved}>Resolved</Text>
            </View>
            <Text style={styles.claimDate}>Jul 14, 2026</Text>
          </View>
          <Text style={styles.claimTitle}>Windshield Damage</Text>
          <Text style={styles.claimId}>Claim #CLM-44912</Text>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.viewDetailsRow}>
            <Text style={styles.viewDetailsText}>View Details</Text>
            <Ionicons name="chevron-forward" size={16} color={Theme.colors.primary} />
          </TouchableOpacity>
        </Card>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Theme.colors.surface },
  container: { padding: Theme.spacing.lg },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: Theme.spacing.xl,
  },
  title: { ...Theme.typography.h1, color: Theme.colors.text },
  newClaimBtn: { height: 36, paddingHorizontal: Theme.spacing.md },
  claimCard: { marginBottom: Theme.spacing.lg },
  claimHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Theme.spacing.sm },
  claimStatusPending: { backgroundColor: '#fff3cd', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  claimStatusTextPending: { color: '#856404', ...Theme.typography.caption, fontWeight: '600' },
  claimStatusResolved: { backgroundColor: '#d4edda', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  claimStatusTextResolved: { color: '#155724', ...Theme.typography.caption, fontWeight: '600' },
  claimDate: { ...Theme.typography.caption, color: Theme.colors.textSecondary },
  claimTitle: { ...Theme.typography.h3, color: Theme.colors.text, marginBottom: 4 },
  claimId: { ...Theme.typography.caption, color: Theme.colors.textSecondary },
  divider: { height: 1, backgroundColor: Theme.colors.border, marginVertical: Theme.spacing.md },
  viewDetailsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  viewDetailsText: { ...Theme.typography.body, color: Theme.colors.primary, fontWeight: '500' }
});
