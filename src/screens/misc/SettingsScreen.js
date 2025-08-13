import { View, Text } from 'react-native';
export default function SettingsScreen() {
  return (
    <View style={{ flex:1, padding:16 }}>
      <Text style={{ fontSize:20, fontWeight:'700' }}>Settings</Text>
      <Text>Notifications, security, preferences.</Text>
    </View>
  );
}
