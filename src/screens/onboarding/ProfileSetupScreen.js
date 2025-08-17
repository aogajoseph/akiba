import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import ScreenContainer from '../../components/ScreenContainer';
import logoImg from '../../../assets/logo.png';

export default function ProfileSetup({ navigation, route }) {
  const { emailOrPhone = '' } = route.params || {};

  const [username, setUsername] = useState('');
  const [contact] = useState(emailOrPhone); // non-editable
  const [photo, setPhoto] = useState(null);

  // Dummy list of taken usernames (replace with API check)
  const takenUsernames = ['john', 'mary', 'alex'];

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

  const handleContinue = () => {
    if (!username) {
      Alert.alert('Missing Information', 'Please enter a username.');
      return;
    }

    // Username uniqueness check
    if (takenUsernames.includes(username.toLowerCase())) {
      Alert.alert('Username Taken', 'Please choose another username.');
      return;
    }

    // ✅ Navigate to AccountSetupScreen
    navigation.navigate('AccountSetup');
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
          This is how others in the account will see you.
        </Text>

        {/* Username */}
        <TextInput
          placeholder="Username"
          placeholderTextColor="#999"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          style={{
            borderWidth: 1,
            borderColor: '#ddd',
            borderRadius: 10,
            padding: 14,
            fontSize: 15,
            marginBottom: 14,
          }}
        />

        {/* Phone/Email (non-editable) */}
        <TextInput
          placeholder="Phone or Email"
          placeholderTextColor="#999"
          value={contact}
          editable={false}
          style={{
            borderWidth: 1,
            borderColor: '#ddd',
            borderRadius: 10,
            padding: 14,
            fontSize: 15,
            marginBottom: 14,
            backgroundColor: '#f9f9f9',
            color: '#666',
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

        {/* Continue Button */}
        <TouchableOpacity
          style={{
            backgroundColor: '#fbbc04',
            paddingVertical: 14,
            borderRadius: 30,
            width: '100%',
            alignItems: 'center',
          }}
          onPress={handleContinue}
        >
          <Text
            style={{
              color: '#fff',
              fontSize: 16,
              fontWeight: '700',
            }}
          >
            Continue
          </Text>
        </TouchableOpacity>
      </View>
    </ScreenContainer>
  );
}
