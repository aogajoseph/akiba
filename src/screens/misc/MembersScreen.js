import { View, Text } from 'react-native';
export default function MembersScreen() {
  return (
    <View style={{ flex:1, padding:16 }}>
      <Text style={{ fontSize:20, fontWeight:'700' }}>Members</Text>
      <Text>List of members, roles, invite link, promote/demote.</Text>
    </View>
  );
}
