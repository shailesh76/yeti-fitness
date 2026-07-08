/**
 * CalorieRing.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Shared animated calorie-progress ring. Renders a circular arc that fills
 * clockwise from 0 → 360° as consumed kcal approaches the daily target.
 *
 * Uses pure React Native border-clip trick (no SVG dependency) to keep the
 * bundle lightweight. Matches the neon-green premium dark theme.
 */

import React, { useEffect } from 'react';
import { View, Text, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { P } from '../constants/premiumTheme';

interface CalorieRingProps {
  /** Calories remaining for the day (displayed in the centre). */
  remaining: number;
  /** Daily calorie target used to compute the fill percentage. */
  total: number;
  /** Diameter of the ring in logical pixels. Defaults to 130. */
  size?: number;
  /** Stroke width of the ring in logical pixels. Defaults to 10. */
  stroke?: number;
}

export function CalorieRing({
  remaining,
  total,
  size = 130,
  stroke = 10,
}: CalorieRingProps) {
  const consumed = Math.max(total - remaining, 0);
  const pct      = Math.min(consumed / Math.max(total, 1), 1);

  const scale   = useSharedValue(0.6);
  const opacity = useSharedValue(0);

  useEffect(() => {
    scale.value   = withTiming(1, { duration: 700, easing: Easing.out(Easing.back(1.3)) });
    opacity.value = withTiming(1, { duration: 500 });
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity:   opacity.value,
  }));

  const deg = Math.round(pct * 360);

  const iosShadow = Platform.OS === 'ios'
    ? {
        shadowColor:   P.ACCENT,
        shadowOffset:  { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius:  6,
      }
    : {};

  return (
    <Animated.View style={[{ width: size, height: size }, animStyle]}>
      {/* ── Track ring ─────────────────────────────────────────────── */}
      <View
        style={{
          position:    'absolute',
          width:       size,
          height:      size,
          borderRadius: size / 2,
          borderWidth:  stroke,
          borderColor:  P.CARD_BORDER,
        }}
      />

      {/* ── Filled arc (two semi-circle clip trick) ─────────────────── */}
      {deg > 0 && (
        <View
          style={{
            position:    'absolute',
            width:       size,
            height:      size,
            borderRadius: size / 2,
            overflow:     'hidden',
          }}
        >
          {/* Right half: covers 0–180° */}
          <View
            style={{
              position: 'absolute',
              width:    size / 2,
              height:   size,
              left:     size / 2,
              top:      0,
              overflow: 'hidden',
            }}
          >
            {/* Back-half arc (visible when deg > 180) */}
            <View
              style={{
                width:        size,
                height:       size,
                borderRadius: size / 2,
                borderWidth:  stroke,
                borderColor:  P.ACCENT,
                position:     'absolute',
                left:         -size / 2,
                transform:    [{ rotate: `${Math.max(0, deg - 180)}deg` }],
                opacity:      deg > 180 ? 1 : 0,
                ...iosShadow,
              }}
            />
            {/* Front-half arc (visible when deg ≤ 180) */}
            <View
              style={{
                width:        size,
                height:       size,
                borderRadius: size / 2,
                borderWidth:  stroke,
                borderColor:  P.ACCENT,
                position:     'absolute',
                left:         -size / 2,
                transform:    [{ rotate: `${Math.min(deg, 180)}deg` }],
                opacity:      deg <= 180 ? 1 : 0,
              }}
            />
          </View>

          {/* Left half: only rendered past 180° */}
          {deg > 180 && (
            <View
              style={{
                position: 'absolute',
                width:    size / 2,
                height:   size,
                left:     0,
                top:      0,
                overflow: 'hidden',
              }}
            >
              <View
                style={{
                  width:        size,
                  height:       size,
                  borderRadius: size / 2,
                  borderWidth:  stroke,
                  borderColor:  P.ACCENT,
                  position:     'absolute',
                  left:         0,
                  ...iosShadow,
                }}
              />
            </View>
          )}
        </View>
      )}

      {/* ── Centre label ───────────────────────────────────────────── */}
      <View
        style={{
          position:       'absolute',
          width:          size,
          height:         size,
          alignItems:     'center',
          justifyContent: 'center',
        }}
      >
        <Text
          style={{
            fontSize:      Math.round(size * 0.215),
            fontWeight:    '800',
            color:         P.ACCENT,
            letterSpacing: -1,
          }}
        >
          {remaining}
        </Text>
        <Text
          style={{
            fontSize:      9,
            color:         P.TEXT_MUT,
            fontWeight:    '700',
            textTransform: 'uppercase',
            letterSpacing: 0.8,
          }}
        >
          kcal left
        </Text>
      </View>
    </Animated.View>
  );
}

export default CalorieRing;
