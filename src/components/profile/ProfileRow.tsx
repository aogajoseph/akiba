import { Ionicons } from '@expo/vector-icons';
import { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type ProfileRowProps = {
  destructive?: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  subtitle?: string;
  title: string;
  trailing?: ReactNode;
};

export default function ProfileRow({
  destructive = false,
  icon,
  onPress,
  subtitle,
  title,
  trailing,
}: ProfileRowProps) {
  const content = (
    <View style={styles.row}>
      <View style={[styles.iconWrap, destructive ? styles.iconWrapDestructive : null]}>
        <Ionicons
          color={destructive ? '#b42318' : '#0f766e'}
          name={icon}
          size={18}
        />
      </View>
      <View style={styles.body}>
        <Text style={[styles.title, destructive ? styles.titleDestructive : null]}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {trailing ?? (onPress ? <Ionicons color="#94a3b8" name="chevron-forward" size={18} /> : null)}
    </View>
  );

  if (!onPress) {
    return content;
  }

  return (
    <Pressable android_ripple={{ color: '#eef2f6' }} onPress={onPress}>
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    minHeight: 68,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  iconWrap: {
    alignItems: 'center',
    backgroundColor: '#edf7f5',
    borderRadius: 12,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  iconWrapDestructive: {
    backgroundColor: '#fdecea',
  },
  body: {
    flex: 1,
    gap: 3,
  },
  title: {
    color: '#132238',
    fontSize: 15,
    fontWeight: '700',
  },
  titleDestructive: {
    color: '#b42318',
  },
  subtitle: {
    color: '#6b7280',
    fontSize: 13,
    lineHeight: 18,
  },
});
