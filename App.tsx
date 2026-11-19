import { useFonts } from 'expo-font';
import { ActivityIndicator, View } from 'react-native';
import { RootNavigator } from './src/navigation/RootNavigator';
import { colors } from './src/theme';

export default function App() {
  const [loaded, fontError] = useFonts({ Manrope: require('./assets/fonts/Manrope-Variable.ttf') });
  if (!loaded && !fontError)
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.canvas,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  return <RootNavigator />;
}
