import React, { useState, useEffect, useMemo } from 'react';
import { StudentNote, NoteColor, StudentLetter, AuthorizedTeacher } from '../types';
import { NOTE_COLOR_MAP } from '../data/initialNotes';
import {
  LETTER_TEMPLATES,
  NOTE_SUGGESTION_CHIPS,
  LETTER_PROMPT_SUGGESTIONS,
} from '../data/letterTemplates';
import {
  JHS_SUBJECTS,
  SHS_STRANDS,
  JHS_GRADE_LEVELS,
  SHS_GRADE_LEVELS,
} from '../data/curriculum';
import confetti from 'canvas-confetti';
import { playChime } from '../utils/audio';
import { realtimeHub } from '../utils/realtime';
import {
  Mail,
  StickyNote,
  Sparkles,
  Send,
  AlertTriangle,
  ShieldAlert,
  Lightbulb,
  Palette,
  GraduationCap,
} from 'lucide-react';
import {
  validateStickyNoteSensor,
  validateLetterSensor,
  containsUnknownOrPlaceholder,
  detectInappropriateContent,
  liveCheckTextSensor,
} from '../utils/contentSensor';

interface WriteNoteSectionProps {
  onAddNote: (newNote: StudentNote, savePermanently: boolean) => void;
  onSendLetter?: (newLetter: StudentLetter) => void;
  authorizedTeachers?: AuthorizedTeacher[];
}

export const WriteNoteSection: React.FC<WriteNoteSectionProps> = ({
  onAddNote,
  onSendLetter,
  authorizedTeachers = [],
}) => {
  const [mode, setMode] = useState<'note' | 'letter'>('note');

  // Shared Grade Level & Subject State
  const [gradeLevel, setGradeLevel] = useState<'Grade 7-10' | 'SHS'>('Grade 7-10');
  const [selectedGrade, setSelectedGrade] = useState<string>('Grade 7');
  const [selectedSubject, setSelectedSubject] = useState<string>('Mathematics');
  const [sectionName, setSectionName] = useState<string>('');

  // Sticky Note state
  const [studentName, setStudentName] = useState('');
  const [noteTeacherName, setNoteTeacherName] = useState('');
  const [message, setMessage] = useState('');
  const [color, setColor] = useState<NoteColor>('blush');
  const [pinToWall, setPinToWall] = useState(true);
  const [noteSticker, setNoteSticker] = useState<string>('✨');

  // Letter form state
  const [recipientTeacher, setRecipientTeacher] = useState<string>('');
  const [letterTitle, setLetterTitle] = useState(LETTER_TEMPLATES[0].defaultTitle);
  const [letterBody, setLetterBody] = useState(LETTER_TEMPLATES[0].bodyTemplate);
  const [selectedTemplateId, setSelectedTemplateId] = useState<
    'mentorship' | 'subject' | 'patience' | 'character' | 'class' | 'creative' | 'adviser' | 'dedication' | 'custom'
  >('mentorship');
  const [pinLetterPreview, setPinLetterPreview] = useState(true);

  // Letter enhancements
  const [stationeryTheme, setStationeryTheme] = useState<'classic' | 'warm' | 'sage' | 'rose'>('classic');
  const [activePromptCategory, setActivePromptCategory] = useState<'openings' | 'memories' | 'impact' | 'closings'>('openings');

  // Safety Sensor Warnings & Alerts
  const [sensorWarnings, setSensorWarnings] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [justSubmitted, setJustSubmitted] = useState(false);
  const [submittedType, setSubmittedType] = useState<'note' | 'letter'>('note');

  const colors: NoteColor[] = ['blush', 'sky', 'mint', 'sunshine', 'lilac', 'coral'];
  const stickers = ['✨', '❤️', '🌟', '📚', '🌸', '💐', '🏆', '🎉'];

  // Update default subject and grade when grade level changes
  const handleGradeLevelChange = (lvl: 'Grade 7-10' | 'SHS') => {
    setGradeLevel(lvl);
    if (lvl === 'Grade 7-10') {
      setSelectedGrade('Grade 7');
      setSelectedSubject('Mathematics');
    } else {
      setSelectedGrade('Senior High School (SHS)');
      setSelectedSubject('STEM');
    }
  };

  // Listen for suggestion event from SuggestionsSection
  useEffect(() => {
    const handlePromptEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ text: string; type: 'note' | 'letter'; subject?: string }>;
      if (!customEvent.detail) return;
      const { text, type, subject } = customEvent.detail;
      if (type === 'letter') {
        setMode('letter');
        setSelectedTemplateId('custom');
        setLetterBody((prev) => (prev ? `${prev}\n\n${text}` : text));
        if (subject) {
          setSelectedSubject(subject);
        }
      } else {
        setMode('note');
        setMessage(text);
        if (subject) {
          setSelectedSubject(subject);
        }
      }
      setSensorWarnings([]);
      setErrorMessage('');
    };

    window.addEventListener('insert-gratitude-prompt', handlePromptEvent);
    return () => window.removeEventListener('insert-gratitude-prompt', handlePromptEvent);
  }, []);

  // Live sensor checks for inline warning badges
  const liveStudentNameWarning = useMemo(() => {
    if (!studentName.trim()) return null;
    if (containsUnknownOrPlaceholder(studentName)) {
      return '⚠️ "Unknown" is not permitted. Please enter your real name or student nickname.';
    }
    const check = detectInappropriateContent(studentName);
    if (check.isInappropriate) {
      return '⚠️ Inappropriate word detected in student name.';
    }
    return null;
  }, [studentName]);

  const liveNoteTeacherWarning = useMemo(() => {
    if (!noteTeacherName.trim()) return null;
    if (containsUnknownOrPlaceholder(noteTeacherName)) {
      return '⚠️ "Unknown" cannot be the teacher name.';
    }
    const check = detectInappropriateContent(noteTeacherName);
    if (check.isInappropriate) {
      return '⚠️ Inappropriate word detected in teacher name.';
    }
    return null;
  }, [noteTeacherName]);

  const liveRecipientTeacherWarning = useMemo(() => {
    if (!recipientTeacher.trim()) return null;
    if (containsUnknownOrPlaceholder(recipientTeacher)) {
      return '⚠️ "Unknown" cannot be the teacher name.';
    }
    const check = detectInappropriateContent(recipientTeacher);
    if (check.isInappropriate) {
      return '⚠️ Inappropriate word detected in teacher recipient name.';
    }
    return null;
  }, [recipientTeacher]);

  const liveMessageWarning = useMemo(() => {
    if (!message.trim()) return null;
    const liveCheck = liveCheckTextSensor(message);
    if (liveCheck.status === 'prohibited' || liveCheck.status === 'warning') {
      return `⚠️ Sensor Alert: ${liveCheck.message}. Please keep tributes positive and respectful!`;
    }
    return null;
  }, [message]);

  const liveLetterBodyWarning = useMemo(() => {
    if (!letterBody.trim()) return null;
    const liveCheck = liveCheckTextSensor(letterBody);
    if (liveCheck.status === 'prohibited' || liveCheck.status === 'warning') {
      return `⚠️ Sensor Alert: ${liveCheck.message}. Formal letters must be respectful and heartfelt.`;
    }
    return null;
  }, [letterBody]);

  const liveLetterTitleWarning = useMemo(() => {
    if (!letterTitle.trim()) return null;
    const liveCheck = liveCheckTextSensor(letterTitle);
    if (liveCheck.status === 'prohibited' || liveCheck.status === 'warning') {
      return `⚠️ Sensor Alert: ${liveCheck.message} in letter title.`;
    }
    return null;
  }, [letterTitle]);

  // Apply template
  const applyTemplate = (templateId: typeof selectedTemplateId) => {
    setSelectedTemplateId(templateId);
    const template = LETTER_TEMPLATES.find((t) => t.id === templateId);
    if (!template) return;
    setLetterTitle(template.defaultTitle);
    const actualTeacher = recipientTeacher.trim() || '[Teacher\'s Name]';
    const actualStudent = studentName.trim() || '[Your Name]';
    const actualSubject = selectedSubject || '[Subject]';
    const filled = template.bodyTemplate
      .replace(/\[Teacher's Name\]/g, actualTeacher)
      .replace(/\[Subject\]/g, actualSubject)
      .replace(/\[Your Name\]/g, actualStudent);
    setLetterBody(filled);
    setSensorWarnings([]);
    setErrorMessage('');
    playChime();
  };

  // Blank letter option
  const applyBlankLetter = () => {
    setSelectedTemplateId('custom');
    const actualTeacher = recipientTeacher.trim() || 'Teacher';
    const actualStudent = studentName.trim() || '[Your Name]';
    setLetterTitle('A Personal Note of Gratitude');
    setLetterBody(`Dear ${actualTeacher},\n\n\n\nWith warm gratitude,\n${actualStudent}`);
    setSensorWarnings([]);
    setErrorMessage('');
    playChime();
  };

  // Insert prompt helper
  const handleInsertLetterPrompt = (promptText: string) => {
    setLetterBody((prev) => {
      const trimmed = prev.trim();
      if (!trimmed) return promptText;
      return `${trimmed}\n\n${promptText}`;
    });
    playChime();
  };

  const handleInsertSalutation = (salutation: string) => {
    const actualTeacher = recipientTeacher.trim() || 'Teacher';
    const cleanSalutation = salutation.replace(/\[Name\]/g, actualTeacher);
    setLetterBody((prev) => `${cleanSalutation}\n\n${prev.replace(/^(Dear|To|Good day)[^\n]*\n+/i, '').trim()}`);
    playChime();
  };

  const handleInsertClosing = (closing: string) => {
    const actualStudent = studentName.trim() || '[Your Name]';
    setLetterBody((prev) => `${prev.trim()}\n\n${closing}\n${actualStudent}`);
    playChime();
  };

  // Submit Sticky Note
  const handleNoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSensorWarnings([]);

    if (!studentName.trim() || !message.trim()) {
      setErrorMessage('Please provide both your name and your thank-you message.');
      return;
    }

    const fullGrade = sectionName.trim()
      ? `${selectedGrade} - ${sectionName.trim()}`
      : selectedGrade;

    // 1. Client-Side Quick Sensor Check
    const sensorCheck = validateStickyNoteSensor({
      studentName,
      grade: fullGrade,
      subjectOrTeacher: noteTeacherName || selectedSubject,
      message,
    });

    if (sensorCheck.hasWarning) {
      setSensorWarnings(sensorCheck.warnings);
      const section = document.getElementById('write-section');
      if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    const messageWithSticker = noteSticker && !message.includes(noteSticker)
      ? `${noteSticker} ${message.trim()}`
      : message.trim();

    const formattedMessage = messageWithSticker.startsWith('"')
      ? messageWithSticker
      : `"${messageWithSticker}"`;

    // 2. Server-side Middleware Moderation & Realtime Verification
    let noteStatus: 'approved' | 'flagged' = 'approved';
    let flaggedReason = '';

    try {
      const response = await fetch('/api/moderate/note', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentName: studentName.trim(),
          grade: fullGrade,
          subject: selectedSubject.toUpperCase(),
          message: formattedMessage,
        }),
      });
      const data = await response.json();
      if (!response.ok || data.status === 'blocked') {
        setSensorWarnings([
          `🚫 ${data.error || 'Submission automatically prevented: Inappropriate language detected.'}`,
          ...(data.details ? [data.details] : []),
        ]);
        const section = document.getElementById('write-section');
        if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
      noteStatus = data.status || 'approved';
      flaggedReason = data.flaggedReason || '';
    } catch {
      // Proceed with client verification
    }

    const newNote: StudentNote = {
      id: `note-${Date.now()}`,
      studentName: studentName.trim(),
      teacherName: noteTeacherName.trim() || undefined,
      grade: fullGrade,
      gradeLevel,
      strandOrSubject: selectedSubject,
      subject: selectedSubject.toUpperCase(),
      message: formattedMessage,
      color,
      likes: 1,
      createdAt: Date.now(),
      status: noteStatus,
      flaggedReason,
    };

    onAddNote(newNote, pinToWall);
    realtimeHub.broadcast({ type: 'NOTE_ADDED', note: newNote });

    if (noteStatus === 'flagged') {
      realtimeHub.broadcast({
        type: 'NOTE_FLAGGED',
        noteId: newNote.id,
        studentName: newNote.studentName,
        reason: flaggedReason,
      });
    }

    playChime();
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.7 },
      colors: ['#FCECEB', '#D8ECFD', '#D7F3E3', '#FDF2B5', '#ECE8FD', '#CE5A46'],
    });

    setStudentName('');
    setNoteTeacherName('');
    setSectionName('');
    setMessage('');
    setColor('blush');
    setSubmittedType('note');
    setSensorWarnings([]);
    setJustSubmitted(true);
    setTimeout(() => setJustSubmitted(false), 5000);

    const wallEl = document.getElementById('wall-section');
    if (wallEl) {
      wallEl.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Submit Formal Letter
  const handleLetterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSensorWarnings([]);

    if (!studentName.trim() || !recipientTeacher.trim() || !letterTitle.trim() || !letterBody.trim()) {
      setErrorMessage('Please provide your name, the name of your teacher, letter title, and message.');
      return;
    }

    const fullGrade = sectionName.trim()
      ? `${selectedGrade} - ${sectionName.trim()}`
      : selectedGrade;

    // 1. Client-side Sensor Check
    const sensorCheck = validateLetterSensor({
      studentName,
      grade: fullGrade,
      title: letterTitle,
      body: letterBody,
      customTeacherName: recipientTeacher.trim(),
    });

    if (sensorCheck.hasWarning) {
      setSensorWarnings(sensorCheck.warnings);
      const section = document.getElementById('write-section');
      if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    let letterStatus: 'approved' | 'flagged' = 'approved';
    let letterFlaggedReason = '';

    try {
      const response = await fetch('/api/moderate/letter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentName: studentName.trim(),
          grade: fullGrade,
          title: letterTitle.trim(),
          body: letterBody.trim(),
          recipientTeacherName: recipientTeacher.trim(),
        }),
      });
      const data = await response.json();
      if (!response.ok || data.status === 'blocked') {
        setSensorWarnings([
          `🚫 ${data.error || 'Submission automatically prevented: Inappropriate language detected in letter.'}`,
          ...(data.details ? [data.details] : []),
        ]);
        const section = document.getElementById('write-section');
        if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
      letterStatus = data.status || 'approved';
      letterFlaggedReason = data.flaggedReason || '';
    } catch {
      // Proceed with client verification
    }

    const newLetter: StudentLetter = {
      id: `letter-${Date.now()}`,
      recipientTeacherName: recipientTeacher.trim(),
      recipientSubject: selectedSubject,
      studentName: studentName.trim(),
      grade: fullGrade,
      gradeLevel,
      templateType: selectedTemplateId,
      title: letterTitle.trim(),
      body: letterBody.trim(),
      createdAt: Date.now(),
      isRead: false,
      isBookmarked: false,
      pinPreviewToWall: pinLetterPreview,
      status: letterStatus,
      flaggedReason: letterFlaggedReason,
    };

    if (onSendLetter) {
      onSendLetter(newLetter);
    }
    realtimeHub.broadcast({
      type: 'LETTER_SENT',
      letter: newLetter,
      letterId: newLetter.id,
      studentName: newLetter.studentName,
      recipientTeacherName: newLetter.recipientTeacherName,
    });

    if (pinLetterPreview) {
      const fullBodyText = letterBody.trim();
      const cardText =
        fullBodyText.length > 4500
          ? `${fullBodyText.substring(0, 4495).trim()}...`
          : fullBodyText;

      const previewNote: StudentNote = {
        id: `note-from-letter-${Date.now()}`,
        studentName: studentName.trim(),
        teacherName: recipientTeacher.trim(),
        grade: fullGrade,
        gradeLevel,
        strandOrSubject: selectedSubject,
        subject: selectedSubject.toUpperCase(),
        message: `💌 ${cardText}`,
        color: 'lilac',
        likes: 1,
        createdAt: Date.now(),
        status: letterStatus,
        flaggedReason: letterFlaggedReason,
        letterId: newLetter.id,
        isFormalLetterPreview: true,
        fullLetterBody: fullBodyText,
        letterTitle: letterTitle.trim(),
      };
      onAddNote(previewNote, true);
      realtimeHub.broadcast({ type: 'NOTE_ADDED', note: previewNote });
    }

    playChime();
    confetti({
      particleCount: 100,
      spread: 80,
      origin: { y: 0.65 },
      colors: ['#E7C14A', '#CE5A46', '#1F453B', '#FCECEB'],
    });

    setSubmittedType('letter');
    setSensorWarnings([]);
    setJustSubmitted(true);
    setTimeout(() => setJustSubmitted(false), 6000);
  };

  const stationeryStyles = {
    classic: {
      card: 'bg-[#FFFDF9] border-[#D5C2A8]',
      stamp: 'border-[#B34B36]/60 text-[#B34B36]',
      name: '📜 Classic Parchment',
    },
    warm: {
      card: 'bg-[#FFFDF0] border-[#E8D499]',
      stamp: 'border-[#C27D00]/60 text-[#C27D00]',
      name: '☀️ Golden Warmth',
    },
    sage: {
      card: 'bg-[#F6FAF7] border-[#BFDFCD]',
      stamp: 'border-[#1F453B]/60 text-[#1F453B]',
      name: '🌿 Sage Botanical',
    },
    rose: {
      card: 'bg-[#FDF7F7] border-[#E8C8C4]',
      stamp: 'border-[#CE5A46]/60 text-[#CE5A46]',
      name: '🌸 Sweet Rose',
    },
  };

  return (
    <section id="write-section" className="relative w-full max-w-4xl mx-auto px-4 sm:px-6 mb-16 sm:mb-20 z-10">
      <div className="relative board-card border border-[#E8DFD1] p-6 sm:p-10 md:p-12 shadow-sm rounded-3xl bg-[#FFFDF9]">
        {/* Format Selector Switcher */}
        <div className="flex items-center justify-between flex-wrap gap-4 mb-6 pb-6 border-b border-[#E8DFD1]">
          <div>
            <div className="text-xs uppercase tracking-[0.22em] font-bold text-[#CE5A46] mb-1">
              CHOOSE TRIBUTE FORMAT
            </div>
            <h2 className="font-heading text-2xl sm:text-3xl font-bold text-[#231F1D] tracking-tight">
              {mode === 'note' ? "Write a Teacher's Day Note" : 'Send a Heartfelt Letter'}
            </h2>
          </div>
          <div className="inline-flex p-1.5 rounded-2xl bg-[#EFE8DC] border border-[#DDD0BF] shadow-inner">
            <button
              type="button"
              onClick={() => {
                setMode('note');
                setErrorMessage('');
                setSensorWarnings([]);
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                mode === 'note'
                  ? 'bg-white text-[#2B2520] shadow-xs'
                  : 'text-[#6C5E50] hover:text-[#2B2520]'
              }`}
            >
              <StickyNote className="w-4 h-4 text-[#CE5A46]" />
              <span>Sticky Note (Quick)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('letter');
                setErrorMessage('');
                setSensorWarnings([]);
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                mode === 'letter'
                  ? 'bg-[#1F453B] text-white shadow-xs'
                  : 'text-[#6C5E50] hover:text-[#2B2520]'
              }`}
            >
              <Mail className="w-4 h-4 text-[#F7DE85]" />
              <span>Heartfelt Letter (Keepsake)</span>
            </button>
          </div>
        </div>

        {/* Grade Level Organizer (Grade 7-10 vs SHS) */}
        <div className="mb-6 p-4 rounded-2xl bg-[#FAF5EB] border border-[#EADBCC]">
          <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
            <div className="text-xs font-bold uppercase tracking-wider text-[#1F453B] flex items-center gap-1.5">
              <GraduationCap className="w-4 h-4 text-[#D97706]" />
              <span>Select Your Grade Level & Curriculum:</span>
            </div>
            <div className="inline-flex p-1 bg-white rounded-xl border border-[#DECDB8] shadow-2xs">
              <button
                type="button"
                onClick={() => handleGradeLevelChange('Grade 7-10')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  gradeLevel === 'Grade 7-10'
                    ? 'bg-[#1F453B] text-white shadow-xs'
                    : 'text-[#6C5E50] hover:text-[#1F453B]'
                }`}
              >
                🏫 Grade 7 - 10 (Junior High)
              </button>
              <button
                type="button"
                onClick={() => handleGradeLevelChange('SHS')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  gradeLevel === 'SHS'
                    ? 'bg-[#1F453B] text-white shadow-xs'
                    : 'text-[#6C5E50] hover:text-[#1F453B]'
                }`}
              >
                🎓 Senior High School (SHS)
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Grade Selector */}
            <div>
              <label className="block text-[11px] font-bold text-[#4F4439] uppercase tracking-wider mb-1">
                GRADE LEVEL
              </label>
              <select
                value={selectedGrade}
                onChange={(e) => setSelectedGrade(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-[#DDD0BF] rounded-xl text-[#2B231D] focus:outline-none focus:ring-2 focus:ring-[#1F453B]/30 font-semibold"
              >
                {(gradeLevel === 'Grade 7-10' ? JHS_GRADE_LEVELS : SHS_GRADE_LEVELS).map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>

            {/* Subject / Strand Selector Organized by Grade Level */}
            <div>
              <label className="block text-[11px] font-bold text-[#4F4439] uppercase tracking-wider mb-1">
                {gradeLevel === 'Grade 7-10' ? 'SUBJECT (GRADE 7-10)' : 'SHS STRAND / TRACK'}
              </label>
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-[#DDD0BF] rounded-xl text-[#2B231D] focus:outline-none focus:ring-2 focus:ring-[#1F453B]/30 font-semibold"
              >
                {(gradeLevel === 'Grade 7-10' ? JHS_SUBJECTS : SHS_STRANDS).map((s) => (
                  <option key={s.id} value={s.name}>
                    {s.icon} {s.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Section / Class Name */}
            <div>
              <label className="block text-[11px] font-bold text-[#4F4439] uppercase tracking-wider mb-1">
                SECTION / CLASS (OPTIONAL)
              </label>
              <input
                type="text"
                placeholder="e.g. Diamond, Hope, STEM-A"
                value={sectionName}
                onChange={(e) => setSectionName(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-[#DDD0BF] rounded-xl text-[#2B231D] focus:outline-none focus:ring-2 focus:ring-[#1F453B]/30"
                maxLength={30}
              />
            </div>
          </div>
        </div>

        {/* Success Confirmation */}
        {justSubmitted && (
          <div className="mb-6 p-4 rounded-2xl bg-[#D7F3E3] border border-[#B2E7C6] text-[#246B46] text-sm font-medium flex items-center gap-2 shadow-xs animate-in fade-in duration-200">
            <span className="text-lg">🎉</span>
            <span>
              {submittedType === 'letter'
                ? "Your heartfelt letter has been sealed and delivered directly to the teacher's mailbox!"
                : 'Your appreciation note has been pinned to the Gratitude Wall!'}
            </span>
          </div>
        )}

        {/* Generic Error message */}
        {errorMessage && (
          <div className="mb-6 p-4 rounded-2xl bg-[#FCECEB] border border-[#F6CDCA] text-[#CE5A46] text-sm font-semibold flex items-center gap-2 shadow-xs">
            <AlertTriangle className="w-4 h-4 shrink-0 text-[#CE5A46]" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Content & Positivity Safety Sensor Warning Box */}
        {sensorWarnings.length > 0 && (
          <div className="mb-6 p-4 sm:p-5 rounded-2xl bg-[#FFF8E6] border-2 border-[#E7C14A] text-[#5A4100] shadow-md animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center gap-2.5 font-bold text-sm text-[#875A00] mb-2">
              <ShieldAlert className="w-5 h-5 text-[#B87A00] shrink-0" />
              <span className="uppercase tracking-wider">Community Positivity & Safety Sensor Warning</span>
            </div>
            <p className="text-xs text-[#6B4B02] mb-2 leading-relaxed">
              Please review the following requirements before posting:
            </p>
            <ul className="space-y-1.5 text-xs text-[#4A3401] font-medium list-disc list-inside">
              {sensorWarnings.map((w, idx) => (
                <li key={idx} className="leading-snug">{w}</li>
              ))}
            </ul>
          </div>
        )}

        {/* MODE 1: STICKY NOTE FORM */}
        {mode === 'note' && (
          <form onSubmit={handleNoteSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Student Name */}
              <div>
                <label className="block text-xs uppercase font-bold text-[#4F4439] tracking-wider mb-2">
                  YOUR NAME / NICKNAME <span className="text-[#CE5A46]">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Maria Santos, Alex, or your nickname"
                  value={studentName}
                  onChange={(e) => {
                    setStudentName(e.target.value);
                    if (sensorWarnings.length > 0) setSensorWarnings([]);
                  }}
                  className={`w-full px-4 py-3 rounded-xl bg-white border text-sm text-[#231F1D] focus:outline-none transition-all ${
                    liveStudentNameWarning
                      ? 'border-[#E7C14A] ring-2 ring-[#E7C14A]/40 bg-[#FFFDF5]'
                      : 'border-[#DDD0BF] focus:ring-2 focus:ring-[#CE5A46]/30 focus:border-[#CE5A46]'
                  }`}
                  maxLength={60}
                />
                {liveStudentNameWarning && (
                  <p className="mt-1.5 text-[11px] font-semibold text-[#A86400]">
                    {liveStudentNameWarning}
                  </p>
                )}
              </div>

              {/* Name of Teacher Text Input */}
              <div>
                <label className="block text-xs uppercase font-bold text-[#4F4439] tracking-wider mb-2">
                  NAME OF TEACHER (RECIPIENT)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Ms. Rivera, Sir Santos, Mrs. Cruz..."
                  value={noteTeacherName}
                  onChange={(e) => {
                    setNoteTeacherName(e.target.value);
                    if (sensorWarnings.length > 0) setSensorWarnings([]);
                  }}
                  className={`w-full px-4 py-3 rounded-xl bg-white border text-sm text-[#231F1D] focus:outline-none transition-all ${
                    liveNoteTeacherWarning
                      ? 'border-[#E7C14A] ring-2 ring-[#E7C14A]/40 bg-[#FFFDF5]'
                      : 'border-[#DDD0BF] focus:ring-2 focus:ring-[#CE5A46]/30 focus:border-[#CE5A46]'
                  }`}
                  maxLength={60}
                />
                {liveNoteTeacherWarning && (
                  <p className="mt-1.5 text-[11px] font-semibold text-[#A86400]">
                    {liveNoteTeacherWarning}
                  </p>
                )}
              </div>
            </div>

            {/* Note Suggestions Chips Bar */}
            <div className="bg-[#FAF5EC] p-3.5 sm:p-4 rounded-2xl border border-[#E4D5C2]">
              <div className="flex items-center justify-between flex-wrap gap-2 mb-2.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#8C5D39]">
                  <Lightbulb className="w-3.5 h-3.5 text-[#E7C14A]" />
                  <span className="uppercase tracking-wider">Smart Suggestion Phrases (Click to Insert or Append):</span>
                </div>
                <span className="text-[10px] font-semibold text-[#7A6C5D] bg-white px-2 py-0.5 rounded-full border border-[#DECDB8]">
                  ✨ One-Click Note Suggestions
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {NOTE_SUGGESTION_CHIPS.map((suggestion, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setMessage((prev) =>
                        prev.trim() && !prev.includes(suggestion)
                          ? `${prev.trim()} ${suggestion}`.slice(0, 500)
                          : suggestion
                      );
                      playChime();
                      if (sensorWarnings.length > 0) setSensorWarnings([]);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-white hover:bg-[#F3EADB] border border-[#DECDB8] hover:border-[#CE5A46]/50 text-xs text-[#3E342B] font-medium transition-all text-left cursor-pointer hover:scale-[1.015] active:scale-[0.98] shadow-2xs"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>

            {/* Note Message Area */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs uppercase font-bold text-[#4F4439] tracking-wider">
                  YOUR MESSAGE FOR TEACHER'S DAY <span className="text-[#CE5A46]">*</span>
                </label>
                <span className="text-xs text-[#8C7D6F] font-mono">{message.length}/500</span>
              </div>
              <textarea
                rows={4}
                placeholder="Share a memory, a lesson that helped you, or simple thanks for their everyday kindness..."
                value={message}
                onChange={(e) => {
                  setMessage(e.target.value);
                  if (sensorWarnings.length > 0) setSensorWarnings([]);
                }}
                maxLength={500}
                className={`w-full px-4 py-3 rounded-xl bg-white border text-sm sm:text-base text-[#231F1D] font-serif leading-relaxed focus:outline-none transition-all ${
                  liveMessageWarning
                    ? 'border-[#CE5A46] ring-2 ring-[#CE5A46]/30 bg-[#FFF9F8]'
                    : 'border-[#DDD0BF] focus:ring-2 focus:ring-[#CE5A46]/30 focus:border-[#CE5A46]'
                }`}
              />
              {liveMessageWarning && (
                <div className="mt-2 p-2.5 rounded-xl bg-[#FFF8E6] border border-[#E7C14A] text-[#805000] text-xs font-semibold flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-[#B87A00]" />
                  <span>{liveMessageWarning}</span>
                </div>
              )}
            </div>

            {/* Color & Sticker Pickers */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs uppercase font-bold text-[#4F4439] tracking-wider mb-2">
                  CHOOSE NOTE COLOR
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  {colors.map((c) => {
                    const theme = NOTE_COLOR_MAP[c];
                    const isSelected = color === c;
                    return (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setColor(c)}
                        style={{ backgroundColor: theme.bg, borderColor: theme.border }}
                        className={`h-9 px-3 rounded-xl border-2 flex items-center gap-1.5 text-xs font-semibold capitalize transition-all cursor-pointer ${
                          isSelected ? 'ring-2 ring-black/30 scale-105 shadow-sm' : 'hover:scale-102 opacity-85'
                        }`}
                      >
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: theme.headerText }} />
                        <span style={{ color: theme.headerText }}>{c}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs uppercase font-bold text-[#4F4439] tracking-wider mb-2">
                  ATTACH A CUTE STICKER
                </label>
                <div className="flex items-center gap-1.5">
                  {stickers.map((stk) => (
                    <button
                      key={stk}
                      type="button"
                      onClick={() => setNoteSticker(stk)}
                      className={`w-9 h-9 rounded-xl border text-base flex items-center justify-center transition-all cursor-pointer ${
                        noteSticker === stk
                          ? 'bg-white border-[#CE5A46] ring-2 ring-[#CE5A46]/30 scale-110 shadow-xs'
                          : 'bg-[#FAF6EE] border-[#DECDB8] hover:bg-white'
                      }`}
                    >
                      {stk}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <label className="inline-flex items-center gap-2 text-xs text-[#6C5E50] cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={pinToWall}
                  onChange={(e) => setPinToWall(e.target.checked)}
                  className="rounded text-[#CE5A46] focus:ring-[#CE5A46]"
                />
                <span>Pin this note to the classroom Gratitude Wall for everyone to see</span>
              </label>
              <button
                type="submit"
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-[#CE5A46] hover:bg-[#B34B36] text-white font-bold text-sm shadow-sm hover:shadow transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Pin note to wall</span>
                <span className="text-base">📌</span>
              </button>
            </div>
          </form>
        )}

        {/* MODE 2: FORMAL HEARTFELT LETTER FORM */}
        {mode === 'letter' && (
          <form onSubmit={handleLetterSubmit} className="space-y-6">
            {/* Template Selection Pills */}
            <div className="bg-[#FAF5EC] p-4 rounded-2xl border border-[#DECDB8]">
              <div className="flex items-center justify-between mb-3 text-xs font-bold text-[#1F453B]">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#E7C14A]" />
                  <span>CHOOSE A LETTER THEME OR WRITE FREEFORM:</span>
                </div>
                {selectedTemplateId === 'custom' && (
                  <span className="text-[11px] font-mono text-[#7A6C5D] bg-white/80 px-2 py-0.5 rounded-full border border-[#D5C2A8]">
                    ✨ Freeform Custom Mode
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                {LETTER_TEMPLATES.map((tmpl) => (
                  <button
                    key={tmpl.id}
                    type="button"
                    onClick={() => applyTemplate(tmpl.id)}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      selectedTemplateId === tmpl.id
                        ? 'bg-white border-[#1F453B] ring-2 ring-[#1F453B]/20 shadow-xs'
                        : 'bg-white/60 border-[#DECDB8] hover:bg-white'
                    }`}
                  >
                    <div className="text-xs font-bold text-[#2B2520] flex items-center gap-1 mb-0.5 truncate">
                      <span>{tmpl.icon}</span>
                      <span className="truncate">{tmpl.title}</span>
                    </div>
                    <div className="text-[10px] text-[#736555] line-clamp-1">
                      {tmpl.subtitle}
                    </div>
                  </button>
                ))}
                {/* Blank Freeform Option */}
                <button
                  type="button"
                  onClick={applyBlankLetter}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    selectedTemplateId === 'custom'
                      ? 'bg-white border-[#1F453B] ring-2 ring-[#1F453B]/20 shadow-xs'
                      : 'bg-white/60 border-[#DECDB8] hover:bg-white'
                  }`}
                >
                  <div className="text-xs font-bold text-[#2B2520] flex items-center gap-1 mb-0.5">
                    <span>📝</span>
                    <span>Freeform Blank</span>
                  </div>
                  <div className="text-[10px] text-[#736555] line-clamp-1">
                    Write from scratch
                  </div>
                </button>
              </div>
            </div>

            {/* Recipient Teacher & Student Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs uppercase font-bold text-[#4F4439] tracking-wider mb-2">
                  NAME OF TEACHER (RECIPIENT) <span className="text-[#CE5A46]">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Ms. Rivera, Sir Santos, Mrs. Lopez..."
                  value={recipientTeacher}
                  onChange={(e) => {
                    setRecipientTeacher(e.target.value);
                    if (sensorWarnings.length > 0) setSensorWarnings([]);
                  }}
                  className={`w-full px-4 py-2.5 rounded-xl bg-white border text-sm text-[#231F1D] focus:outline-none transition-all ${
                    liveRecipientTeacherWarning
                      ? 'border-[#E7C14A] ring-2 ring-[#E7C14A]/40 bg-[#FFFDF5]'
                      : 'border-[#DDD0BF] focus:ring-2 focus:ring-[#1F453B]/30'
                  }`}
                  maxLength={60}
                />
                {liveRecipientTeacherWarning && (
                  <p className="mt-1 text-[11px] font-semibold text-[#A86400]">
                    {liveRecipientTeacherWarning}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs uppercase font-bold text-[#4F4439] tracking-wider mb-2">
                  YOUR NAME / NICKNAME <span className="text-[#CE5A46]">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Maria Santos, Alex, or your nickname"
                  value={studentName}
                  onChange={(e) => {
                    setStudentName(e.target.value);
                    if (sensorWarnings.length > 0) setSensorWarnings([]);
                  }}
                  className={`w-full px-4 py-2.5 rounded-xl bg-white border text-sm text-[#231F1D] focus:outline-none transition-all ${
                    liveStudentNameWarning
                      ? 'border-[#E7C14A] ring-2 ring-[#E7C14A]/40 bg-[#FFFDF5]'
                      : 'border-[#DDD0BF] focus:ring-2 focus:ring-[#1F453B]/30'
                  }`}
                  maxLength={60}
                />
                {liveStudentNameWarning && (
                  <p className="mt-1 text-[11px] font-semibold text-[#A86400]">
                    {liveStudentNameWarning}
                  </p>
                )}
              </div>
            </div>

            {/* Letter Title */}
            <div>
              <label className="block text-xs uppercase font-bold text-[#4F4439] tracking-wider mb-2">
                LETTER SUBJECT / TITLE <span className="text-[#CE5A46]">*</span>
              </label>
              <input
                type="text"
                value={letterTitle}
                onChange={(e) => {
                  setLetterTitle(e.target.value);
                  setSelectedTemplateId('custom');
                  if (sensorWarnings.length > 0) setSensorWarnings([]);
                }}
                className={`w-full px-4 py-2.5 rounded-xl bg-white border text-sm font-heading font-bold text-[#231F1D] focus:outline-none transition-all ${
                  liveLetterTitleWarning
                    ? 'border-[#E7C14A] ring-2 ring-[#E7C14A]/40'
                    : 'border-[#DDD0BF] focus:ring-2 focus:ring-[#1F453B]/30'
                }`}
                maxLength={140}
              />
              {liveLetterTitleWarning && (
                <p className="mt-1 text-[11px] font-semibold text-[#A86400]">
                  {liveLetterTitleWarning}
                </p>
              )}
            </div>

            {/* Letter Enhancements */}
            <div className="bg-[#FAF5EC] rounded-2xl border border-[#E2D5C3] p-4">
              <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <Palette className="w-4 h-4 text-[#1F453B]" />
                  <span className="text-xs font-bold text-[#1F453B] uppercase tracking-wider">
                    Stationery Theme & Letter Builder Tools:
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  {(Object.keys(stationeryStyles) as Array<keyof typeof stationeryStyles>).map((tKey) => (
                    <button
                      key={tKey}
                      type="button"
                      onClick={() => setStationeryTheme(tKey)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                        stationeryTheme === tKey
                          ? 'bg-[#1F453B] text-white shadow-2xs'
                          : 'bg-white border border-[#DDD0BF] text-[#55493D]'
                      }`}
                    >
                      {stationeryStyles[tKey].name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick Salutation Pills */}
              <div className="mb-3 pt-2 border-t border-[#E5D7C3]">
                <div className="text-[11px] font-bold text-[#75685B] mb-1.5 flex items-center gap-1">
                  <span>🖋️</span>
                  <span>Salutation Openers (click to prepend):</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {LETTER_PROMPT_SUGGESTIONS.salutations.map((sal, sIdx) => (
                    <button
                      key={sIdx}
                      type="button"
                      onClick={() => handleInsertSalutation(sal)}
                      className="px-2.5 py-1 rounded-lg bg-white hover:bg-[#F2ECE1] border border-[#DDD0BF] text-[11px] font-medium text-[#44382C] transition-colors cursor-pointer"
                    >
                      {sal.replace(/\[Name\]/g, recipientTeacher.trim() || 'Teacher')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Starter Paragraphs Selector */}
              <div className="mb-3 pt-2 border-t border-[#E5D7C3]">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-[11px] font-bold text-[#75685B] flex items-center gap-1">
                    <span>💡</span>
                    <span>Paragraph Starters (click to insert):</span>
                  </div>
                  <div className="inline-flex rounded-lg bg-white p-0.5 border border-[#DECDB8] text-[10px]">
                    <button
                      type="button"
                      onClick={() => setActivePromptCategory('openings')}
                      className={`px-2 py-0.5 rounded font-bold transition-colors cursor-pointer ${
                        activePromptCategory === 'openings' ? 'bg-[#1F453B] text-white' : 'text-[#6C5E50]'
                      }`}
                    >
                      Openings
                    </button>
                    <button
                      type="button"
                      onClick={() => setActivePromptCategory('memories')}
                      className={`px-2 py-0.5 rounded font-bold transition-colors cursor-pointer ${
                        activePromptCategory === 'memories' ? 'bg-[#1F453B] text-white' : 'text-[#6C5E50]'
                      }`}
                    >
                      Memories
                    </button>
                    <button
                      type="button"
                      onClick={() => setActivePromptCategory('impact')}
                      className={`px-2 py-0.5 rounded font-bold transition-colors cursor-pointer ${
                        activePromptCategory === 'impact' ? 'bg-[#1F453B] text-white' : 'text-[#6C5E50]'
                      }`}
                    >
                      Impact
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  {LETTER_PROMPT_SUGGESTIONS[activePromptCategory].map((prompt, pIdx) => (
                    <button
                      key={pIdx}
                      type="button"
                      onClick={() => handleInsertLetterPrompt(prompt)}
                      className="w-full text-left p-2 rounded-xl bg-white hover:bg-[#F3EADB] border border-[#E4D5C2] text-xs text-[#3E342B] font-medium transition-all hover:scale-[1.005] cursor-pointer flex items-center justify-between group shadow-2xs"
                    >
                      <span className="line-clamp-2">{prompt}</span>
                      <span className="text-[10px] font-bold text-[#1F453B] opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2">
                        + Insert
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick Closing Sign-Off Pills */}
              <div className="pt-2 border-t border-[#E5D7C3]">
                <div className="text-[11px] font-bold text-[#75685B] mb-1.5 flex items-center gap-1">
                  <span>✉️</span>
                  <span>Closing Sign-Offs (click to append):</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {LETTER_PROMPT_SUGGESTIONS.closings.map((closing, cIdx) => (
                    <button
                      key={cIdx}
                      type="button"
                      onClick={() => handleInsertClosing(closing)}
                      className="px-2.5 py-1 rounded-lg bg-white hover:bg-[#F2ECE1] border border-[#DDD0BF] text-[11px] font-medium text-[#44382C] transition-colors cursor-pointer"
                    >
                      {closing}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Parchment Stationery Letter Area */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs uppercase font-bold text-[#4F4439] tracking-wider">
                  LETTER BODY (MULTI-PARAGRAPH KEEPSAKE) <span className="text-[#CE5A46]">*</span>
                </label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedTemplateId('custom');
                      setLetterBody('');
                      setSensorWarnings([]);
                    }}
                    className="text-[11px] font-semibold text-[#8C7D6F] hover:text-[#CE5A46] underline transition-colors cursor-pointer"
                  >
                    Clear text
                  </button>
                  <span className="text-xs text-[#8C7D6F] font-mono">{letterBody.length}/3500</span>
                </div>
              </div>
              <div
                className={`relative rounded-2xl border shadow-inner p-4 sm:p-7 transition-all ${
                  stationeryStyles[stationeryTheme].card
                } ${
                  liveLetterBodyWarning
                    ? 'border-[#CE5A46] ring-2 ring-[#CE5A46]/30'
                    : ''
                }`}
              >
                <div
                  className={`absolute top-4 right-4 w-11 h-13 border-2 border-dashed rounded-xs flex flex-col items-center justify-center rotate-2 shadow-2xs select-none opacity-85 ${
                    stationeryStyles[stationeryTheme].stamp
                  }`}
                >
                  <span className="text-xs">🏫</span>
                  <span className="text-[7px] font-bold uppercase tracking-tighter">TEACHER</span>
                  <span className="text-[6.5px] font-mono">2026</span>
                </div>
                <textarea
                  rows={11}
                  value={letterBody}
                  onChange={(e) => {
                    setLetterBody(e.target.value);
                    setSelectedTemplateId('custom');
                    if (sensorWarnings.length > 0) setSensorWarnings([]);
                  }}
                  maxLength={3500}
                  placeholder="Write your heartfelt multi-paragraph letter here..."
                  className="w-full bg-transparent text-sm sm:text-base font-serif text-[#2B2520] leading-relaxed resize-y focus:outline-none pr-14"
                />
              </div>
              {liveLetterBodyWarning && (
                <div className="mt-2 p-2.5 rounded-xl bg-[#FFF8E6] border border-[#E7C14A] text-[#805000] text-xs font-semibold flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-[#B87A00]" />
                  <span>{liveLetterBodyWarning}</span>
                </div>
              )}
            </div>

            {/* Options & Send Button */}
            <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <label className="inline-flex items-center gap-2 text-xs text-[#6C5E50] cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={pinLetterPreview}
                  onChange={(e) => setPinLetterPreview(e.target.checked)}
                  className="rounded text-[#1F453B] focus:ring-[#1F453B]"
                />
                <span>Also pin a preview quote of this letter to the public Gratitude Wall</span>
              </label>
              <button
                type="submit"
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-[#1F453B] hover:bg-[#16332B] text-white font-bold text-sm shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4 text-[#F7DE85]" />
                <span>Seal & Send to Teacher Mailbox</span>
                <span className="text-base">💌</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </section>
  );
};
