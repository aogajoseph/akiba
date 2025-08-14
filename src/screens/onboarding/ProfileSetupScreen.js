import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import ScreenContainer from '../../components/ScreenContainer';
import logoImg from '../../../assets/logo.png';

export default function ProfileSetup({ navigation, route }) {
  const { phoneOrEmail = '' } = route.params || {};

  const [name, setName] = useState('');
  const [contact, setContact] = useState(phoneOrEmail);
  const [photo, setPhoto] = useState(null);

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
        
        {/* Logo */}
        <Image
          source={logoImg}
          style={{
            width: 64,
            height: 64,
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
            marginBottom: 6,
            textAlign: 'center',
          }}
        >
          Setup Your Profile
        </Text>

        {/* Subtitle */}
        <Text
          style={{
            fontSize: 15,
            color: '#555',
            marginBottom: 24,
            textAlign: 'center',
          }}
        >
          Add your personal details to complete your account.
        </Text>

        {/* Name */}
        <TextInput
          placeholder="Full Name"
          placeholderTextColor="#999"
          value={name}
          onChangeText={setName}
          style={{
            borderWidth: 1,
            borderColor: '#ddd',
            borderRadius: 10,
            padding: 14,
            fontSize: 15,
            marginBottom: 14,
          }}
        />

        {/* Phone/Email */}
        <TextInput
          placeholder="Phone or Email"
          placeholderTextColor="#999"
          value={contact}
          onChangeText={setContact}
          style={{
            borderWidth: 1,
            borderColor: '#ddd',
            borderRadius: 10,
            padding: 14,
            fontSize: 15,
            marginBottom: 14,
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
            {photo ? 'Change Photo' : 'Upload Profile Photo (Optional)'}
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

        {/* Finish Button */}
        <TouchableOpacity
          style={{
            backgroundColor: '#34a853',
            paddingVertical: 14,
            borderRadius: 30,
            width: '100%',
            alignItems: 'center',
          }}
          onPress={() => navigation.navigate('MainApp')}
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
      </View>
    </ScreenContainer>
  );
}
