/**
 * Content Sensor & Positivity Safety Filter (Production Hardened for Publication)
 * Enforces community guidelines for Teacher's Day notes & letters.
 * Detects:
 * 1. English, Filipino/Tagalog, and regional profanity, slurs, sexual terms, and harassment
 * 2. Obfuscated words (l33tspeak, character-separated like "f u c k", repeated characters like "fuuuuck")
 * 3. Cyrillic/homoglyph letter replacements
 * 4. Spam links, advertising, and phone numbers
 * 5. "Unknown" or generic placeholder inputs in Name, Grade, Section, or Recipient
 */

export const INAPPROPRIATE_WORDS = [
  // --- English Profanity, Vulgarity & Slurs ---
  'fuck', 'fucking', 'fucked', 'fucker', 'fuckers', 'fuk', 'fvck', 'f*ck', 'f**k', 'fck', 'fckin', 'fcku',
  'motherfucker', 'motherfucking', 'mofo', 'mf',
  'shit', 'shitty', 'bullshit', 'sh*t', 'sh!t', 'shite', 'dipshit', 'horseshit',
  'bitch', 'bitches', 'bitching', 'b*tch', 'b!tch', 'son of a bitch',
  'asshole', 'assholes', 'a**hole', 'ass', 'a$$', 'dumbass', 'jackass', 'fatass', 'badass',
  'cunt', 'cunts', 'c*nt',
  'dick', 'dicks', 'd*ck', 'd!ck', 'penis', 'cock', 'cocks', 'c*ck', 'dickhead',
  'pussy', 'pussies', 'p*ssy', 'pu$$y', 'vagina',
  'bastard', 'bastards', 'slut', 'sluts', 'whore', 'whores', 'wh*re', 'hoe', 'hoes',
  'faggot', 'fag', 'fags', 'dyke', 'nigger', 'nigga', 'niggers', 'niggas', 'n*gger', 'n*gga',
  'retard', 'retarded', 'spastic',
  'porn', 'porno', 'xxx', 'boobs', 'tits', 'titties', 'nude', 'nudes', 'sex', 'blowjob', 'handjob',
  'wanker', 'prick', 'twat', 'scumbag', 'douche', 'douchebag',

  // --- Threatening, Harassment, & Harmful Language ---
  'kill yourself', 'kys', 'unalive', 'die in a fire', 'i hope you die', 'hang yourself', 'rot in hell',
  'go to hell', 'drop dead', 'hate you', 'ugly teacher', 'trash teacher', 'worst teacher',
  'terrible teacher', 'suck my', 'eat shit', 'eat dirt', 'fuck off', 'piss off',
  'stfu', 'shut the fuck up', 'shut up', 'loser', 'kill you', 'burn in hell',
  'fire this teacher', 'terror teacher', 'bwisit ka', 'salot ka', 'walang kwenta',

  // --- Filipino / Tagalog & Philippine Regional Profanities (Luzon, Visayas, Mindanao) ---
  'tangina', 'tang ina', 'putangina', 'putang ina', 'potangina', 'potang ina',
  'tanginamo', 'tangina mo', 'putanginamo', 'putang ina mo', 'taena', 'tae ka', 't@ngina',
  'pakshet', 'paksit', 'pakyu', 'fakyu', 'pakyow', 'p@kyu',
  'puta', 'punyeta', 'pucha', 'punyemas', 'pvtang', 'amputa', 'ampota',
  'gago', 'gag0', 'gaga', 'tarantado', 'tarantada', 'ulol', 'ulul', 'ogag',
  'bobo', 'b0b0', 'bubu', 'bogo', 'inutil', 'tanga', 'engot', 'ugok', 'siraulo', 'sira ulo', 'gunggong', 'hudas',
  'kupal', 'kupaloid', 'tae', 'leche', 'letse', 'hayop', 'hayop ka', 'lintik', 'salot', 'buwisit', 'bwisit',
  'hindot', 'pokpok', 'bayag', 'tamod', 'kantot', 'kantutan', 'iyot', 'iyotan', 'burikat',
  'jakol', 'tite', 'titi', 'burat', 'puke', 'puki', 'pepe', 'kiffy', 'kipay', 'pekpek', 'bilat', 'suso',
  'yawa', 'pisting yawa', 'piste', 'pisteng', 'oten', 'kayat', 'libog', 'maniakis', 'manyak',
  'mamatay ka', 'walang kwenta', 'barumbado', 'bwiset', 'buang', 'buang ka', 'torpe'
];

// Placeholder keywords that violate authentic student tribute requirement
export const PLACEHOLDER_TERMS = [
  'unknown',
  'unknown student',
  'student unknown',
  'mr unknown',
  'ms unknown',
  'grade unknown',
  'section unknown',
  'anonymous',
  'anon',
  'nobody',
  'no one',
  'none',
  'n/a',
  'na',
  'idk',
  'i dont know',
  'i don\'t know',
  'who cares',
  'whatever',
  'blank',
  'nothing',
  'no name',
  'asdf',
  'qwerty',
  'test',
  'testing',
  'admin',
  'administrator',
  'secret',
  'someone',
];

/**
 * Advanced Text Normalization:
 */
export function normalizeText(raw: string): string {
  if (!raw) return '';
  // 1. Strip zero-width and invisible formatting characters
  let str = raw.replace(/[\u200B-\u200D\uFEFF\u00AD\u2060]/g, '');
  // 2. Normalize full-width characters
  str = str.replace(/[\uFF01-\uFF5E]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xFEE0));
  str = str.toLowerCase();
  // 3. Remove common emojis often inserted as evasions
  str = str.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '');
  // 4. Cyrillic & Leetspeak homoglyph mapping
  str = str
    .replace(/[аa@]/g, 'a')
    .replace(/[еe3]/g, 'e')
    .replace(/[іi!1|]/g, 'i')
    .replace(/[оo0]/g, 'o')
    .replace(/[рp]/g, 'p')
    .replace(/[сs$5]/g, 's')
    .replace(/[уy]/g, 'y')
    .replace(/[хx]/g, 'x')
    .replace(/[тt7+]/g, 't')
    .replace(/[вb8]/g, 'b');
  // 5. Collapse 3 or more consecutive identical characters
  str = str.replace(/(.)\1{2,}/g, '$1');
  // 6. Remove common punctuation used to break words up
  const strippedPunct = str.replace(/[-_.*#~^\\/,|;:<>`'"]/g, '');
  return strippedPunct.trim();
}

/**
 * Checks for space-separated and punctuation-separated bypasses
 */
function checkSpacedProfanity(text: string): string | null {
  const compact = text.toLowerCase().replace(/[\s\-_.*#~^\\/,|;:<>`'"]+/g, '');
  const keyTargets = [
    'fuck', 'bitch', 'shit', 'cunt', 'dick', 'pussy', 'slut', 'whore',
    'gago', 'tangina', 'puta', 'ulol', 'pakyu', 'bobo', 'bogo', 'yawa', 'burat',
    'tite', 'puke', 'leche', 'kupal', 'pakshet', 'tarantado', 'punyeta', 'inutil',
    'bilat', 'kantot', 'jakol', 'tamod', 'bayag'
  ];
  for (const word of keyTargets) {
    if (compact.includes(word)) {
      return word;
    }
  }
  return null;
}

/**
 * Enhanced Sensor: Detects spam links, phone numbers, and social media handles
 */
export function detectSpamOrPersonalData(text: string): { isSpam: boolean; reason?: string } {
  if (!text) return { isSpam: false };

  // URL / external link detection
  if (/(?:https?:\/\/|www\.|t\.me\/|discord\.gg\/)[^\s]+/i.test(text)) {
    return { isSpam: true, reason: 'External links and invite URLs are not permitted on the gratitude wall.' };
  }

  // Philippine and International mobile phone number detection
  if (/\b(?:\+?63|0)?9\d{2}[-\s]?\d{3}[-\s]?\d{4}\b/.test(text)) {
    return { isSpam: true, reason: 'Personal phone numbers should not be shared publicly.' };
  }

  // Social media handles spam
  if (/@\w{3,}\s*(?:follow|dm|add|subs)/i.test(text)) {
    return { isSpam: true, reason: 'Social media self-promotion is not permitted.' };
  }

  // Keyboard mashing / repeated characters spam
  if (/(.)\1{9,}/.test(text)) {
    return { isSpam: true, reason: 'Excessive repetitive character flooding detected.' };
  }

  return { isSpam: false };
}

/**
 * Enhanced Sensor: Detects keyboard mash or low-quality gibberish
 */
export function detectGibberish(text: string): { isGibberish: boolean; reason?: string } {
  if (!text) return { isGibberish: false };
  const clean = text.trim();

  // Long string with no vowels
  if (clean.length >= 10 && !/[aeiouy]/i.test(clean)) {
    return { isGibberish: true, reason: 'Please write actual words in English or Filipino.' };
  }

  // Obvious keyboard mash sequences
  if (/(asdfgh|qwertyui|zxcvbnm|12345678|qawsed)/i.test(clean)) {
    return { isGibberish: true, reason: 'Keyboard mash detected. Please write a meaningful tribute.' };
  }

  return { isGibberish: false };
}

/**
 * Detects inappropriate words in any string with multi-layer heuristics
 */
export function detectInappropriateContent(text: string): {
  isInappropriate: boolean;
  flaggedWords: string[];
} {
  if (!text) return { isInappropriate: false, flaggedWords: [] };

  const rawLower = text.toLowerCase();
  const normalized = normalizeText(text);
  const flagged = new Set<string>();

  // Check spaced evasion
  const spacedMatch = checkSpacedProfanity(text);
  if (spacedMatch) {
    flagged.add(spacedMatch);
  }

  // Check spam / links / numbers
  const spamCheck = detectSpamOrPersonalData(text);
  if (spamCheck.isSpam && spamCheck.reason) {
    flagged.add(spamCheck.reason);
  }

  // Check word boundary and substring matches
  for (const word of INAPPROPRIATE_WORDS) {
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const wordPattern = new RegExp(`\\b${escaped}\\b`, 'i');
    if (wordPattern.test(rawLower) || wordPattern.test(normalized)) {
      flagged.add(word);
      continue;
    }
    // For multi-word slurs
    if (word.includes(' ') && (rawLower.includes(word) || normalized.includes(word.replace(/\s+/g, '')))) {
      flagged.add(word);
    }
  }

  const flaggedWords = Array.from(flagged);
  return {
    isInappropriate: flaggedWords.length > 0,
    flaggedWords,
  };
}

/**
 * Checks if a string contains "unknown" or unacceptable placeholder values
 */
export function containsUnknownOrPlaceholder(val: string): boolean {
  if (!val) return false;
  const clean = val.trim().toLowerCase();
  const norm = normalizeText(val);

  // Direct check for "unknown" substring anywhere in the string
  if (clean.includes('unknown') || norm.includes('unknown')) {
    return true;
  }

  // Check against exact or word-boundary placeholder terms
  for (const term of PLACEHOLDER_TERMS) {
    if (clean === term || norm === term) return true;
    const regex = new RegExp(`\\b${term}\\b`, 'i');
    if (regex.test(clean) || regex.test(norm)) return true;
  }

  // Punctuations only
  if (/^[.\-_?~*! ]+$/.test(clean)) {
    return true;
  }

  // Suspicious repetition
  if (/^(asdf|test|qwerty|xxx|aaa)+$/i.test(clean)) {
    return true;
  }

  return false;
}

export interface ValidationWarnings {
  hasWarning: boolean;
  warnings: string[];
  nameWarning?: string;
  gradeWarning?: string;
  contentWarning?: string;
  subjectWarning?: string;
  flaggedTerms: string[];
}

/**
 * Comprehensive Sensor for Sticky Notes
 */
export function validateStickyNoteSensor(params: {
  studentName: string;
  grade: string;
  subjectOrTeacher: string;
  message: string;
}): ValidationWarnings {
  const warnings: string[] = [];
  const flaggedTerms: string[] = [];
  let nameWarning: string | undefined;
  let gradeWarning: string | undefined;
  let contentWarning: string | undefined;
  let subjectWarning: string | undefined;

  // 1. Student Name Checks
  if (containsUnknownOrPlaceholder(params.studentName)) {
    nameWarning = '⚠️ Name Warning: "Unknown" or placeholder names are not permitted. Please enter your real name or student nickname so your teacher knows who appreciated them!';
    warnings.push(nameWarning);
  }

  const nameInappropriate = detectInappropriateContent(params.studentName);
  if (nameInappropriate.isInappropriate) {
    nameWarning = '⚠️ Name Warning: Inappropriate word detected in your name. Please use a respectful student name.';
    warnings.push(nameWarning);
    flaggedTerms.push(...nameInappropriate.flaggedWords);
  }

  // 2. Grade / Section Checks
  if (params.grade && params.grade.trim()) {
    if (containsUnknownOrPlaceholder(params.grade)) {
      gradeWarning = '⚠️ Grade Warning: "Unknown" is not allowed in grade/section. Please put your actual grade and section (e.g., "SHS - STEM") or leave it blank.';
      warnings.push(gradeWarning);
    }
    const gradeInappropriate = detectInappropriateContent(params.grade);
    if (gradeInappropriate.isInappropriate) {
      gradeWarning = '⚠️ Grade Warning: Inappropriate language detected in Grade/Section.';
      warnings.push(gradeWarning);
      flaggedTerms.push(...gradeInappropriate.flaggedWords);
    }
  }

  // 3. Subject / Teacher Checks
  if (params.subjectOrTeacher && params.subjectOrTeacher.trim()) {
    if (containsUnknownOrPlaceholder(params.subjectOrTeacher)) {
      subjectWarning = '⚠️ Subject Warning: "Unknown" is not allowed. Please specify the teacher or subject.';
      warnings.push(subjectWarning);
    }
    const subjectInappropriate = detectInappropriateContent(params.subjectOrTeacher);
    if (subjectInappropriate.isInappropriate) {
      subjectWarning = '⚠️ Subject Warning: Inappropriate language detected in Subject.';
      warnings.push(subjectWarning);
      flaggedTerms.push(...subjectInappropriate.flaggedWords);
    }
  }

  // 4. Message Content Sensor
  if (!params.message || params.message.trim().length < 6) {
    contentWarning = '⚠️ Tribute is very short. Please write a few heartfelt words expressing gratitude to your teacher!';
    warnings.push(contentWarning);
  }

  const messageGibberish = detectGibberish(params.message);
  if (messageGibberish.isGibberish && messageGibberish.reason) {
    contentWarning = `⚠️ Content Sensor Warning: ${messageGibberish.reason}`;
    warnings.push(contentWarning);
  }

  const messageInappropriate = detectInappropriateContent(params.message);
  if (messageInappropriate.isInappropriate) {
    contentWarning = `⚠️ Content Sensor Warning: Inappropriate or prohibited language detected (${messageInappropriate.flaggedWords.join(', ')}). Our Teachers' Day wall is dedicated to positive, respectful appreciation. Please revise your message.`;
    warnings.push(contentWarning);
    flaggedTerms.push(...messageInappropriate.flaggedWords);
  }

  return {
    hasWarning: warnings.length > 0,
    warnings,
    nameWarning,
    gradeWarning,
    contentWarning,
    subjectWarning,
    flaggedTerms,
  };
}

/**
 * Comprehensive Sensor for Formal Heartfelt Letters
 */
export function validateLetterSensor(params: {
  studentName: string;
  grade: string;
  title: string;
  body: string;
  customTeacherName?: string;
}): ValidationWarnings {
  const warnings: string[] = [];
  const flaggedTerms: string[] = [];
  let nameWarning: string | undefined;
  let gradeWarning: string | undefined;
  let contentWarning: string | undefined;
  let subjectWarning: string | undefined;

  // 1. Student Name Checks
  if (containsUnknownOrPlaceholder(params.studentName)) {
    nameWarning = '⚠️ Name Warning: "Unknown" is not allowed. Please enter your real name or class group so your teacher knows who sent this letter!';
    warnings.push(nameWarning);
  }

  const nameInappropriate = detectInappropriateContent(params.studentName);
  if (nameInappropriate.isInappropriate) {
    nameWarning = '⚠️ Name Warning: Inappropriate language detected in your signature/name.';
    warnings.push(nameWarning);
    flaggedTerms.push(...nameInappropriate.flaggedWords);
  }

  // 2. Grade Checks
  if (params.grade && params.grade.trim()) {
    if (containsUnknownOrPlaceholder(params.grade)) {
      gradeWarning = '⚠️ Grade Warning: "Unknown" is not allowed in grade/section. Please provide your actual grade (e.g. "SHS - Hope") or leave it blank.';
      warnings.push(gradeWarning);
    }
    const gradeInappropriate = detectInappropriateContent(params.grade);
    if (gradeInappropriate.isInappropriate) {
      gradeWarning = '⚠️ Grade Warning: Inappropriate language detected in Grade/Section.';
      warnings.push(gradeWarning);
      flaggedTerms.push(...gradeInappropriate.flaggedWords);
    }
  }

  // 3. Custom Teacher Name Checks
  if (params.customTeacherName && params.customTeacherName.trim()) {
    if (containsUnknownOrPlaceholder(params.customTeacherName)) {
      subjectWarning = '⚠️ Recipient Warning: "Unknown" cannot be the teacher recipient.';
      warnings.push(subjectWarning);
    }
    const teacherInappropriate = detectInappropriateContent(params.customTeacherName);
    if (teacherInappropriate.isInappropriate) {
      subjectWarning = '⚠️ Recipient Warning: Inappropriate language detected in teacher name.';
      warnings.push(subjectWarning);
      flaggedTerms.push(...teacherInappropriate.flaggedWords);
    }
  }

  // 4. Letter Title & Body Checks
  if (!params.title || params.title.trim().length < 4) {
    contentWarning = '⚠️ Letter Title is very short. Please give your letter a meaningful subject or title.';
    warnings.push(contentWarning);
  }

  if (!params.body || params.body.trim().length < 20) {
    contentWarning = '⚠️ Letter Body is very short. Formal letters to teachers should be at least a sentence or two sharing your appreciation.';
    warnings.push(contentWarning);
  }

  const titleGibberish = detectGibberish(params.title);
  if (titleGibberish.isGibberish && titleGibberish.reason) {
    warnings.push(`⚠️ Title: ${titleGibberish.reason}`);
  }

  const bodyGibberish = detectGibberish(params.body);
  if (bodyGibberish.isGibberish && bodyGibberish.reason) {
    warnings.push(`⚠️ Letter Body: ${bodyGibberish.reason}`);
  }

  const titleInappropriate = detectInappropriateContent(params.title);
  if (titleInappropriate.isInappropriate) {
    contentWarning = `⚠️ Content Warning: Inappropriate language detected in letter title (${titleInappropriate.flaggedWords.join(', ')}).`;
    warnings.push(contentWarning);
    flaggedTerms.push(...titleInappropriate.flaggedWords);
  }

  const bodyInappropriate = detectInappropriateContent(params.body);
  if (bodyInappropriate.isInappropriate) {
    contentWarning = `⚠️ Content Sensor Warning: Inappropriate language detected in letter body (${bodyInappropriate.flaggedWords.join(', ')}). Please write a respectful and heartfelt message for your teacher.`;
    warnings.push(contentWarning);
    flaggedTerms.push(...bodyInappropriate.flaggedWords);
  }

  return {
    hasWarning: warnings.length > 0,
    warnings,
    nameWarning,
    gradeWarning,
    contentWarning,
    subjectWarning,
    flaggedTerms,
  };
}

/**
 * Real-time Live Sensor Check for immediate input guidance
 */
export function liveCheckTextSensor(text: string): {
  status: 'safe' | 'warning' | 'prohibited';
  message: string;
} {
  if (!text || text.trim().length === 0) {
    return { status: 'safe', message: 'Sensor active' };
  }

  const inappropriate = detectInappropriateContent(text);
  if (inappropriate.isInappropriate) {
    return {
      status: 'prohibited',
      message: `Prohibited language detected (${inappropriate.flaggedWords[0]})`,
    };
  }

  const spam = detectSpamOrPersonalData(text);
  if (spam.isSpam) {
    return {
      status: 'prohibited',
      message: spam.reason || 'Spam or link detected',
    };
  }

  const gibberish = detectGibberish(text);
  if (gibberish.isGibberish) {
    return {
      status: 'warning',
      message: gibberish.reason || 'Suspicious keyboard pattern',
    };
  }

  return { status: 'safe', message: 'Positivity & Respect Verified' };
}
