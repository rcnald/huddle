import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, View } from 'react-native';
import { colors } from '../theme';
import { HuddleMark } from './HuddleMark';

export const BrandPlanContext = createContext(false);
const brandLetters = [
  { id: 'h-first', letter: 'h' },
  { id: 'u', letter: 'u' },
  { id: 'd-first', letter: 'd' },
  { id: 'd-second', letter: 'd' },
  { id: 'l', letter: 'l' },
  { id: 'e', letter: 'e' },
];

export function AnimatedBrand({ premium: explicitPremium }: { premium?: boolean }) {
  const planPremium = useContext(BrandPlanContext);
  const premium = explicitPremium ?? planPremium;
  const progress = useRef(new Animated.Value(0)).current;
  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReducedMotion);
    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReducedMotion,
    );
    return () => subscription.remove();
  }, []);
  useEffect(() => {
    if (reducedMotion) {
      progress.setValue(0);
      return;
    }
    const animation = Animated.loop(
      Animated.sequence([
        Animated.delay(3200),
        Animated.timing(progress, {
          toValue: 1,
          duration: 1600,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.delay(1800),
        Animated.timing(progress, {
          toValue: 0,
          duration: 1600,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => {
      animation.stop();
      progress.setValue(0);
    };
  }, [progress, reducedMotion]);
  const iconOpacity = progress.interpolate({
    inputRange: [0, 0.45, 0.7, 1],
    outputRange: [0, 0, 1, 1],
  });
  const iconRotation = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['-180deg', '360deg'],
  });
  return (
    <View
      accessibilityRole="text"
      accessibilityLabel={premium ? 'Huddle Plus' : 'Huddle'}
      style={{ width: 94, height: 32, alignItems: 'flex-start', justifyContent: 'center' }}
    >
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={{ flexDirection: 'row', alignItems: 'center' }}
      >
        {brandLetters.map(({ id, letter }, index) => (
          <Animated.Text
            key={id}
            style={{
              fontFamily: 'Manrope',
              color: colors.primary,
              fontSize: 20,
              fontWeight: '700',
              letterSpacing: -0.5,
              opacity: progress.interpolate({
                inputRange: [0, 0.45, 0.68, 1],
                outputRange: [1, 1, 0, 0],
              }),
              transform: [
                {
                  translateX: progress.interpolate({
                    inputRange: [0, 0.55, 1],
                    outputRange: [0, (2.5 - index) * 8 - 24, (2.5 - index) * 8 - 24],
                  }),
                },
                {
                  scale: progress.interpolate({
                    inputRange: [0, 0.55, 1],
                    outputRange: [1, 0.28, 0.28],
                  }),
                },
              ],
            }}
          >
            {letter}
          </Animated.Text>
        ))}
        {premium ? (
          <Animated.Text
            style={{
              fontFamily: 'Manrope',
              color: colors.primary,
              fontSize: 18,
              fontWeight: '700',
              opacity: progress.interpolate({
                inputRange: [0, 0.45, 0.68, 1],
                outputRange: [1, 1, 0, 0],
              }),
              transform: [
                {
                  translateX: progress.interpolate({
                    inputRange: [0, 0.55, 1],
                    outputRange: [0, -48, -48],
                  }),
                },
                {
                  scale: progress.interpolate({
                    inputRange: [0, 0.55, 1],
                    outputRange: [1, 0.28, 0.28],
                  }),
                },
              ],
            }}
          >
            +
          </Animated.Text>
        ) : null}
      </View>
      <Animated.View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={{
          position: 'absolute',
          left: 0,
          opacity: iconOpacity,
          transform: [
            { rotate: iconRotation },
            {
              scale: progress.interpolate({
                inputRange: [0, 0.55, 1],
                outputRange: [0.25, 0.45, 1],
              }),
            },
          ],
        }}
      >
        <HuddleMark size={26} premium={premium} />
      </Animated.View>
    </View>
  );
}
