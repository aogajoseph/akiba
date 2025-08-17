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

export default function SignUpScreen({ navigation }) {
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState('');

  // Validate email or phone
  const validateEmailOrPhone = (input) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^\+?[1-9]\d{7,14}$/; // supports country code
    return emailRegex.test(input) || phoneRegex.test(input);
  };

  // Password strength checker
  const checkPasswordStrength = (text) => {
    let strength = '';
    const strongRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/;
    const mediumRegex =
      /^(((?=.*[a-z])(?=.*[A-Z]))|((?=.*[A-Z])(?=.*\d))|((?=.*[a-z])(?=.*\d))).{6,}$/;

    if (strongRegex.test(text)) {
      strength = 'Strong';
    } else if (mediumRegex.test(text)) {
      strength = 'Fair';
    } else {
      strength = 'Weak';
    }

    setPasswordStrength(strength);
  };

  // Sign up handler
  const handleSignUp = () => {
    if (!acceptTerms) {
      Alert.alert(
        'Terms Required',
        'Please accept the terms and conditions before continuing.'
      );
      return;
    }

    if (!emailOrPhone) {
      Alert.alert('Missing Information', 'Please enter email or phone number.');
      return;
    }

    if (!validateEmailOrPhone(emailOrPhone)) {
      Alert.alert(
        'Invalid Input',
        'Please enter a valid email or phone number (with country code and no leading zero).'
      );
      return;
    }

    if (!password) {
      Alert.alert('Missing Information', 'Please enter a password.');
      return;
    }

    if (passwordStrength !== 'Strong') {
      Alert.alert(
        'Password Recommendations',
        'Password must be at least 8 characters long, include uppercase, lowercase, number, and special character.'
      );
      return;
    }

    // ✅ Navigate to OTP screen if all checks pass
    navigation.navigate('OtpVerification', { emailOrPhone });
  };

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
          Sign Up
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
          Join Akiba and start saving with your friends, family or community.
        </Text>

        {/* Email/Phone Input */}
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

        {/* Password Input */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            borderWidth: 1,
            borderColor: '#ddd',
            borderRadius: 10,
            width: '100%',
            marginBottom: 6,
            paddingHorizontal: 14,
          }}
        >
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
          <TouchableOpacity
            onPress={() => setPasswordVisible(!passwordVisible)}
          >
            <Ionicons
              name={passwordVisible ? 'eye-off' : 'eye'}
              size={20}
              color="#999"
            />
          </TouchableOpacity>
        </View>

        {/* Strength Indicator */}
        {password.length > 0 && (
          <Text
            style={{
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
            }}
          >
            {passwordStrength} password
          </Text>
        )}

        {/* Accept Terms Checkbox */}
        <TouchableOpacity
          onPress={() => setAcceptTerms(!acceptTerms)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            alignSelf: 'flex-start',
            marginBottom: 24,
          }}
        >
          <Ionicons
            name={acceptTerms ? 'checkbox' : 'square-outline'}
            size={20}
            color={acceptTerms ? '#34a853' : '#999'}
            style={{ marginRight: 8 }}
          />
          <Text style={{ fontSize: 14, color: '#555' }}>
            I accept the terms and conditions
          </Text>
        </TouchableOpacity>

        {/* Sign Up Button */}
        <TouchableOpacity
          style={{
            backgroundColor: '#fbbc04',
            paddingVertical: 14,
            borderRadius: 30,
            width: '100%',
            alignItems: 'center',
          }}
          onPress={handleSignUp}
        >
          <Text
            style={{
              color: '#fff',
              fontSize: 16,
              fontWeight: '700',
            }}
          >
            Sign Up
          </Text>
        </TouchableOpacity>

        <View style={{ flexDirection: 'row', marginTop: 16 }}>
          <Text style={{ fontSize: 14, color: '#555' }}>
            Already have an account?{' '}
          </Text>
          <TouchableOpacity onPress={() => navigation.navigate('SignIn')}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#34a853' }}>
              Sign In
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScreenContainer>
  );
}
