import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, StyleSheet, TouchableOpacity } from 'react-native';
import { InteractionService } from '@/services/interactionService';
import { useInteractionToggle } from '@/utils/useInteractionToggle';

const ops = {
  check: InteractionService.isVenueSaved.bind(InteractionService),
  on: InteractionService.saveVenue.bind(InteractionService),
  off: InteractionService.unsaveVenue.bind(InteractionService),
};

export default function SaveVenueButton({ venueId }: { venueId: string | undefined }) {
  const { userId, active, loading, busy, toggle } = useInteractionToggle(venueId, ops);

  if (!loading && !userId) return null;

  return (
    <TouchableOpacity
      style={styles.button}
      onPress={toggle}
      disabled={loading || busy}
      accessibilityLabel={active ? 'Remove venue from favorites' : 'Add venue to favorites'}
      hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
    >
      {loading ? (
        <ActivityIndicator size="small" color="#fff" />
      ) : (
        <Ionicons name={active ? 'heart' : 'heart-outline'} size={20} color={active ? '#ff4d6d' : '#fff'} />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
});
