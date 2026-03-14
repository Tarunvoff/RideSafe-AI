import React from 'react';
import { View, Text, StatusBar, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import { COLORS, TYPOGRAPHY, SPACING } from '../constants/colors';

/**
 * GradientHeader
 * Reusable gradient header bar with optional back button, subtitle and right action.
 */
export default function GradientHeader({
  title,
  subtitle,
  gradient = COLORS.gradientPrimary,
  showBack = false,
  onBack,
  rightComponent = null,
  centerTitle = false,
  compact = false,
}) {
  const insets = useSafeAreaInsets();

  return (
    <LinearGradient
      colors={gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.container, { paddingTop: insets.top + (compact ? 8 : 16) }]}
    >
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <View style={[styles.row, centerTitle && styles.rowCenter]}>
        {/* Back Button */}
        {showBack && (
          <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.7}>
            <ChevronLeft size={22} color={COLORS.white} strokeWidth={2.5} />
          </TouchableOpacity>
        )}

        {/* Title Block */}
        <View style={[styles.titleBlock, showBack && styles.titleBlockWithBack]}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>

        {/* Right Action */}
        {rightComponent ? (
          <View style={styles.rightSlot}>{rightComponent}</View>
        ) : (
          showBack && <View style={styles.placeholder} />
        )}
      </View>

      {/* Bottom fade overlay for smooth blending */}
      <View style={styles.bottomFade} />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: SPACING.lg,
    paddingHorizontal: SPACING.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: SPACING.sm,
  },
  rowCenter: {
    justifyContent: 'center',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.glassBg,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleBlock: {
    flex: 1,
  },
  titleBlockWithBack: {
    paddingHorizontal: SPACING.sm,
  },
  title: {
    ...TYPOGRAPHY.h3,
    color: COLORS.white,
  },
  subtitle: {
    ...TYPOGRAPHY.bodySmall,
    color: 'rgba(255,255,255,0.65)',
    marginTop: 2,
  },
  rightSlot: {
    alignItems: 'flex-end',
  },
  placeholder: {
    width: 36,
  },
  bottomFade: {
    position: 'absolute',
    bottom: -1,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: 'transparent',
  },
});
