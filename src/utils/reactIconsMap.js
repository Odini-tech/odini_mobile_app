import {
  AntDesign,
  Entypo,
  Feather,
  FontAwesome5,
  FontAwesome6,
  Ionicons,
  MaterialCommunityIcons,
  Octicons,
  SimpleLineIcons,
} from '@expo/vector-icons';

// `amenities.icon_name` is stored using react-icons (https://react-icons.github.io/react-icons)
// naming — a library prefix (Io, Fa, Md, ...) followed by a PascalCase icon name, e.g. "IoWifiOutline",
// "FaSwimmingPool", "MdLocalParking". react-icons and @expo/vector-icons both wrap the same underlying
// icon fonts (Ionicons, Font Awesome, Material, ...), so we map each known prefix to its RN component
// and convert the PascalCase remainder to that font's kebab-case icon name.
// Ordered longest-prefix-first so e.g. "Io5"/"Fa6" are checked before their shorter "Io"/"Fa" siblings.
const PREFIX_MAP = [
  { prefix: 'Io5', Component: Ionicons },
  { prefix: 'Io', Component: Ionicons },
  { prefix: 'Fa6', Component: FontAwesome6 },
  { prefix: 'Fa', Component: FontAwesome5 },
  { prefix: 'Md', Component: MaterialCommunityIcons },
  { prefix: 'Ai', Component: AntDesign },
  { prefix: 'Fi', Component: Feather },
  { prefix: 'Go', Component: Octicons },
  { prefix: 'Sl', Component: SimpleLineIcons },
  { prefix: 'En', Component: Entypo },
];

const FALLBACK = { Component: Ionicons, name: 'checkmark-circle-outline' };

function toKebabCase(str) {
  return str
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
    .toLowerCase();
}

/**
 * Resolves a react-icons-style name (as stored in `amenities.icon_name`) to an
 * @expo/vector-icons component + icon name pair, e.g. "IoWifiOutline" -> { Component: Ionicons, name: 'wifi-outline' }.
 * Falls back to a generic checkmark icon for unrecognized prefixes or empty values.
 */
export function resolveAmenityIcon(iconName) {
  if (!iconName) return FALLBACK;

  for (const { prefix, Component } of PREFIX_MAP) {
    if (iconName.length > prefix.length && iconName.startsWith(prefix) && /[A-Z]/.test(iconName[prefix.length])) {
      return { Component, name: toKebabCase(iconName.slice(prefix.length)) };
    }
  }

  // No recognized react-icons prefix — assume it's already a plain Ionicons name (legacy data).
  return { Component: Ionicons, name: iconName };
}
