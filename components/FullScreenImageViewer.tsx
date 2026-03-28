import { Image, Modal, Pressable, StyleSheet, View } from 'react-native';

type FullScreenImageViewerProps = {
  visible: boolean;
  imageUrl: string | null;
  onClose: () => void;
};

export default function FullScreenImageViewer({
  visible,
  imageUrl,
  onClose,
}: FullScreenImageViewerProps) {
  if (!imageUrl) {
    return null;
  }

  return (
    <Modal
      animationType="fade"
      onRequestClose={onClose}
      transparent
      visible={visible}>
      <Pressable onPress={onClose} style={styles.overlay}>
        <View style={styles.container}>
          <Image
            resizeMode="contain"
            source={{ uri: imageUrl }}
            style={styles.image}
          />
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.9)',
    flex: 1,
    justifyContent: 'center',
  },
  container: {
    height: '70%',
    width: '100%',
  },
  image: {
    height: '100%',
    width: '100%',
  },
});
