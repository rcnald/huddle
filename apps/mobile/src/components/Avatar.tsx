import { Text, View } from 'react-native';
import { colors } from '../theme';
import type { Player } from '../types';
import { initials } from '../utils';

export function Avatar({ name, color, size = 40 }: { name: string; color: string; size?: number }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text
        style={{
          fontFamily: 'Manrope',
          fontSize: Math.max(9, size * 0.31),
          fontWeight: '700',
          color: colors.ink,
        }}
      >
        {initials(name)}
      </Text>
    </View>
  );
}

export function AvatarStack({
  players,
  size = 28,
  limit = 3,
}: {
  players: Player[];
  size?: number;
  limit?: number;
}) {
  const shown = players.slice(0, limit);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      {shown.map((player, index) => (
        <View
          key={player.id}
          style={{
            marginLeft: index ? -7 : 0,
            zIndex: limit - index,
            borderWidth: 2,
            borderColor: '#FFFFFF',
            borderRadius: size / 2,
          }}
        >
          <Avatar name={player.name} color={player.color} size={size} />
        </View>
      ))}
      {players.length > limit ? (
        <View
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            marginLeft: -7,
            backgroundColor: colors.lavender,
            borderWidth: 2,
            borderColor: '#FFFFFF',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text
            style={{
              color: colors.primaryDark,
              fontFamily: 'Manrope',
              fontSize: 9,
              fontWeight: '700',
            }}
          >
            +{players.length - limit}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
