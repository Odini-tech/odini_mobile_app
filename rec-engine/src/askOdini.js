const { supabase } = require('./supabaseClient');

const LAUNCH_CITIES = (process.env.ODINI_LAUNCH_CITIES || 'Lusaka,Livingstone')
  .split(',')
  .map(c => c.trim())
  .filter(Boolean);

const MODEL = process.env.ASK_ODINI_MODEL || 'claude-sonnet-5';
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

/**
 * Pull the curated, launch-scope candidate listings with everything the
 * LLM needs to reason about them: location, tags, categories.
 * Small dataset (50-100 listings) — feasible to hand the whole scoped
 * set to the model rather than standing up a vector store for v1.
 *
 * NOTE: cover images are intentionally left null for now (would need a
 * per-listing-type join across stay_images/event_images/offering_images).
 * Fine for the Ask Odini text-first flow; revisit if the UI needs thumbnails.
 */
async function fetchCandidateListings() {
  const { data, error } = await supabase
    .from('listings')
    .select(`
      id, title, description, price, listing_type, is_active, created_at, host_id,
      locations ( city, country, lat, lng ),
      category_listings ( categories ( name ) ),
      tag_listings ( tags ( name ) )
    `)
    .eq('is_active', true);

  if (error) throw new Error(`Supabase fetch failed: ${error.message}`);

  return (data || [])
    .filter(listing => listing.locations && LAUNCH_CITIES.includes(listing.locations.city))
    .map(listing => ({
      id: listing.id,
      title: listing.title,
      description: listing.description || '',
      price: listing.price,
      listingType: listing.listing_type,
      coverImageUrl: null,
      created_at: listing.created_at,
      location: {
        city: listing.locations?.city || null,
        country: listing.locations?.country || null,
        lat: listing.locations?.lat ?? null,
        lng: listing.locations?.lng ?? null,
      },
      categories: (listing.category_listings || []).map(cl => cl.categories?.name).filter(Boolean),
      tags: (listing.tag_listings || []).map(tl => tl.tags?.name).filter(Boolean),
    }));
}

/** Compact representation to keep the prompt small and cheap. */
function toPromptCandidate(listing) {
  return {
    id: listing.id,
    title: listing.title,
    type: listing.listingType,
    city: listing.location?.city,
    price: listing.price,
    categories: listing.categories,
    tags: listing.tags,
    description: (listing.description || '').slice(0, 240),
  };
}

function extractJson(text) {
  const cleaned = text.replace(/```json|```/g, '').trim();
  return JSON.parse(cleaned);
}

/** Cheap keyword-overlap fallback if the LLM call fails for any reason. */
function keywordFallback(query, candidates, limit) {
  const terms = query.toLowerCase().split(/\W+/).filter(Boolean);
  const scored = candidates.map(listing => {
    const haystack = [
      listing.title,
      listing.description,
      listing.location?.city,
      ...(listing.categories || []),
      ...(listing.tags || []),
    ]
      .join(' ')
      .toLowerCase();
    const hits = terms.filter(term => haystack.includes(term)).length;
    return { listing, hits };
  });

  return scored
    .sort((a, b) => b.hits - a.hits)
    .slice(0, limit)
    .map(({ listing, hits }) => ({
      ...listing,
      score: hits > 0 ? Math.min(1, hits / terms.length) : 0.3,
      explanation: hits > 0
        ? `Matches your search for "${query}".`
        : `A popular option in ${listing.location?.city || 'the area'} while we reconnect to Odini's smart engine.`,
    }));
}

async function rankWithLLM(query, candidates, limit) {
  if (!ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY not configured');
  }

  const promptCandidates = candidates.map(toPromptCandidate);

  const systemPrompt = `You are Odini's recommendation ranker for a Zambia travel app, scoped to Lusaka and Livingstone.
Given a traveler's question and a list of candidate listings, pick the ${limit} best-matching listings.
Respond with ONLY a JSON array, no prose, no markdown fences, in this exact shape:
[{"id": "<listing id from the candidates list>", "score": <float 0-1>, "reason": "<one short, specific sentence on why this fits the traveler's question>"}]
Rules:
- Only use ids that appear in the candidates list. Never invent an id.
- If fewer than ${limit} candidates are genuinely relevant, return fewer.
- Reasons should be concrete and reference the traveler's actual question, not generic praise.`;

  const userPrompt = `Traveler's question: "${query}"\n\nCandidates:\n${JSON.stringify(promptCandidates)}`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Anthropic API ${response.status}: ${text}`);
  }

  const data = await response.json();
  const textBlock = (data.content || []).find(block => block.type === 'text');
  if (!textBlock) throw new Error('No text content in Anthropic response');

  const ranked = extractJson(textBlock.text);
  const byId = new Map(candidates.map(c => [c.id, c]));

  return ranked
    .filter(item => byId.has(item.id))
    .slice(0, limit)
    .map(item => ({
      ...byId.get(item.id),
      score: typeof item.score === 'number' ? item.score : 0.5,
      explanation: item.reason || 'Recommended based on your question.',
    }));
}

/**
 * Main entry point for /api/ask.
 * Returns AskListingCard-shaped items (EngineListingCard + reason).
 */
async function askOdini(query, limit = 5) {
  const candidates = await fetchCandidateListings();

  if (candidates.length === 0) {
    return { source: 'keyword_fallback', items: [] };
  }

  try {
    const items = await rankWithLLM(query, candidates, limit);
    return { source: 'rag', items };
  } catch (err) {
    console.warn(`[rec_eng] LLM ranking failed, using keyword fallback: ${err.message}`);
    return { source: 'keyword_fallback', items: keywordFallback(query, candidates, limit) };
  }
}

module.exports = { askOdini, fetchCandidateListings, LAUNCH_CITIES };
