import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  Modal,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import ScreenContainer from '../../components/ScreenContainer';
import logoImg from '../../../assets/logo.png';

export default function AccountSetupScreen({ navigation }) {
  const [accountName, setAccountName] = useState('');
  const [description, setDescription] = useState('');
  const [photo, setPhoto] = useState(null);
  const [inviteModalVisible, setInviteModalVisible] = useState(false);
  const [selectedContacts, setSelectedContacts] = useState([]);

  // Placeholder contacts (in real app, fetch from device contacts)
  const contacts = [
    { id: '1', name: 'John Doe', phone: '+254700000001' },
    { id: '2', name: 'Jane Smith', phone: '+254700000002' },
    { id: '3', name: 'Mark Lee', phone: '+254700000003' },
  ];

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

  const toggleContact = (contact) => {
    if (selectedContacts.find((c) => c.id === contact.id)) {
      setSelectedContacts(selectedContacts.filter((c) => c.id !== contact.id));
    } else {
      setSelectedContacts([...selectedContacts, contact]);
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
            placeholder="Account Name (e.g., John's Family, XYZ Club, XYZ Ltd. etc.,)"
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
            placeholder="e.g., This account was created to manage shared goals for John's Family in a transparent and organized space...."
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
            }}
            onPress={() => setInviteModalVisible(true)}
          >
            <Text
              style={{
                color: '#34a853',
                fontSize: 16,
                fontWeight: '700',
              }}
            >
              Invite Participants
            </Text>
          </TouchableOpacity>

          {/* Setup Your Profile Button */}
          <TouchableOpacity
            style={{
              backgroundColor: '#fbbc04',
              paddingVertical: 14,
              borderRadius: 30,
              width: '100%',
              alignItems: 'center',
            }}
            onPress={() => navigation.navigate('ProfileSetup')}
          >
            <Text
              style={{
                color: '#fff',
                fontSize: 16,
                fontWeight: '700',
              }}
            >
              Setup Your Profile
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Invite Participants Modal */}
      <Modal transparent visible={inviteModalVisible} animationType="slide">
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'center',
            padding: 20,
          }}
        >
          <View
            style={{
              backgroundColor: '#fff',
              borderRadius: 16,
              padding: 20,
              maxHeight: '80%',
            }}
          >
            <Text
              style={{
                fontSize: 18,
                fontWeight: '700',
                marginBottom: 12,
                color: '#333',
              }}
            >
              Select Participants to Invite
            </Text>
            <FlatList
              data={contacts}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => {
                const selected = selectedContacts.some(
                  (c) => c.id === item.id
                );
                return (
                  <TouchableOpacity
                    onPress={() => toggleContact(item)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingVertical: 10,
                    }}
                  >
                    <Ionicons
                      name={selected ? 'checkbox' : 'square-outline'}
                      size={20}
                      color={selected ? '#34a853' : '#999'}
                      style={{ marginRight: 8 }}
                    />
                    <View>
                      <Text style={{ fontSize: 15, color: '#333' }}>
                        {item.name}
                      </Text>
                      <Text style={{ fontSize: 13, color: '#777' }}>
                        {item.phone}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              }}
            />

            <TouchableOpacity
              style={{
                marginTop: 16,
                backgroundColor: '#34a853',
                paddingVertical: 12,
                borderRadius: 30,
                alignItems: 'center',
              }}
              onPress={() => setInviteModalVisible(false)}
            >
              <Text style={{ color: '#fff', fontWeight: '700' }}>
                Send Invites
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{ marginTop: 10, alignItems: 'center' }}
              onPress={() => setInviteModalVisible(false)}
            >
              <Text style={{ color: '#999' }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}
