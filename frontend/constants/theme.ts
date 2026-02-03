

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
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
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

export const CLASSIFICATION_COLORS = {
  HIDDEN_GEM: '#22c55e',
  CONDITIONAL: '#f97316',
  TOURIST_TRAP: '#ef4444',
  MUST_SEE: '#3b82f6',
} as const;

export const DAY_COLORS = [
  '#0ea5e9',
  '#8b5cf6',
  '#ec4899',
  '#f59e0b',
  '#10b981',
  '#6366f1',
  '#f43f5e',
  '#84cc16',
  '#06b6d4',
  '#d946ef',
] as const;

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

/**
 * Brand-specific colors used throughout the TravelWise app.
 * Use these instead of hardcoding hex values in components.
 */
export const BRAND_COLORS = {
  /** Main brand color - used for primary buttons, headers, and accents */
  primary: '#0A4974',
  /** Lighter shade of primary - used for backgrounds and hover states */
  primaryLight: 'rgba(10, 73, 116, 0.1)',
  /** Text on primary background */
  primaryText: '#FFFFFF',
} as const;


export function getClassificationLabel(classification: keyof typeof CLASSIFICATION_COLORS): string {
  const labels: Record<keyof typeof CLASSIFICATION_COLORS, string> = {
    HIDDEN_GEM: '💎 Hidden Gem',
    CONDITIONAL: '⚠️ Conditional',
    TOURIST_TRAP: '🚫 Tourist Trap',
    MUST_SEE: '⭐ Must See',
  };
  return labels[classification] || classification;
}


export function getPriceLevelDisplay(priceLevel: keyof typeof PRICE_LEVEL_CONFIG | undefined | null) {
  if (!priceLevel) return null;
  return PRICE_LEVEL_CONFIG[priceLevel] || null;
}

