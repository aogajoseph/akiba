import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { useState } from 'react';

export default function TransferModal({ onClose }) {
  const [method, setMethod] = useState('mpesa');
  const [form, setForm] = useState({ amount: '', recipientName: '', mpesaNumber: '', bankName: '', bankAccount: '', reason: '', akibaName: '', akibaId: '' });

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleTransfer = () => {
    console.log('Transfer Data:', { method, ...form });
    onClose();
  };

  return (
    <View style={styles.overlay}>
      <View style={styles.modal}>
        <Text style={styles.title}>Make a Transfer</Text>

        {/* Transfer Method Tabs */}
        <View style={styles.tabRow}>
          {['mpesa', 'bank', 'akiba'].map(option => (
            <TouchableOpacity
              key={option}
              style={[styles.tab, method === option && styles.activeTab]}
              onPress={() => setMethod(option)}
            >
              <Text style={[styles.tabText, method === option && styles.activeTabText]}>
                {option === 'mpesa' ? 'Mpesa' : option === 'bank' ? 'Bank Transfer' : 'Akiba-to-Akiba'}
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
          <>
            <TextInput
              style={styles.input}
              placeholder="Recipient's Name"
              value={form.recipientName}
              onChangeText={val => handleChange('recipientName', val)}
            />
            <TextInput
              style={styles.input}
              placeholder="Mpesa Number"
              keyboardType="phone-pad"
              value={form.mpesaNumber}
              onChangeText={val => handleChange('mpesaNumber', val)}
            />
          </>
        )}

        {method === 'bank' && (
          <>
            <TextInput
              style={styles.input}
              placeholder="Bank Name"
              value={form.bankName}
              onChangeText={val => handleChange('bankName', val)}
            />
            <TextInput
              style={styles.input}
              placeholder="Bank Account Number"
              value={form.bankAccount}
              onChangeText={val => handleChange('bankAccount', val)}
            />
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

        {/* Reason field for all */}
        <TextInput
          style={[styles.input, { height: 60 }]}
          placeholder="Reason(s) for the transfer"
          value={form.reason}
          onChangeText={val => handleChange('reason', val)}
          multiline
        />

        {/* Buttons */}
        <View style={styles.buttonRow}>
          <TouchableOpacity style={[styles.button, styles.cancel]} onPress={onClose}>
            <Text style={styles.buttonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.button, styles.submit]} onPress={handleTransfer}>
            <Text style={styles.buttonText}>Submit for Approval</Text>
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
  activeTab: { backgroundColor: '#f9a825', borderColor: '#f9a825' },
  tabText: { fontSize: 14, color: '#333' },
  activeTabText: { color: '#fff', fontWeight: '600' },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 6, padding: 10, marginBottom: 10 },
  buttonRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12 },
  button: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 6, marginLeft: 8 },
  cancel: { backgroundColor: '#999' },
  submit: { backgroundColor: '#f9a825' },
  buttonText: { color: '#fff', fontWeight: '600' },
});
