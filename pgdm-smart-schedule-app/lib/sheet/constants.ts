/**
 * Central config for how we read the PGDM session-schedule sheet.
 * Keeping these here (not hardcoded in parser logic) means the
 * app can be re-pointed at a new term/batch by editing this file
 * or the equivalent env vars, without touching parsing code.
 *
 * Nothing here hardcodes a specific batch, subject list, or timing
 * grid — those are all read live from the sheet itself:
 *   - Batches: lib/sheet/matchBatch.ts
 *   - Subjects: lib/sheet/resolveSubjectIdentity.ts (cross-references
 *     the sheet's own data to tell a genuine subject-code qualifier
 *     apart from a redundant section tag — no fixed subject list)
 *   - Session times: lib/sheet/parseSessionTimeHeaders.ts (reads each
 *     batch's own "Session No. - PGDM YYYY-YY" header + Time row)
 */

export const TARGET_SECTIONS = ['A', 'B', 'C'] as const;
export type TargetSection = (typeof TARGET_SECTIONS)[number];

// Credit line shown in the header. Change this if you'd like the wording
// or name updated.
export const CREATOR_CREDIT = 'Made by Deepak Kumar · 25PGDM-BHU081';

// Ordered session columns as laid out left-to-right in the sheet.
export const SESSION_ORDER = ['I', 'II', 'III', 'LUNCH', 'IV', 'V', 'VI'] as const;

// Rows whose Column B text starts with this are treated as a "new day" anchor.
export const DAY_HEADER_MARKER = 'Date & Day';

// A row's session cell is treated as a full-day event/holiday if it matches this.
export const EVENT_KEYWORDS = [
  'holiday',
  'exam',
  'workshop',
  'seminar',
  'guest lecture',
  'placement',
  'notice',
];

/**
 * Pure safety net: used ONLY if a batch has no "Session No. - PGDM
 * YYYY-YY" header row of its own in the sheet at all (so a brand new
 * batch added to the "Batch and Section" column before anyone's gotten
 * around to adding its header row doesn't show broken/blank times).
 * This is not treated as real data anywhere — every batch that has a
 * header row uses its own actual times instead of this.
 */
export const FALLBACK_SESSION_TIMES: Record<string, { start: string; end: string }> = {
  I: { start: '09:00', end: '10:30' },
  II: { start: '10:45', end: '12:15' },
  III: { start: '12:30', end: '14:00' },
  LUNCH: { start: '13:30', end: '14:30' },
  IV: { start: '15:00', end: '16:30' },
  V: { start: '16:45', end: '18:15' },
  VI: { start: '18:30', end: '20:00' },
};
