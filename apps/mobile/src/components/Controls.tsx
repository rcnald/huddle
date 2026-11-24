import { useEffect, useState } from 'react';
import {
  Platform,
  Pressable,
  Text,
  TextInput,
  type TextInputProps,
  type TextStyle,
  View,
  type ViewStyle,
} from 'react-native';
import {
  GestureDetector,
  useExclusiveGestures,
  usePanGesture,
  useTapGesture,
} from 'react-native-gesture-handler';
import Animated, {
  cubicBezier,
  Easing,
  useAnimatedReaction,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { colors, radius } from '../theme';
import { AppIcon, type IconName } from './Icon';

const controlTransition = {
  transitionProperty: ['transform', 'backgroundColor', 'borderColor'],
  transitionDuration: ['140ms', '150ms', '150ms'],
  transitionTimingFunction: [cubicBezier(0.23, 1, 0.32, 1), 'ease', 'ease'],
} as unknown as ViewStyle;
const controlColorTransition = {
  transitionProperty: ['backgroundColor', 'borderColor'],
  transitionDuration: '150ms',
  transitionTimingFunction: 'ease',
} as unknown as ViewStyle;
const controlTextTransition = {
  transitionProperty: 'color',
  transitionDuration: '150ms',
  transitionTimingFunction: 'ease',
} as unknown as TextStyle;
const canHover =
  Platform.OS === 'web' &&
  typeof window !== 'undefined' &&
  window.matchMedia?.('(hover: hover) and (pointer: fine)').matches === true;

function clampSliderPosition(position: number, width: number) {
  'worklet';
  return Math.max(0, Math.min(width, position));
}

function sliderValueAtPosition(position: number, width: number, min: number, max: number) {
  'worklet';
  if (width <= 0 || max <= min) return min;
  const ratio = clampSliderPosition(position, width) / width;
  return Math.max(min, Math.min(max, Math.round(min + ratio * (max - min))));
}

function sliderPositionForValue(value: number, width: number, min: number, max: number) {
  'worklet';
  if (width <= 0 || max <= min) return 0;
  const boundedValue = Math.max(min, Math.min(max, value));
  return ((boundedValue - min) / (max - min)) * width;
}

export function ActionButton({
  title,
  icon,
  onPress,
  tone = 'primary',
  disabled = false,
  style,
}: {
  title: string;
  icon: IconName;
  onPress: () => void;
  tone?: 'primary' | 'soft' | 'glass' | 'danger';
  disabled?: boolean;
  style?: ViewStyle;
}) {
  const [hovered, setHovered] = useState(false);
  const [pressing, setPressing] = useState(false);
  const reducedMotion = useReducedMotion();
  const hoverActive = canHover && hovered && !disabled && !reducedMotion;
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      onPressIn={() => setPressing(true)}
      onPressOut={() => setPressing(false)}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      style={[styles.buttonHitArea, style]}
    >
      <Animated.View
        style={[
          styles.button,
          controlTransition,
          styles[tone],
          hoverActive && styles.buttonHovered,
          pressing && !disabled && !reducedMotion && styles.buttonPressed,
          pressing && !disabled && tone === 'primary' && styles.primaryPressed,
          pressing && !disabled && tone === 'soft' && styles.softPressed,
          pressing && !disabled && tone === 'glass' && styles.glassPressed,
          pressing && !disabled && tone === 'danger' && styles.dangerPressed,
          disabled && styles.buttonDisabled,
        ]}
      >
        <View>
          <AppIcon
            name={icon}
            size={18}
            color={tone === 'primary' || tone === 'danger' ? '#FFFFFF' : colors.primary}
          />
        </View>
        <Text
          style={[
            styles.buttonText,
            (tone === 'soft' || tone === 'glass') && styles.buttonTextSoft,
          ]}
        >
          {title}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

export function TextField({
  label,
  error,
  hint,
  ...props
}: TextInputProps & { label: string; error?: string; hint?: string }) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        placeholderTextColor="#88878D"
        {...props}
        style={[styles.input, error ? styles.inputError : null, props.style]}
      />
      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : hint ? (
        <Text style={styles.hint}>{hint}</Text>
      ) : null}
    </View>
  );
}

export function StepProgress({ step, labels }: { step: number; labels: [string, string] }) {
  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={styles.smallStrong}>Etapa {step} de 2</Text>
        <Text style={styles.hint}>{labels[step - 1]}</Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 5 }}>
        {[1, 2].map((n) => (
          <View
            key={n}
            style={{
              height: 4,
              flex: 1,
              borderRadius: 2,
              backgroundColor: n <= step ? colors.primary : '#DAD9E2',
            }}
          />
        ))}
      </View>
    </View>
  );
}

export function NumberStepper({
  label,
  value,
  onChange,
  min = 2,
  max = 30,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.stepper}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Diminuir vagas"
          disabled={value <= min}
          onPress={() => onChange(Math.max(min, value - 1))}
          style={[styles.stepperButton, value <= min && styles.controlDisabled]}
        >
          <AppIcon name="minus" size={17} color={colors.primary} />
        </Pressable>
        <Text style={styles.stepperValue}>{value}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Aumentar vagas"
          disabled={value >= max}
          onPress={() => onChange(Math.min(max, value + 1))}
          style={[styles.stepperButton, value >= max && styles.controlDisabled]}
        >
          <AppIcon name="plus" size={17} color={colors.primary} />
        </Pressable>
      </View>
      <Text style={styles.hint}>
        De {min} a {max} jogadores
      </Text>
    </View>
  );
}

export function LevelSlider({
  label,
  value,
  onChange,
  min = 0,
  max = 5,
  compact = false,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  compact?: boolean;
}) {
  const trackWidth = useSharedValue(0);
  const position = useSharedValue(0);
  const dragOffset = useSharedValue(0);
  const isDragging = useSharedValue(false);
  const lastReported = useSharedValue(value);
  const reducedMotion = useReducedMotion();
  const thumbSize = compact ? 12 : 20;
  const fillStyle = useAnimatedStyle(() => ({ width: position.get() }));
  const thumbStyle = useAnimatedStyle(() => {
    const width = trackWidth.get();
    const maxLeft = Math.max(0, width - thumbSize);
    const left = Math.max(0, Math.min(maxLeft, position.get() - thumbSize / 2));
    return { transform: [{ translateX: left }] };
  }, [thumbSize]);

  useEffect(() => {
    const width = trackWidth.get();
    if (width <= 0 || isDragging.get() || lastReported.get() === value) return;
    lastReported.set(value);
    position.set(sliderPositionForValue(value, width, min, max));
  }, [isDragging, lastReported, max, min, position, trackWidth, value]);

  useAnimatedReaction(
    () => {
      if (!isDragging.get()) return null;
      return sliderValueAtPosition(position.get(), trackWidth.get(), min, max);
    },
    (nextValue) => {
      if (nextValue === null || nextValue === lastReported.get()) return;
      lastReported.set(nextValue);
      scheduleOnRN(onChange, nextValue);
    },
    [max, min, onChange],
  );

  const tap = useTapGesture({
    maxDeltaX: 10,
    maxDeltaY: 10,
    onActivate: (event) => {
      const width = trackWidth.get();
      if (width <= 0) return;
      const nextValue = sliderValueAtPosition(event.x, width, min, max);
      const target = sliderPositionForValue(nextValue, width, min, max);
      if (nextValue !== lastReported.get()) {
        lastReported.set(nextValue);
        scheduleOnRN(onChange, nextValue);
      }
      position.set(
        reducedMotion
          ? target
          : withTiming(target, {
              duration: 120,
              easing: Easing.bezier(0.23, 1, 0.32, 1),
            }),
      );
    },
  });

  const pan = usePanGesture({
    activeOffsetX: [-10, 10],
    failOffsetY: [-10, 10],
    onBegin: (event) => {
      const width = trackWidth.get();
      const currentPosition = position.get();
      const currentLeft = Math.max(0, Math.min(width - thumbSize, currentPosition - thumbSize / 2));
      const thumbCenter = currentLeft + thumbSize / 2;
      dragOffset.set(Math.abs(event.x - thumbCenter) <= thumbSize ? thumbCenter - event.x : 0);
    },
    onActivate: (event) => {
      isDragging.set(true);
      position.set(clampSliderPosition(event.x + dragOffset.get(), trackWidth.get()));
    },
    onUpdate: (event) => {
      position.set(clampSliderPosition(event.x + dragOffset.get(), trackWidth.get()));
    },
    onDeactivate: (event) => {
      const width = trackWidth.get();
      if (width > 0) {
        const finalValue = sliderValueAtPosition(position.get(), width, min, max);
        if (finalValue !== lastReported.get()) {
          lastReported.set(finalValue);
          scheduleOnRN(onChange, finalValue);
        }
        const target = sliderPositionForValue(finalValue, width, min, max);
        position.set(
          reducedMotion
            ? target
            : withSpring(target, {
                duration: 400,
                dampingRatio: 1,
                velocity: event.velocityX,
                overshootClamping: true,
              }),
        );
      }
      isDragging.set(false);
    },
  });
  const sliderGesture = useExclusiveGestures(tap, pan);

  return (
    <View style={[styles.sliderBlock, compact && styles.sliderBlockCompact]}>
      <View style={[styles.sliderHeader, compact && styles.compactSliderHeader]}>
        <Text style={[styles.fieldLabel, compact && styles.compactSliderLabel]}>{label}</Text>
        <Text style={styles.sliderValue}>{value} / 5</Text>
      </View>
      <GestureDetector gesture={sliderGesture} touchAction="pan-y">
        <View
          onLayout={(event) => {
            const width = event.nativeEvent.layout.width;
            trackWidth.set(width);
            position.set(sliderPositionForValue(value, width, min, max));
            lastReported.set(value);
          }}
          accessibilityRole="adjustable"
          accessibilityLabel={label}
          accessibilityValue={{ min, max, now: value }}
          style={[styles.sliderTouch, compact && styles.compactSliderTouch]}
        >
          <View style={[styles.sliderTrack, compact && styles.compactSliderTrack]} />
          <Animated.View
            style={[styles.sliderFill, compact && styles.compactSliderFill, fillStyle]}
          />
          <Animated.View
            style={[
              styles.sliderThumb,
              compact && styles.compactSliderThumb,
              { width: thumbSize, height: thumbSize, borderRadius: thumbSize / 2, left: 0 },
              thumbStyle,
            ]}
          />
        </View>
      </GestureDetector>
    </View>
  );
}

export function SelectCard({
  title,
  description,
  selected,
  onPress,
  icon,
}: {
  title: string;
  description: string;
  selected: boolean;
  onPress: () => void;
  icon: IconName;
}) {
  const reducedMotion = useReducedMotion();
  const [pressing, setPressing] = useState(false);
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      onPressIn={() => setPressing(true)}
      onPressOut={() => setPressing(false)}
      style={styles.selectCardHitArea}
    >
      <Animated.View
        style={[
          styles.selectCard,
          controlTransition,
          selected && styles.selectCardSelected,
          pressing && !reducedMotion && styles.selectCardPressed,
        ]}
      >
        <Animated.View
          style={[styles.selectIcon, controlColorTransition, selected && styles.selectIconSelected]}
        >
          <AppIcon name={icon} size={18} color={selected ? colors.primary : colors.muted} />
        </Animated.View>
        <View style={{ flex: 1, gap: 4 }}>
          <Animated.Text
            style={[
              styles.selectTitle,
              controlTextTransition,
              selected && styles.selectTitleSelected,
            ]}
          >
            {title}
          </Animated.Text>
          <Text style={styles.hint}>{description}</Text>
        </View>
        <Animated.View
          style={[styles.radio, controlColorTransition, selected && styles.radioSelected]}
        >
          {selected ? <View style={styles.radioCenter} /> : null}
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

const styles = {
  buttonHitArea: { alignSelf: 'stretch' as const },
  button: {
    minHeight: 50,
    width: '100%' as const,
    borderRadius: radius.pill,
    paddingHorizontal: 18,
    flexDirection: 'row' as const,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    gap: 8,
  },
  primary: { backgroundColor: colors.primary },
  danger: { backgroundColor: colors.danger },
  soft: { backgroundColor: colors.lavender },
  glass: { backgroundColor: 'rgba(255,255,255,0.7)', borderWidth: 1, borderColor: '#FFFFFF' },
  buttonText: { fontFamily: 'Manrope', fontWeight: '700' as const, fontSize: 14, color: '#FFFFFF' },
  buttonTextSoft: { color: colors.primaryDark },
  buttonDisabled: { opacity: 0.48 },
  buttonHovered: {
    transform: [{ translateY: -1 }],
    shadowColor: '#4638A1',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  buttonPressed: { transform: [{ scale: 0.97 }] },
  primaryPressed: { backgroundColor: colors.primaryDark },
  dangerPressed: { backgroundColor: '#84212C' },
  softPressed: { backgroundColor: '#E7E3FC' },
  glassPressed: { backgroundColor: 'rgba(255,255,255,0.94)' },
  fieldWrap: { gap: 7 },
  fieldLabel: {
    fontFamily: 'Manrope',
    fontSize: 13,
    fontWeight: '700' as const,
    color: colors.ink,
  },
  input: {
    minHeight: 50,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: 'rgba(255,255,255,0.88)',
    paddingHorizontal: 14,
    color: colors.ink,
    fontFamily: 'Manrope',
    fontSize: 14,
  },
  inputError: { borderColor: colors.danger },
  errorText: { color: colors.danger, fontFamily: 'Manrope', fontSize: 12 },
  hint: { color: colors.muted, fontFamily: 'Manrope', fontSize: 12, lineHeight: 17 },
  smallStrong: {
    color: colors.primary,
    fontFamily: 'Manrope',
    fontSize: 12,
    fontWeight: '700' as const,
  },
  stepper: {
    minHeight: 56,
    padding: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
  },
  stepperButton: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: colors.lavender,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  stepperValue: {
    color: colors.ink,
    fontFamily: 'Manrope',
    fontSize: 20,
    fontWeight: '700' as const,
    fontVariant: ['tabular-nums'] as const,
  },
  controlDisabled: { opacity: 0.35 },
  sliderBlock: { gap: 4 },
  sliderBlockCompact: { gap: 2 },
  sliderHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
  },
  compactSliderHeader: { minHeight: 18 },
  sliderValue: {
    color: colors.primary,
    fontFamily: 'Manrope',
    fontSize: 13,
    fontWeight: '700' as const,
  },
  compactSliderLabel: { fontSize: 13 },
  sliderTouch: { height: 42, justifyContent: 'center' as const },
  compactSliderTouch: { height: 22 },
  sliderTrack: { height: 4, borderRadius: 2, backgroundColor: '#D8D8DD' },
  compactSliderTrack: { height: 3 },
  sliderFill: {
    position: 'absolute' as const,
    left: 0,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#9C90E8',
  },
  compactSliderFill: { height: 3 },
  sliderThumb: {
    position: 'absolute' as const,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  compactSliderThumb: { borderWidth: 1.5 },
  selectCard: {
    minHeight: 68,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
  },
  selectCardHitArea: { alignSelf: 'stretch' as const },
  selectCardSelected: {
    borderColor: '#7566D9',
    backgroundColor: colors.lavender,
    borderWidth: 1.5,
  },
  selectCardPressed: { transform: [{ scale: 0.985 }] },
  selectIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F2F6',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  selectIconSelected: { backgroundColor: '#FFFFFF' },
  selectTitle: {
    fontFamily: 'Manrope',
    fontSize: 14,
    fontWeight: '700' as const,
    color: colors.ink,
  },
  selectTitleSelected: { color: colors.primaryDark },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: '#B7B6C0',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  radioSelected: { borderColor: colors.primary, backgroundColor: colors.primary },
  radioCenter: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FFFFFF' },
};

export const controlStyles = styles;
