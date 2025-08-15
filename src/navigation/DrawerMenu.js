import { createDrawerNavigator, DrawerContentScrollView, DrawerItem } from '@react-navigation/drawer';
import { View, Text, Image, StyleSheet } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
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
import logoImg from '../../assets/logo.png'; // ensure this path is correct

const Drawer = createDrawerNavigator();

function CustomDrawerContent(props) {
  return (
    <DrawerContentScrollView {...props} contentContainerStyle={styles.container}>
      {/* Title */}
      <Text style={styles.title}>More</Text>

      {/* Logo + Brand Name */}
      <View style={styles.logoContainer}>
        <Image source={logoImg} style={styles.logo} />
        <Text style={styles.brandName}>Akiba</Text>
      </View>

      {/* First group */}
      <View style={styles.section}>
        <DrawerItem
          label="Notifications"
          labelStyle={styles.itemLabel}
          icon={({ color, size }) => (
            <MaterialCommunityIcons name="bell-outline" size={22} color="#555" style={styles.icon} />
          )}
          onPress={() => props.navigation.navigate('Notifications')}
        />
        <DrawerItem
          label="My Profile"
          labelStyle={styles.itemLabel}
          icon={({ color, size }) => (
            <MaterialCommunityIcons name="account-circle-outline" size={22} color="#555" style={styles.icon} />
          )}
          onPress={() => props.navigation.navigate('Profile')}
        />
      </View>

      {/* Divider */}
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
      </View>
    </DrawerContentScrollView>
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
    flexDirection: 'row', // logo and text side by side
    alignItems: 'center', // vertically center
    marginBottom: 20,
    paddingHorizontal: 16, // a bit of left/right padding
  },
  logo: {
    width: 40,
    height: 40,
    resizeMode: 'contain',
    marginRight: 10, // space between logo and text
  },
  brandName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
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
    padding: 10, 
    fontWeigt: '500',
    color: '#555',
  },
  icon: {
    marginRight: -10, // aligns icon visually with label
  },
});
