// src/services/safetyService.ts
//
// Guardian pillar, v1 slice: curated, hand-written safety notes only.
// Deliberately NOT LLM-generated — a wrong "this is safe" claim from a
// hallucinating model is a real liability risk, not just a quality issue.
// This is a direct Supabase read against `safety_notes` (RLS: public read).

import { supabase } from '../../lib/supabase.js';

export interface SafetyNote {
  id: string;
  city: string;
  activityTag: string;
  noteText: string;
  severity: 'info' | 'caution' | 'warning';
}

const FALLBACK_ACTIVITY_TAG = 'general';

const mapRow = (row: any): SafetyNote => ({
  id: row.id,
  city: row.city,
  activityTag: row.activity_tag,
  noteText: row.note_text,
  severity: row.severity,
});

export const safetyService = {
  /**
   * Fetch the best-matching safety note for a city + activity tag.
   * Falls back to the city's 'general' note if a specific-activity note
   * doesn't exist yet, and returns null if nothing is curated for that
   * city at all (rather than fabricating a note).
   */
  async getSafetyNote(city: string, activityTag?: string): Promise<SafetyNote | null> {
    if (!city) return null;

    const tagsToTry = activityTag && activityTag !== FALLBACK_ACTIVITY_TAG
      ? [activityTag, FALLBACK_ACTIVITY_TAG]
      : [FALLBACK_ACTIVITY_TAG];

    try {
      const { data, error } = await supabase
        .from('safety_notes')
        .select('id, city, activity_tag, note_text, severity')
        .eq('city', city)
        .in('activity_tag', tagsToTry);

      if (error || !data || data.length === 0) return null;

      // Prefer an exact activity match over the general fallback.
      const exact = data.find(row => row.activity_tag === activityTag);
      return mapRow(exact || data[0]);
    } catch (err) {
      console.error('Error in safetyService.getSafetyNote:', err);
      return null;
    }
  },
};
