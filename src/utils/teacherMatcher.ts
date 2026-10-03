/**
 * Normalizes teacher names by:
 * - Lowercasing
 * - Stripping honorifics: sir, ma'am, maam, mr, ms, mrs, miss, prof, professor, dr, doctor, teacher
 * - Removing punctuation and symbols (apostrophes, periods, hyphens)
 * - Trimming spaces
 */
export function normalizeTeacherName(name: string): string {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/\b(sir|ma'am|maam|mr|ms|mrs|miss|prof|professor|dr|doctor|teacher)\b\.?/gi, '')
    .replace(/[^a-z0-9]/gi, '')
    .trim();
}

/**
 * Robust matching for teacher names:
 * Handles variations like:
 * - "Maam Angelica" vs "Ma'am Angelica"
 * - "Sir Ke Al" vs "Ke Al"
 * - "Dr. Santos" vs "Santos" vs "Ma'am Santos"
 * - "Ma'am Jo" vs "Jo"
 * - "Ma'am Anilyn" vs "Anilyn"
 */
export function matchesTeacherName(recipientName: string, teacherName: string): boolean {
  if (!recipientName || !teacherName) return false;

  const rawRec = recipientName.trim().toLowerCase();
  const rawTeacher = teacherName.trim().toLowerCase();

  if (rawRec === rawTeacher) return true;
  if (rawRec.includes(rawTeacher) || rawTeacher.includes(rawRec)) return true;

  const normRec = normalizeTeacherName(recipientName);
  const normTeacher = normalizeTeacherName(teacherName);

  if (normRec && normTeacher) {
    if (normRec === normTeacher) return true;
    if (normRec.length >= 3 && normTeacher.includes(normRec)) return true;
    if (normTeacher.length >= 3 && normRec.includes(normTeacher)) return true;
  }

  // Token matching for first or last names (e.g., "Angelica" in "Ma'am Angelica Rivera")
  const ignored = new Set(['sir', 'maam', 'ma\'am', 'mr', 'ms', 'mrs', 'prof', 'teacher', 'the', 'and', 'for']);
  const recTokens = rawRec
    .replace(/[^a-z0-9\s]/gi, ' ')
    .split(/\s+/)
    .filter((t) => t.length >= 3 && !ignored.has(t));
  const teacherTokens = rawTeacher
    .replace(/[^a-z0-9\s]/gi, ' ')
    .split(/\s+/)
    .filter((t) => t.length >= 3 && !ignored.has(t));

  for (const rt of recTokens) {
    for (const tt of teacherTokens) {
      if (rt === tt) return true;
    }
  }

  return false;
}
