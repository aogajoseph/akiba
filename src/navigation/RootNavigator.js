import { createNativeStackNavigator } from '@react-navigation/native-stack';
import WelcomeScreen from '../screens/onboarding/WelcomeScreen';
import SignUpScreen from '../screens/onboarding/SignUpScreen';
import SignInScreen from '../screens/onboarding/SignInScreen';
import PasswordResetScreen from '../screens/onboarding/PasswordResetScreen';
import AccountSetupScreen from '../screens/onboarding/AccountSetupScreen';
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
          <Stack.Screen name="MainApp" component={DrawerMenu} />
        </>
      ) : (
        <Stack.Screen name="MainApp" component={DrawerMenu} />
      )}
    </Stack.Navigator>
  );
}
