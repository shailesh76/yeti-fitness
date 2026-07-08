import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Card } from './Card';
import { ProgressBar } from './ProgressBar';
import { Colors, Typography, Spacing } from '../../constants/designSystem';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface StatCardProps {
  /** Small label above the value (e.g. "Calories") */
  title: string;
  /** Primary large number/text (e.g. "1,840") */
  value: string | number;
  /** Secondary descriptor below the value (e.g. "kcal remaining") */
  subtitle?: string;
  /** 0–100 progress shown as an animated bar below the text */
  progress?: number;
  /** Accent color for the value text and progress bar — defaults to primary */
  color?: string;
  /** Tap handler — makes card pressable */
  onPress?: () => void;
  /** Show the top neon accent stripe */
  accentBar?: boolean;
  /** Style overrides for the outer Card */
  style?: ViewStyle | ViewStyle[];
  /** Optional icon/badge to render in the top-right corner */
  badge?: React.ReactNode;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function StatCard({
  title,
  value,
  subtitle,
  progress,
  color     = Colors.primary,
  onPress,
  accentBar = false,
  style,
  badge,
}: StatCardProps) {
  return (
    <Card
      variant="compact"
      onPress={onPress}
      accentBar={accentBar}
      accentColor={color}
      style={style}
    >
      {/* Header row: title label + optional badge */}
      <View style={styles.header}>
        <Text style={styles.title}>{title.toUpperCase()}</Text>
        {badge != null && <View>{badge}</View>}
      </View>

      {/* Big value */}
      <Text style={[styles.value, { color }]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>

      {/* Subtitle */}
      {subtitle != null && (
        <Text style={styles.subtitle} numberOfLines={1}>
          {subtitle}
        </Text>
      )}

      {/* Progress bar */}
      {progress != null && (
        <View style={styles.progressWrapper}>
          <ProgressBar
            progress={progress}
            color={color}
            height={5}
            duration={800}
          />
        </View>
      )}
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  header: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    marginBottom:   Spacing.xs,  // 4
  },
  title: {
    ...Typography.label,          // 11px, uppercase, muted
    letterSpacing: 0.9,
  },
  value: {
    fontSize:      28,
    fontWeight:    '800',
    lineHeight:    34,
    letterSpacing: -0.6,
    color:         Colors.textPrimary,
    marginTop:     2,
  },
  subtitle: {
    ...Typography.small,          // 12px, medium, muted
    marginTop: 4,
  },
  progressWrapper: {
    marginTop: Spacing.sm,        // 8
  },
});

export default StatCard;
