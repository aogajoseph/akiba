import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import AppAvatar from '@/src/components/identity/AppAvatar';

type AvatarViewerModalProps = {
  avatarUrl?: string | null;
  onClose: () => void;
  username?: string | null;
  visible: boolean;
};

export default function AvatarViewerModal({
  avatarUrl,
  onClose,
  username,
  visible,
}: AvatarViewerModalProps) {
  const normalizedUsername = username?.trim().replace(/^@+/, '') ?? 'user';

  return (
    <Modal
      animationType="fade"
      onRequestClose={onClose}
      transparent
      visible={visible}>
      <Pressable onPress={onClose} style={styles.overlay}>
        <View style={styles.card}>
          <AppAvatar avatarUrl={avatarUrl} size="xlarge" username={normalizedUsername} />
          <Text style={styles.username}>@{normalizedUsername}</Text>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.82)',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    alignItems: 'center',
    backgroundColor: '#132238',
    borderRadius: 28,
    gap: 12,
    paddingHorizontal: 28,
    paddingVertical: 30,
  },
  username: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '800',
  },
});
