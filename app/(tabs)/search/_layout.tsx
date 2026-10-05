import { Stack } from 'expo-router';

// Stack inside the Search tab so results keep the tab bar and get a real back.
export default function SearchLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
