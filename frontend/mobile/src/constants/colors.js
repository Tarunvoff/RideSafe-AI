// ─────────────────────────────────────────────────────────────
// COLOR PALETTE  –  Blink Insurance  (professional light theme)
// ─────────────────────────────────────────────────────────────

export const COLORS = {
  // ── Backgrounds ──────────────────────────────────────────────
  bgDeep: '#EEF2F7',
  bgPrimary: '#F5F7FA',
  bgCard: '#FFFFFF',
  bgSurface: '#F0F4FF',
  bgBorder: '#E2E8F0',

  // ── Brand Gradients ───────────────────────────────────────────
  gradientPrimary: ['#1E3A8A', '#1D4ED8', '#2563EB'],
  gradientPurple: ['#4F46E5', '#7C3AED'],
  gradientCyan: ['#0284C7', '#0EA5E9'],
  gradientGreen: ['#047857', '#059669'],
  gradientOrange: ['#D97706', '#F59E0B'],
  gradientRed: ['#B91C1C', '#DC2626'],
  gradientGold: ['#B45309', '#D97706'],
  gradientBlue: ['#1E3A8A', '#1D4ED8', '#3B82F6'],
  gradientCard: ['#FFFFFF', '#F8FAFF'],
  gradientGlass: ['rgba(255,255,255,0.9)', 'rgba(255,255,255,0.7)'],
  gradientHeader: ['#1E3A8A', '#1D4ED8'],

  // ── Text ──────────────────────────────────────────────────────
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#94A3B8',
  textAccent: '#1D4ED8',
  textWhite: '#FFFFFF',

  // ── Accent Colors ─────────────────────────────────────────────
  purple: '#4F46E5',
  purpleLight: '#EEF2FF',
  purpleDark: '#3730A3',
  cyan: '#0EA5E9',
  cyanLight: '#E0F2FE',
  blue: '#1D4ED8',
  blueLight: '#DBEAFE',
  blueMid: '#2563EB',
  green: '#059669',
  greenLight: '#D1FAE5',
  orange: '#D97706',
  orangeLight: '#FEF3C7',
  red: '#DC2626',
  redLight: '#FEE2E2',
  yellow: '#D97706',
  yellowLight: '#FEF3C7',
  pink: '#DB2777',
  pinkLight: '#FCE7F3',
  teal: '#0D9488',
  tealLight: '#CCFBF1',
  navy: '#1E3A8A',

  // ── Risk Level Colors ─────────────────────────────────────────
  riskLow: '#059669',
  riskMedium: '#D97706',
  riskHigh: '#EA580C',
  riskCritical: '#DC2626',

  // ── UI Utility ────────────────────────────────────────────────
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
  overlay: 'rgba(15,23,42,0.5)',
  glassBg: 'rgba(255,255,255,0.95)',
  glassBorder: 'rgba(226,232,240,1)',
  shadow: '#1E3A8A',
  divider: '#E2E8F0',
};

// ─────────────────────────────────────────────────────────────
// TYPOGRAPHY
// ─────────────────────────────────────────────────────────────
export const TYPOGRAPHY = {
  h1: { fontSize: 32, fontWeight: '800', letterSpacing: -0.5 },
  h2: { fontSize: 26, fontWeight: '700', letterSpacing: -0.3 },
  h3: { fontSize: 20, fontWeight: '700' },
  h4: { fontSize: 17, fontWeight: '600' },
  body: { fontSize: 15, fontWeight: '400' },
  bodySmall: { fontSize: 13, fontWeight: '400' },
  caption: { fontSize: 11, fontWeight: '400', letterSpacing: 0.5 },
  label: { fontSize: 12, fontWeight: '600', letterSpacing: 0.8, textTransform: 'uppercase' },
};

// ─────────────────────────────────────────────────────────────
// SPACING
// ─────────────────────────────────────────────────────────────
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

// ─────────────────────────────────────────────────────────────
// BORDER RADIUS
// ─────────────────────────────────────────────────────────────
export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  full: 9999,
};

// ─────────────────────────────────────────────────────────────
// SHADOWS
// ─────────────────────────────────────────────────────────────
export const SHADOWS = {
  card: {
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  glow: {
    shadowColor: '#1D4ED8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  subtle: {
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  strong: {
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 12,
  },
};
