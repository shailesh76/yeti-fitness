import React, { useEffect, useRef } from 'react';
import { View, Animated, Easing, StyleSheet, ViewStyle } from 'react-native';
import { P } from '../../constants/premiumTheme';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface ProgressBarProps {
  /** Fill level 0–100 */
  progress: number;
  /** Bar fill color — defaults to P.ACCENT (#39FF6A) */
  color?: string;
  /** Track (background) color — defaults to P.CARD_BORDER */
  trackColor?: string;
  /** Bar height in px — defaults to 8 */
  height?: number;
  /** Animation duration in ms — defaults to 800 */
  duration?: number;
  /** Skip entrance animation and jump directly to value */
  animated?: boolean;
  /** Optional container style overrides */
  style?: ViewStyle | ViewStyle[];
  /** Optional filled-bar style overrides */
  fillStyle?: ViewStyle | ViewStyle[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function ProgressBar({
  progress,
  color      = P.ACCENT,
  trackColor = P.CARD_BORDER,
  height     = 8,
  duration   = 800,
  animated   = true,
  style,
  fillStyle,
}: ProgressBarProps) {
  // Clamp to [0, 100]
  const clamped = Math.min(Math.max(progress, 0), 100);

  // Animated value — starts at 0 and drives the flex/width of the fill bar
  const widthAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (animated) {
      Animated.timing(widthAnim, {
        toValue:         clamped,
        duration,
        easing:          Easing.out(Easing.cubic),
        useNativeDriver: false, // width cannot use native driver
      }).start();
    } else {
      widthAnim.setValue(clamped);
    }
  }, [clamped, duration, animated]);

  // Interpolate animated value (0–100) to a percentage string ('0%' – '100%')
  const fillWidth = widthAnim.interpolate({
    inputRange:  [0, 100],
    outputRange: ['0%', '100%'],
    extrapolate: 'clamp',
  });

  return (
    <View
      style={[
        styles.track,
        { height, borderRadius: height / 2, backgroundColor: trackColor },
        style,
      ]}
    >
      <Animated.View
        style={[
          styles.fill,
          {
            width:           fillWidth,
            height,
            borderRadius:    height / 2,
            backgroundColor: color,
          },
          fillStyle,
        ]}
      />
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  track: {
    overflow: 'hidden',
    width:    '100%',
  },
  fill: {
    position: 'absolute',
    left:     0,
    top:      0,
  },
});

export default ProgressBar;
