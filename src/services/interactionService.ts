import { supabase } from '../../lib/supabase';
import { callRecommendationApi, getRecommendationModeStatus } from './recommendationGateway';

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

// Engine only accepts action: view|like|save|unlike|unsave — map our richer
// local vocabulary onto the closest one. The actual weight is always sent
// explicitly via `score`, so this mapping only affects the stored label.
const ACTION_TO_API_ACTION: Record<InteractionType, 'view' | 'like' | 'save' | 'unlike' | 'unsave'> = {
  view: 'view',
  click: 'view',
  save: 'save',
  book: 'save',
  swipe_right: 'like',
  swipe_left: 'unlike',
  share: 'like',
  message: 'like',
};

const clampAllowedScore = (score: number): InteractionRow['score'] => {
  const allowed: InteractionRow['score'][] = [-1, 0, 1, 3, 5, 7];
  return allowed.reduce((prev, curr) =>
    Math.abs(curr - score) < Math.abs(prev - score) ? curr : prev
  );
};

const stringifyAction = (
  interactionType: InteractionType,
  metadata?: Record<string, unknown>,
  propertyId?: string
): string =>
  JSON.stringify({ action: interactionType, propertyId: propertyId ?? null, metadata: metadata ?? null });

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
    return this._insertInteraction({ userId, listingId, propertyId, interactionType, weight: ACTION_SCORE[interactionType] });
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
    if (interactions.length === 0) return true;
    const results = await Promise.allSettled(
      interactions.map(i =>
        this._insertInteraction({
          userId: i.userId,
          listingId: i.listingId,
          propertyId: i.propertyId,
          interactionType: i.interactionType,
          weight: i.weight,
          metadata: i.metadata,
        })
      )
    );
    return results.every(r => r.status === 'fulfilled' && r.value === true);
  },

  async getUserRecentInteractions(userId: string, limit = 50): Promise<InteractionRow[]> {
    // The engine has no endpoint for reading a user's raw interaction history
    // back out — it's Supabase-only, in both runtime modes.
    try {
      const { data, error } = await supabase
        .from('interactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return (data ?? []) as InteractionRow[];
    } catch (error) {
      console.error('Error in getUserRecentInteractions:', error);
      return [];
    }
  },

  async clearUserInteractions(userId: string): Promise<boolean> {
    try {
      const { error } = await supabase.from('interactions').delete().eq('user_id', userId);
      if (error) throw error;
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

      // Always write to Supabase — update existing row if present, else insert
      const { data: updated, error: updateErr } = await supabase
        .from('interactions')
        .update({ score, last_action: lastAction })
        .eq('user_id', userId)
        .eq('listing_id', listingId)
        .select('id');

      if (updateErr) throw updateErr;

      if (!updated?.length) {
        const { error: insertErr } = await supabase
          .from('interactions')
          .insert({ user_id: userId, listing_id: listingId, score, last_action: lastAction });
        if (insertErr) throw insertErr;
      }

      // Best-effort: also push to rec engine if it's configured (never throws, never switches mode)
      const { mode } = getRecommendationModeStatus();
      if (mode === 'rec_eng') {
        callRecommendationApi('/api/interactions', {
          method: 'POST',
          body: JSON.stringify({
            listingId,
            action: ACTION_TO_API_ACTION[interactionType] ?? 'view',
            score,
          }),
        }).catch(() => undefined);
      }

      return true;
    } catch (error) {
      console.error(`Error in _insertInteraction for ${interactionType}:`, error);
      return false;
    }
  },
};
