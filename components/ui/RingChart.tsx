import React, { useEffect, useRef } from 'react';
import { View, Animated, Easing, StyleSheet, ViewStyle } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { Colors } from '../../constants/designSystem';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface RingChartProps {
  /** Fill percentage 0–100 */
  percentage: number;
  /** Outer diameter of the ring in px (default 150) */
  size?: number;
  /** Stroke thickness in px (default 12) */
  strokeWidth?: number;
  /** Start colour of the gradient stroke — defaults to primary green */
  gradientStart?: string;
  /** End colour of the gradient stroke — defaults to accent blue */
  gradientEnd?: string;
  /** Track (unfilled) ring colour */
  trackColor?: string;
  /** Animation duration in ms (default 900) */
  duration?: number;
  /** Content rendered in the ring centre */
  children?: React.ReactNode;
  /** Container style overrides */
  style?: ViewStyle;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

// Unique-ish gradient ID so multiple rings on one screen don't share defs
let _idSeed = 0;

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function RingChart({
  percentage,
  size          = 150,
  strokeWidth   = 12,
  gradientStart = Colors.primary,
  gradientEnd   = Colors.accentBlue,
  trackColor    = Colors.surfaceBorder,
  duration      = 900,
  children,
  style,
}: RingChartProps) {
  // Stable gradient ID per component instance
  const gradientId = useRef(`ring-grad-${++_idSeed}`).current;

  // Ring geometry
  const radius        = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center        = size / 2;

  // Clamp percentage
  const clamped = Math.min(Math.max(percentage, 0), 100);

  // Animated value drives strokeDashoffset
  const animValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animValue, {
      toValue:         clamped,
      duration,
      easing:          Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [clamped, duration]);

  // We can't animate SVG props directly with Animated on native, so we use
  // an Animated listener to update state imperatively via a ref approach.
  // Instead, we render a simple static SVG and re-render on progress change
  // using the RingChartAnimated pattern below.
  const dashOffset = circumference - (clamped / 100) * circumference;

  return (
    <View style={[{ width: size, height: size }, style]}>
      {/* SVG Ring */}
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%"   stopColor={gradientStart} stopOpacity={1} />
            <Stop offset="100%" stopColor={gradientEnd}   stopOpacity={1} />
          </LinearGradient>
        </Defs>

        {/* Track ring */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
        />

        {/* Progress arc — rotated so arc starts at top (12 o'clock) */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={`url(#${gradientId})`}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={dashOffset}
          // Rotate so 0% starts at the top
          transform={`rotate(-90 ${center} ${center})`}
        />
      </Svg>

      {/* Centre content */}
      {children != null && (
        <View style={styles.center}>{children}</View>
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Animated variant using JS-driven re-renders
// ─────────────────────────────────────────────────────────────────────────────

/**
 * RingChartAnimated renders a smooth Animated version using a listener.
 * Use this for continuous live-updating rings (e.g. timer countdowns).
 */
export function RingChartAnimated(props: RingChartProps) {
  const { percentage, duration = 900, ...rest } = props;
  const [displayPct, setDisplayPct] = React.useState(0);
  const animValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const clamped = Math.min(Math.max(percentage, 0), 100);
    const id = animValue.addListener(({ value }) => setDisplayPct(value));
    Animated.timing(animValue, {
      toValue:         clamped,
      duration,
      easing:          Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
    return () => animValue.removeListener(id);
  }, [percentage, duration]);

  return <RingChart percentage={displayPct} duration={0} {...rest} />;
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  center: {
    position:       'absolute',
    top:            0,
    left:           0,
    right:          0,
    bottom:         0,
    alignItems:     'center',
    justifyContent: 'center',
  },
});

export default RingChart;
