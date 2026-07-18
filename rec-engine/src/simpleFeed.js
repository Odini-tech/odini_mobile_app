const { fetchCandidateListings } = require('./askOdini');

/**
 * Deliberately simple placeholders — feed/explore/mixes/similar are not
 * this month's focus (Ask Odini is), and a teammate is already building a
 * separate recommendation-engine repo that may cover these properly.
 * This just keeps the rest of the app's existing UI working end-to-end if
 * this service is the one pointed at by RECOMMENDATION_API_URL.
 */
async function recencyRanked(limit = 20) {
  const candidates = await fetchCandidateListings();
  return [...candidates]
    .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
    .slice(0, limit)
    .map(listing => ({ ...listing, score: 0.5 }));
}

async function getFeed(limit) {
  const items = await recencyRanked(limit);
  return { source: 'cold_start', items, nextCursor: null };
}

async function getExplore(limit) {
  const items = await recencyRanked(limit);
  return { source: 'cold_start', items, nextCursor: null };
}

async function getMixes() {
  const items = await recencyRanked(10);
  return {
    source: 'cold_start',
    mixes: [
      { id: 'recent', title: 'Recently added', reason: 'New on Odini', items },
    ],
  };
}

async function getSimilar(listingId, limit) {
  const candidates = await fetchCandidateListings();
  const items = candidates.filter(c => c.id !== listingId).slice(0, limit).map(l => ({ ...l, score: 0.4 }));
  return { source: 'content_fallback', items };
}

module.exports = { getFeed, getExplore, getMixes, getSimilar };
