import { View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { colors } from '../theme';

const wheel = [
  {
    id: 'north',
    path: 'M44.1 29.7q5.646-5.365 12.879-8.254 7.233-2.889 15.021-2.889 7.788 0 15.021 2.889 7.233 2.889 12.879 8.254l-11.7 12.6q-3.268-3.135-7.47-4.825-4.201-1.69-8.73-1.69-4.529 0-8.73 1.69-4.202 1.69-7.47 4.825z',
  },
  {
    id: 'east',
    path: 'M114.3 44.1q5.365 5.646 8.254 12.879 2.889 7.233 2.889 15.021 0 7.788-2.889 15.021-2.889 7.233-8.254 12.879l-12.6-11.7q3.135-3.268 4.825-7.47 1.69-4.201 1.69-8.73 0-4.529-1.69-8.73-1.69-4.202-4.825-7.47z',
  },
  {
    id: 'south',
    path: 'M99.9 114.3q-5.646 5.365-12.879 8.254-7.233 2.889-15.021 2.889-7.788 0-15.021-2.889-7.233-2.889-12.879-8.254l11.7-12.6q3.268 3.135 7.47 4.825 4.201 1.69 8.73 1.69 4.529 0 8.73-1.69 4.202-1.69 7.47-4.825z',
  },
  {
    id: 'west',
    path: 'M29.7 99.9q-5.365-5.646-8.254-12.879-2.889-7.233-2.889-15.021 0-7.788 2.889-15.021 2.889-7.233 8.254-12.879l12.6 11.7q-3.135 3.268-4.825 7.47-1.69 4.201-1.69 8.73 0 4.529 1.69 8.73 1.69 4.202 4.825 7.47z',
  },
];
const people = [
  { id: 'north', cx: 72, cy: 17.1 },
  { id: 'east', cx: 126.9, cy: 72 },
  { id: 'south', cx: 72, cy: 126.9 },
  { id: 'west', cx: 17.1, cy: 72 },
];

export function HuddleMark({
  size = 24,
  premium = false,
  color = colors.primary,
}: {
  size?: number;
  premium?: boolean;
  color?: string;
}) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 144 144"
      accessibilityLabel={premium ? 'Huddle Plus' : 'Huddle'}
    >
      {wheel.map(({ id, path }) => (
        <Path key={id} d={path} fill={color} />
      ))}
      {people.map(({ id, cx, cy }) => (
        <Circle key={id} cx={cx} cy={cy} r={8.1} fill={color} />
      ))}
      {premium ? (
        <>
          <Rect x={60} y={68.5} width={24} height={7} rx={2.5} fill={color} />
          <Rect x={68.5} y={60} width={7} height={24} rx={2.5} fill={color} />
        </>
      ) : null}
    </Svg>
  );
}

export function HuddleAppIcon({ size = 64 }: { size?: number }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <HuddleMark size={size * 0.98} />
    </View>
  );
}

export const huddleAppIconSource = require('../../assets/icon.png');
export const sportIllustrations = {
  football: require('../../assets/illustrations/sports/football-transparent.png'),
  basketball: require('../../assets/illustrations/sports/basketball-transparent.png'),
  volleyball: require('../../assets/illustrations/sports/volleyball-transparent.png'),
  handball: require('../../assets/illustrations/sports/handball-transparent.png'),
  dodgeball: require('../../assets/illustrations/sports/dodgeball-transparent.png'),
} as const;
