import { useFonts } from 'expo-font';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ActivityIndicator } from 'react-native';
import {
  initialWindowMetrics,
  SafeAreaProvider,
  SafeAreaView,
} from 'react-native-safe-area-context';
import { RootNavigator } from './src/navigation/RootNavigator';
import { colors } from './src/theme';

export default function App() {
  const [loaded, fontError] = useFonts({ Manrope: require('./assets/fonts/Manrope-Variable.ttf') });
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        {!loaded && !fontError ? (
          <SafeAreaView
            style={{
              flex: 1,
              backgroundColor: colors.canvas,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ActivityIndicator color={colors.primary} />
          </SafeAreaView>
        ) : (
          <RootNavigator />
        )}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
