const sharedShadow = {
  shadowColor: '#16324F',
  shadowOffset: { width: 0, height: 10 },
  shadowOpacity: 0.08,
  shadowRadius: 20,
  elevation: 5,
};

export const patientTheme = {
  colors: {
    background: '#F5FAFF',
    backgroundMuted: '#EEF6FF',
    surface: '#FFFFFF',
    surfaceAlt: '#EFF6FF',
    surfaceStrong: '#DDEBFF',
    primary: '#2F80ED',
    primaryDeep: '#1E5FB6',
    primarySoft: '#66A5FF',
    primaryTint: '#DDEBFF',
    primaryTintStrong: '#C6DDFF',
    text: '#16324F',
    textMuted: '#5F7895',
    textSubtle: '#89A1BC',
    border: '#D6E5F6',
    white: '#FFFFFF',
    overlay: 'rgba(22, 50, 79, 0.45)',
    danger: '#D64545',
    success: '#2E8B57',
  },
  listingTypeColors: {
    stay: '#2F80ED',
    event: '#5A9BFF',
    offering: '#3A78D5',
  },
  shadow: sharedShadow,
};

export const doctorTheme = {
  colors: {
    background: '#F4FBF7',
    backgroundMuted: '#ECF8F0',
    surface: '#FFFFFF',
    surfaceAlt: '#EEF8F2',
    surfaceStrong: '#D8EEE2',
    primary: '#1F8F5F',
    primaryDeep: '#176948',
    primarySoft: '#4EBA86',
    primaryTint: '#DDF2E7',
    primaryTintStrong: '#C7E8D6',
    text: '#163226',
    textMuted: '#5C7D6D',
    textSubtle: '#88A394',
    border: '#D4E7DB',
    white: '#FFFFFF',
    overlay: 'rgba(22, 50, 38, 0.42)',
    danger: '#C44949',
    success: '#1F8F5F',
  },
  listingTypeColors: {
    stay: '#1F8F5F',
    event: '#49AA7C',
    offering: '#2C9C6B',
  },
  shadow: {
    ...sharedShadow,
    shadowColor: '#153828',
  },
};

export function getThemeForMode(mode) {
  return mode === 'doctor' ? doctorTheme : patientTheme;
}
