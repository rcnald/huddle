import { useEffect, useMemo } from 'react';
import { AccessibilityInfo, Text, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeOut,
  FadeOutDown,
  useReducedMotion,
} from 'react-native-reanimated';
import { AppIcon } from './Icon';
export function CompactToast({
  message,
  onDismiss,
  bottom = 94,
}: {
  message: string;
  onDismiss: () => void;
  bottom?: number;
}) {
  const reducedMotion = useReducedMotion();
  const entering = useMemo(
    () =>
      reducedMotion
        ? FadeIn.duration(160)
        : FadeInDown.duration(220).easing(Easing.bezier(0.23, 1, 0.32, 1)),
    [reducedMotion],
  );
  const exiting = useMemo(
    () =>
      reducedMotion
        ? FadeOut.duration(120)
        : FadeOutDown.duration(180).easing(Easing.bezier(0.23, 1, 0.32, 1)),
    [reducedMotion],
  );
  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(message);
    const timer = setTimeout(onDismiss, 3200);
    return () => clearTimeout(timer);
  }, [message, onDismiss]);
  return (
    <Animated.View
      entering={entering}
      exiting={exiting}
      accessibilityRole="alert"
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: 20,
        right: 20,
        bottom,
        minHeight: 56,
        paddingHorizontal: 16,
        borderRadius: 18,
        backgroundColor: '#252228',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        zIndex: 200,
        elevation: 10,
      }}
    >
      <AppIcon name="check" size={20} color="#C8BFFF" />
      <Text
        style={{
          flex: 1,
          fontFamily: 'Manrope',
          fontWeight: '700',
          fontSize: 14,
          color: '#FFFFFF',
        }}
      >
        {message}
      </Text>
    </Animated.View>
  );
}
