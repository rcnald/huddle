import { useCallback, useMemo, useState } from 'react';
import {
  PanResponder,
  Platform,
  Pressable,
  Text,
  TextInput,
  type TextInputProps,
  View,
  type ViewStyle,
} from 'react-native';
import { colors, radius } from '../theme';
import { AppIcon, type IconName } from './Icon';

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
  tone?: 'primary' | 'soft' | 'glass';
  disabled?: boolean;
  style?: ViewStyle;
}) {
  const [hovered, setHovered] = useState(false);
  const [pressing, setPressing] = useState(false);
  const iconActive = hovered || pressing;
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      onPressIn={() => setPressing(true)}
      onPressOut={() => setPressing(false)}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      style={({ pressed }) => [
        styles.button,
        styles[tone],
        hovered && !disabled && styles.buttonHovered,
        pressed && !disabled && styles.buttonPressed,
        pressed && !disabled && tone === 'primary' && styles.primaryPressed,
        pressed && !disabled && tone === 'soft' && styles.softPressed,
        pressed && !disabled && tone === 'glass' && styles.glassPressed,
        disabled && styles.buttonDisabled,
        style,
      ]}
    >
      <View
        style={[
          styles.buttonIcon,
          iconActive && icon === 'search' && styles.searchIconHovered,
          iconActive && icon === 'arrow' && styles.arrowIconHovered,
          iconActive && icon === 'plus' && styles.plusIconHovered,
        ]}
      >
        <AppIcon name={icon} size={18} color={tone === 'primary' ? '#FFFFFF' : colors.primary} />
      </View>
      <Text style={[styles.buttonText, tone !== 'primary' && styles.buttonTextSoft]}>{title}</Text>
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
  const [width, setWidth] = useState(0);
  const update = useCallback(
    (x: number) => {
      if (width > 0)
        onChange(Math.max(min, Math.min(max, Math.round((x / width) * (max - min) + min))));
    },
    [width, min, max, onChange],
  );
  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (e) => update(e.nativeEvent.locationX),
        onPanResponderMove: (e) => update(e.nativeEvent.locationX),
      }),
    [update],
  );
  const progress = width ? ((value - min) / (max - min)) * width : 0;
  const thumbSize = compact ? 12 : 20;
  return (
    <View style={[styles.sliderBlock, compact && styles.sliderBlockCompact]}>
      <View style={[styles.sliderHeader, compact && styles.compactSliderHeader]}>
        <Text style={[styles.fieldLabel, compact && styles.compactSliderLabel]}>{label}</Text>
        <Text style={styles.sliderValue}>{value} / 5</Text>
      </View>
      <View
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        {...responder.panHandlers}
        accessibilityRole="adjustable"
        accessibilityLabel={label}
        accessibilityValue={{ min, max, now: value }}
        style={[styles.sliderTouch, compact && styles.compactSliderTouch]}
      >
        <View style={[styles.sliderTrack, compact && styles.compactSliderTrack]} />
        <View
          style={[styles.sliderFill, compact && styles.compactSliderFill, { width: progress }]}
        />
        <View
          style={[
            styles.sliderThumb,
            compact && styles.compactSliderThumb,
            {
              width: thumbSize,
              height: thumbSize,
              borderRadius: thumbSize / 2,
              left: Math.max(0, Math.min(width - thumbSize, progress - thumbSize / 2)),
            },
          ]}
        />
      </View>
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
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={[styles.selectCard, selected && styles.selectCardSelected]}
    >
      <View style={[styles.selectIcon, selected && styles.selectIconSelected]}>
        <AppIcon name={icon} size={18} color={selected ? colors.primary : colors.muted} />
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={[styles.selectTitle, selected && styles.selectTitleSelected]}>{title}</Text>
        <Text style={styles.hint}>{description}</Text>
      </View>
      <View style={[styles.radio, selected && styles.radioSelected]}>
        {selected ? <View style={styles.radioCenter} /> : null}
      </View>
    </Pressable>
  );
}

const styles = {
  button: {
    minHeight: 50,
    borderRadius: radius.pill,
    paddingHorizontal: 18,
    flexDirection: 'row' as const,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    gap: 8,
    ...Platform.select({
      web: {
        transitionProperty: 'transform, background-color, box-shadow',
        transitionDuration: '150ms',
        transitionTimingFunction: 'cubic-bezier(0.23, 1, 0.32, 1)',
      } as unknown as ViewStyle,
    }),
  },
  primary: { backgroundColor: colors.primary },
  soft: { backgroundColor: colors.lavender },
  glass: { backgroundColor: 'rgba(255,255,255,0.7)', borderWidth: 1, borderColor: '#FFFFFF' },
  buttonIcon: {
    ...Platform.select({
      web: {
        transitionProperty: 'transform',
        transitionDuration: '220ms',
        transitionTimingFunction: 'cubic-bezier(0.23, 1, 0.32, 1)',
      } as unknown as ViewStyle,
    }),
  },
  searchIconHovered: { transform: [{ rotate: '-12deg' }, { scale: 1.08 }] },
  arrowIconHovered: { transform: [{ translateX: 3 }] },
  plusIconHovered: { transform: [{ rotate: '45deg' }] },
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
  buttonPressed: { transform: [{ translateY: -1 }, { scale: 1.01 }] },
  primaryPressed: { backgroundColor: colors.primaryDark },
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
  selectCardSelected: {
    borderColor: '#7566D9',
    backgroundColor: colors.lavender,
    borderWidth: 1.5,
  },
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
