/**
 * Dude Fitness App — Design System
 * ─────────────────────────────────
 * Single source of truth for all visual tokens used across the
 * React Native client. Import named constants rather than
 * hardcoding hex values or magic numbers inside components.
 *
 * Usage:
 *   import { colors, spacing, typography, borderRadius, Colors, Spacing, Typography, CardStyle } from '@/constants/designSystem';
 */

import { Platform, StyleSheet } from 'react-native';

// ─────────────────────────────────────────────────────────────────────────────
// 1. SPECIFIED DESIGN SYSTEM TOKENS (NEW)
// ─────────────────────────────────────────────────────────────────────────────

export const colors = {
  // Primary
  primary: '#00E676',        // Neon green
  primaryDark: '#00B359',
  primaryLight: '#6FFFB9',
  primaryGlow: 'rgba(0, 230, 118, 0.4)',
  
  // Backgrounds
  background: '#000000',     // Pure black
  surface: '#0A0A0A',        // Slightly lighter
  surfaceElevated: '#141414', // Cards
  surfaceHighlight: '#1E1E1E', // Hover states
  
  // Text
  textPrimary: '#FFFFFF',
  textSecondary: '#A0A0A0',
  textMuted: '#666666',
  
  // Accents
  accentBlue: '#00D4FF',
  accentPurple: '#A855F7',
  accentOrange: '#F97316',
  
  // Status
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  
  // Gradients
  gradientStart: '#00E676',
  gradientEnd: '#00D4FF',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  screenPadding: 20,
};

export const typography = {
  hero: { fontSize: 36, fontWeight: '800' as const, lineHeight: 42 },
  h1: { fontSize: 28, fontWeight: '700' as const, lineHeight: 34 },
  h2: { fontSize: 24, fontWeight: '600' as const, lineHeight: 30 },
  h3: { fontSize: 20, fontWeight: '600' as const, lineHeight: 26 },
  body: { fontSize: 16, fontWeight: '400' as const, lineHeight: 22 },
  caption: { fontSize: 14, fontWeight: '500' as const, lineHeight: 20 },
  small: { fontSize: 12, fontWeight: '600' as const, lineHeight: 16, textTransform: 'uppercase' as const },
};

export const shadows = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  glow: {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
  },
};

export const borderRadius = {
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  full: 9999,
};

// ─────────────────────────────────────────────────────────────────────────────
// 2. BACKWARDS-COMPATIBLE ALIASES & EXTRA KEYS
// ─────────────────────────────────────────────────────────────────────────────

export const Colors = {
  ...colors,
  surfaceBorder: '#2A2A2A', // subtle dividers & borders
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
  accentBlueGlow: 'rgba(0, 212, 255, 0.12)',
  accentPurpleGlow: 'rgba(168, 85, 247, 0.12)',
  accentOrangeGlow: 'rgba(249, 115, 22, 0.12)',
  successGlow: 'rgba(16, 185, 129, 0.12)',
  warningGlow: 'rgba(245, 158, 11, 0.12)',
  errorGlow: 'rgba(239, 68, 68, 0.12)',
} as const;

export type ColorKey = keyof typeof Colors;

export const Spacing = spacing;
export type SpacingKey = keyof typeof Spacing;

export const Radii = {
  xs: 6,
  sm: borderRadius.sm,  // 12
  md: borderRadius.md,  // 16
  lg: borderRadius.lg,  // 20
  xl: borderRadius.xl,  // 24
  xxl: 40,
  full: borderRadius.full, // 9999
} as const;

export const Typography = {
  ...typography,
  /** Uppercase metric label — tab labels, stat headings */
  label: {
    fontSize: 11, fontWeight: '700' as const, lineHeight: 14,
    letterSpacing: 0.8, textTransform: 'uppercase' as const,
  },
  /** Monospaced numeric — calories, weights, reps */
  mono: {
    fontSize: 16, fontWeight: '700' as const, lineHeight: 22,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
} as const;

export const Shadows = {
  /** Barely-there depth for flat cards */
  sm: Platform.select({
    ios: {
      shadowColor:   '#000000',
      shadowOffset:  { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius:  6,
    },
    android: { elevation: 3 },
    web:     { boxShadow: '0 2px 12px rgba(0,0,0,0.4)' },
    default: {},
  }),

  /** Standard card shadow */
  md: Platform.select({
    ios: {
      shadowColor:   '#000000',
      shadowOffset:  shadows.card.shadowOffset,
      shadowOpacity: shadows.card.shadowOpacity,
      shadowRadius:  shadows.card.shadowRadius,
    },
    android: { elevation: shadows.card.elevation },
    web:     { boxShadow: '0 4px 24px rgba(0,0,0,0.5)' },
    default: {},
  }),

  /** Modal / hero card shadow */
  lg: Platform.select({
    ios: {
      shadowColor:   '#000000',
      shadowOffset:  { width: 0, height: 8 },
      shadowOpacity: 0.45,
      shadowRadius:  20,
    },
    android: { elevation: 12 },
    web:     { boxShadow: '0 8px 40px rgba(0,0,0,0.6)' },
    default: {},
  }),

  /** Neon-green glow for primary CTAs */
  primaryGlow: Platform.select({
    ios: {
      shadowColor:   shadows.glow.shadowColor,
      shadowOffset:  shadows.glow.shadowOffset,
      shadowOpacity: shadows.glow.shadowOpacity,
      shadowRadius:  shadows.glow.shadowRadius,
    },
    android: { elevation: shadows.glow.elevation },
    web:     { boxShadow: `0 4px 20px ${colors.primaryGlow}` },
    default: {},
  }),
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// 3. CARD STYLES
// ─────────────────────────────────────────────────────────────────────────────

export const CardStyle = {
  /** Standard list / section card */
  default: {
    borderRadius:    Radii.lg,            // 20
    padding:         Spacing.lg,          // 24
    backgroundColor: Colors.surface,      // #0A0A0A
    borderWidth:     1,
    borderColor:     Colors.surfaceBorder, // #2A2A2A
    overflow:        'hidden' as const,
    ...Shadows.md,
  },

  /** Slightly raised card — use for hero / featured content */
  elevated: {
    borderRadius:    Radii.lg,
    padding:         Spacing.lg,
    backgroundColor: Colors.surfaceElevated, // #141414
    borderWidth:     1,
    borderColor:     Colors.surfaceBorder,
    overflow:        'hidden' as const,
    ...Shadows.lg,
  },

  /** Compact card — metric tiles, quick stats */
  compact: {
    borderRadius:    Radii.md,            // 16
    padding:         Spacing.md,          // 16
    backgroundColor: Colors.surface,
    borderWidth:     1,
    borderColor:     Colors.surfaceBorder,
    overflow:        'hidden' as const,
    ...Shadows.sm,
  },

  /** Highlighted / active state — primary accent border */
  active: {
    borderRadius:    Radii.lg,
    padding:         Spacing.lg,
    backgroundColor: Colors.surface,
    borderWidth:     1.5,
    borderColor:     Colors.primary,
    overflow:        'hidden' as const,
    ...Shadows.primaryGlow,
  },
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// 4. BUTTON STYLES
// ─────────────────────────────────────────────────────────────────────────────

export const ButtonStyle = {
  /** Full-width primary CTA */
  primary: {
    backgroundColor: Colors.primary,
    borderRadius:    Radii.md,
    paddingVertical: Spacing.md,
    alignItems:      'center' as const,
    justifyContent:  'center' as const,
    ...Shadows.primaryGlow,
  },
  primaryText: {
    ...Typography.caption,
    fontWeight:     '800' as const,
    color:          Colors.black,
    textTransform:  'uppercase' as const,
    letterSpacing:  0.6,
  },

  /** Ghost / outline button */
  ghost: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius:    Radii.md,
    paddingVertical: Spacing.md,
    borderWidth:     1,
    borderColor:     Colors.surfaceBorder,
    alignItems:      'center' as const,
    justifyContent:  'center' as const,
  },
  ghostText: {
    ...Typography.caption,
    fontWeight:     '700' as const,
    color:          Colors.textSecondary,
    textTransform:  'uppercase' as const,
    letterSpacing:  0.5,
  },

  /** Danger / destructive action */
  danger: {
    backgroundColor: Colors.errorGlow,
    borderRadius:    Radii.md,
    paddingVertical: Spacing.md,
    borderWidth:     1,
    borderColor:     'rgba(239,68,68,0.25)',
    alignItems:      'center' as const,
    justifyContent:  'center' as const,
  },
  dangerText: {
    ...Typography.caption,
    fontWeight:     '700' as const,
    color:          Colors.error,
    textTransform:  'uppercase' as const,
    letterSpacing:  0.5,
  },
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// 5. PROGRESS BAR
// ─────────────────────────────────────────────────────────────────────────────

export const ProgressStyle = {
  track: {
    height:          5,
    backgroundColor: Colors.surfaceBorder,
    borderRadius:    Radii.full,
    overflow:        'hidden' as const,
  },
  fill: {
    height:          '100%' as any,
    borderRadius:    Radii.full,
    backgroundColor: Colors.primary,
  },
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// 6. LAYOUT HELPERS
// ─────────────────────────────────────────────────────────────────────────────

export const Layout = {
  row:             { flexDirection: 'row'    as const },
  rowCenter:       { flexDirection: 'row'    as const, alignItems: 'center'   as const },
  rowBetween:      { flexDirection: 'row'    as const, alignItems: 'center'   as const, justifyContent: 'space-between' as const },
  rowAround:       { flexDirection: 'row'    as const, alignItems: 'center'   as const, justifyContent: 'space-around'  as const },
  col:             { flexDirection: 'column' as const },
  colCenter:       { flexDirection: 'column' as const, alignItems: 'center'   as const },
  colBetween:      { flexDirection: 'column' as const, justifyContent: 'space-between' as const },
  center:          { alignItems: 'center'    as const, justifyContent: 'center'         as const },
  fill:            { flex: 1 },
  fillCenter:      { flex: 1, alignItems: 'center' as const, justifyContent: 'center' as const },
  screenPadding:   { paddingHorizontal: Spacing.lg },  // 24px sides
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// 7. ANIMATION DURATIONS (ms)
// ─────────────────────────────────────────────────────────────────────────────

export const Duration = {
  fast:   200,
  normal: 350,
  slow:   500,
} as const;
