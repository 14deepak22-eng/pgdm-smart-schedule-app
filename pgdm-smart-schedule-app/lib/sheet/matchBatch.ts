import type { TargetSection } from '@/types/timetable';
import { TARGET_SECTIONS } from './constants';

/**
 * The sheet's batch labels are inconsistently formatted, e.g.:
 *   "PGDM 2025-27 -A", "PGDM 2025-27- B", "PGDM 2026-28 -A"
 * We normalize by stripping all whitespace before matching, so spacing
 * quirks don't cause silent data loss.
 */
function normalize(label: string): string {
  return label.replace(/\s+/g, '').toUpperCase();
}

/**
 * Normalizes a batch year range to a consistent "YYYY-YY" shape,
 * regardless of whether the source wrote the end year with 2 or 4
 * digits — e.g. both "2025-2027" (as the sheet's session-time headers
 * write it) and "2025-27" (as the "Batch and Section" column writes it)
 * normalize to "2025-27". This is what lets the two be matched up to
 * the same batch even though the sheet itself is inconsistent about it.
 */
export function normalizeBatchYearRange(rangeText: string): string | null {
  const match = rangeText.match(/(\d{4})-(\d{2,4})/);
  if (!match) return null;
  const start = match[1];
  const end = match[2].length === 4 ? match[2].slice(-2) : match[2];
  return `${start}-${end}`;
}

// Matches "PGDM" + a year range + a section letter, after whitespace has
// been stripped — e.g. "PGDM2025-27-A".
const BATCH_CELL_PATTERN = /^PGDM(\d{4}-\d{2,4})-([ABC])$/;

export interface ParsedBatchCell {
  /** e.g. "PGDM 2025-27" */
  batchPrefix: string;
  section: TargetSection;
}

/**
 * Parses a "Batch and Section" cell into its batch-year prefix and
 * section letter — for ANY batch present in the sheet, not just one
 * hardcoded target. This is what lets the app support multiple
 * concurrently-active batches (e.g. an outgoing 2nd-year batch and an
 * incoming 1st-year batch) without code changes as new batches appear.
 *
 * Returns null for cells that don't match this shape at all (stray
 * text, merged headers, etc.) so callers can just skip them.
 */
export function parseBatchCell(batchCellText: string): ParsedBatchCell | null {
  const normalized = normalize(batchCellText);
  const match = normalized.match(BATCH_CELL_PATTERN);
  if (!match) return null;

  const [, years, sectionLetter] = match;
  const section = sectionLetter as TargetSection;
  if (!(TARGET_SECTIONS as readonly string[]).includes(section)) return null;

  const normalizedYears = normalizeBatchYearRange(years);
  if (!normalizedYears) return null;

  return { batchPrefix: `PGDM ${normalizedYears}`, section };
}
