import React from 'react';
import { View, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { P, glowStyle, sharedStyles } from '../../constants/premiumTheme';

interface CardProps {
  children: React.ReactNode;
  onPress?: () => void;
  variant?: 'default' | 'glow' | 'elevated' | 'compact' | 'active' | 'glass';
  style?: ViewStyle | ViewStyle[];
  accentBar?: boolean;
  accentColor?: string;
}

export function Card({
  children,
  onPress,
  variant = 'default',
  style,
  accentBar = false,
  accentColor = P.ACCENT,
}: CardProps) {
  const cardContent = (
    <>
      {accentBar && (
        <View
          style={[
            styles.accentBar,
            { backgroundColor: accentColor },
          ]}
        />
      )}
      {children}
    </>
  );

  const getVariantStyles = () => {
    switch (variant) {
      case 'glow':
      case 'active':
        return [styles.glow, glowStyle(P.ACCENT, 12, 0.25)];
      case 'elevated':
        return styles.elevated;
      case 'compact':
        return styles.compact;
      case 'glass':
        return styles.glass;
      default:
        return null;
    }
  };

  if (onPress) {
    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onPress}
        style={[
          styles.base,
          getVariantStyles(),
          style as any,
        ]}
      >
        {cardContent}
      </TouchableOpacity>
    );
  }

  return (
    <View
      style={[
        styles.base,
        getVariantStyles(),
        style as any,
      ]}
    >
      {cardContent}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: P.CARD_BG,
    borderRadius: P.RADIUS_CARD,
    borderWidth: 1,
    borderColor: P.CARD_BORDER,
    padding: 20,
    overflow: 'hidden', // clips the accentBar border radius correctly
  },
  glow: {
    borderColor: P.ACCENT_BORDER,
  },
  elevated: {
    backgroundColor: '#121612',
    borderColor: 'rgba(255,255,255,0.08)',
  },
  compact: {
    padding: 12,
    borderRadius: 14,
  },
  glass: {
    backgroundColor: 'rgba(10, 13, 10, 0.65)',
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  accentBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    zIndex: 1,
  },
});
