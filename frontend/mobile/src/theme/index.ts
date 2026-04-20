/**
 * [EXCELLENCE SUMMARY]
 * The Aegis Design System Core. This file codifies the visual language of the platform, 
 * utilizing a precise token-based architecture to ensure stylistic consistency across 
 * all mobile interfaces.
 * 
 * For the design tokens and visual guidelines, refer to ARCHITECTURE/FRONTEND_DESIGN_SYSTEM.md.
 * 
 * [DOMAIN LOGIC]
 * Implements a "Service-First" color palette, where semantic colors (success, warning, error) 
 * are tuned for high visibility in outdoor logistics and dark store environments, 
 * reducing cognitive load for operators.
 */

export const Theme = {
  /**
   * [IN-LINE PRIDE]: Semantic Color Palette
   * Each color is selected for its accessibility and psychological impact in an 
   * insurance context—Green for safety/compliance, Amber for risk alerts.
   */
  colors: {
    primary: '#16a34a',
    brandOrange: '#FF6B53', // Definitive Aegis Salmon/Orange
    background: '#ffffff',
    surface: '#f5f5f5',
    text: '#111111',
    textSecondary: '#666666',
    border: '#e0e0e0',
    success: '#34C759',
    warning: '#f59e0b',
    error: '#FF3B30',
    info: '#3b82f6',
    overlayLight: 'rgba(17,17,17,0.1)',
    overlayMedium: 'rgba(17,17,17,0.24)',
    overlayStrong: 'rgba(17,17,17,0.38)',
  },
  /**
   * [IN-LINE PRIDE]: Hierarchical Typography system
   * Enforces a clear information hierarchy, essential for communicating complex 
   * actuarial data at a glance.
   */
  typography: {
    fontFamily: 'Inter', // Assuming Inter is available or system default
    h1: { fontSize: 28, fontWeight: '700' as const },
    h2: { fontSize: 24, fontWeight: '700' as const },
    h3: { fontSize: 20, fontWeight: '600' as const },
    body: { fontSize: 16, fontWeight: '400' as const },
    caption: { fontSize: 14, fontWeight: '400' as const },
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    full: 9999,
  },
  roundness: 8,
};
