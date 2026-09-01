// Lightweight, rule-based parsing for the Guide chat — no external NLP/LLM dependency.
// Turns free text like "new places to eat next weekend" into a date window + search keywords.

export interface DateHint {
  label: string;
  start: Date;
  end: Date; // exclusive
}

export type GuideListingType = 'stay' | 'event' | 'offering';

export interface GuideIntent {
  rawText: string;
  keywords: string[];
  listingType: GuideListingType | null;
  dateHint: DateHint | null;
}

const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function parseDateHint(rawText: string, now: Date = new Date()): DateHint | null {
  const text = rawText.toLowerCase();
  const today = startOfDay(now);

  if (/\b(today|tonight)\b/.test(text)) {
    return { label: 'today', start: today, end: addDays(today, 1) };
  }
  if (/\btomorrow\b/.test(text)) {
    const t = addDays(today, 1);
    return { label: 'tomorrow', start: t, end: addDays(t, 1) };
  }

  const isNextWeekend = /\bnext weekend\b/.test(text);
  const isWeekend = isNextWeekend || /\bweekend\b/.test(text);
  if (isWeekend) {
    const dow = today.getDay();
    let saturday = addDays(today, (6 - dow + 7) % 7);
    if (isNextWeekend) saturday = addDays(saturday, 7);
    return {
      label: isNextWeekend ? 'next weekend' : 'this weekend',
      start: saturday,
      end: addDays(saturday, 2),
    };
  }

  if (/\bnext week\b/.test(text)) {
    const dow = today.getDay();
    const daysToNextMonday = ((1 - dow + 7) % 7) || 7;
    const nextMonday = addDays(today, daysToNextMonday);
    return { label: 'next week', start: nextMonday, end: addDays(nextMonday, 7) };
  }
  if (/\bthis week\b/.test(text)) {
    const dow = today.getDay();
    const nextMonday = addDays(today, ((1 - dow + 7) % 7) || 7);
    return { label: 'this week', start: today, end: nextMonday };
  }

  if (/\bnext month\b/.test(text)) {
    const start = addMonths(startOfMonth(today), 1);
    return { label: 'next month', start, end: addMonths(start, 1) };
  }
  if (/\bthis month\b/.test(text)) {
    return { label: 'this month', start: today, end: addMonths(startOfMonth(today), 1) };
  }

  for (let i = 0; i < DAY_NAMES.length; i++) {
    const dayName = DAY_NAMES[i];
    if (new RegExp(`\\bnext ${dayName}\\b`).test(text)) {
      const diff = ((i - today.getDay() + 7) % 7 || 7) + 7;
      const d = addDays(today, diff);
      return { label: `next ${capitalize(dayName)}`, start: d, end: addDays(d, 1) };
    }
    if (new RegExp(`\\b(this |on )${dayName}\\b`).test(text)) {
      const d = addDays(today, (i - today.getDay() + 7) % 7);
      return { label: `this ${capitalize(dayName)}`, start: d, end: addDays(d, 1) };
    }
  }

  return null;
}

const STOPWORDS = new Set([
  'a', 'an', 'the', 'to', 'in', 'on', 'for', 'of', 'with', 'and', 'or', 'is', 'are', 'me', 'my', 'i',
  'im', 'please', 'some', 'any', 'around', 'near', 'nearby', 'new', 'what', 'whats', 'about', 'find',
  'show', 'looking', 'want', 'wanna', 'need', 'give', 'can', 'you', 'your', 'there', 'area', 'today',
  'tonight', 'tomorrow', 'this', 'next', 'week', 'weekend', 'month', 'day', 'days', 'plans', 'plan',
  'vibe', 'mood', 'something', 'somewhere', 'places', 'place', 'good', 'best', 'great', 'nice', 'cool',
  'stuff', 'things', 'thing', 'do', 'doing', 'go', 'going', 'lets', 'up', 'out', 'see', 'get', 'it',
  'that', 'just', 'us', 'we', 'be', 'at', 'all',
]);

// Common "vibe" words mapped to a canonical search term — matched against listing
// titles/descriptions and category/tag names by searchService.
const SYNONYMS: Record<string, string> = {
  eat: 'food', eating: 'food', food: 'food', restaurant: 'food', restaurants: 'food',
  dinner: 'food', lunch: 'food', breakfast: 'food', hungry: 'food', dine: 'food', dining: 'food',
  party: 'nightlife', nightlife: 'nightlife', club: 'nightlife', clubbing: 'nightlife',
  drinks: 'nightlife', bar: 'nightlife', bars: 'nightlife',
  chill: 'relax', relax: 'relax', relaxing: 'relax', calm: 'relax', spa: 'relax', quiet: 'relax',
  hike: 'adventure', hiking: 'adventure', adventure: 'adventure', outdoor: 'adventure',
  outdoors: 'adventure', nature: 'adventure',
  culture: 'culture', art: 'culture', arts: 'culture', museum: 'culture', music: 'culture', concert: 'culture',
};

const TYPE_HINTS: Record<string, GuideListingType> = {
  stay: 'stay', sleep: 'stay', hotel: 'stay', lodge: 'stay', lodging: 'stay', room: 'stay',
  accommodation: 'stay', accomodation: 'stay', guesthouse: 'stay',
  event: 'event', events: 'event', concert: 'event', show: 'event', festival: 'event', gig: 'event',
  activity: 'offering', activities: 'offering', tour: 'offering', experience: 'offering', experiences: 'offering',
};

export function extractIntent(rawText: string, now: Date = new Date()): GuideIntent {
  const dateHint = parseDateHint(rawText, now);
  const normalized = rawText.toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
  const words = normalized.split(/\s+/).filter(Boolean);

  let listingType: GuideListingType | null = null;
  for (const w of words) {
    if (TYPE_HINTS[w]) {
      listingType = TYPE_HINTS[w];
      break;
    }
  }

  const synonymKeywords: string[] = [];
  const otherKeywords: string[] = [];
  for (const w of words) {
    if (STOPWORDS.has(w) || w.length < 3 || TYPE_HINTS[w]) continue;
    if (SYNONYMS[w]) {
      synonymKeywords.push(SYNONYMS[w]);
    } else {
      otherKeywords.push(w);
    }
  }

  const keywords = Array.from(new Set([...synonymKeywords, ...otherKeywords])).slice(0, 4);

  return { rawText, keywords, listingType, dateHint };
}
