import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';

// Placeholder components for graphs & tables (replace with actual later)
function GraphPlaceholder({ title }) {
  return (
    <View style={styles.graphCard}>
      <Text style={styles.graphTitle}>{title}</Text>
      <View style={styles.graphBox}>
        <Text style={{ color: '#999' }}>Graph here</Text>
      </View>
    </View>
  );
}

function TableSnippet({ title, data, viewAll }) {
  return (
    <View style={styles.tableCard}>
      <View style={styles.tableHeader}>
        <Text style={styles.tableTitle}>{title}</Text>
        {viewAll && <TouchableOpacity><Text style={styles.viewAll}>View All</Text></TouchableOpacity>}
      </View>
      {data.map((row, idx) => (
        <View key={idx} style={styles.tableRow}>
          <Text style={styles.tableRowText}>{row}</Text>
        </View>
      ))}
    </View>
  );
}

export default function DashboardScreen({ navigation }) {
  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 20 }}>
      {/* Dashboard Title */}
      <Text style={styles.pageTitle}>Dashboard</Text>

      {/* Account Info Card */}
      <View style={styles.accountCard}>
        <Text style={styles.accountName}>John's Family</Text>
        <Text style={styles.accountLabel}>Akiba Account</Text>
        <Text style={styles.balance}>Balance: <Text style={{ fontWeight: '700' }}>KSh 124,500.00</Text></Text>
        <Text>Contributions: 56 <Text style={{ color: '#666' }}>Since 1 Jan 2024</Text></Text>
        <Text>Participants: 8 Members, 2 Admins</Text>
      </View>

      {/* Graphs Section */}
      <GraphPlaceholder title="Daily Contribution Counts" />
      <GraphPlaceholder title="Daily Deposits" />
      <GraphPlaceholder title="Daily Withdrawals" />

      {/* Tables */}
      <TableSnippet
        title="Savings Goals"
        viewAll
        data={[
          "🏆 Current Goal: Buy Land - KSh 300,000 target",
          "✔ Completed: Emergency Fund - KSh 50,000",
        ]}
      />

      <TableSnippet
        title="Recent Activity"
        viewAll
        data={[
          "Dan deposited KSh 2,000 - 2 hrs ago",
          "Mary withdrew KSh 1,000 - 1 day ago",
          "Goal 'Emergency Fund' completed - 2 days ago",
          "Peter deposited KSh 3,000 - 4 days ago",
          "Admin added new member - 5 days ago",
        ]}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F7F6',
    padding: 16,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 10,
  },
  accountCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
  },
  accountName: {
    fontSize: 18,
    fontWeight: '700',
  },
  accountLabel: {
    color: '#00A388',
    marginBottom: 8,
  },
  balance: {
    fontSize: 16,
    marginBottom: 4,
  },
  graphCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    elevation: 2,
  },
  graphTitle: {
    fontWeight: '600',
    marginBottom: 8,
  },
  graphBox: {
    height: 120,
    backgroundColor: '#EAEAEA',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tableCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    elevation: 2,
  },
  tableHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  tableTitle: {
    fontWeight: '600',
    fontSize: 16,
  },
  viewAll: {
    color: '#00A388',
    fontWeight: '600',
  },
  tableRow: {
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  tableRowText: {
    fontSize: 14,
    color: '#333',
  },
});
