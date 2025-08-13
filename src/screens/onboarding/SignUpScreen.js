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
import { BlurView } from 'expo-blur';
import ScreenContainer from '../../components/ScreenContainer';
import logoImg from '../../../assets/logo.png';

export default function SignUpScreen({ navigation }) {
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [repeatPasswordVisible, setRepeatPasswordVisible] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

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
          Create Account
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

        {/* Password Input */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            borderWidth: 1,
            borderColor: '#ddd',
            borderRadius: 10,
            width: '100%',
            marginBottom: 14,
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

        {/* Repeat Password Input */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            borderWidth: 1,
            borderColor: '#ddd',
            borderRadius: 10,
            width: '100%',
            marginBottom: 14,
            paddingHorizontal: 14,
          }}
        >
          <TextInput
            placeholder="Repeat Password"
            placeholderTextColor="#999"
            secureTextEntry={!repeatPasswordVisible}
            style={{ flex: 1, fontSize: 15, paddingVertical: 12 }}
          />
          <TouchableOpacity
            onPress={() => setRepeatPasswordVisible(!repeatPasswordVisible)}
          >
            <Ionicons
              name={repeatPasswordVisible ? 'eye-off' : 'eye'}
              size={20}
              color="#999"
            />
          </TouchableOpacity>
        </View>

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
          onPress={() => setModalVisible(true)}
        >
          <Text
            style={{
              color: '#fff',
              fontSize: 16,
              fontWeight: '700',
            }}
          >
            Create Account
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

      {/* Success Modal */}
      <Modal transparent visible={modalVisible} animationType="fade">
        <View style={{ flex: 1 }}>
          {/* Blur Background */}
          <BlurView
            intensity={80}
            tint="light"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
            }}
          />

          {/* Modal Content */}
          <View
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              padding: 24,
            }}
          >
            <View
              style={{
                backgroundColor: 'white',
                borderRadius: 16,
                padding: 24,
                alignItems: 'center',
                width: '90%',
              }}
            >
              <Ionicons
                name="checkmark-circle"
                size={60}
                color="#fbbc04"
                style={{ marginBottom: 12 }}
              />
              <Text
                style={{ fontSize: 20, fontWeight: '700', marginBottom: 6 }}
              >
                Account Created Successfully
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  color: '#555',
                  textAlign: 'center',
                  marginBottom: 20,
                }}
              >
                Your account details have been sent to you via email or SMS.
              </Text>
              <TouchableOpacity
                style={{
                  backgroundColor: '#34a853',
                  paddingVertical: 12,
                  paddingHorizontal: 24,
                  borderRadius: 30,
                }}
                onPress={() => {
                  setModalVisible(false);
                  navigation.navigate('AccountSetup');
                }}
              >
                <Text style={{ color: '#fff', fontWeight: '700' }}>
                  Proceed to Setup
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}
