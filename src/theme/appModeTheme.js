const sharedShadow = {
  shadowColor: '#000000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.06,
  shadowRadius: 8,
  elevation: 3,
};

export const userTheme = {
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

export const patientTheme = userTheme;
export const doctorTheme = userTheme;

export function getThemeForMode(mode) {
  return userTheme;
}
