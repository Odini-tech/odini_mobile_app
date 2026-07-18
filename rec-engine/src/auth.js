const { supabase } = require('./supabaseClient');

/**
 * Attaches req.userId if a valid Supabase JWT is present, otherwise leaves
 * it undefined (guest). Never rejects the request — matches
 * recommendationGateway.ts's own comment: "Missing/expired tokens just
 * mean the engine treats the caller as a guest."
 */
async function attachUser(req, _res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    req.userId = null;
    return next();
  }

  try {
    const { data, error } = await supabase.auth.getUser(token);
    req.userId = error ? null : data.user?.id || null;
  } catch {
    req.userId = null;
  }

  next();
}

module.exports = { attachUser };
