const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const RELATIVE_WINDOW_DAYS = 14;

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function plainDate(date, now) {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

/**
 * Event-only relative date label (Today/Tomorrow/This weekend/This|Next|Last <Day>),
 * for events within +/-14 days. Outside that window, falls back to a short plain date.
 * Not used for stays/offerings — only events get this relative treatment.
 */
export function formatEventDateSmart(timestamp) {
  if (!timestamp) return 'Date TBD';
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return 'Date TBD';

  const now = new Date();
  const diffDays = Math.round((startOfDay(date) - startOfDay(now)) / 86400000);

  if (diffDays < -RELATIVE_WINDOW_DAYS || diffDays > RELATIVE_WINDOW_DAYS) {
    return plainDate(date, now);
  }

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays === -1) return 'Yesterday';

  const dayOfWeek = date.getDay();
  const isWeekendDay = dayOfWeek === 0 || dayOfWeek === 6;
  const dayName = DAY_NAMES[dayOfWeek];

  if (diffDays > 0 && diffDays <= 6 && isWeekendDay) return 'This weekend';
  if (diffDays > 0 && diffDays <= 7) return `This ${dayName}`;
  if (diffDays > 7 && diffDays <= RELATIVE_WINDOW_DAYS) return `Next ${dayName}`;
  if (diffDays < 0 && diffDays >= -RELATIVE_WINDOW_DAYS) return `Last ${dayName}`;

  return plainDate(date, now);
}

/**
 * Event-only relative date + time, e.g. "This Saturday at 7:00 PM".
 */
export function formatEventTimeSmart(timestamp) {
  if (!timestamp) return 'TBD';
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return 'TBD';

  const dateLabel = formatEventDateSmart(timestamp);
  const timeLabel = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return `${dateLabel} at ${timeLabel}`;
}
