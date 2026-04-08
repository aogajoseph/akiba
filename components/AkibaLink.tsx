import { router } from 'expo-router';
import { StyleSheet, Text } from 'react-native';

import { parseAkibaLink } from '@/utils/linking';

type Props = {
  url: string;
};

export default function AkibaLink({ url }: Props) {
  const handlePress = () => {
    const { spaceId } = parseAkibaLink(url);

    if (spaceId) {
      router.push(`/spaces/${spaceId}`);
    }
  };

  return (
    <Text style={styles.link} onPress={handlePress}>
      {url}
    </Text>
  );
}

const styles = StyleSheet.create({
  link: {
    color: '#0f766e',
    fontSize: 15,
    lineHeight: 22,
    textDecorationLine: 'underline',
    fontWeight: '600',
  },
});
