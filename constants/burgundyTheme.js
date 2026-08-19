const burgundyTheme = {
  colors: {
    // Backgrounds — clean white / neutral gray
    background: '#FFFFFF',
    backgroundMuted: '#F9FAFB',
    surface: '#FFFFFF',
    surfaceAlt: '#F3F4F6',
    surfaceStrong: '#E5E7EB',

    // Burgundy — accent / brand only
    primary: '#7A1E3A',
    primaryDeep: '#8a1b3c',
    primarySoft: '#A44E69',
    primaryTint: '#FDF2F5',
    primaryTintStrong: '#FAE0E8',

    // Text — near-black base
    text: '#111827',
    textMuted: '#6B7280',
    textSubtle: '#9CA3AF',

    // Structural
    border: '#E5E7EB',
    white: '#FFFFFF',
    overlay: 'rgba(0, 0, 0, 0.50)',

    // Semantic
    danger: '#DC2626',
    success: '#16A34A',
  },
  listingTypeColors: {
    stay: '#7A1E3A',
    event: '#A63456',
    offering: '#8B4B61',
  },
  shadow: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
};

export function getListingTypeColor(type) {
  return burgundyTheme.listingTypeColors[type] || burgundyTheme.colors.primary;
}

export default burgundyTheme;
