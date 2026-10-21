import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { Colors } from '@/constants/theme';

const tema = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: Colors.dark.background,
    card: Colors.dark.background,
    primary: Colors.dark.acento,
    text: Colors.dark.text,
    border: Colors.dark.borde,
  },
};

export default function RootLayout() {
  return (
    <ThemeProvider value={tema}>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.dark.background } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="grabar" options={{ presentation: 'modal' }} />
        <Stack.Screen
          name="entrada/[id]"
          options={{
            headerShown: true,
            title: '',
            headerTransparent: true,
            headerTintColor: Colors.dark.text,
          }}
        />
      </Stack>
    </ThemeProvider>
  );
}
