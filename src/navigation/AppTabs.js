import React from 'react';
import { Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import DashboardScreen from '../screens/tabs/DashboardScreen';
import AccountScreen from '../screens/tabs/AccountScreen';
import ChatListScreen from '../screens/tabs/ChatListScreen';
import ForumScreen from '../screens/tabs/ForumScreen';
import Ionicons from 'react-native-vector-icons/Ionicons';

const Tab = createBottomTabNavigator();

export default function AppTabs() {
  return (
    <Tab.Navigator
      initialRouteName="Dashboard"
      sceneContainerStyle={{ backgroundColor: '#fff' }}
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarIcon: ({ color, size, focused }) => {
          let iconName;

          switch (route.name) {
            case 'Dashboard':
              iconName = focused ? 'speedometer' : 'speedometer-outline';
              break;
            case 'Account':
              iconName = focused ? 'wallet' : 'wallet-outline';
              break;
            case 'ChatList':
              iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
              break;
            case 'Forum':
              iconName = focused ? 'people' : 'people-outline';
              break;
            default:
              iconName = 'ellipse';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#34a853',
        tabBarInactiveTintColor: '#777',
        // Remove custom height/padding so RN Navigation can place the bar
        // exactly on the safe-area edge. This fixes the "pushed down" look.
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopWidth: 0,
          elevation: 6,
          shadowColor: '#000',
          shadowOpacity: 0.06,
          shadowOffset: { width: 0, height: -2 },
          shadowRadius: 6,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Account" component={AccountScreen} />
      <Tab.Screen
        name="ChatList"
        component={ChatListScreen}
        options={{ title: 'Chats' }}
      />
      <Tab.Screen name="Forum" component={ForumScreen} />
    </Tab.Navigator>
  );
}
