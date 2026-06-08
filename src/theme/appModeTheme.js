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
    background: '#111827',
    backgroundMuted: '#1F2937',
    surface: '#1F2937',
    surfaceAlt: '#374151',
    surfaceStrong: '#4B5563',
    primary: '#A44E69',
    primaryDeep: '#7A1E3A',
    primarySoft: '#C27090',
    primaryTint: '#2D1A22',
    primaryTintStrong: '#3D2030',
    text: '#F9FAFB',
    textMuted: '#9CA3AF',
    textSubtle: '#6B7280',
    border: '#374151',
    white: '#FFFFFF',
    overlay: 'rgba(0, 0, 0, 0.70)',
    danger: '#EF4444',
    success: '#22C55E',
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
