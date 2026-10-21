/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */


import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#000000',
    background: '#ffffff',
    backgroundElement: '#F0F0F3',
    backgroundSelected: '#E0E1E6',
    textSecondary: '#60646C',
    acento: '#6D4AFF',
    borde: '#D9DAE3',
  },
  // La app es oscura (userInterfaceStyle: "dark" en app.json): esta es la paleta que se ve.
  dark: {
    text: '#F2F3FF',
    background: '#07070F',
    backgroundElement: '#12121F',
    backgroundSelected: '#1C1C30',
    textSecondary: '#9A9CB8',
    acento: '#7C5CFF',
    borde: '#26264A',
  },
} as const;

/** Color de cada emoción (estrellas, chips y leyenda). */
export const ColoresEmocion = {
  alegría: '#FFD166',
  calma: '#4CC9F0',
  gratitud: '#5EE6A8',
  tristeza: '#6C8CFF',
  ansiedad: '#FF6B9D',
  enojo: '#FF5A5F',
  cansancio: '#B197FC',
  otra: '#9A9CB8',
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
