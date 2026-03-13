import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { colors } from '../theme/colors';

export default function GoldButton({
  title,
  onPress,
  loading = false,
  disabled = false,
  variant = 'filled', // 'filled' | 'outline' | 'ghost'
  style,
  textStyle,
}) {
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      style={[
        styles.button,
        variant === 'filled' && styles.filled,
        variant === 'outline' && styles.outline,
        variant === 'ghost' && styles.ghost,
        isDisabled && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.75}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'filled' ? colors.background : colors.gold}
          size="small"
        />
      ) : (
        <Text
          style={[
            styles.text,
            variant === 'filled' && styles.textFilled,
            variant === 'outline' && styles.textOutline,
            variant === 'ghost' && styles.textGhost,
            isDisabled && styles.textDisabled,
            textStyle,
          ]}
        >
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  filled: {
    backgroundColor: colors.gold,
  },
  outline: {
    borderWidth: 1.5,
    borderColor: colors.gold,
    backgroundColor: 'transparent',
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  disabled: {
    opacity: 0.4,
  },
  text: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  textFilled: {
    color: colors.background,
  },
  textOutline: {
    color: colors.gold,
  },
  textGhost: {
    color: colors.gold,
  },
  textDisabled: {
    color: colors.muted,
  },
});
