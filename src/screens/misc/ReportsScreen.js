import { View, Text } from 'react-native';
export default function ReportsScreen() {
  return (
    <View style={{ flex:1, padding:16 }}>
      <Text style={{ fontSize:20, fontWeight:'700' }}>Reports</Text>
      <Text>Statements, CSV export, monthly summaries.</Text>
    </View>
  );
}
