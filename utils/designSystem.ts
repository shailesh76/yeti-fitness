import { Platform } from 'react-native';

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const COLORS = {
  // Primary brand — Neon Green
  primary:        '#00E676',
  primaryDark:    '#00B359',
  primaryLight:   '#6FFFB9',
  primaryGlow:    'rgba(0, 230, 118, 0.15)',

  // Backgrounds
  bg:             '#0A0A0A',
  surface:        '#141414',
  surfaceElevated:'#1E1E1E',
  surfaceBorder:  '#2A2A2A',

  // Text
  text:           '#FFFFFF',
  textSecondary:  '#B0B0B0',
  textMuted:      '#6B6B6B',

  // Accents
  blue:           '#00D4FF',
  blueGlow:       'rgba(0, 212, 255, 0.12)',
  purple:         '#A855F7',
  purpleGlow:     'rgba(168, 85, 247, 0.12)',
  orange:         '#F97316',
  orangeGlow:     'rgba(249, 115, 22, 0.12)',

  // Status
  success:        '#10B981',
  warning:        '#F59E0B',
  error:          '#EF4444',

  // Chart
  chartGrid:      '#2A2A2A',
};

export const RADII = {
  sm:   8,
  md:   12,
  lg:   16,
  xl:   20,
  xxl:  28,
  full: 9999,
};

export const TYPOGRAPHY = {
  h1: {
    fontSize: 32,
    fontWeight: '800' as '800',
    color: '#FFFFFF',
    letterSpacing: -0.8,
    lineHeight: 38,
  },
  h2: {
    fontSize: 22,
    fontWeight: '700' as '700',
    color: '#FFFFFF',
    letterSpacing: -0.4,
  },
  h3: {
    fontSize: 16,
    fontWeight: '700' as '700',
    color: '#FFFFFF',
  },
  body: {
    fontSize: 14,
    fontWeight: '500' as '500',
    color: '#B0B0B0',
    lineHeight: 22,
  },
  caption: {
    fontSize: 11,
    fontWeight: '600' as '600',
    color: '#6B6B6B',
    textTransform: 'uppercase' as 'uppercase',
    letterSpacing: 0.8,
  },
};

export const SHADOWS = {
  greenGlow: Platform.OS === 'web'
    ? { boxShadow: '0 0 20px rgba(0, 230, 118, 0.25)' }
    : {
        shadowColor: '#00E676',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 8,
      },
  subtle: Platform.OS === 'web'
    ? { boxShadow: '0 4px 24px rgba(0,0,0,0.5)' }
    : {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 8,
      },
};
