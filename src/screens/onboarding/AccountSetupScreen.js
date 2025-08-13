import { View, Text, TextInput, Button, Switch } from 'react-native';
import ScreenContainer from '../../components/ScreenContainer'; 

export default function AccountSetupScreen({ navigation }) {
  // Simple placeholders
  return (
    <ScreenContainer>
      <View style={{ flex:1, padding:20 }}>
        <Text style={{ fontSize:18, fontWeight:'600', marginBottom:12 }}>Create Akiba Account</Text>
        <TextInput placeholder="Account name (e.g., James & Jacky Wedding)" style={styles.in} />
        <TextInput placeholder="Description" style={[styles.in,{height:90}]} multiline />
        {/* TODO: photo upload */}
        <View style={{ height:12 }} />
        <Button title="Invite members (optional)" onPress={() => {/* future modal */}} />
        <View style={{ height:12 }} />
        <Button title="Finish" onPress={() => navigation.replace('MainApp')} />
      </View>
    </ScreenContainer>
  );
}
const styles = { in:{ borderWidth:1, borderColor:'#ddd', borderRadius:8, padding:12, marginBottom:12 } };
