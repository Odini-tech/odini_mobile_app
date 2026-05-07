const sharedShadow = {
  shadowColor: '#3B1724',
  shadowOffset: { width: 0, height: 10 },
  shadowOpacity: 0.08,
  shadowRadius: 20,
  elevation: 5,
};

export const userTheme = {
  colors: {
    background: '#F8F1F4',
    backgroundMuted: '#F2E7EC',
    surface: '#FFFFFF',
    surfaceAlt: '#F6EBF0',
    surfaceStrong: '#EBD6DE',
    primary: '#7A1E3A',
    primaryDeep: '#571126',
    primarySoft: '#A44E69',
    primaryTint: '#F3DEE6',
    primaryTintStrong: '#EBCDD8',
    text: '#2F1320',
    textMuted: '#755967',
    textSubtle: '#9B7B89',
    border: '#E6D1D9',
    white: '#FFFFFF',
    overlay: 'rgba(47, 19, 32, 0.45)',
    danger: '#B4234C',
    success: '#3D7A5B',
  },
  listingTypeColors: {
    stay: '#7A1E3A',
    event: '#A63456',
    offering: '#8B4B61',
  },
  shadow: sharedShadow,
};

// Keep as alias for backwards compatibility
export const patientTheme = userTheme;
export const doctorTheme = userTheme;

export function getThemeForMode(mode) {
  return userTheme;
}
