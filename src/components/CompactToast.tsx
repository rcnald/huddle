import { useEffect } from 'react';
import { AccessibilityInfo, Text, View } from 'react-native';
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
  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(message);
    const timer = setTimeout(onDismiss, 3200);
    return () => clearTimeout(timer);
  }, [message, onDismiss]);
  return (
    <View
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
    </View>
  );
}
