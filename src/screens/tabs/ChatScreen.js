import { View, Text } from 'react-native';

export default function ChatScreen() {
  return (
    <View style={{ flex:1, padding:16 }}>
      <Text style={{ fontSize:20, fontWeight:'700' }}>Private Chat</Text>
      <Text>1:1 conversations will appear here.</Text>
    </View>
  );
}
