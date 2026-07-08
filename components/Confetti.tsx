import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  withDelay, 
  Easing 
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const CONFETTI_COLORS = [
  '#39FF6A', // Neon green
  '#00fbfb', // Neon cyan
  '#ff007f', // Hot pink
  '#a855f7', // Purple
  '#00ff66', // Electric green
];

interface ParticleProps {
  index: number;
}

function ConfettiParticle({ index }: ParticleProps) {
  const size = Math.random() * 8 + 6;
  const startX = Math.random() * SCREEN_WIDTH;
  const color = CONFETTI_COLORS[index % CONFETTI_COLORS.length];
  const isCircle = Math.random() > 0.5;

  const translateY = useSharedValue(-50);
  const translateX = useSharedValue(0);
  const rotate = useSharedValue(0);
  const opacity = useSharedValue(1);

  useEffect(() => {
    const duration = Math.random() * 2000 + 2500; // 2.5s - 4.5s
    const delay = Math.random() * 1500; // Up to 1.5s delay
    const drift = (Math.random() - 0.5) * 150; // Random horizontal drift

    translateY.value = withDelay(
      delay,
      withTiming(SCREEN_HEIGHT + 50, {
        duration,
        easing: Easing.out(Easing.quad),
      })
    );

    translateX.value = withDelay(
      delay,
      withTiming(drift, {
        duration,
        easing: Easing.linear,
      })
    );

    rotate.value = withDelay(
      delay,
      withTiming(Math.random() * 720 - 360, {
        duration,
        easing: Easing.linear,
      })
    );

    opacity.value = withDelay(
      delay + duration - 500,
      withTiming(0, {
        duration: 500,
        easing: Easing.linear,
      })
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateY: translateY.value },
        { translateX: translateX.value },
        { rotate: `${rotate.value}deg` },
      ],
      opacity: opacity.value,
    };
  });

  return (
    <Animated.View
      style={[
        styles.particle,
        animatedStyle,
        {
          width: size,
          height: isCircle ? size : size * 1.5,
          borderRadius: isCircle ? size / 2 : 2,
          backgroundColor: color,
          left: startX,
        },
      ]}
    />
  );
}

export default function Confetti({ count = 60 }: { count?: number }) {
  const particles = Array.from({ length: count });

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {particles.map((_, i) => (
        <ConfettiParticle key={i} index={i} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  particle: {
    position: 'absolute',
    top: 0,
    zIndex: 9999,
  },
});
