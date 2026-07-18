// Dynamic Expo config. Expo CLI automatically loads .env / .env.local into
// process.env before this file runs (SDK 49+), so no dotenv import needed.
//
// This replaces hardcoded secrets that used to live directly in app.json's
// "extra" block (SUPABASE_URL, SUPABASE_ANON_KEY, RECOMMENDATION_API_URL,
// RECOMMENDATION_MODE) — those were committed to git in plain text across
// multiple commits. Keep app.json for the static, non-secret config; this
// file layers the per-environment values on top from your local .env.

const appJson = require('./app.json');

module.exports = () => ({
  ...appJson.expo,
  extra: {
    ...appJson.expo.extra,
    SUPABASE_URL: process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL,
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY,
    RECOMMENDATION_API_URL: process.env.RECOMMENDATION_API_URL || 'http://localhost:4000',
    RECOMMENDATION_MODE: process.env.RECOMMENDATION_MODE || 'rec_eng',
  },
});
