import React from 'react';
import { Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DashboardScreen from '../screens/tabs/DashboardScreen';
import AccountScreen from '../screens/tabs/AccountScreen';
import ChatScreen from '../screens/tabs/ChatScreen';
import ForumScreen from '../screens/tabs/ForumScreen';
import Ionicons from 'react-native-vector-icons/Ionicons';

const Tab = createBottomTabNavigator();

export default function AppTabs() {
  const insets = useSafeAreaInsets(); // Get device safe area

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ color, size, focused }) => {
          let iconName;

          switch (route.name) {
            case 'Dashboard':
              iconName = focused ? 'speedometer' : 'speedometer-outline';
              break;
            case 'Account':
              iconName = focused ? 'wallet' : 'wallet-outline';
              break;
            case 'Chat':
              iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
              break;
            case 'Forum':
              iconName = focused ? 'people' : 'people-outline';
              break;
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#2b6cb0',
        tabBarInactiveTintColor: '#777',
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopWidth: 0,
          elevation: 5,
          height:
            (Platform.OS === 'ios' ? 60 : 55) + insets.bottom, // Adjust height by safe area
          paddingBottom: insets.bottom > 0 ? insets.bottom - 4 : 8, // Padding above gesture area
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Account" component={AccountScreen} />
      <Tab.Screen name="Chat" component={ChatScreen} />
      <Tab.Screen name="Forum" component={ForumScreen} />
    </Tab.Navigator>
  );
}
