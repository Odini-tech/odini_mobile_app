import { supabase } from '../../lib/supabase';
import { callRecommendationApi, runDualMode } from './recommendationGateway';

/**
 * Allowed interaction actions used in app logic.
 */
export type InteractionType =
  | 'view'
  | 'save'
  | 'book'
  | 'swipe_left'
  | 'swipe_right'
  | 'click'
  | 'share'
  | 'message';

export type SwipeDirection = 'left' | 'right';

export interface InteractionRow {
  id: string;
  user_id: string;
  listing_id: string;
  score: -1 | 0 | 1 | 3 | 5 | 7;
  last_action: string | null;
  created_at: string;
  updated_at: string;
}

const ACTION_SCORE: Record<InteractionType, InteractionRow['score']> = {
  view: 1,
  click: 3,
  save: 5,
  share: 5,
  message: 5,
  swipe_right: 3,
  swipe_left: -1,
  book: 7,
};

const clampAllowedScore = (score: number): InteractionRow['score'] => {
  const allowed: InteractionRow['score'][] = [-1, 0, 1, 3, 5, 7];
  const closest = allowed.reduce((prev, curr) =>
    Math.abs(curr - score) < Math.abs(prev - score) ? curr : prev
  );
  return closest;
};

const stringifyAction = (
  interactionType: InteractionType,
  metadata?: Record<string, unknown>,
  propertyId?: string
): string => {
  const payload = {
    action: interactionType,
    propertyId,
    metadata: metadata || null,
  };
  return JSON.stringify(payload);
};

export const InteractionService = {
  async trackView(userId: string, listingId: string, propertyId?: string): Promise<boolean> {
    return this._insertInteraction({ userId, listingId, propertyId, interactionType: 'view', weight: ACTION_SCORE.view });
  },

  async trackSave(userId: string, listingId: string, propertyId?: string): Promise<boolean> {
    return this._insertInteraction({ userId, listingId, propertyId, interactionType: 'save', weight: ACTION_SCORE.save });
  },

  async trackBooking(userId: string, listingId: string, propertyId?: string): Promise<boolean> {
    return this._insertInteraction({ userId, listingId, propertyId, interactionType: 'book', weight: ACTION_SCORE.book });
  },

  async trackSwipe(userId: string, listingId: string, direction: SwipeDirection, propertyId?: string): Promise<boolean> {
    const interactionType: InteractionType = direction === 'left' ? 'swipe_left' : 'swipe_right';
    return this._insertInteraction({
      userId,
      listingId,
      propertyId,
      interactionType,
      weight: ACTION_SCORE[interactionType],
    });
  },

  async trackClick(userId: string, listingId: string, propertyId?: string): Promise<boolean> {
    return this._insertInteraction({ userId, listingId, propertyId, interactionType: 'click', weight: ACTION_SCORE.click });
  },

  async trackShare(userId: string, listingId: string, propertyId?: string): Promise<boolean> {
    return this._insertInteraction({ userId, listingId, propertyId, interactionType: 'share', weight: ACTION_SCORE.share });
  },

  async trackMessage(userId: string, listingId: string, propertyId?: string): Promise<boolean> {
    return this._insertInteraction({ userId, listingId, propertyId, interactionType: 'message', weight: ACTION_SCORE.message });
  },

  async trackBatch(
    interactions: Array<{
      userId: string;
      listingId: string;
      propertyId?: string;
      interactionType: InteractionType;
      weight: number;
      metadata?: Record<string, unknown>;
    }>
  ): Promise<boolean> {
    try {
      if (interactions.length === 0) return true;

      const formattedInteractions = interactions.map(interaction => ({
        user_id: interaction.userId,
        listing_id: interaction.listingId,
        score: clampAllowedScore(interaction.weight),
        last_action: stringifyAction(interaction.interactionType, interaction.metadata, interaction.propertyId),
      }));

      await runDualMode({
        context: 'interactionService.trackBatch',
        recEng: async () => {
          await Promise.all(
            formattedInteractions.map(row =>
              callRecommendationApi('/v1/listings/interactions', {
                method: 'POST',
                body: JSON.stringify({
                  userId: row.user_id,
                  listingId: row.listing_id,
                  interactionType: 'batch',
                  score: row.score,
                  metadata: row.last_action ? JSON.parse(row.last_action) : null,
                }),
              })
            )
          );
        },
        basic: async () => {
          const { error } = await supabase
            .from('interactions')
            .insert(formattedInteractions);

          if (error) {
            throw error;
          }
        },
      });

      const uniqueUsers = Array.from(new Set(interactions.map(i => i.userId)));
      uniqueUsers.forEach(userId => {
        this._triggerRecommendationUpdate(userId).catch(() => undefined);
      });

      return true;
    } catch (error) {
      console.error('Error in trackBatch:', error);
      return false;
    }
  },

  async getUserRecentInteractions(userId: string, limit = 50): Promise<InteractionRow[]> {
    try {
      return await runDualMode<InteractionRow[]>({
        context: 'interactionService.getUserRecentInteractions',
        recEng: async () => {
          const envelope = await callRecommendationApi<InteractionRow[]>(`/v1/listings/user/${userId}/interactions?limit=${limit}`, {
            method: 'GET',
          });
          return envelope.data || [];
        },
        basic: async () => {
          const { data, error } = await supabase
            .from('interactions')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(limit);

          if (error) {
            throw error;
          }

          return (data || []) as InteractionRow[];
        },
      });
    } catch (error) {
      console.error('Error in getUserRecentInteractions:', error);
      return [];
    }
  },

  async clearUserInteractions(userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('interactions')
        .delete()
        .eq('user_id', userId);

      if (error) {
        console.error('Error clearing user interactions:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in clearUserInteractions:', error);
      return false;
    }
  },

  async _insertInteraction({
    userId,
    listingId,
    propertyId,
    interactionType,
    weight,
    metadata,
  }: {
    userId: string;
    listingId: string;
    propertyId?: string;
    interactionType: InteractionType;
    weight: number;
    metadata?: Record<string, unknown>;
  }): Promise<boolean> {
    try {
      const score = clampAllowedScore(weight);
      const lastAction = stringifyAction(interactionType, metadata, propertyId);

      await runDualMode({
        context: `interactionService._insertInteraction:${interactionType}`,
        recEng: async () => {
          await callRecommendationApi('/v1/listings/interactions', {
            method: 'POST',
            body: JSON.stringify({
              userId,
              listingId,
              interactionType,
              score,
              metadata: lastAction ? JSON.parse(lastAction) : null,
            }),
          });
        },
        basic: async () => {
          const { error } = await supabase
            .from('interactions')
            .insert({
              user_id: userId,
              listing_id: listingId,
              score,
              last_action: lastAction,
            });

          if (error) {
            throw error;
          }
        },
      });

      this._triggerRecommendationUpdate(userId).catch(() => undefined);
      return true;
    } catch (error) {
      console.error(`Error in _insertInteraction for ${interactionType}:`, error);
      return false;
    }
  },

  async _triggerRecommendationUpdate(userId: string): Promise<void> {
    try {
      await runDualMode({
        context: 'interactionService._triggerRecommendationUpdate',
        recEng: async () => {
          await callRecommendationApi('/v1/listings/recommendations?userId=' + encodeURIComponent(userId), {
            method: 'GET',
          });
        },
        basic: async () => {
          await supabase.functions.invoke('recommendations', {
            body: {
              action: 'refresh_user',
              userId,
            },
          });
        },
      });
    } catch (_) {
      // silent fail
    }
  },
};
