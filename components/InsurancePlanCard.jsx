import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
} from 'react-native-reanimated';
import { Check, Star, Shield, Zap } from 'lucide-react-native';
import { COLORS, TYPOGRAPHY, SPACING, SHADOWS, RADIUS } from '../constants/colors';

const PLAN_ICONS = { basic: Shield, pro: Zap, elite: Star };

/**
 * InsurancePlanCard
 * Visual pricing card for a weekly insurance plan.
 * Highlights "popular" plans and shows animated entry.
 */
export default function InsurancePlanCard({ plan, isSelected, onSelect, index = 0 }) {
  const IconComponent = PLAN_ICONS[plan.id] || Shield;
  const translateY = useSharedValue(40);
  const opacity = useSharedValue(0);

  useEffect(() => {
    translateY.value = withDelay(index * 120, withSpring(0, { damping: 18, stiffness: 90 }));
    opacity.value = withDelay(index * 120, withSpring(1, { damping: 20 }));
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={animStyle}>
      <TouchableOpacity
        onPress={() => onSelect(plan.id)}
        activeOpacity={0.85}
        style={styles.touchable}
      >
        <LinearGradient
          colors={plan.popular ? plan.gradient : ['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.02)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.card,
            isSelected && styles.cardSelected,
            plan.popular && styles.cardPopular,
            SHADOWS.card,
          ]}
        >
          {/* Badge */}
          {plan.badge && (
            <View style={[styles.badge, plan.popular && styles.badgePopular]}>
              <Text style={styles.badgeText}>{plan.badge}</Text>
            </View>
          )}

          {/* Icon + Plan Name */}
          <View style={styles.header}>
            <View style={[styles.iconWrap, { backgroundColor: `${plan.gradient[0]}25` }]}>
              <IconComponent size={20} color={plan.popular ? COLORS.white : plan.gradient[0]} strokeWidth={2} />
            </View>
            <View style={styles.nameBlock}>
              <Text style={[styles.planName, plan.popular && styles.planNameLight]}>
                {plan.name}
              </Text>
              <Text style={[styles.planTagline, plan.popular && styles.planTaglineLight]}>
                {plan.tagline}
              </Text>
            </View>
          </View>

          {/* Price */}
          <View style={styles.priceRow}>
            <Text style={[styles.currency, plan.popular && styles.textLight]}>₹</Text>
            <Text style={[styles.price, plan.popular && styles.textLight]}>{plan.price}</Text>
            <Text style={[styles.pricePeriod, plan.popular && styles.pricePeriodLight]}>
              /week
            </Text>
          </View>

          {/* Protection Value */}
          <View style={[styles.protectBlock, plan.popular ? styles.protectBlockLight : styles.protectBlockDark]}>
            <Text style={[styles.protectLabel, plan.popular && styles.textLightMuted]}>
              Protects up to
            </Text>
            <Text style={[styles.protectValue, plan.popular && styles.textLight]}>
              ₹{plan.protectedIncome.toLocaleString('en-IN')}/week
            </Text>
          </View>

          {/* Features */}
          <View style={styles.features}>
            {plan.features.map((f, i) => (
              <View key={i} style={styles.featureRow}>
                <View style={[styles.checkCircle, { backgroundColor: plan.popular ? 'rgba(255,255,255,0.2)' : `${plan.gradient[0]}20` }]}>
                  <Check size={10} color={plan.popular ? COLORS.white : plan.gradient[0]} strokeWidth={3} />
                </View>
                <Text style={[styles.featureText, plan.popular && styles.featureTextLight]}>
                  {f}
                </Text>
              </View>
            ))}
          </View>

          {/* CTA */}
          <View style={[
            styles.ctaBtn,
            plan.popular
              ? styles.ctaBtnLight
              : { borderColor: plan.gradient[0], borderWidth: 1.5 },
          ]}>
            <Text style={[styles.ctaText, !plan.popular && { color: plan.gradient[0] }]}>
              {isSelected ? '✓ Selected' : 'Choose Plan'}
            </Text>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  touchable: { marginBottom: SPACING.md },
  card: {
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    overflow: 'hidden',
  },
  cardSelected: {
    borderColor: COLORS.purple,
    borderWidth: 2,
  },
  cardPopular: {
    borderWidth: 0,
  },
  badge: {
    position: 'absolute',
    top: 14,
    right: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: RADIUS.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgePopular: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameBlock: { flex: 1 },
  planName: {
    ...TYPOGRAPHY.h4,
    color: COLORS.textPrimary,
  },
  planNameLight: { color: COLORS.white },
  planTagline: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  planTaglineLight: { color: 'rgba(255,255,255,0.7)' },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginVertical: SPACING.sm,
  },
  currency: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  price: {
    fontSize: 40,
    fontWeight: '900',
    color: COLORS.textPrimary,
    lineHeight: 44,
  },
  textLight: { color: COLORS.white },
  pricePeriod: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  pricePeriodLight: { color: 'rgba(255,255,255,0.7)' },
  protectBlock: {
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    marginBottom: SPACING.md,
  },
  protectBlockDark: { backgroundColor: COLORS.glassBg },
  protectBlockLight: { backgroundColor: 'rgba(255,255,255,0.15)' },
  protectLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
  },
  textLightMuted: { color: 'rgba(255,255,255,0.65)' },
  protectValue: {
    ...TYPOGRAPHY.h4,
    color: COLORS.textPrimary,
    marginTop: 2,
  },
  features: { gap: 8, marginBottom: SPACING.md },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  checkCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
    flex: 1,
  },
  featureTextLight: { color: 'rgba(255,255,255,0.85)' },
  ctaBtn: {
    borderRadius: RADIUS.lg,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  ctaBtnLight: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  ctaText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.white,
  },
});
