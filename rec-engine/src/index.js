require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { supabase } = require('./supabaseClient');
const { attachUser } = require('./auth');
const { askOdini } = require('./askOdini');
const { getFeed, getExplore, getMixes, getSimilar } = require('./simpleFeed');

const app = express();
app.use(cors());
app.use(express.json());
app.use(attachUser); // sets req.userId (or null for guests) from the Supabase JWT

const PORT = process.env.PORT || 4000;

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'odini-rec-engine', time: new Date().toISOString() });
});

// GET /api/ask?query=...&limit=5
// The main feature this month. Everything below this is placeholder logic
// so the rest of the app keeps working if this service is the one pointed
// at by RECOMMENDATION_API_URL — not this month's focus (see simpleFeed.js).
app.get('/api/ask', async (req, res) => {
  const { query, limit } = req.query;
  if (!query || typeof query !== 'string') {
    return res.status(400).json({ error: 'Missing "query" query param' });
  }
  const parsedLimit = limit ? Math.max(1, Math.min(20, Number(limit))) : 5;

  try {
    const result = await askOdini(query, parsedLimit);
    res.json(result); // { source, items }
  } catch (err) {
    console.error('[rec_eng] /api/ask failed:', err);
    res.status(500).json({ error: 'Failed to generate recommendations', detail: err.message });
  }
});

app.get('/api/feed', async (req, res) => {
  try {
    res.json(await getFeed(Number(req.query.limit) || 20));
  } catch (err) {
    console.error('[rec_eng] /api/feed failed:', err);
    res.status(500).json({ error: 'Failed to load feed', detail: err.message });
  }
});

app.get('/api/explore', async (req, res) => {
  try {
    res.json(await getExplore(Number(req.query.limit) || 20));
  } catch (err) {
    console.error('[rec_eng] /api/explore failed:', err);
    res.status(500).json({ error: 'Failed to load explore feed', detail: err.message });
  }
});

app.get('/api/mixes', async (_req, res) => {
  try {
    res.json(await getMixes());
  } catch (err) {
    console.error('[rec_eng] /api/mixes failed:', err);
    res.status(500).json({ error: 'Failed to load mixes', detail: err.message });
  }
});

app.get('/api/listings/:id/similar', async (req, res) => {
  try {
    const limit = Number(req.query.limit) || 10;
    res.json(await getSimilar(req.params.id, limit));
  } catch (err) {
    console.error('[rec_eng] /api/listings/:id/similar failed:', err);
    res.status(500).json({ error: 'Failed to load similar listings', detail: err.message });
  }
});

// POST /api/interactions  body: { listingId, action, score }
// Matches recommendationService.recordInteraction's payload exactly.
app.post('/api/interactions', async (req, res) => {
  const { listingId, action, score } = req.body || {};

  if (!listingId || !action) {
    return res.status(400).json({ error: 'listingId and action are required' });
  }
  if (!req.userId) {
    // Guest interactions aren't persisted — no user_id to attribute them to.
    return res.json({ success: true, persisted: false });
  }

  try {
    const { error } = await supabase.from('interactions').insert({
      user_id: req.userId,
      listing_id: listingId,
      score: typeof score === 'number' ? score : 0,
      last_action: JSON.stringify({ action }),
    });

    if (error) throw new Error(error.message);
    res.json({ success: true, persisted: true });
  } catch (err) {
    console.error('[rec_eng] /api/interactions failed:', err);
    res.status(500).json({ error: 'Failed to record interaction', detail: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`[rec_eng] Odini smart engine listening on port ${PORT}`);
});
