import { View, Text, Button } from 'react-native';
import ScreenContainer from '../../components/ScreenContainer'; 

export default function WelcomeScreen({ navigation }) {
  return (
    <ScreenContainer>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Text style={{ fontSize: 24, fontWeight: '700', marginBottom: 8 }}>
          Welcome to Akiba
        </Text>
        <Text style={{ textAlign: 'center', marginBottom: 24 }}>
          Create an Akiba account for your event, invite members, transact, and chat in one place.
        </Text>
        <Button title="Sign Up" onPress={() => navigation.navigate('SignUp')} />
      </View>
    </ScreenContainer>
  );
}
