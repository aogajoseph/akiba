// src/screens/misc/ReportsScreen.js
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

// Sample transactions with date and time
const julyTransactions = [
  { id: '1', txnId: 'TXN01T5SC', description: 'Deposit from Jake Kim', amount: 5000, balance: 5000, date: '15/07/2025', time: '10:15:30' },
  { id: '2', txnId: 'TXNFT22X0', description: 'Transfer to Mambo Hardware for paint', amount: -2000, balance: 3000, date: '16/07/2025', time: '14:22:10' },
  { id: '3', txnId: 'TXN03JUL', description: 'Deposit from Anna Smith', amount: 7000, balance: 10000, date: '20/07/2025', time: '09:05:50' },
];

const augustTransactions = [
  { id: '1', txnId: 'TXN01AUG', description: 'Deposit from Sarah Lee', amount: 4000, balance: 4000, date: '01/08/2025', time: '11:45:10' },
  { id: '2', txnId: 'TXN02AUG', description: 'Transfer to Office Supplies', amount: -1500, balance: 2500, date: '03/08/2025', time: '15:20:40' },
];

export default function ReportsScreen() {
  const handleShare = (month) => {
    Alert.alert(`Share ${month} report`, 'Sharing functionality goes here.');
  };

  const handleDownload = (month) => {
    Alert.alert(`Download ${month} report`, 'Download functionality goes here.');
  };

  const renderTable = (month, data) => (
    <View style={styles.tableContainer}>
      <View style={styles.tableHeaderRow}>
        <Text style={styles.tableHeader}>{month}</Text>
        <View style={styles.iconsContainer}>
          <TouchableOpacity onPress={() => handleShare(month)} style={{ marginRight: 8 }}>
            <MaterialIcons name="share" size={20} color="#2270EE" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleDownload(month)}>
            <MaterialIcons name="file-download" size={20} color="#1C8A27" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Table Column Headers */}
      <View style={[styles.tableRow, styles.tableRowHeader]}>
        <Text style={[styles.cell, { flex: 0.5 }]}>#</Text>
        <Text style={[styles.cell, { flex: 1.5 }]}>Transaction ID</Text>
        <Text style={[styles.cell, { flex: 2 }]}>Description</Text>
        <Text style={[styles.cell, { flex: 1 }]}>Amount (KSh)</Text>
        <Text style={[styles.cell, { flex: 1 }]}>Balance (KSh)</Text>
        <Text style={[styles.cell, { flex: 1.2 }]}>Date / Time</Text>
      </View>

      {data.map((txn, index) => (
        <View key={txn.id} style={styles.tableRow}>
          <Text style={[styles.cell, { flex: 0.5 }]}>{index + 1}</Text>
          <Text style={[styles.cell, { flex: 1.5 }]}>{txn.txnId}</Text>
          <Text style={[styles.cell, { flex: 2 }]}>{txn.description}</Text>
          <Text style={[styles.cell, { flex: 1 }]}>{txn.amount.toLocaleString()}</Text>
          <Text style={[styles.cell, { flex: 1 }]}>{txn.balance.toLocaleString()}</Text>
          <View style={[styles.cell, { flex: 1.2 }]}>
            <Text style={{ fontSize: 12 }}>{txn.date}</Text>
            <Text style={{ fontSize: 12 }}>{txn.time}</Text>
          </View>
        </View>
      ))}
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Reports</Text>
      <Text style={styles.subtitle}>
        Review, share or download monthly financial reports.
      </Text>

      {renderTable('July', julyTransactions)}
      {renderTable('August', augustTransactions)}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 16 },
  title: { fontSize: 22, fontWeight: '700', color: '#000', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#555', marginBottom: 16 },

  tableContainer: {
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    overflow: 'hidden',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F7F7F7',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  tableHeader: { fontSize: 16, fontWeight: '700', color: '#000' },
  iconsContainer: { flexDirection: 'row', alignItems: 'center' },

  tableRow: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#eee' },
  tableRowHeader: { backgroundColor: '#F0F0F0' },
  cell: { fontSize: 12, color: '#333' },
});
