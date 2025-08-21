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
import ScreenContainer from '../../components/ScreenContainer';
import logoImg from '../../../assets/logo.png';
import axios from 'axios';

const API_BASE_URL = "http://192.168.100.24:5000";

export default function SignUpScreen({ navigation }) {
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState('');

  const validateEmailOrPhone = (input) => {
    const trimmed = input.trim();
  
    // simpler & more flexible email check
    const emailRegex = /\S+@\S+\.\S+/;
  
    // E.164 international phone number
    const phoneRegex = /^\+?[1-9]\d{7,14}$/;
  
    return emailRegex.test(trimmed) || phoneRegex.test(trimmed);
  };  

  const checkPasswordStrength = (text) => {
    let strength = '';
    const strongRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/;
    const mediumRegex =
      /^(((?=.*[a-z])(?=.*[A-Z]))|((?=.*[A-Z])(?=.*\d))|((?=.*[a-z])(?=.*\d))).{6,}$/;

    if (strongRegex.test(text)) strength = 'Strong';
    else if (mediumRegex.test(text)) strength = 'Fair';
    else strength = 'Weak';

    setPasswordStrength(strength);
  };

  const handleSignUp = async () => {
    if (!acceptTerms) {
      Alert.alert('Terms Required', 'Please accept the terms and conditions.');
      return;
    }
    if (!emailOrPhone || !validateEmailOrPhone(emailOrPhone)) {
      Alert.alert('Invalid Input', 'Enter valid email or phone (+country code).');
      return;
    }
    if (!password || passwordStrength !== 'Strong') {
      Alert.alert(
        'Password Recommendations',
        'Password must be at least 8 characters long, include uppercase, lowercase, number, and special character.'
      );
      return;
    }

    // Decide delivery channel: if email detected, use email; else WhatsApp
    const channel = emailOrPhone.includes('@') ? 'email' : 'whatsapp';

    try {
      const response = await axios.post(`${API_BASE_URL}/signup`, {
        emailOrPhone,
        password,
        channel,
      });

      if (response.status === 200) {
        const otp = response.data.otp; // backend may return OTP in dev/sandbox
        navigation.navigate('OtpVerification', { emailOrPhone, otp });
      }
    } catch (err) {
      console.error('Signup error:', err.response?.data || err.message);
      Alert.alert('Error', err.response?.data?.message || 'Network error.');
    }
  };

  return (
    <ScreenContainer style={{ backgroundColor: '#fff' }}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Image source={logoImg} style={{ width: 70, height: 70, marginBottom: 16 }} resizeMode="contain" />
        <Text style={{ fontSize: 26, fontWeight: '800', color: '#333', marginBottom: 6 }}>Sign Up</Text>
        <Text style={{ fontSize: 15, color: '#555', textAlign: 'center', marginBottom: 24 }}>
          Join Akiba and start saving with your friends, family or community.
        </Text>

        <TextInput
          placeholder="Phone number (+countrycode) or Email address"
          placeholderTextColor="#999"
          value={emailOrPhone}
          onChangeText={setEmailOrPhone}
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

        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          borderWidth: 1,
          borderColor: '#ddd',
          borderRadius: 10,
          width: '100%',
          marginBottom: 6,
          paddingHorizontal: 14,
        }}>
          <TextInput
            placeholder="Password"
            placeholderTextColor="#999"
            secureTextEntry={!passwordVisible}
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              checkPasswordStrength(text);
            }}
            style={{ flex: 1, fontSize: 15, paddingVertical: 12 }}
          />
          <TouchableOpacity onPress={() => setPasswordVisible(!passwordVisible)}>
            <Ionicons name={passwordVisible ? 'eye-off' : 'eye'} size={20} color="#999" />
          </TouchableOpacity>
        </View>

        {password.length > 0 && (
          <Text style={{
            alignSelf: 'flex-start',
            marginTop: 2,
            marginBottom: 12,
            fontSize: 13,
            fontWeight: '600',
            color:
              passwordStrength === 'Weak'
                ? 'red'
                : passwordStrength === 'Fair'
                ? 'orange'
                : 'green',
          }}>
            {passwordStrength} password
          </Text>
        )}

        <TouchableOpacity
          onPress={() => setAcceptTerms(!acceptTerms)}
          style={{ flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', marginBottom: 24 }}
        >
          <Ionicons
            name={acceptTerms ? 'checkbox' : 'square-outline'}
            size={20}
            color={acceptTerms ? '#34a853' : '#999'}
            style={{ marginRight: 8 }}
          />
          <Text style={{ fontSize: 14, color: '#555' }}>I accept the terms and conditions</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleSignUp}
          style={{
            backgroundColor: '#fbbc04',
            paddingVertical: 14,
            borderRadius: 30,
            width: '100%',
            alignItems: 'center',
          }}
        >
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Sign Up</Text>
        </TouchableOpacity>

        <View style={{ flexDirection: 'row', marginTop: 16 }}>
          <Text style={{ fontSize: 14, color: '#555' }}>Already have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('SignIn')}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#34a853' }}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScreenContainer>
  );
}
