import { colors as baseColors, borderRadius, shadows as baseShadows, Shadows, Typography, spacing as baseSpacing } from './designSystem';

export const colors = {
  ...baseColors,
  border: '#2A2A2A', // Sleek dark border color matching the design system
};

export const radius = borderRadius;

export const shadows = {
  ...baseShadows,
  sm: Shadows.sm,
  md: Shadows.md,
  lg: Shadows.lg,
};

export const typography = Typography;

export const spacing = baseSpacing;
