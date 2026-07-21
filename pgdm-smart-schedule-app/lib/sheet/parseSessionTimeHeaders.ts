import { SESSION_ORDER } from './constants';
import { normalizeBatchYearRange } from './matchBatch';

// Column layout matches parseSchedule.ts: B=1 (header text), C=2 ("Time"
// marker), D..J=3..9 (the 7 session slots, in SESSION_ORDER).
const COL_HEADER_TEXT = 1;
const COL_TIME_MARKER = 2;
const COL_SESSIONS_START = 3;

const HEADER_PREFIX = 'session no.';
const TIME_ROW_MARKER = 'time';

export interface SessionTime {
  start: string; // "HH:mm", 24h
  end: string;
}

export type BatchSessionTimes = Partial<Record<string, SessionTime>>;

/** Normalizes "8.30" or "8:30" or "18.00" to "08:30" / "18:00". */
function normalizeTimeToken(token: string): string | null {
  const cleaned = token.trim().replace('.', ':');
  const match = cleaned.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hh = match[1].padStart(2, '0');
  return `${hh}:${match[2]}`;
}

/** Parses "8.30 - 10.00" into { start: "08:30", end: "10:00" }. */
function parseTimeRange(rangeText: string): SessionTime | null {
  const parts = rangeText
    .split('-')
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length !== 2) return null;

  const start = normalizeTimeToken(parts[0]);
  const end = normalizeTimeToken(parts[1]);
  if (!start || !end) return null;

  return { start, end };
}

/**
 * Scans the sheet for "Session No. - PGDM <years> (...)→" header rows —
 * each immediately followed by a "Time" row giving that batch's actual
 * session start/end times — and builds a per-batch time grid straight
 * from the sheet. No assumption is made about how many batches exist or
 * what hours they use; if the sheet adds a new batch with its own header
 * later, it's picked up automatically with no code changes.
 */
export function parseSessionTimeHeaders(rows: string[][]): Record<string, BatchSessionTimes> {
  const result: Record<string, BatchSessionTimes> = {};

  for (let i = 0; i < rows.length - 1; i++) {
    const headerText = (rows[i][COL_HEADER_TEXT] ?? '').trim();
    if (!headerText.toLowerCase().startsWith(HEADER_PREFIX)) continue;

    const yearMatch = headerText.match(/(\d{4}-\d{2,4})/);
    if (!yearMatch) continue;
    const normalizedYears = normalizeBatchYearRange(yearMatch[1]);
    if (!normalizedYears) continue;
    const batchPrefix = `PGDM ${normalizedYears}`;

    const timeRow = rows[i + 1];
    if (!timeRow) continue;
    const timeMarker = (timeRow[COL_TIME_MARKER] ?? '').trim().toLowerCase();
    if (timeMarker !== TIME_ROW_MARKER) continue;

    const times: BatchSessionTimes = {};
    SESSION_ORDER.forEach((key, idx) => {
      const cell = (timeRow[COL_SESSIONS_START + idx] ?? '').trim();
      const parsed = parseTimeRange(cell);
      if (parsed) times[key] = parsed;
    });

    if (Object.keys(times).length > 0) {
      result[batchPrefix] = times;
    }
  }

  return result;
}
