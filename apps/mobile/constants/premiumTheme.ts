/**
 * premiumTheme.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Permanent single source of truth for Yeti Fitness's design system:
 * - Concept A Minimal Premium foundation
 * - Concept B Biometric Rings & Soft Glass Cards
 * - Concept C AI Coach Telemetry Accents & Micro-interactions
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { Platform, StyleSheet } from 'react-native';

// ─── Core Color Palette ───────────────────────────────────────────────────────
export const P = {
  // Primary Brand Accent & CTA (Master Reference Royal / Electric Blue)
  ACCENT:        '#2563EB', // Royal Blue primary CTA
  ACCENT_BRIGHT: '#3B82F6', // Electric Blue highlights

  // Biometric & Ring Palette
  CALORIES:      '#FF453A', // Calories Coral Red
  PROTEIN:       '#FFD60A', // Protein Amber Gold
  WATER:         '#64D2FF', // Water Cyber Cyan
  STEPS:         '#30D158', // Steps / Success Kinetic Green
  CARBS:         '#3B82F6', // Carbohydrates Blue
  FAT:           '#FF453A', // Fat Red

  // Semantic & Auxiliary Colors
  SUCCESS:       '#30D158', // Online / Success / Positive Change
  WARNING:       '#FF9F0A', // Warning Amber
  DESTRUCTIVE:   '#FF453A', // Alert / End Workout Red
  INFO:          '#64D2FF', // Telemetry Info

  // Legacy Backwards-Compatible Aliases
  ACCENT_CYAN:   '#64D2FF',
  ACCENT_BLUE:   '#3B82F6',
  ACCENT_AMBER:  '#FFD60A',
  ACCENT_ORANGE: '#FF9F0A',
  ACCENT_RED:    '#FF453A',

  BLUE:  '#3B82F6',
  AMBER: '#FFD60A',
  RED:   '#FF453A',
  GOLD:  '#FFD700',

  // Translucent Accent Fills & Borders (Royal Blue)
  ACCENT_DIM:    'rgba(37, 99, 235, 0.12)',
  ACCENT_GLOW:   'rgba(37, 99, 235, 0.25)',
  ACCENT_BORDER: 'rgba(59, 130, 246, 0.35)',

  BLUE_DIM:      'rgba(59, 130, 246, 0.12)',
  BLUE_BORDER:   'rgba(59, 130, 246, 0.30)',

  CYAN_DIM:      'rgba(100, 210, 255, 0.12)',
  CYAN_BORDER:   'rgba(100, 210, 255, 0.30)',

  AMBER_DIM:     'rgba(255, 214, 10, 0.12)',
  AMBER_BORDER:  'rgba(255, 214, 10, 0.30)',

  PURPLE_AI_DIM:    'rgba(139, 92, 246, 0.12)',
  PURPLE_AI_BORDER: 'rgba(139, 92, 246, 0.20)',

  // Dark Monolithic Surfaces — exact v1.0 spec values
  BG:             '#090B10', // Main screen background
  CARD_BG:        '#161B22', // Card surface
  CARD_BG_ELEVATED: '#1C222C', // Elevated card surface (modals, sheets, nested cards)
  CARD_GLASS:     'rgba(18, 20, 28, 0.75)', // Soft glass surface
  CARD_BORDER:    'rgba(255, 255, 255, 0.07)', // Ultra-subtle 1px border
  CARD_BORDER_HI: 'rgba(255, 255, 255, 0.14)',
  DIVIDER:        'rgba(255, 255, 255, 0.06)', // Hairline separator between list rows

  // AI / Coach accent (kept distinct from the primary blue CTA accent —
  // design rule: never more than 2 accent colors visible on one screen)
  PURPLE_AI: '#8B5CF6',

  // Typography Palette
  TEXT_PRI: '#FFFFFF', // High contrast white
  TEXT_SEC: '#94A3B8', // Medium zinc / slate secondary
  TEXT_MUT: '#64748B', // Muted slate / caption
  TEXT_SUB: '#475569', // Sub-caption / track line

  // Sizing Tokens — radius is per component type, not one global value
  RADIUS_CARD:   22, // Cards, ChartCard
  RADIUS_BUTTON: 20, // PrimaryButton / SecondaryButton
  RADIUS_INPUT:  18, // Text inputs, SearchBar
  RADIUS_SHEET:  32, // BottomSheet
  RADIUS_MODAL:  28, // Modal
  RADIUS_PILL:   16,
  RADIUS_SM:     12,
  RADIUS_FULL:   9999,

  // Fixed component heights referenced across screens
  BUTTON_HEIGHT_LG: 56, // PrimaryButton (large, pill)

  // 8-point spacing scale
  SPACE_MARGIN:      24, // Screen-edge margins
  SPACE_CARD:        20, // Card padding
  SPACE_SECTION_GAP: 28, // Gap between major sections
  SPACE_INSIDE_CARD: 16, // Gap between elements inside a card
} as const;

// ─── Typography Scale ─────────────────────────────────────────────────────────
// SF Pro Display sizes/weights per the design system. Compose into a Text
// style alongside color, e.g. { ...TYPE.screenTitle, color: P.TEXT_PRI }.
export const TYPE = {
  heading:     { fontSize: 32, fontWeight: '700' as const },
  screenTitle: { fontSize: 28, fontWeight: '700' as const },
  section:     { fontSize: 22, fontWeight: '600' as const },
  cardTitle:   { fontSize: 18, fontWeight: '600' as const },
  body:        { fontSize: 16, fontWeight: '400' as const },
  caption:     { fontSize: 13, fontWeight: '500' as const },
} as const;

// ─── Glass Effect Tokens ──────────────────────────────────────────────────────
export const GLASS = {
  background: 'rgba(255, 255, 255, 0.04)',
  border:     'rgba(255, 255, 255, 0.07)', // same value as P.CARD_BORDER
  blurAmount: 20, // backdrop blur radius (BlurView intensity uses its own 0-100 scale)
} as const;


// ─── Cross-Platform Shadow & Glow Helpers ─────────────────────────────────────
export const glowStyle = (color: string = P.ACCENT, radius = 16, opacity = 0.25) =>
  Platform.select({
    ios: {
      shadowColor:   color,
      shadowOffset:  { width: 0, height: 4 },
      shadowOpacity: opacity,
      shadowRadius:  radius,
    },
    android: {
      elevation:   8,
      borderWidth: 1,
      borderColor: color + '40',
    },
    default: {
      shadowColor:   color,
      shadowOffset:  { width: 0, height: 4 },
      shadowOpacity: opacity,
      shadowRadius:  radius,
    },
  }) ?? {};

// ─── Shared Style Atoms ───────────────────────────────────────────────────────
export const sharedStyles = StyleSheet.create({
  /** Premium Dark Graphite Card Container */
  card: {
    backgroundColor: P.CARD_BG,
    borderWidth:     1,
    borderColor:     P.CARD_BORDER,
    borderRadius:    P.RADIUS_CARD,
    padding:         20,
    marginBottom:    16,
  },
  /** Hero Glass Card with subtle emerald glow border */
  cardGlow: {
    backgroundColor: P.CARD_BG,
    borderWidth:     1,
    borderColor:     P.ACCENT_BORDER,
    borderRadius:    P.RADIUS_CARD,
    padding:         20,
    marginBottom:    16,
    ...glowStyle(P.ACCENT, 20, 0.18),
  },
  /** Telemetry Glass Card with subtle Cyan glow */
  cardTelemetry: {
    backgroundColor: P.CARD_BG,
    borderWidth:     1,
    borderColor:     P.CYAN_BORDER,
    borderRadius:    P.RADIUS_CARD,
    padding:         20,
    marginBottom:    16,
    ...glowStyle(P.ACCENT_CYAN, 20, 0.15),
  },
  /** Section Headline Caps */
  labelCaps: {
    fontSize:      11,
    fontWeight:    '800' as const,
    color:         P.TEXT_MUT,
    textTransform: 'uppercase' as const,
    letterSpacing: 1.4,
  },
  /** Scrollable screen container */
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop:        Platform.OS === 'ios' ? 16 : 24,
    paddingBottom:     120,
    backgroundColor:   P.BG,
  },
  /** Flex Row Helper */
  row: {
    flexDirection:  'row' as const,
    alignItems:     'center' as const,
  },
  rowBetween: {
    flexDirection:  'row' as const,
    alignItems:     'center' as const,
    justifyContent: 'space-between' as const,
  },
  /** Circular Button (Header / Action) */
  circleBtn: {
    width:           44,
    height:          44,
    borderRadius:    22,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth:     1,
    borderColor:     P.CARD_BORDER,
    alignItems:      'center' as const,
    justifyContent:  'center' as const,
  },
  /** Metric Badge Pill */
  badgePill: {
    paddingHorizontal: 10,
    paddingVertical:   4,
    borderRadius:      P.RADIUS_FULL,
    backgroundColor:   P.ACCENT_DIM,
    borderWidth:       1,
    borderColor:       P.ACCENT_BORDER,
  },
  badgeText: {
    fontSize:   11,
    fontWeight: '800' as const,
    color:      P.ACCENT,
    letterSpacing: 0.5,
  },
  /** Thin progress bar track */
  barBg: {
    height:          5,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius:    99,
    overflow:        'hidden' as const,
  },
  /** Progress fill — combine with dynamic width */
  barFill: {
    height:       '100%' as any,
    borderRadius: 99,
  },
});

