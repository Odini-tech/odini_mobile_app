import { supabaseClient } from '../src/config/supabaseClient';

// Score constants
export const INTERACTION_SCORES = {
  DISLIKE: -1,
  NEUTRAL: 0,
  VIEW: 1,
  LIKE: 3,
  SHARE: 5,
  PURCHASE: 7,
};

/**
 * Record or update an interaction for a user-listing pair
 * @param {string} userId - User ID
 * @param {string} listingId - Listing ID
 * @param {number} score - Score value (-1, 0, 1, 3, 5, 7)
 * @param {string} lastAction - Action performed (view, like, dislike, share, purchase, etc.)
 * @returns {Promise<Object>} Interaction record
 */
export const recordInteraction = async (userId, listingId, score, lastAction = null) => {
  try {
    const { data, error } = await supabaseClient
      .from('interactions')
      .upsert(
        {
          user_id: userId,
          listing_id: listingId,
          score: score,
          last_action: lastAction,
          updated_at: new Date(),
        },
        { onConflict: 'user_id,listing_id' }
      )
      .select();

    if (error) {
      console.error('Error recording interaction:', error);
      throw error;
    }

    return data?.[0] || null;
  } catch (err) {
    console.error('recordInteraction failed:', err);
    throw err;
  }
};

/**
 * Record a view interaction
 * @param {string} userId - User ID
 * @param {string} listingId - Listing ID
 * @returns {Promise<Object>} Interaction record
 */
export const recordView = async (userId, listingId) => {
  return recordInteraction(userId, listingId, INTERACTION_SCORES.VIEW, 'view');
};

/**
 * Record a like interaction
 * @param {string} userId - User ID
 * @param {string} listingId - Listing ID
 * @returns {Promise<Object>} Interaction record
 */
export const recordLike = async (userId, listingId) => {
  return recordInteraction(userId, listingId, INTERACTION_SCORES.LIKE, 'like');
};

/**
 * Record a dislike interaction
 * @param {string} userId - User ID
 * @param {string} listingId - Listing ID
 * @returns {Promise<Object>} Interaction record
 */
export const recordDislike = async (userId, listingId) => {
  return recordInteraction(userId, listingId, INTERACTION_SCORES.DISLIKE, 'dislike');
};

/**
 * Record a share interaction
 * @param {string} userId - User ID
 * @param {string} listingId - Listing ID
 * @returns {Promise<Object>} Interaction record
 */
export const recordShare = async (userId, listingId) => {
  return recordInteraction(userId, listingId, INTERACTION_SCORES.SHARE, 'share');
};

/**
 * Record a purchase interaction
 * @param {string} userId - User ID
 * @param {string} listingId - Listing ID
 * @returns {Promise<Object>} Interaction record
 */
export const recordPurchase = async (userId, listingId) => {
  return recordInteraction(userId, listingId, INTERACTION_SCORES.PURCHASE, 'purchase');
};

/**
 * Get interaction score for a user-listing pair
 * @param {string} userId - User ID
 * @param {string} listingId - Listing ID
 * @returns {Promise<number>} Score value
 */
export const getInteractionScore = async (userId, listingId) => {
  try {
    const { data, error } = await supabaseClient
      .from('interactions')
      .select('score')
      .eq('user_id', userId)
      .eq('listing_id', listingId)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows found, which is normal
      console.error('Error fetching interaction score:', error);
      throw error;
    }

    return data?.score ?? INTERACTION_SCORES.NEUTRAL;
  } catch (err) {
    console.error('getInteractionScore failed:', err);
    return INTERACTION_SCORES.NEUTRAL;
  }
};

/**
 * Get interaction details for a user-listing pair
 * @param {string} userId - User ID
 * @param {string} listingId - Listing ID
 * @returns {Promise<Object>} Interaction record with id, score, last_action, created_at, updated_at
 */
export const getInteraction = async (userId, listingId) => {
  try {
    const { data, error } = await supabaseClient
      .from('interactions')
      .select('id, score, last_action, created_at, updated_at')
      .eq('user_id', userId)
      .eq('listing_id', listingId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching interaction:', error);
      throw error;
    }

    return data || null;
  } catch (err) {
    console.error('getInteraction failed:', err);
    return null;
  }
};

/**
 * Get all interactions for a user (for recommendation scoring)
 * @param {string} userId - User ID
 * @param {number} limit - Max number of interactions to return
 * @returns {Promise<Array>} Array of interaction records
 */
export const getUserInteractions = async (userId, limit = 100) => {
  try {
    const { data, error } = await supabaseClient
      .from('interactions')
      .select('listing_id, score, last_action, updated_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching user interactions:', error);
      throw error;
    }

    return data || [];
  } catch (err) {
    console.error('getUserInteractions failed:', err);
    return [];
  }
};

/**
 * Get all interactions for a listing (engagement metrics)
 * @param {string} listingId - Listing ID
 * @returns {Promise<Object>} Engagement metrics { totalViews, totalLikes, totalDislikes, avgScore, lastUpdated }
 */
export const getListingInteractions = async (listingId) => {
  try {
    const { data, error } = await supabaseClient
      .from('interactions')
      .select('score')
      .eq('listing_id', listingId);

    if (error) {
      console.error('Error fetching listing interactions:', error);
      throw error;
    }

    const interactions = data || [];
    const totalViews = interactions.filter(i => i.score >= INTERACTION_SCORES.VIEW).length;
    const totalLikes = interactions.filter(i => i.score === INTERACTION_SCORES.LIKE).length;
    const totalDislikes = interactions.filter(i => i.score === INTERACTION_SCORES.DISLIKE).length;
    const avgScore = interactions.length > 0
      ? interactions.reduce((sum, i) => sum + i.score, 0) / interactions.length
      : 0;

    return {
      totalViews,
      totalLikes,
      totalDislikes,
      avgScore,
      totalInteractions: interactions.length,
    };
  } catch (err) {
    console.error('getListingInteractions failed:', err);
    return {
      totalViews: 0,
      totalLikes: 0,
      totalDislikes: 0,
      avgScore: 0,
      totalInteractions: 0,
    };
  }
};

/**
 * Delete an interaction record
 * @param {string} userId - User ID
 * @param {string} listingId - Listing ID
 * @returns {Promise<boolean>} Success flag
 */
export const deleteInteraction = async (userId, listingId) => {
  try {
    const { error } = await supabaseClient
      .from('interactions')
      .delete()
      .eq('user_id', userId)
      .eq('listing_id', listingId);

    if (error) {
      console.error('Error deleting interaction:', error);
      throw error;
    }

    return true;
  } catch (err) {
    console.error('deleteInteraction failed:', err);
    return false;
  }
};

/**
 * Reset interaction score to neutral
 * @param {string} userId - User ID
 * @param {string} listingId - Listing ID
 * @returns {Promise<Object>} Updated interaction record
 */
export const resetInteraction = async (userId, listingId) => {
  return recordInteraction(userId, listingId, INTERACTION_SCORES.NEUTRAL, 'reset');
};

/**
 * Get top listings by engagement (used for recommendations)
 * @param {number} limit - Max number of listings to return
 * @param {number} minScore - Minimum average score filter
 * @returns {Promise<Array>} Array of listing IDs sorted by engagement
 */
export const getTopListingsByEngagement = async (limit = 20, minScore = 0) => {
  try {
    const { data, error } = await supabaseClient
      .from('interactions')
      .select('listing_id, score')
      .gte('score', minScore);

    if (error) {
      console.error('Error fetching top listings:', error);
      throw error;
    }

    // Aggregate scores by listing
    const listingScores = {};
    data?.forEach(({ listing_id, score }) => {
      if (!listingScores[listing_id]) {
        listingScores[listing_id] = { sum: 0, count: 0 };
      }
      listingScores[listing_id].sum += score;
      listingScores[listing_id].count += 1;
    });

    // Calculate avg score and sort
    const topListings = Object.entries(listingScores)
      .map(([listingId, { sum, count }]) => ({
        listing_id: listingId,
        avgScore: sum / count,
        interactionCount: count,
      }))
      .sort((a, b) => b.avgScore - a.avgScore)
      .slice(0, limit);

    return topListings;
  } catch (err) {
    console.error('getTopListingsByEngagement failed:', err);
    return [];
  }
};

/**
 * Batch update interactions for multiple listings
 * @param {string} userId - User ID
 * @param {Array} interactions - Array of { listingId, score, lastAction }
 * @returns {Promise<Array>} Updated interaction records
 */
export const batchRecordInteractions = async (userId, interactions = []) => {
  try {
    const records = interactions.map(({ listingId, score, lastAction }) => ({
      user_id: userId,
      listing_id: listingId,
      score,
      last_action: lastAction || null,
      updated_at: new Date(),
    }));

    const { data, error } = await supabaseClient
      .from('interactions')
      .upsert(records, { onConflict: 'user_id,listing_id' })
      .select();

    if (error) {
      console.error('Error batch recording interactions:', error);
      throw error;
    }

    return data || [];
  } catch (err) {
    console.error('batchRecordInteractions failed:', err);
    throw err;
  }
};

export default {
  INTERACTION_SCORES,
  recordInteraction,
  recordView,
  recordLike,
  recordDislike,
  recordShare,
  recordPurchase,
  getInteractionScore,
  getInteraction,
  getUserInteractions,
  getListingInteractions,
  deleteInteraction,
  resetInteraction,
  getTopListingsByEngagement,
  batchRecordInteractions,
};
