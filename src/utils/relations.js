// PostgREST returns a to-one embed (e.g. `stays`, `events`, `offering` — whose FK column
// is also the primary key, making it a true 1:1) as a plain object, but returns a to-many
// embed as an array. Code that assumes array access (`.stays?.[0]`) silently breaks when
// PostgREST hands back an object instead. This normalizes either shape to a single object.
export function oneOf(relation) {
  if (!relation) return {};
  return Array.isArray(relation) ? (relation[0] || {}) : relation;
}
