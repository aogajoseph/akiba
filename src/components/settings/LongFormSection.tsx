import { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

type LongFormSectionProps = {
  children: ReactNode;
  title: string;
};

export default function LongFormSection({ children, title }: LongFormSectionProps) {
  return (
    <View style={styles.section}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.body}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    backgroundColor: '#ffffff',
    borderColor: '#e7dfd1',
    borderRadius: 22,
    borderWidth: 1,
    gap: 10,
    padding: 18,
  },
  title: {
    color: '#132238',
    fontSize: 17,
    fontWeight: '800',
  },
  body: {
    gap: 8,
  },
});
