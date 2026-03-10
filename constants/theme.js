import { Dimensions, Platform } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export const SCREEN = {
  width: SCREEN_WIDTH,
  height: SCREEN_HEIGHT,
  isSmall: SCREEN_WIDTH < 375,
  isMedium: SCREEN_WIDTH >= 375 && SCREEN_WIDTH < 414,
  isLarge: SCREEN_WIDTH >= 414,
};

export const IS_IOS = Platform.OS === 'ios';
export const IS_ANDROID = Platform.OS === 'android';

export const RISK_LEVELS = {
  low: { label: 'Low Risk', color: '#10B981', bg: 'rgba(16,185,129,0.15)', threshold: [0, 40] },
  medium: { label: 'Moderate Risk', color: '#F59E0B', bg: 'rgba(245,158,11,0.15)', threshold: [41, 65] },
  high: { label: 'High Risk', color: '#F97316', bg: 'rgba(249,115,22,0.15)', threshold: [66, 80] },
  critical: { label: 'Critical Risk', color: '#EF4444', bg: 'rgba(239,68,68,0.15)', threshold: [81, 100] },
};

export const SEVERITY_CONFIG = {
  low: { label: 'Low', color: '#10B981', bg: 'rgba(16,185,129,0.12)', dot: '#10B981' },
  medium: { label: 'Medium', color: '#F59E0B', bg: 'rgba(245,158,11,0.12)', dot: '#F59E0B' },
  high: { label: 'High', color: '#F97316', bg: 'rgba(249,115,22,0.12)', dot: '#F97316' },
  critical: { label: 'Critical', color: '#EF4444', bg: 'rgba(239,68,68,0.12)', dot: '#EF4444' },
};

export const PLAN_COLORS = {
  basic: {
    gradient: ['#4facfe', '#00f2fe'],
    accent: '#4facfe',
    bg: 'rgba(79,172,254,0.1)',
  },
  pro: {
    gradient: ['#667eea', '#764ba2'],
    accent: '#8B5CF6',
    bg: 'rgba(139,92,246,0.1)',
  },
  elite: {
    gradient: ['#f7971e', '#ffd200'],
    accent: '#F59E0B',
    bg: 'rgba(245,158,11,0.1)',
  },
};

export function getRiskLevel(score) {
  if (score <= 40) return RISK_LEVELS.low;
  if (score <= 65) return RISK_LEVELS.medium;
  if (score <= 80) return RISK_LEVELS.high;
  return RISK_LEVELS.critical;
}

export function formatCurrency(amount) {
  return `₹${amount.toLocaleString('en-IN')}`;
}

export function formatPercent(value) {
  return `${Math.round(value)}%`;
}
