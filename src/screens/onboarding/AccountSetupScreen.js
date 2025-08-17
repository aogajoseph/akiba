import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import ScreenContainer from '../../components/ScreenContainer';
import InviteMembersModal from '../../components/InviteMembersModal'; // ✅ import modal
import logoImg from '../../../assets/logo.png';

export default function AccountSetupScreen({ navigation }) {
  const [accountName, setAccountName] = useState('');
  const [description, setDescription] = useState('');
  const [photo, setPhoto] = useState(null);
  const [inviteModalVisible, setInviteModalVisible] = useState(false);
  const [successModalVisible, setSuccessModalVisible] = useState(false);

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled) {
      setPhoto(result.assets[0].uri);
    }
  };

  return (
    <ScreenContainer style={{ backgroundColor: '#fff' }}>
      <View style={{ flex: 1, padding: 24, justifyContent: 'center' }}>
        <View>
          {/* Logo */}
          <Image
            source={logoImg}
            style={{
              width: 80,
              height: 80,
              resizeMode: 'contain',
              alignSelf: 'center',
              marginBottom: 16,
            }}
          />

          {/* Title */}
          <Text
            style={{
              fontSize: 26,
              fontWeight: '800',
              color: '#333',
              marginBottom: 24,
              textAlign: 'center',
            }}
          >
            Setup Your Account
          </Text>

          {/* Account Name */}
          <TextInput
            placeholder="Account Name (e.g., John's Family, XYZ Club, XYZ Ltd.)"
            placeholderTextColor="#999"
            value={accountName}
            onChangeText={setAccountName}
            style={{
              borderWidth: 1,
              borderColor: '#ddd',
              borderRadius: 10,
              padding: 14,
              fontSize: 15,
              marginBottom: 14,
            }}
          />

          {/* Description */}
          <TextInput
            placeholder="e.g., This account was created to manage shared financial goals for John's Family in a transparent and organized space."
            placeholderTextColor="#999"
            value={description}
            onChangeText={setDescription}
            multiline
            style={{
              borderWidth: 1,
              borderColor: '#ddd',
              borderRadius: 10,
              padding: 14,
              fontSize: 15,
              marginBottom: 14,
              height: 90,
              textAlignVertical: 'top',
            }}
          />

          {/* Upload Photo */}
          <TouchableOpacity
            style={{
              borderWidth: 1,
              borderColor: '#ddd',
              borderRadius: 10,
              padding: 14,
              alignItems: 'center',
              marginBottom: 20,
              flexDirection: 'row',
            }}
            onPress={pickImage}
          >
            <Ionicons
              name="camera"
              size={20}
              color="#999"
              style={{ marginRight: 8 }}
            />
            <Text style={{ color: '#555', fontSize: 15 }}>
              {photo ? 'Change Photo' : 'Upload Photo (Optional)'}
            </Text>
          </TouchableOpacity>

          {photo && (
            <Image
              source={{ uri: photo }}
              style={{
                width: 80,
                height: 80,
                borderRadius: 40,
                marginBottom: 20,
                alignSelf: 'center',
              }}
            />
          )}

          {/* Invite People Button */}
          <TouchableOpacity
            style={{
              borderWidth: 1,
              borderColor: '#34a853',
              paddingVertical: 14,
              borderRadius: 30,
              width: '100%',
              alignItems: 'center',
              marginBottom: 14,
              flexDirection: 'row',
              justifyContent: 'center',
            }}
            onPress={() => setInviteModalVisible(true)}
          >
            <Ionicons
              name="person-add"
              size={20}
              color="#34a853"
              style={{ marginRight: 8 }}
            />
            <Text
              style={{
                color: '#34a853',
                fontSize: 16,
                fontWeight: '700',
              }}
            >
              Invite Participants (Optional)
            </Text>
          </TouchableOpacity>

          {/* Finish Button */}
          <TouchableOpacity
            style={{
              backgroundColor: '#34a853',
              paddingVertical: 14,
              borderRadius: 30,
              width: '100%',
              alignItems: 'center',
            }}
            onPress={() => setSuccessModalVisible(true)} // <-- Opens success modal
          >
            <Text
              style={{
                color: '#fff',
                fontSize: 16,
                fontWeight: '700',
              }}
            >
              Finish
            </Text>
          </TouchableOpacity>

          {/* Back to Profile link */}
          <TouchableOpacity
            style={{ marginTop: 12, alignItems: 'center' }}
            onPress={() => navigation.navigate('ProfileSetup')}
          >
            <Text style={{ color: '#fbbc04', fontSize: 14 }}>
              Back to Profile
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ✅ InviteMembersModal */}
      <InviteMembersModal
        visible={inviteModalVisible}
        onClose={() => setInviteModalVisible(false)}
      />

      {/* Success Modal */}
      <Modal transparent visible={successModalVisible} animationType="slide">
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.6)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 24,
          }}
        >
          <View
            style={{
              backgroundColor: '#fff',
              borderRadius: 20,
              padding: 24,
              width: '100%',
              alignItems: 'center',
            }}
          >
            <Ionicons name="checkmark-circle" size={64} color="#34a853" />
            <Text
              style={{
                fontSize: 20,
                fontWeight: '700',
                marginTop: 16,
                color: '#333',
                textAlign: 'center',
              }}
            >
              Success!
            </Text>
            <Text
              style={{
                marginTop: 8,
                fontSize: 15,
                color: '#555',
                textAlign: 'center',
              }}
            >
              Your account details were sent to you via Email or SMS
            </Text>

            <TouchableOpacity
              style={{
                marginTop: 20,
                backgroundColor: '#fbbc04',
                paddingVertical: 14,
                borderRadius: 30,
                width: '80%',
                alignItems: 'center',
              }}
              onPress={() => {
                setSuccessModalVisible(false);
                navigation.navigate('MainApp'); // <-- Adjust this route as needed
              }}
            >
              <Text
                style={{
                  color: '#fff',
                  fontSize: 16,
                  fontWeight: '700',
                }}
              >
                Go to Account
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}
