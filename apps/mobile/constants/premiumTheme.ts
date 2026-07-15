/**
 * premiumTheme.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Single source of truth for the neon-green premium dark aesthetic
 * introduced in the Home redesign. Import from here on every screen that
 * needs to stay consistent with that design language.
 */

import { Platform, StyleSheet } from 'react-native';

// ─── Core palette ─────────────────────────────────────────────────────────────
export const P = {
  // Greens
  ACCENT:        '#39FF6A',
  ACCENT_DIM:    'rgba(57,255,106,0.12)',
  ACCENT_GLOW:   'rgba(57,255,106,0.25)',
  ACCENT_BORDER: 'rgba(57,255,106,0.22)',

  // Surfaces
  BG:          '#0a0d0a',
  CARD_BG:     '#0d120d',
  CARD_BORDER: '#1e2a1e',

  // Text
  TEXT_PRI: '#FFFFFF',
  TEXT_SEC: '#8a9e8a',
  TEXT_MUT: '#4d6b4d',

  // Accents
  BLUE:  '#00D4FF',
  AMBER: '#F59E0B',
  RED:   '#EF4444',
  GOLD:  '#FFD700',

  // Sizes
  RADIUS_CARD: 20,
  RADIUS_SM:   12,
  RADIUS_FULL: 9999,
} as const;

// ─── Cross-platform glow shadow helper ────────────────────────────────────────
export const glowStyle = (color: string, radius = 16, opacity = 0.35) =>
  Platform.select({
    ios: {
      shadowColor:   color,
      shadowOffset:  { width: 0, height: 0 },
      shadowOpacity: opacity,
      shadowRadius:  radius,
    },
    android: {
      elevation:   8,
      borderWidth: 1,
      borderColor: color + '55',
    },
    default: {
      shadowColor:   color,
      shadowOffset:  { width: 0, height: 0 },
      shadowOpacity: opacity,
      shadowRadius:  radius,
    },
  }) ?? {};

// ─── Shared style atoms ───────────────────────────────────────────────────────
export const sharedStyles = StyleSheet.create({
  /** Premium dark card container */
  card: {
    backgroundColor: P.CARD_BG,
    borderWidth:     1,
    borderColor:     P.CARD_BORDER,
    borderRadius:    P.RADIUS_CARD,
    padding:         18,
    marginBottom:    14,
  },
  /** Card with extra outer green glow (hero / primary cards) */
  cardGlow: {
    backgroundColor: P.CARD_BG,
    borderWidth:     1,
    borderColor:     P.CARD_BORDER,
    borderRadius:    P.RADIUS_CARD,
    padding:         18,
    marginBottom:    14,
    ...Platform.select({
      ios: {
        shadowColor:   P.ACCENT,
        shadowOffset:  { width: 0, height: 0 },
        shadowOpacity: 0.18,
        shadowRadius:  20,
      },
      android: {
        elevation:   12,
        borderColor: P.ACCENT_BORDER,
      },
      default: {
        shadowColor:   P.ACCENT,
        shadowOffset:  { width: 0, height: 0 },
        shadowOpacity: 0.18,
        shadowRadius:  20,
      },
    }),
  },
  /** Small uppercase section label */
  labelCaps: {
    fontSize:      10,
    fontWeight:    '800' as const,
    color:         P.TEXT_MUT,
    textTransform: 'uppercase' as const,
    letterSpacing: 1.2,
  },
  /** Scrollable screen content area */
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop:        Platform.OS === 'ios' ? 16 : 24,
    paddingBottom:     120,
    backgroundColor:   P.BG,
  },
  /** Generic row flex */
  row: {
    flexDirection:  'row' as const,
    alignItems:     'center' as const,
  },
  rowBetween: {
    flexDirection:  'row' as const,
    alignItems:     'center' as const,
    justifyContent: 'space-between' as const,
  },
  /** Thin progress bar track */
  barBg: {
    height:          5,
    backgroundColor: '#111c11',
    borderRadius:    99,
    overflow:        'hidden' as const,
  },
  /** Progress fill — combine with dynamic width */
  barFill: {
    height:       '100%' as any,
    borderRadius: 99,
  },
  /** Circular dark button (header actions) */
  circleBtn: {
    width:           44,
    height:          44,
    borderRadius:    22,
    backgroundColor: P.CARD_BG,
    borderWidth:     1,
    borderColor:     P.CARD_BORDER,
    alignItems:      'center' as const,
    justifyContent:  'center' as const,
  },
});
