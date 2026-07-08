import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { P, glowStyle, sharedStyles } from '../../constants/premiumTheme';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  title?: string;
  children?: React.ReactNode;
  onPress: () => void;
  variant?: ButtonVariant;
  fullWidth?: boolean;
  style?: ViewStyle | ViewStyle[];
  textStyle?: TextStyle | TextStyle[];
}

export function Button({
  title,
  children,
  onPress,
  variant = 'primary',
  fullWidth = false,
  style,
  textStyle,
}: ButtonProps) {
  const content = children || (title ? (
    <Text
      style={[
        styles.text,
        (styles as any)[`${variant}Text`],
        textStyle,
      ]}
    >
      {title}
    </Text>
  ) : null);

  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return [styles.primary, glowStyle(P.ACCENT, 12, 0.4)];
      case 'secondary':
        return styles.secondary;
      case 'ghost':
        return styles.ghost;
      default:
        return null;
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={[
        styles.base,
        getVariantStyles(),
        fullWidth && styles.fullWidth,
        style as any,
      ]}
    >
      {typeof content === 'string' ? (
        <Text
          style={[
            styles.text,
            (styles as any)[`${variant}Text`],
            textStyle,
          ]}
        >
          {content}
        </Text>
      ) : (
        content
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: P.RADIUS_SM,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullWidth: {
    width: '100%',
  },
  primary: {
    backgroundColor: P.ACCENT,
    borderWidth: 0,
  },
  secondary: {
    backgroundColor: P.CARD_BG,
    borderWidth: 1,
    borderColor: P.CARD_BORDER,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  text: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  primaryText: {
    color: '#000000', // Black text on green button for high contrast
    fontWeight: '900',
  },
  secondaryText: {
    color: P.TEXT_PRI,
  },
  ghostText: {
    color: P.ACCENT,
  },
});
