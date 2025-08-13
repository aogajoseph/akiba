import { View, Text, TextInput, Button } from 'react-native';
import { useState } from 'react';

export default function TransactScreen() {
  const [amount, setAmount] = useState('');
  return (
    <View style={{ flex:1, padding:16 }}>
      <Text style={{ fontSize:20, fontWeight:'700' }}>Transact</Text>
      <Text style={{ marginTop:8 }}>Deposit / Withdraw / Transfer</Text>
      <TextInput
        placeholder="Amount (KSh)"
        keyboardType="numeric"
        value={amount}
        onChangeText={setAmount}
        style={{ borderWidth:1, borderColor:'#ddd', borderRadius:8, padding:12, marginTop:12 }}
      />
      <View style={{ height:8 }} />
      <Button title="Deposit (STK Push)" onPress={() => {/* call initiateStkPush */}} />
      <View style={{ height:8 }} />
      <Button title="Request Withdrawal (needs approval)" onPress={() => {/* create pending txn */}} />
    </View>
  );
}
