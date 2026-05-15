import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

type InviteMembersModalProps = {
  onClose: () => void;
  onCopyLink: () => void;
  onFromContacts: () => void;
  onShareSpace: () => void;
  visible: boolean;
};

export default function InviteMembersModal({
  onClose,
  onCopyLink,
  onFromContacts,
  onShareSpace,
  visible,
}: InviteMembersModalProps) {
  return (
    <Modal
      animationType="fade"
      onRequestClose={onClose}
      transparent
      visible={visible}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>Invite Members</Text>

          <Pressable onPress={onFromContacts} style={styles.modalButton}>
            <Text style={styles.modalButtonText}>From Contacts</Text>
          </Pressable>

          <Pressable onPress={onShareSpace} style={styles.modalButton}>
            <Text style={styles.modalButtonText}>Share this Space</Text>
          </Pressable>

          <Pressable onPress={onCopyLink} style={styles.modalButton}>
            <Text style={styles.modalButtonText}>Copy Invite Link</Text>
          </Pressable>

          <Pressable onPress={onClose} style={styles.modalCancel}>
            <Text style={styles.modalCancelText}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
    flex: 1,
    justifyContent: 'center',
  },
  modalContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    gap: 14,
    padding: 20,
    width: '85%',
  },
  modalTitle: {
    color: '#132238',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  modalButton: {
    alignItems: 'center',
    backgroundColor: '#edf4f2',
    borderRadius: 14,
    paddingVertical: 14,
  },
  modalButtonText: {
    color: '#132238',
    fontSize: 15,
    fontWeight: '600',
  },
  modalCancel: {
    alignItems: 'center',
    marginTop: 6,
  },
  modalCancelText: {
    color: '#b42318',
    fontWeight: '600',
  },
});
