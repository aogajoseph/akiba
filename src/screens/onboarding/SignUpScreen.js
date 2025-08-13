import { View, Text, TextInput, Button } from 'react-native';
import ScreenContainer from '../../components/ScreenContainer'; 

export default function SignUpScreen({ navigation }) {
  return (
    <ScreenContainer>
      <View style={{ flex:1, padding:20 }}>
        <Text style={{ fontSize:18, fontWeight:'600', marginBottom:12 }}>Create your profile</Text>
        <TextInput placeholder="Full name" style={styles.in} />
        <TextInput placeholder="Phone number" keyboardType="phone-pad" style={styles.in} />
        <TextInput placeholder="Password" secureTextEntry style={styles.in} />
        {/* TODO: photo upload */}
        <Button title="Continue" onPress={() => navigation.navigate('AccountSetup')} />
      </View>
    </ScreenContainer>
  );
}

const styles = { in:{ borderWidth:1, borderColor:'#ddd', borderRadius:8, padding:12, marginBottom:12 } };
