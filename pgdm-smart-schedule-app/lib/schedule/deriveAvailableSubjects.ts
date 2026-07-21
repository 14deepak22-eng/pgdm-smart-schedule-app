import type { DaySchedule } from '@/types/timetable';

/**
 * Returns every subject code actually found in the parsed schedule for
 * one specific batch, sorted alphabetically. Nothing hardcoded — this is
 * the complete list purely because it's everything the sheet itself
 * contains for that batch (see lib/sheet/resolveSubjectIdentity.ts for
 * how each code's true identity is determined).
 *
 * Returns an empty list if no batch is selected yet.
 */
export function deriveAvailableSubjects(days: DaySchedule[], batchPrefix: string | null): string[] {
  if (!batchPrefix) return [];

  const codes = new Set<string>();
  for (const day of days) {
    if (day.batch !== batchPrefix) continue;
    if (day.isHoliday) continue;
    for (const slot of day.sessions) {
      for (const entry of slot.entries) {
        if (entry.subjectCode) codes.add(entry.subjectCode);
      }
    }
  }

  return Array.from(codes).sort((a, b) => a.localeCompare(b));
}
