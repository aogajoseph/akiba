// components/ScreenContainer.js
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ScreenContainer({ children, style }) {
  return (
    <SafeAreaView style={[{ flex: 1, backgroundColor: '#fff' }, style]} edges={['top', 'bottom']}>
      {children}
    </SafeAreaView>
  );
}
