const sharedShadow = {
  shadowColor: '#000000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.06,
  shadowRadius: 8,
  elevation: 3,
};

export const lightTheme = {
  colors: {
    background: '#FFFFFF',
    backgroundMuted: '#F9FAFB',
    surface: '#FFFFFF',
    surfaceAlt: '#F3F4F6',
    surfaceStrong: '#E5E7EB',
    primary: '#7A1E3A',
    primaryDeep: '#571126',
    primarySoft: '#A44E69',
    primaryTint: '#FDF2F5',
    primaryTintStrong: '#FAE0E8',
    text: '#111827',
    textMuted: '#6B7280',
    textSubtle: '#9CA3AF',
    border: '#E5E7EB',
    white: '#FFFFFF',
    overlay: 'rgba(0, 0, 0, 0.50)',
    danger: '#DC2626',
    success: '#16A34A',
    // Buttons invert against the mode's base color (dark button on light mode)
    // so the burgundy label needs a brighter shade to read against a dark fill.
    buttonBg: '#111827',
    buttonText: '#C27090',
  },
  listingTypeColors: {
    stay: '#7A1E3A',
    event: '#A63456',
    offering: '#8B4B61',
  },
  shadow: sharedShadow,
};

export const darkTheme = {
  colors: {
    background: '#000000',
    backgroundMuted: '#0A0A0A',
    surface: '#020202',
    surfaceAlt: '#0c0c0c',
    surfaceStrong: '#090909',
    primary: '#A44E69',
    primaryDeep: '#7A1E3A',
    primarySoft: '#C27090',
    primaryTint: '#221217',
    primaryTintStrong: '#331A22',
    text: '#F5F5F5',
    textMuted: '#A3A3A3',
    textSubtle: '#737373',
    border: '#2423238b',
    white: '#ffffffdd',
    overlay: 'rgba(0, 0, 0, 0.75)',
    danger: '#EF4444',
    success: '#22C55E',
    // Buttons invert against the mode's base color (light button on dark mode)
    // so the burgundy label needs a deeper shade to read against a light fill.
    buttonBg: '#F5F5F5',
    buttonText: '#571126',
  },
  listingTypeColors: {
    stay: '#A44E69',
    event: '#B56078',
    offering: '#9B6B7A',
  },
  shadow: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
};

// Backwards-compatible aliases
export const userTheme = lightTheme;
export const patientTheme = lightTheme;
export const doctorTheme = lightTheme;

export function getThemeForMode(_mode, colorScheme = 'light') {
  return colorScheme === 'dark' ? darkTheme : lightTheme;
}
