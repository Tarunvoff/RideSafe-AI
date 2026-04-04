export const Theme = {
  colors: {
    primary: '#16a34a',
    background: '#ffffff',
    surface: '#f5f5f5',
    text: '#111111',
    textSecondary: '#666666',
    border: '#e0e0e0',
    success: '#34C759',
    warning: '#f59e0b',
    error: '#FF3B30',
    info: '#3b82f6',
  },
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
