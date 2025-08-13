import { createDrawerNavigator, DrawerContentScrollView, DrawerItem } from '@react-navigation/drawer';
import AppTabs from './AppTabs';
import MembersScreen from '../screens/misc/MembersScreen';
import ReportsScreen from '../screens/misc/ReportsScreen';
import SettingsScreen from '../screens/misc/SettingsScreen';
import ProfileScreen from '../screens/misc/ProfileScreen';
import Header from './Header';

const Drawer = createDrawerNavigator();

function CustomDrawerContent(props) {
  return (
    <DrawerContentScrollView {...props}>
      <DrawerItem label="Dashboard" onPress={() => props.navigation.navigate('Tabs', { screen: 'Dashboard' })} />
      <DrawerItem label="Members" onPress={() => props.navigation.navigate('Members')} />
      <DrawerItem label="Reports" onPress={() => props.navigation.navigate('Reports')} />
      <DrawerItem label="Settings" onPress={() => props.navigation.navigate('Settings')} />
      <DrawerItem label="Profile" onPress={() => props.navigation.navigate('Profile')} />
      <DrawerItem label="Logout" onPress={() => { /* TODO */ }} />
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
      <Drawer.Screen name="Members" component={MembersScreen} />
      <Drawer.Screen name="Reports" component={ReportsScreen} />
      <Drawer.Screen name="Settings" component={SettingsScreen} />
      <Drawer.Screen name="Profile" component={ProfileScreen} />
    </Drawer.Navigator>
  );
}
