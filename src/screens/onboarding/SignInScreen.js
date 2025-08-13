import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image } from 'react-native';
import ScreenContainer from '../../components/ScreenContainer';
import { Ionicons } from '@expo/vector-icons';
import logoImg from '../../../assets/logo.png';

export default function SignInScreen({ navigation }) {
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [staySignedIn, setStaySignedIn] = useState(false);

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
          Sign In
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
          Sign in to your Akiba account using email or phone and password.
        </Text>

        {/* Phone/Email Input */}
        <TextInput
          placeholder="Phone number or Email address"
          placeholderTextColor="#999"
          style={{
            borderWidth: 1,
            borderColor: '#ddd',
            borderRadius: 10,
            padding: 14,
            width: '100%',
            marginBottom: 14,
            fontSize: 15,
          }}
        />

        {/* Password Input with toggle */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            borderWidth: 1,
            borderColor: '#ddd',
            borderRadius: 10,
            width: '100%',
            paddingHorizontal: 14,
          }}
        >
          <TextInput
            placeholder="Password"
            placeholderTextColor="#999"
            secureTextEntry={!passwordVisible}
            style={{ flex: 1, fontSize: 15, paddingVertical: 12 }}
          />
          <TouchableOpacity onPress={() => setPasswordVisible(!passwordVisible)}>
            <Ionicons
              name={passwordVisible ? 'eye-off' : 'eye'}
              size={20}
              color="#999"
            />
          </TouchableOpacity>
        </View>

        {/* Forgot Password Link */}
        <TouchableOpacity
          onPress={() => navigation.navigate('PasswordReset')}
          style={{ alignSelf: 'flex-end', marginTop: 8, marginBottom: 16 }}
        >
          <Text style={{ color: '#007aff', fontSize: 14 }}>
            Forgot password?
          </Text>
        </TouchableOpacity>

        {/* Stay signed in toggle */}
        <TouchableOpacity
          onPress={() => setStaySignedIn(!staySignedIn)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            alignSelf: 'flex-start',
            marginBottom: 24,
          }}
        >
          <Ionicons
            name={staySignedIn ? 'checkbox' : 'square-outline'}
            size={20}
            color={staySignedIn ? '#34a853' : '#999'}
            style={{ marginRight: 8 }}
          />
          <Text style={{ fontSize: 14, color: '#555' }}>Stay signed in</Text>
        </TouchableOpacity>

        {/* Sign In Button */}
        <TouchableOpacity
          style={{
            backgroundColor: '#fbbc04', // warm yellow from logo
            paddingVertical: 14,
            borderRadius: 30,
            width: '100%',
            alignItems: 'center',
          }}
          onPress={() => navigation.replace('MainApp')}
        >
          <Text
            style={{
              color: '#fff',
              fontSize: 16,
              fontWeight: '700',
            }}
          >
            Sign In
          </Text>
        </TouchableOpacity>
        <View style={{ flexDirection: 'row', marginTop: 16 }}>
          <Text style={{ fontSize: 14, color: '#555' }}>New Here? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#34a853' }}>
              Create Account
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScreenContainer>
  );
}
