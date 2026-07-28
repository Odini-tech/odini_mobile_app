import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, TouchableOpacity } from 'react-native';
import { supabase } from '../../../lib/supabase';
import { useAppMode } from '../../context/AppModeContext';
import { InteractionService } from '../../services/interactionService';

export default function FavoriteToggleButton({ listingId, size = 26 }) {
  const { theme } = useAppMode();
  const [isFavorited, setIsFavorited] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const checkIfFavorited = async () => {
      try {
        const { data: authData } = await supabase.auth.getUser();
        const userId = authData?.user?.id;
        if (!userId) return;
        const { data } = await supabase
          .from('interactions')
          .select('id')
          .eq('user_id', userId)
          .eq('listing_id', listingId)
          .gte('score', 5)
          .maybeSingle();
        if (!cancelled) setIsFavorited(!!data);
      } catch (_) {}
    };
    checkIfFavorited();
    return () => { cancelled = true; };
  }, [listingId]);

  const toggleFavorite = async () => {
    setLoading(true);
    try {
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData?.user?.id;
      if (!userId) return;
      if (isFavorited) {
        await supabase
          .from('interactions')
          .delete()
          .eq('user_id', userId)
          .eq('listing_id', listingId)
          .gte('score', 5);
        setIsFavorited(false);
      } else {
        await InteractionService.trackSave(userId, listingId);
        setIsFavorited(true);
      }
    } catch (_) {
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableOpacity
      onPress={toggleFavorite}
      disabled={loading}
      hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
    >
      {loading ? (
        <ActivityIndicator size="small" color={theme.colors.danger} />
      ) : (
        <Ionicons
          name={isFavorited ? 'bookmark' : 'bookmark-outline'}
          size={size}
          color={isFavorited ? theme.colors.danger : theme.colors.text}
        />
      )}
    </TouchableOpacity>
  );
}
