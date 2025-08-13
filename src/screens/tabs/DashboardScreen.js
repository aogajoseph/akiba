import { View, Text, Button } from 'react-native';

export default function DashboardScreen({ navigation }) {
  return (
    <View style={{ flex:1, padding:16 }}>
      <Text style={{ fontSize:20, fontWeight:'700' }}>Dashboard</Text>
      <Text style={{ marginTop:8 }}>Balance: KSh 0.00</Text>
      <Text>Total Members: 0</Text>
      <View style={{ height:12 }} />
      <Button title="Deposit" onPress={() => navigation.navigate('Tabs', { screen: 'Transact' })} />
    </View>
  );
}
