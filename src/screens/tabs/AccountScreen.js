import { View, Text } from 'react-native';

export default function AccountScreen() {
  return (
    <View style={{ flex:1, padding:16 }}>
      <Text style={{ fontSize:20, fontWeight:'700' }}>Account</Text>
      <Text>Name: James & Jacky Wedding</Text>
      <Text>Date created: Aug 2025</Text>
      <Text>Main Admin: Mama Jacky</Text>
      <Text>Sub-admins: —</Text>
      <Text>Members: —</Text>
    </View>
  );
}
