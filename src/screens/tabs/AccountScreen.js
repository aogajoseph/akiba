import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, Modal } from 'react-native';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

// Local assets
import coverImg from '../../../assets/cover.jpg';

// Components
import DepositModal from '../../components/DepositModal';
import TransferModal from '../../components/TransferModal';

export default function AccountScreen() {
  const [coverPhoto, setCoverPhoto] = useState(coverImg);
  const [depositVisible, setDepositVisible] = useState(false);
  const [transferVisible, setTransferVisible] = useState(false);

  const pickCoverPhoto = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 1,
    });

    if (!result.canceled) {
      setCoverPhoto({ uri: result.assets[0].uri });
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Cover Photo */}
      <View style={styles.coverContainer}>
        <Image source={coverPhoto} style={styles.coverImage} resizeMode="cover" />
        <TouchableOpacity style={styles.cameraIcon} onPress={pickCoverPhoto}>
          <Ionicons name="camera-outline" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Account Name & Label */}
      <Text style={styles.accountName}>John Doe's Family</Text>
      <Text style={styles.akibaLabel}>Akiba Account</Text>

      {/* Account Info Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Account Info</Text>
        <Text style={styles.description}>
          This account was created to manage shared goals for John's Family in a transparent and organized space.
        </Text>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Account ID:</Text>
          <Text style={styles.infoValue}>AKB-JFY-001</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Account Type:</Text>
          <Text style={styles.infoValue}>Akiba Basic</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Created By:</Text>
          <Text style={styles.infoValue}>John Doe</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Creation Date:</Text>
          <Text style={styles.infoValue}>June 13, 2025</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Invitation Link:</Text>
          <Text style={[styles.infoValue, styles.link]}>https://akiba/jfy001/invite/</Text>
        </View>

        {/* New Financial Stats Section */}
        <View style={styles.statsContainer}>
          <View style={styles.statsRow}>
            <Text style={styles.statsLabel}>Current Balance:</Text>
            <Text style={styles.statsValue}>KSh 124,500.00</Text>
          </View>
          <View style={styles.statsRow}>
            <Text style={styles.statsLabel}>Saving Goals:</Text>
            <Text style={styles.statsValue}>2/5</Text>
          </View>
          <View style={styles.statsRow}>
            <Text style={styles.statsLabel}>Total Members:</Text>
            <Text style={styles.statsValue}>25</Text>
          </View>
        </View>
      </View>

      {/* Action Buttons */}
      <TouchableOpacity style={[styles.button, styles.depositButton]} onPress={() => setDepositVisible(true)}>
        <Text style={styles.buttonText}>Deposit Funds</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.button, styles.transferButton]} onPress={() => setTransferVisible(true)}>
        <Text style={styles.buttonText}>Make a Transfer</Text>
      </TouchableOpacity>

      {/* Modals */}
      <Modal visible={depositVisible} animationType="slide" transparent>
        <DepositModal onClose={() => setDepositVisible(false)} />
      </Modal>

      <Modal visible={transferVisible} animationType="slide" transparent>
        <TransferModal onClose={() => setTransferVisible(false)} />
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 20,
  },
  coverContainer: {
    width: '100%',
    height: 180,
    position: 'relative',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  cameraIcon: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 6,
    borderRadius: 20,
  },
  accountName: {
    fontSize: 22,
    fontWeight: '700',
    marginTop: 12,
    marginHorizontal: 16,
  },
  akibaLabel: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    marginHorizontal: 16,
    marginBottom: 8,
  },
  card: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 12,
    padding: 16,
    borderRadius: 8,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#555',
    marginBottom: 12,
    lineHeight: 20,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  infoLabel: {
    fontWeight: '600',
    width: 120,
    fontSize: 14,
  },
  infoValue: {
    fontSize: 14,
    color: '#333',
  },
  link: {
    color: '#007AFF',
  },
  statsContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  statsRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  statsLabel: {
    fontWeight: '600',
    width: 140,
    fontSize: 14,
  },
  statsValue: {
    fontSize: 14,
    color: '#333',
  },
  button: {
    marginHorizontal: 16,
    marginTop: 12,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  depositButton: {
    backgroundColor: '#2e7d32', // Green
  },
  transferButton: {
    backgroundColor: '#f9a825', // Warm yellow
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
