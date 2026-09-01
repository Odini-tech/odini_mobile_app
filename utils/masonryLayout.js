const MIN_ASPECT_RATIO = 0.62;
const MAX_ASPECT_RATIO = 1.4;

// Deterministic pseudo-random aspect ratio per listing so heights vary
// (pinterest-style) but stay stable across re-renders for the same item.
export function getAspectRatio(id) {
  const str = String(id);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) | 0;
  }
  const normalized = (Math.abs(hash) % 1000) / 1000;
  return MIN_ASPECT_RATIO + normalized * (MAX_ASPECT_RATIO - MIN_ASPECT_RATIO);
}

// Greedily distributes listings across columns, always appending to the
// column with the smallest estimated running height, so columns stay
// visually balanced like a Pinterest/masonry grid.
export function distributeIntoColumns(listings, numColumns) {
  const columns = Array.from({ length: numColumns }, () => []);
  const heights = Array(numColumns).fill(0);
  listings.forEach((item) => {
    let shortest = 0;
    for (let i = 1; i < numColumns; i++) {
      if (heights[i] < heights[shortest]) shortest = i;
    }
    columns[shortest].push(item);
    heights[shortest] += getAspectRatio(item.id) * 100 + 70;
  });
  return columns;
}
