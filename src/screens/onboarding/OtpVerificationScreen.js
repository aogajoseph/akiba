import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import ScreenContainer from '../../components/ScreenContainer';

export default function OtpVerificationScreen({ navigation }) {
  const [otp, setOtp] = useState('');

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
        {/* Title */}
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

        {/* Description */}
        <Text
          style={{
            fontSize: 15,
            color: '#555',
            textAlign: 'center',
            marginBottom: 24,
          }}
        >
          Enter the 6-digit code we sent to your phone or email.
        </Text>

        {/* OTP Input */}
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

        {/* Verify Button */}
        <TouchableOpacity
          style={{
            backgroundColor: '#fbbc04',
            paddingVertical: 14,
            borderRadius: 30,
            width: '100%',
            alignItems: 'center',
            marginBottom: 12,
          }}
          onPress={() => navigation.navigate('AccountSetup')}
        >
          <Text
            style={{
              color: '#fff',
              fontSize: 16,
              fontWeight: '700',
            }}
          >
            Verify
          </Text>
        </TouchableOpacity>

        {/* Resend OTP */}
        <TouchableOpacity onPress={() => alert('OTP Resent (UI only)')}>
          <Text
            style={{
              fontSize: 14,
              fontWeight: '600',
              color: '#34a853',
            }}
          >
            Resend OTP
          </Text>
        </TouchableOpacity>
      </View>
    </ScreenContainer>
  );
}
