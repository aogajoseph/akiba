// src/navigation/DrawerMenu.js
import { createDrawerNavigator, DrawerContentScrollView, DrawerItem } from '@react-navigation/drawer';
import { View, Text, Image, StyleSheet, SafeAreaView } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AppTabs from './AppTabs';
import ParticipantsScreen from '../screens/misc/ParticipantsScreen';
import ReportsScreen from '../screens/misc/ReportsScreen';
import SettingsScreen from '../screens/misc/SettingsScreen';
import ProfileScreen from '../screens/misc/ProfileScreen';
import NotificationsScreen from '../screens/misc/NotificationsScreen';
import SavingGoalsScreen from '../screens/misc/SavingGoalsScreen';
import LeaderboardScreen from '../screens/misc/LeaderboardScreen';
import PledgesScreen from '../screens/misc/PledgesScreen';
import Header from './Header';
import AccountSettingsModal from '../components/AccountSettingsModal';

import logoImg from '../../assets/logo.png'; // ensure this path is correct

const Drawer = createDrawerNavigator();

// Dummy user role (replace with real auth/role check)
const userRole = 'Main Admin';

function CustomDrawerContent(props) {
  const [accountModalVisible, setAccountModalVisible] = useState(false);
  const insets = useSafeAreaInsets(); // for safe area bottom padding

  const getYear = () => new Date().getFullYear();

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <DrawerContentScrollView {...props} contentContainerStyle={styles.container}>
        {/* Title */}
        <Text style={styles.title}>More</Text>

        {/* Logo + Brand Name */}
        <View style={styles.logoContainer}>
          <Image source={logoImg} style={styles.logo} />
          <View>
            <Text style={styles.brandName}>Akiba</Text>
            <Text style={styles.platformName}>Group Savings Platform</Text>
          </View>
        </View>

        {/* First group */}
        <View style={styles.section}>
          <DrawerItem
            label="My Profile"
            labelStyle={styles.itemLabel}
            icon={({ color, size }) => (
              <MaterialCommunityIcons name="account-circle-outline" size={22} color="#555" style={styles.icon} />
            )}
            onPress={() => props.navigation.navigate('Profile')}
          />
          <DrawerItem
            label="Notifications"
            labelStyle={styles.itemLabel}
            icon={({ color, size }) => (
              <MaterialCommunityIcons name="bell-outline" size={22} color="#555" style={styles.icon} />
            )}
            onPress={() => props.navigation.navigate('Notifications')}
          />
        </View>

        <View style={styles.divider} />

        {/* Second group */}
        <View style={styles.section}>
          <DrawerItem
            label="Saving Goals"
            labelStyle={styles.itemLabel}
            icon={({ color, size }) => (
              <MaterialCommunityIcons name="target" size={22} color="#555" style={styles.icon} />
            )}
            onPress={() => props.navigation.navigate('SavingGoals')}
          />
          <DrawerItem
            label="Participants"
            labelStyle={styles.itemLabel}
            icon={({ color, size }) => (
              <MaterialCommunityIcons name="account-multiple-outline" size={22} color="#555" style={styles.icon} />
            )}
            onPress={() => props.navigation.navigate('Participants')}
          />
          <DrawerItem
            label="Leaderboard"
            labelStyle={styles.itemLabel}
            icon={({ color, size }) => (
              <MaterialCommunityIcons name="trophy-outline" size={22} color="#555" style={styles.icon} />
            )}
            onPress={() => props.navigation.navigate('Leaderboard')}
          />
          <DrawerItem
            label="Pledges"
            labelStyle={styles.itemLabel}
            icon={({ color, size }) => (
              <MaterialCommunityIcons name="handshake-outline" size={22} color="#555" style={styles.icon} />
            )}
            onPress={() => props.navigation.navigate('Pledges')}
          />
          <DrawerItem
            label="Reports"
            labelStyle={styles.itemLabel}
            icon={({ color, size }) => (
              <MaterialCommunityIcons name="file-chart-outline" size={22} color="#555" style={styles.icon} />
            )}
            onPress={() => props.navigation.navigate('Reports')}
          />
          {userRole === 'Main Admin' && (
            <DrawerItem
              label="Account Settings"
              labelStyle={styles.itemLabel}
              icon={({ color, size }) => (
                <MaterialCommunityIcons name="cog-outline" size={22} color="#555" style={styles.icon} />
              )}
              onPress={() => setAccountModalVisible(true)}
            />
          )}
        </View>
      </DrawerContentScrollView>

      {/* Footer */}
      <View style={[styles.footer, { paddingBottom: insets.bottom || 16 }]}>
        <View style={styles.footerDivider} />
        <Text style={styles.copyright}>
          ©{getYear()} Globe Technologies.
        </Text>
      </View>

      {/* Account Settings Modal */}
      {accountModalVisible && (
        <AccountSettingsModal
          visible={accountModalVisible}
          onClose={() => setAccountModalVisible(false)}
        />
      )}
    </SafeAreaView>
  );
}

export default function DrawerMenu() {
  return (
    <Drawer.Navigator
      screenOptions={{
        header: (props) => <Header {...props} />,
      }}
      drawerContent={(props) => <CustomDrawerContent {...props} />}
    >
      <Drawer.Screen name="Tabs" component={AppTabs} options={{ title: 'Akiba' }} />
      <Drawer.Screen name="Notifications" component={NotificationsScreen} />
      <Drawer.Screen name="Profile" component={ProfileScreen} />
      <Drawer.Screen name="SavingGoals" component={SavingGoalsScreen} />
      <Drawer.Screen name="Participants" component={ParticipantsScreen} />
      <Drawer.Screen name="Reports" component={ReportsScreen} />
      <Drawer.Screen name="Leaderboard" component={LeaderboardScreen} />
      <Drawer.Screen name="Pledges" component={PledgesScreen} />
      <Drawer.Screen name="Settings" component={SettingsScreen} />
    </Drawer.Navigator>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#333',
    marginLeft: 16,
    marginBottom: 12,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  logo: {
    width: 40,
    height: 40,
    resizeMode: 'contain',
    marginRight: 10,
  },
  brandName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  platformName: {
    fontSize: 12,
    fontWeight: '500',
    color: '#777',
  },
  section: {
    marginBottom: 10,
  },
  divider: {
    height: 1,
    backgroundColor: '#ddd',
    marginVertical: 12,
    marginHorizontal: 16,
  },
  itemLabel: {
    fontSize: 16,
    padding: 4,
    fontWeight: '500',
    color: '#555',
  },
  icon: {
    marginRight: -10,
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
  },
  footerDivider: {
    width: '100%',
    height: 1,
    backgroundColor: '#eee',
    marginBottom: 6,
  },
  copyright: {
    fontSize: 12,
    color: '#999',
  },
});
