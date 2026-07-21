import type { EventCategory } from '@/types/events';
import { EVENT_KEYWORDS } from './constants';

const EVENT_CATEGORY_MAP: Record<string, EventCategory> = {
  holiday: 'holiday',
  exam: 'exam',
  workshop: 'workshop',
  seminar: 'seminar',
  'guest lecture': 'guest-lecture',
  placement: 'placement',
  notice: 'notice',
};

/**
 * Checks whether a cell's text represents an event (holiday, exam, etc.)
 * rather than a regular class. Matches by substring so variants like
 * "Holiday - Eid" or "Placement Drive - Round 2" still get detected.
 */
export function detectEventCategory(cellText: string): EventCategory | null {
  const lower = cellText.trim().toLowerCase();
  if (!lower) return null;

  for (const keyword of EVENT_KEYWORDS) {
    if (lower.includes(keyword)) {
      return EVENT_CATEGORY_MAP[keyword] ?? 'other';
    }
  }
  return null;
}

// The base course code, e.g. "MK629", "MK630", "ST509".
const BASE_CODE_PATTERN = /^[A-Z]{2,4}\d{3}/;

// A single "(...)" group immediately following the code (allowing whitespace
// before it), captured one at a time so we can walk through several in a
// row — e.g. "ST509(B) (A) ( CR-1)" has three: "B", "A", "CR-1".
const NEXT_GROUP_PATTERN = /^\s*\(([^)]+)\)/;

function isRoomLike(group: string): boolean {
  return /CR|CL|Tutorial/i.test(group);
}

export interface SplitCellPart {
  /** Original text for this part, e.g. "MK629 (A) (CR-5)" */
  raw: string;
  /** The base course code, e.g. "MK629" */
  baseCode: string;
  /**
   * Every non-room "(...)" qualifier after the code, in order, e.g.
   * ["B", "A"] for "ST509(B) (A) (CR-1)". Whether each of these is a
   * genuine part of the subject's identity or a redundant section tag
   * is decided later, by cross-referencing the whole sheet — see
   * lib/sheet/resolveSubjectIdentity.ts. This function only extracts,
   * it never guesses.
   */
  groups: string[];
  room?: string;
}

/**
 * Splits a session-slot cell into its parts (a slot can hold multiple
 * parallel/alternate offerings separated by "/", e.g.
 * "MK629 (A) (CR-5)/MK630 (A) (CR-2)"), and for each part extracts the
 * base course code, its bracketed qualifiers, and its room — without
 * making any judgment call about what those qualifiers *mean*. Purely
 * mechanical extraction; no hardcoded subject list involved at all.
 */
export function splitCellParts(cellText: string): SplitCellPart[] {
  const trimmed = cellText.trim();
  if (!trimmed) return [];

  return trimmed
    .split('/')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const baseMatch = part.match(BASE_CODE_PATTERN);
      if (!baseMatch) return { raw: part, baseCode: part, groups: [] };

      const groups: string[] = [];
      let room: string | undefined;
      let rest = part.slice(baseMatch[0].length);

      let match = rest.match(NEXT_GROUP_PATTERN);
      while (match) {
        const value = match[1].trim();
        if (isRoomLike(value)) {
          room = room ?? value;
        } else {
          groups.push(value);
        }
        rest = rest.slice(match[0].length);
        match = rest.match(NEXT_GROUP_PATTERN);
      }

      return { raw: part, baseCode: baseMatch[0], groups, room };
    });
}

/**
 * Checks whether a cell's text resembles a course code (e.g. starts with
 * 2-4 letters followed by 3 digits, like "MK629" or "ST509") in at least
 * one of its "/"-separated parts. Used as a catch-all: any non-empty cell
 * that doesn't look like a class AND doesn't match a known event keyword
 * gets treated as a generic event instead of showing up as a garbled
 * "class" — covers things like workshops, industry visits, farewells,
 * or any other one-off text someone adds to the sheet.
 */
export function looksLikeSubjectCell(cellText: string): boolean {
  const trimmed = cellText.trim();
  if (!trimmed) return false;

  return trimmed
    .split('/')
    .map((part) => part.trim())
    .filter(Boolean)
    .some((part) => BASE_CODE_PATTERN.test(part));
}
