import { Image, StyleSheet, Text, View } from 'react-native';

export default function AuthBrand({
  color,
}: {
  color: string;
}) {
  return (
    <View style={styles.row}>
      <Image source={require('../../../assets/images/logo.png')} style={styles.logo} />
      <Text style={[styles.label, { color }]}>Akiba</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  logo: {
    borderRadius: 8,
    height: 24,
    width: 24,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
});
