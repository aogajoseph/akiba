import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import axios from 'axios';
import ScreenContainer from '../../components/ScreenContainer';

const API_BASE_URL = "http://192.168.100.24:5000";

export default function OtpVerificationScreen({ route, navigation }) {
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);

  const { emailOrPhone, otp: backendOtp, channel } = route.params || {};

  // Prefill OTP in dev/sandbox mode
  useEffect(() => {
    if (backendOtp) setOtp(backendOtp);
  }, [backendOtp]);

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) {
      Alert.alert('Invalid OTP', 'Please enter the 6-digit code.');
      return;
    }

    try {
      setLoading(true);
      const response = await axios.post(`${API_BASE_URL}/verify-otp`, {
        emailOrPhone,
        otp,
      });

      if (response.status === 200) {
        Alert.alert('Success', 'OTP verified successfully!');
        navigation.navigate('ProfileSetup'); // next screen
      }
    } catch (error) {
      console.error(error);
      const message =
        error.response?.data?.message ||
        'Something went wrong. Please try again.';
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    try {
      setLoading(true);
      const response = await axios.post(`${API_BASE_URL}/signup`, {
        emailOrPhone,
        password: 'resend-otp', // placeholder, not stored
        channel,
      });

      if (response.status === 200) {
        Alert.alert('Success', 'OTP has been resent!');
        if (response.data.otp) setOtp(response.data.otp); // prefill if dev
      }
    } catch (error) {
      console.error(error);
      const message =
        error.response?.data?.message || 'Failed to resend OTP.';
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
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
        <Text
          style={{
            fontSize: 26,
            fontWeight: '800',
            color: '#333',
            marginBottom: 8,
          }}
        >
          Verify OTP
        </Text>
        <Text
          style={{
            fontSize: 15,
            color: '#555',
            textAlign: 'center',
            marginBottom: 24,
          }}
        >
          Enter the 6-digit code we sent via {channel} to {emailOrPhone}.
        </Text>

        <TextInput
          placeholder="------"
          keyboardType="numeric"
          value={otp}
          onChangeText={setOtp}
          maxLength={6}
          style={{
            borderWidth: 1,
            borderColor: '#ddd',
            borderRadius: 10,
            padding: 14,
            width: '100%',
            marginBottom: 20,
            fontSize: 20,
            textAlign: 'center',
            letterSpacing: 10,
          }}
        />

        <TouchableOpacity
          onPress={handleVerifyOtp}
          disabled={loading}
          style={{
            backgroundColor: '#fbbc04',
            paddingVertical: 14,
            borderRadius: 30,
            width: '100%',
            alignItems: 'center',
            marginBottom: 12,
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>
              Verify
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={handleResendOtp} disabled={loading}>
          <Text
            style={{ fontSize: 14, fontWeight: '600', color: '#34a853' }}
          >
            Resend OTP
          </Text>
        </TouchableOpacity>
      </View>
    </ScreenContainer>
  );
}
