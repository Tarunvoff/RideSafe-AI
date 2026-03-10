import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  createAnimatedComponent,
  useSharedValue,
  useAnimatedProps,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import { COLORS, TYPOGRAPHY } from '../constants/colors';

const AnimatedCircle = createAnimatedComponent(Circle);

/**
 * AnimatedProgressRing
 * SVG-based circular progress ring with smooth fill animation.
 * Shows a score value in the center with a label and sublabel.
 */
export default function AnimatedProgressRing({
  score = 0,
  size = 140,
  strokeWidth = 10,
  label = '',
  sublabel = '',
  color = COLORS.purple,
  bgColor = COLORS.bgSurface,
  delay = 0,
  showPercent = true,
  centerContent = null,
}) {
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      delay,
      withTiming(score / 100, {
        duration: 1400,
        easing: Easing.out(Easing.cubic),
      })
    );
  }, [score, delay]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - progress.value),
  }));

  const gradientIdRef = useRef(`ring-gradient-${Math.random().toString(36).slice(2)}`);
  const gradientId = gradientIdRef.current;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} style={styles.svg}>
        <Defs>
          <SvgLinearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={color} stopOpacity={1} />
            <Stop offset="100%" stopColor={COLORS.cyan} stopOpacity={0.8} />
          </SvgLinearGradient>
        </Defs>

        {/* Background Track */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={bgColor}
          strokeWidth={strokeWidth}
          fill="none"
          opacity={0.4}
        />

        {/* Animated Progress Arc */}
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={`url(#${gradientId})`}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          animatedProps={animatedProps}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>

      {/* Center Content */}
      <View style={styles.center}>
        {centerContent || (
          <>
            <Text style={[styles.score, { color }]}>
              {score}
              {showPercent && <Text style={styles.percent}></Text>}
            </Text>
            {label ? <Text style={styles.label}>{label}</Text> : null}
            {sublabel ? <Text style={styles.sublabel}>{sublabel}</Text> : null}
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  svg: {
    position: 'absolute',
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  score: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  percent: {
    fontSize: 16,
    fontWeight: '700',
  },
  label: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 2,
  },
  sublabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 1,
  },
});
