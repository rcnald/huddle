import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { colors } from '../theme';
import { AppIcon } from './Icon';

export function MapPreview({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <View accessibilityLabel={`Mapa da região de ${title}, ${subtitle}`} style={styles.map}>
      <Svg width="100%" height="100%" viewBox="0 0 360 150" preserveAspectRatio="xMidYMid slice">
        <Rect width="360" height="150" fill="#EEEFF1" />
        <Path
          d="M-20 38 C50 24 78 63 141 55 S252 5 382 32"
          fill="none"
          stroke="#DDEBDD"
          strokeWidth="36"
        />
        <Path
          d="M-10 116 C65 83 103 141 175 112 S283 67 379 93"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="20"
        />
        <Path
          d="M28 -10 C45 39 77 68 68 167 M157 -12 C139 39 165 93 151 169 M271 -4 C248 42 286 88 269 164"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="12"
        />
        <Path
          d="M-10 82 C61 72 91 101 143 82 S253 42 377 66"
          fill="none"
          stroke="#D8D5E7"
          strokeWidth="3"
          strokeDasharray="5 5"
        />
        <Circle cx="185" cy="78" r="27" fill={colors.primary} opacity="0.12" />
        <Circle cx="185" cy="78" r="15" fill={colors.primary} />
        <Circle cx="185" cy="78" r="5" fill="#FFFFFF" />
      </Svg>
      <View pointerEvents="none" style={styles.locationLabel}>
        <AppIcon name="location" size={14} color={colors.primary} />
        <View style={{ flex: 1 }}>
          <Text numberOfLines={1} style={styles.title}>
            {title}
          </Text>
          <Text numberOfLines={1} style={styles.subtitle}>
            {subtitle}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  map: { height: 148, borderRadius: 18, overflow: 'hidden', backgroundColor: '#EEEFF1' },
  locationLabel: {
    position: 'absolute',
    left: 10,
    bottom: 10,
    minHeight: 42,
    maxWidth: '88%',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 7,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: 'rgba(255,255,255,0.94)',
  },
  title: { color: colors.ink, fontFamily: 'Manrope', fontSize: 11, fontWeight: '700' },
  subtitle: { color: colors.muted, fontFamily: 'Manrope', fontSize: 9 },
});
