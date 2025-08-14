import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { useState } from 'react';

export default function DepositModal({ onClose }) {
  const [method, setMethod] = useState('mpesa');
  const [form, setForm] = useState({ amount: '', phone: '', card: '', akibaName: '', akibaId: '' });

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleDeposit = () => {
    console.log('Deposit Data:', { method, ...form });
    onClose();
  };

  return (
    <View style={styles.overlay}>
      <View style={styles.modal}>
        <Text style={styles.title}>Deposit Funds</Text>

        {/* Payment Method Tabs */}
        <View style={styles.tabRow}>
          {['mpesa', 'card', 'akiba'].map(option => (
            <TouchableOpacity
              key={option}
              style={[styles.tab, method === option && styles.activeTab]}
              onPress={() => setMethod(option)}
            >
              <Text style={[styles.tabText, method === option && styles.activeTabText]}>
                {option === 'mpesa' ? 'Mpesa' : option === 'card' ? 'Credit Card' : 'Akiba-to-Akiba'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Conditional Inputs */}
        <TextInput
          style={styles.input}
          placeholder="Amount"
          keyboardType="numeric"
          value={form.amount}
          onChangeText={val => handleChange('amount', val)}
        />

        {method === 'mpesa' && (
          <TextInput
            style={styles.input}
            placeholder="Phone Number"
            keyboardType="phone-pad"
            value={form.phone}
            onChangeText={val => handleChange('phone', val)}
          />
        )}

        {method === 'card' && (
          <>
            <TextInput
              style={styles.input}
              placeholder="Name on Card"
              value={form.cardName}
              onChangeText={val => handleChange('cardName', val)}
            />
            <TextInput
              style={styles.input}
              placeholder="Card Number"
              keyboardType="numeric"
              maxLength={16}
              value={form.cardNumber}
              onChangeText={val => handleChange('cardNumber', val)}
            />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="MM/YY"
                maxLength={5}
                value={form.cardExpiry}
                onChangeText={val => handleChange('cardExpiry', val)}
              />
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="CVV"
                keyboardType="numeric"
                maxLength={3}
                value={form.cardCVV}
                onChangeText={val => handleChange('cardCVV', val)}
              />
            </View>
          </>
        )}

        {method === 'akiba' && (
          <>
            <TextInput
              style={styles.input}
              placeholder="Akiba Account Name"
              value={form.akibaName}
              onChangeText={val => handleChange('akibaName', val)}
            />
            <TextInput
              style={styles.input}
              placeholder="Akiba Account ID"
              value={form.akibaId}
              onChangeText={val => handleChange('akibaId', val)}
            />
          </>
        )}

        {/* Buttons */}
        <View style={styles.buttonRow}>
          <TouchableOpacity style={[styles.button, styles.cancel]} onPress={onClose}>
            <Text style={styles.buttonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.button, styles.submit]} onPress={handleDeposit}>
            <Text style={styles.buttonText}>Deposit</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 16 },
  modal: { backgroundColor: '#fff', borderRadius: 8, padding: 16 },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  tabRow: { flexDirection: 'row', marginBottom: 12 },
  tab: { flex: 1, padding: 8, borderWidth: 1, borderColor: '#ccc', alignItems: 'center', borderRadius: 4, marginHorizontal: 4 },
  activeTab: { backgroundColor: '#2e7d32', borderColor: '#2e7d32' },
  tabText: { fontSize: 14, color: '#333' },
  activeTabText: { color: '#fff', fontWeight: '600' },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 6, padding: 10, marginBottom: 10 },
  buttonRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12 },
  button: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 6, marginLeft: 8 },
  cancel: { backgroundColor: '#999' },
  submit: { backgroundColor: '#2e7d32' },
  buttonText: { color: '#fff', fontWeight: '600' },
});
