import type { TargetSection } from '@/types/timetable';

export interface IdentityObservation {
  batchPrefix: string;
  section: TargetSection;
  baseCode: string;
  groups: string[];
}

/**
 * Builds a resolver that decides, for a given (batch, base code, bracket
 * groups) combination, what the subject's real code is — with zero
 * hardcoded subject list. The decision is made purely by cross-
 * referencing every occurrence of that code across the whole sheet:
 *
 *   If the LAST bracket's value equals that row's OWN section in every
 *   single observation, it's a redundant section tag the sheet author
 *   added (e.g. "ST509(B) (A)" on a Section A row, "(B)" on a Section B
 *   row, etc.) — so it gets stripped, leaving just "ST509(B)".
 *
 *   If it ever *doesn't* match the row's own section — e.g. "MK629 (A)"
 *   appearing on a Section B row — that proves the bracket isn't a
 *   section marker at all; it's a genuine distinguishing part of the
 *   subject's identity (two different elective offerings), so it's kept:
 *   "MK629(A)" and "MK629(B)" stay as two separate subjects.
 *
 * This only ever needs to look at the LAST bracket group at each
 * "prefix" level (base code + all earlier groups) — every case seen in
 * practice has at most one redundant trailing tag.
 */
export function buildIdentityResolver(
  observations: IdentityObservation[],
): (batchPrefix: string, baseCode: string, groups: string[]) => string {
  const prefixKey = (batchPrefix: string, baseCode: string, groups: string[]) =>
    `${batchPrefix}|${baseCode}|${groups.join('\u0001')}`;

  const alwaysMatchesOwnSection = new Map<string, boolean>();

  for (const obs of observations) {
    if (obs.groups.length === 0) continue;
    const key = prefixKey(obs.batchPrefix, obs.baseCode, obs.groups.slice(0, -1));
    const lastGroup = obs.groups[obs.groups.length - 1];
    const matches = lastGroup.toUpperCase() === obs.section.toUpperCase();

    if (!alwaysMatchesOwnSection.has(key)) {
      alwaysMatchesOwnSection.set(key, true);
    }
    if (!matches) {
      alwaysMatchesOwnSection.set(key, false);
    }
  }

  return (batchPrefix: string, baseCode: string, groups: string[]): string => {
    if (groups.length === 0) return baseCode;

    const key = prefixKey(batchPrefix, baseCode, groups.slice(0, -1));
    const shouldStrip = alwaysMatchesOwnSection.get(key) ?? false;
    const finalGroups = shouldStrip ? groups.slice(0, -1) : groups;

    return baseCode + finalGroups.map((g) => `(${g})`).join('');
  };
}
