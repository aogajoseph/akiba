import { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

type ProfileSectionProps = {
  children: ReactNode;
  title: string;
};

export default function ProfileSection({ children, title }: ProfileSectionProps) {
  return (
    <View style={styles.section}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.card}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 10,
  },
  title: {
    color: '#526172',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  card: {
    backgroundColor: '#ffffff',
    borderColor: '#e7dfd1',
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
});
