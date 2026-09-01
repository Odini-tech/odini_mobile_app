const CAP = 100;

// Caps large availability counts (rooms, tickets, slots) at "100+" instead of
// showing the exact figure — precision doesn't matter once there's clearly
// plenty left, and it avoids awkwardly large numbers on compact card rows.
export function formatCount(count) {
  const n = Number(count) || 0;
  return n > CAP ? `${CAP}+` : `${n}`;
}
