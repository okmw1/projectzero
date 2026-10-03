import type { Request, Response, NextFunction } from 'express';

// Severe keywords that automatically prevent submission (blocked)
export const SEVERE_BLOCKLIST = [
  // --- English Profanity & Slurs ---
  'fuck', 'fucking', 'fucked', 'fucker', 'fuckers', 'fuk', 'fvck', 'f*ck', 'f**k', 'fck', 'fckin',
  'shit', 'shitty', 'bullshit', 'sh*t', 'sh!t', 'shite',
  'bitch', 'bitches', 'bitching', 'b*tch', 'b!tch',
  'asshole', 'assholes', 'a**hole', 'ass', 'a$$', 'dumbass', 'jackass', 'dipshit',
  'cunt', 'cunts', 'c*nt',
  'dick', 'dicks', 'd*ck', 'd!ck', 'penis', 'cock', 'cocks', 'c*ck',
  'pussy', 'pussies', 'p*ssy', 'pu$$y', 'vagina',
  'bastard', 'bastards', 'slut', 'sluts', 'whore', 'whores', 'wh*re',
  'faggot', 'fag', 'fags', 'nigger', 'nigga', 'niggers', 'niggas', 'n*gger', 'n*gga',
  'retard', 'retarded',
  'porn', 'porno', 'xxx', 'boobs', 'tits', 'nude', 'nudes', 'sex', 'blowjob', 'handjob',
  'motherfucker', 'mofo', 'mf', 'wanker', 'prick', 'twat', 'scumbag',
  'kill yourself', 'kys', 'unalive', 'die', 'i hope you die', 'hang yourself', 'rot in hell', 'go to hell',
  'hate you', 'ugly teacher', 'trash teacher', 'worst teacher', 'suck my', 'eat shit', 'drop dead',
  'stfu', 'wtf', 'terror teacher', 'fire this teacher',

  // --- Filipino / Tagalog & Regional Profanity ---
  'tangina', 'tang ina', 'putangina', 'putang ina', 'potangina', 'tanginamo', 'tangina mo',
  'putanginamo', 'putang ina mo', 'taena', 'pakshet', 'paksit', 'pakyu', 'fcku', 'p@kyu',
  'puta', 'punyeta', 'pucha', 'punyemas', 'amputa', 'ampota',
  'gago', 'gag0', 'gaga', 'tarantado', 'tarantada', 'ulol', 'ulul', 'ogag',
  'bobo', 'b0b0', 'bogo', 'inutil', 'tanga', 'engot', 'ugok', 'siraulo', 'sira ulo', 'gunggong', 'hudas',
  'kupal', 'kupaloid', 'tae', 'leche', 'letse', 'hayop', 'hayop ka', 'lintik', 'salot', 'buwisit', 'bwisit',
  'hindot', 'pokpok', 'bayag', 'tamod', 'kantot', 'kantutan', 'iyot', 'iyotan', 'burikat',
  'jakol', 'tite', 'titi', 'burat', 'puke', 'puki', 'pepe', 'kiffy', 'kipay', 'pekpek', 'bilat', 'suso',
  'yawa', 'pisting yawa', 'piste', 'pisteng', 'oten', 'kayat', 'buang',
  'mamatay ka', 'walang kwenta', 'barumbado',
];

// Milder or placeholder terms that trigger a 'flagged' status for moderation
export const FLAGGED_BLOCKLIST = [
  'unknown',
  'anonymous',
  'anon',
  'nobody',
  'no one',
  'none',
  'n/a',
  'idk',
  'who cares',
  'whatever',
  'blank',
  'nothing',
  'stupid',
  'idiot',
  'moron',
  'loser',
  'hate',
  'ugly',
];

export interface ModerationResult {
  allowed: boolean;
  status: 'approved' | 'flagged' | 'blocked';
  reason?: string;
  flaggedWords: string[];
}

/**
 * Normalizes input text by mapping common l33tspeak and stripping obfuscating symbols.
 */
export function normalizeText(raw?: string): string {
  if (!raw) return '';
  return raw
    .toLowerCase()
    .replace(/@/g, 'a')
    .replace(/\$/g, 's')
    .replace(/!/g, 'i')
    .replace(/1/g, 'i')
    .replace(/0/g, 'o')
    .replace(/3/g, 'e')
    .replace(/5/g, 's')
    .replace(/7/g, 't')
    .replace(/8/g, 'b')
    .replace(/[-_.*#~^\\/,|]/g, '')
    .trim();
}

/**
 * Checks for space-separated bypasses (e.g. "f u c k", "g a g o")
 */
function checkSpacedProfanity(text: string): string | null {
  const compact = text.toLowerCase().replace(/\s+/g, '');
  for (const word of ['fuck', 'bitch', 'shit', 'cunt', 'dick', 'pussy', 'gago', 'tangina', 'puta', 'ulol', 'pakyu', 'bobo', 'yawa', 'burat', 'tite', 'puke']) {
    if (compact.includes(word)) {
      return word;
    }
  }
  return null;
}

/**
 * Evaluates text against the severe and flagged blocklists.
 */
export function evaluateProfanity(fields: {
  message?: string;
  body?: string;
  studentName?: string;
  grade?: string;
  title?: string;
  subject?: string;
}): ModerationResult {
  const combinedText = [
    fields.message || '',
    fields.body || '',
    fields.studentName || '',
    fields.grade || '',
    fields.title || '',
    fields.subject || '',
  ].join(' ');

  const normalized = normalizeText(combinedText);
  const rawLower = combinedText.toLowerCase();

  // 1. Check severe blocklist (Automatic Prevention / Blocked)
  const blockedMatches = new Set<string>();

  // Check spaced evasion
  const spacedMatch = checkSpacedProfanity(combinedText);
  if (spacedMatch) {
    blockedMatches.add(spacedMatch);
  }

  // Check links and phone spam
  if (/(?:https?:\/\/|www\.)[^\s]+/i.test(combinedText)) {
    blockedMatches.add('external links');
  }

  for (const word of SEVERE_BLOCKLIST) {
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const wordPattern = new RegExp(`\\b${escaped}\\b`, 'i');
    if (wordPattern.test(rawLower) || wordPattern.test(normalized)) {
      blockedMatches.add(word);
      continue;
    }
    if (word.includes(' ') && (rawLower.includes(word) || normalized.includes(word.replace(/\s+/g, '')))) {
      blockedMatches.add(word);
    }
  }

  if (blockedMatches.size > 0) {
    return {
      allowed: false,
      status: 'blocked',
      reason: `Inappropriate language automatically prevented: ${Array.from(blockedMatches).join(', ')}`,
      flaggedWords: Array.from(blockedMatches),
    };
  }

  // 2. Check flagged blocklist (Allowed but marked with 'flagged' status)
  const flaggedMatches = new Set<string>();

  // Check if studentName or grade explicitly contains "unknown"
  const nameNorm = normalizeText(fields.studentName);
  const gradeNorm = normalizeText(fields.grade);
  if (nameNorm.includes('unknown') || fields.studentName?.toLowerCase().includes('unknown')) {
    flaggedMatches.add('unknown in student name');
  }
  if (gradeNorm.includes('unknown') || fields.grade?.toLowerCase().includes('unknown')) {
    flaggedMatches.add('unknown in grade');
  }

  for (const word of FLAGGED_BLOCKLIST) {
    const regex = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (regex.test(rawLower) || regex.test(normalized)) {
      flaggedMatches.add(word);
    }
  }

  if (flaggedMatches.size > 0) {
    return {
      allowed: true,
      status: 'flagged',
      reason: `Flagged for moderation: ${Array.from(flaggedMatches).join(', ')}`,
      flaggedWords: Array.from(flaggedMatches),
    };
  }

  return {
    allowed: true,
    status: 'approved',
    flaggedWords: [],
  };
}

/**
 * Express middleware for note or letter submission
 */
export function profanityDetectorMiddleware(req: Request, res: Response, next: NextFunction): void {
  const result = evaluateProfanity({
    message: req.body.message,
    body: req.body.body,
    studentName: req.body.studentName,
    grade: req.body.grade,
    title: req.body.title,
    subject: req.body.subject,
  });

  (req as any).moderationResult = result;

  // If severe profanity is detected, automatically prevent submission
  if (!result.allowed) {
    res.status(400).json({
      success: false,
      status: 'blocked',
      error: 'Submission prevented: Inappropriate or offensive language detected.',
      details: result.reason,
      flaggedWords: result.flaggedWords,
    });
    return;
  }

  next();
}
