import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import DashboardScreen from '../screens/tabs/DashboardScreen';
import AccountScreen from '../screens/tabs/AccountScreen';
import TransactScreen from '../screens/tabs/TransactScreen';
import ChatScreen from '../screens/tabs/ChatScreen';
import ForumScreen from '../screens/tabs/ForumScreen';

const Tab = createBottomTabNavigator();

export default function AppTabs() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Account" component={AccountScreen} />
      <Tab.Screen name="Transact" component={TransactScreen} />
      <Tab.Screen name="Chat" component={ChatScreen} />
      <Tab.Screen name="Forum" component={ForumScreen} />
    </Tab.Navigator>
  );
}
