import { createNativeStackNavigator } from '@react-navigation/native-stack';
import WelcomeScreen from '../screens/onboarding/WelcomeScreen';
import SignUpScreen from '../screens/onboarding/SignUpScreen';
import SignInScreen from '../screens/onboarding/SignInScreen';
import PasswordResetScreen from '../screens/onboarding/PasswordResetScreen';
import AccountSetupScreen from '../screens/onboarding/AccountSetupScreen';
import ProfileSetupScreen from '../screens/onboarding/ProfileSetupScreen';
import NotificationsScreen from '../screens/misc/NotificationsScreen';
import PledgesScreen from '../screens/misc/PledgesScreen';
import DrawerMenu from './DrawerMenu';

const Stack = createNativeStackNavigator();

/**
 * For now we just pretend "not logged in" -> show onboarding.
 * Later, replace with real auth state.
 */
const isLoggedIn = false; // TODO hook to AuthContext
const hasAccount = false; // TODO after account setup

export default function RootNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!isLoggedIn || !hasAccount ? (
        <>
          <Stack.Screen name="Welcome" component={WelcomeScreen} />
          <Stack.Screen name="SignUp" component={SignUpScreen} />
          <Stack.Screen name="SignIn" component={SignInScreen} />
          <Stack.Screen name="PasswordReset" component={PasswordResetScreen} />
          <Stack.Screen name="AccountSetup" component={AccountSetupScreen} />
          <Stack.Screen name="ProfileSetup" component={ProfileSetupScreen} />
          <Stack.Screen name="Notifications" component={NotificationsScreen} />
          <Stack.Screen name="Pledges" component={PledgesScreen} />
          <Stack.Screen name="MainApp" component={DrawerMenu} />
        </>
      ) : (
        <Stack.Screen name="MainApp" component={DrawerMenu} />
      )}
    </Stack.Navigator>
  );
}
