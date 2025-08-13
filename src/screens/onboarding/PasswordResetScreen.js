import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image } from 'react-native';
import ScreenContainer from '../../components/ScreenContainer';
import logoImg from '../../../assets/logo.png';

export default function ForgotPasswordScreen({ navigation }) {
  const [emailOrPhone, setEmailOrPhone] = useState('');

  return (
    <ScreenContainer style={{ backgroundColor: '#fff' }}>
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
        }}
      >
        {/* Logo */}
        <Image
          source={logoImg}
          style={{ width: 70, height: 70, marginBottom: 16 }}
          resizeMode="contain"
        />

        {/* Title */}
        <Text
          style={{
            fontSize: 26,
            fontWeight: '800',
            color: '#333',
            marginBottom: 6,
          }}
        >
          Forgot Password
        </Text>

        {/* Description */}
        <Text
          style={{
            fontSize: 15,
            color: '#555',
            textAlign: 'center',
            marginBottom: 24,
          }}
        >
          Enter your registered email or phone number and we'll send you a link
          or code to reset your password.
        </Text>

        {/* Email/Phone Input */}
        <TextInput
          placeholder="Phone number or Email address"
          placeholderTextColor="#999"
          value={emailOrPhone}
          onChangeText={setEmailOrPhone}
          style={{
            borderWidth: 1,
            borderColor: '#ddd',
            borderRadius: 10,
            padding: 14,
            width: '100%',
            marginBottom: 20,
            fontSize: 15,
          }}
        />

        {/* Submit Button */}
        <TouchableOpacity
          style={{
            backgroundColor: '#fbbc04',
            paddingVertical: 14,
            borderRadius: 30,
            width: '100%',
            alignItems: 'center',
          }}
          onPress={() => {
            // TODO: send reset request
            navigation.navigate('SignIn');
          }}
        >
          <Text
            style={{
              color: '#fff',
              fontSize: 16,
              fontWeight: '700',
            }}
          >
            Send Reset Link
          </Text>
        </TouchableOpacity>

        {/* Back to Sign In Link */}
        <View style={{ flexDirection: 'row', marginTop: 16 }}>
          <TouchableOpacity onPress={() => navigation.navigate('SignIn')}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#34a853' }}>
              Back to Sign In
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScreenContainer>
  );
}
