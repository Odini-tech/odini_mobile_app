import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { InteractionService } from '@/services/interactionService';
import { useInteractionToggle } from '@/utils/useInteractionToggle';

const ops = {
  check: InteractionService.isFollowingHost.bind(InteractionService),
  on: InteractionService.followHost.bind(InteractionService),
  off: InteractionService.unfollowHost.bind(InteractionService),
};

export default function FollowHostButton({ hostId }: { hostId: string | undefined }) {
  const { userId, active, loading, busy, toggle } = useInteractionToggle(hostId, ops);

  // Signed-out users and hosts viewing their own page get no button.
  if (!loading && (!userId || userId === hostId)) return null;

  return (
    <TouchableOpacity
      style={[styles.pill, active && styles.pillActive]}
      onPress={toggle}
      disabled={loading || busy}
      hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
    >
      {loading ? (
        <ActivityIndicator size="small" color="#fff" />
      ) : (
        <>
          <Ionicons name={active ? 'checkmark' : 'person-add-outline'} size={14} color={active ? '#111' : '#fff'} />
          <Text style={[styles.label, active && styles.labelActive]}>{active ? 'Following' : 'Follow'}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minWidth: 96,
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  pillActive: {
    backgroundColor: '#fff',
    borderColor: '#fff',
  },
  label: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  labelActive: {
    color: '#111',
  },
});
