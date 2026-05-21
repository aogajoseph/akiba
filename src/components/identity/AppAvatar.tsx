import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type AvatarSize = 'small' | 'medium' | 'large' | 'xlarge';

type AppAvatarProps = {
  avatarUrl?: string | null;
  onPress?: () => void;
  size?: AvatarSize;
  username?: string | null;
};

const SIZE_MAP: Record<AvatarSize, number> = {
  small: 36,
  medium: 48,
  large: 88,
  xlarge: 180,
};

const FONT_SIZE_MAP: Record<AvatarSize, number> = {
  small: 14,
  medium: 18,
  large: 30,
  xlarge: 48,
};

const getInitial = (username?: string | null): string => {
  const normalized = username?.trim().replace(/^@+/, '') ?? '';

  if (!normalized) {
    return '?';
  }

  return normalized.charAt(0).toUpperCase();
};

export default function AppAvatar({
  avatarUrl,
  onPress,
  size = 'medium',
  username,
}: AppAvatarProps) {
  const dimension = SIZE_MAP[size];
  const content = (
    <View
      style={[
        styles.avatar,
        {
          borderRadius: dimension / 2,
          height: dimension,
          width: dimension,
        },
      ]}>
      {avatarUrl ? (
        <Image
          contentFit="cover"
          source={{ uri: avatarUrl }}
          style={[
            styles.image,
            {
              borderRadius: dimension / 2,
            },
          ]}
        />
      ) : (
        <View
          style={[
            styles.fallback,
            {
              borderRadius: dimension / 2,
            },
          ]}>
          <Text
            style={[
              styles.initial,
              {
                fontSize: FONT_SIZE_MAP[size],
              },
            ]}>
            {getInitial(username)}
          </Text>
        </View>
      )}
    </View>
  );

  if (!onPress) {
    return content;
  }

  return (
    <Pressable
      accessibilityRole="button"
      hitSlop={8}
      onPress={onPress}
      style={styles.pressable}>
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    alignSelf: 'flex-start',
  },
  avatar: {
    overflow: 'hidden',
  },
  image: {
    height: '100%',
    width: '100%',
  },
  fallback: {
    alignItems: 'center',
    backgroundColor: '#0f766e',
    height: '100%',
    justifyContent: 'center',
    width: '100%',
  },
  initial: {
    color: '#ffffff',
    fontWeight: '800',
  },
});
