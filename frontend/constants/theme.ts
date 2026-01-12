/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

const tintColorLight = '#0a7ea4';
const tintColorDark = '#fff';

export const Colors = {
  light: {
    text: '#11181C',
    background: '#fff',
    tint: tintColorLight,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
  },
};

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
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});

// ============================================
// CLASSIFICATION & PRICE LEVEL CONSTANTS
// ============================================

// Classification colors for places
export const CLASSIFICATION_COLORS = {
  HIDDEN_GEM: '#22c55e',    // Green - authentic local spots
  CONDITIONAL: '#f97316',    // Orange - good at specific times
  TOURIST_TRAP: '#ef4444',   // Red - avoid
  MUST_SEE: '#3b82f6',       // Blue - iconic attractions
} as const;

// Price level display configuration
export const PRICE_LEVEL_CONFIG = {
  INEXPENSIVE: {
    label: '$',
    description: 'Budget-friendly',
    color: '#22c55e',
  },
  MODERATE: {
    label: '$$',
    description: 'Mid-range',
    color: '#f97316',
  },
  EXPENSIVE: {
    label: '$$$',
    description: 'High-end',
    color: '#ef4444',
  },
} as const;

// App color palette
export const APP_COLORS = {
  primary: '#007AFF',
  secondary: '#FF9500',
  success: '#34C759',
  danger: '#FF3B30',
  warning: '#FFCC00',
  info: '#5856D6',
  light: '#F7F7F7',
  dark: '#1C1C1E',
} as const;

// Helper to get classification label
export function getClassificationLabel(classification: keyof typeof CLASSIFICATION_COLORS): string {
  const labels: Record<keyof typeof CLASSIFICATION_COLORS, string> = {
    HIDDEN_GEM: '💎 Hidden Gem',
    CONDITIONAL: '⚠️ Conditional',
    TOURIST_TRAP: '🚫 Tourist Trap',
    MUST_SEE: '⭐ Must See',
  };
  return labels[classification] || classification;
}

// Helper to get price level display
export function getPriceLevelDisplay(priceLevel: keyof typeof PRICE_LEVEL_CONFIG | undefined | null) {
  if (!priceLevel) return null;
  return PRICE_LEVEL_CONFIG[priceLevel] || null;
}

