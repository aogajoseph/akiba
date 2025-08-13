import { View, Text, TouchableOpacity, Image } from 'react-native';
import ScreenContainer from '../../components/ScreenContainer';
import logoImg from '../../../assets/logo.png'; // your uploaded logo

export default function WelcomeScreen({ navigation }) {
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
          style={{ width: 80, height: 80, marginBottom: 10 }}
          resizeMode="contain"
        />

        {/* App Name Title */}
        <Text
          style={{
            fontSize: 28,
            fontWeight: '700',
            color: '#333',
            marginBottom: 20,
          }}
        >
          Welcome to Akiba
        </Text>

        {/* Tagline */}
        <Text
          style={{
            fontSize: 20,
            fontWeight: '800',
            textAlign: 'center',
            marginBottom: 12,
            color: '#333',
          }}
        >
          Do more, together.
        </Text>

        {/* Description */}
        <Text
          style={{
            fontSize: 16,
            textAlign: 'center',
            marginBottom: 32,
            color: '#555',
            lineHeight: 22,
          }}
        >
          Akiba is a collaborative savings platform that helps friends, families
          and groups save and manage money as a team.
          {'\n\n'}
          Saving made social. Achieve more, together.
        </Text>

        {/* Create Account Button */}
        <TouchableOpacity
          style={{
            backgroundColor: '#fbbc04', // warm yellow from logo
            paddingVertical: 14,
            paddingHorizontal: 24,
            borderRadius: 30,
            width: '100%',
            marginBottom: 12,
          }}
          onPress={() => navigation.navigate('SignUp')}
        >
          <Text
            style={{
              color: '#fff',
              fontSize: 16,
              fontWeight: '700',
              textAlign: 'center',
            }}
          >
            Create Account
          </Text>
        </TouchableOpacity>

        {/* Sign In Button */}
        <TouchableOpacity
          style={{
            backgroundColor: '#34a853', // green from logo
            paddingVertical: 14,
            paddingHorizontal: 24,
            borderRadius: 30,
            width: '100%',
          }}
          onPress={() => navigation.navigate('SignIn')}
        >
          <Text
            style={{
              color: '#fff',
              fontSize: 16,
              fontWeight: '700',
              textAlign: 'center',
            }}
          >
            Sign In
          </Text>
        </TouchableOpacity>
      </View>
    </ScreenContainer>
  );
}
