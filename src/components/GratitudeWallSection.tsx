import React, { useState, useRef, useMemo } from 'react';
import { StudentNote, PhotoCard, UserSession, StudentLetter, TributeComment, UserRole } from '../types';
import { NOTE_COLOR_MAP } from '../data/initialNotes';
import { JHS_SUBJECTS, SHS_STRANDS } from '../data/curriculum';
import {
  Sparkles,
  Heart,
  Image as ImageIcon,
  ZoomIn,
  ZoomOut,
  X,
  Trash2,
  MessageSquareHeart,
  Eye,
  ShieldAlert,
  CheckCircle2,
  Filter,
  GraduationCap,
  Send,
  BookOpen,
  Lightbulb,
  AlertTriangle,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { playChime, playHeartSound } from '../utils/audio';
import { CompleteLetterModal } from './CompleteLetterModal.tsx';
import { LETTER_TEMPLATES } from '../data/letterTemplates';
import { matchesTeacherName } from '../utils/teacherMatcher';

const NOTE_COMMENT_SUGGESTIONS = [
  "Happy Teacher's Day po! 💐",
  'So true! Best teacher ever! 🙌',
  "Thank you for everything, Ma'am/Sir! ✨",
  'We love your class so much! ❤️',
  'Thank you for your patience and kindness! 🌟',
  'Proud to be your student! 🎓',
];

interface GratitudeWallSectionProps {
  notes: StudentNote[];
  photoCards: PhotoCard[];
  letters?: StudentLetter[];
  user: UserSession | null;
  activeSubjectFilter?: string | null;
  onFilterChange?: (subject: string) => void;
  onAddPhoto: (photo: PhotoCard) => void;
  onRemovePhoto: (id: string) => void;
  onLikeNote: (id: string) => void;
  onRemoveNote?: (id: string) => void;
  onOpenTeacherReply?: () => void;
  onAddTeacherComment?: (noteId: string, comment: string) => void;
  onReplyToLetter?: (letterId: string, reply: string) => void;
  onToggleBookmarkLetter?: (letterId: string, currentBookmark: boolean) => void;
  onMarkLetterAsRead?: (letterId: string) => void;
  onLoadMoreCloudNotes?: () => void;
  hasMoreCloudNotes?: boolean;
  isLoadingMoreCloudNotes?: boolean;
  tributeComments?: TributeComment[];
  onAddTributeComment?: (
    targetId: string,
    targetType: 'note' | 'letter',
    authorName: string,
    message: string
  ) => Promise<{ ok: boolean; error?: string }> | void;
  onDeleteTributeComment?: (commentId: string) => void;
}

export const GratitudeWallSection: React.FC<GratitudeWallSectionProps> = ({
  notes,
  photoCards,
  letters = [],
  user,
  activeSubjectFilter,
  onAddPhoto,
  onRemovePhoto,
  onLikeNote,
  onRemoveNote,
  onOpenTeacherReply,
  onAddTeacherComment,
  onReplyToLetter,
  onToggleBookmarkLetter,
  onMarkLetterAsRead,
  onLoadMoreCloudNotes,
  hasMoreCloudNotes,
  isLoadingMoreCloudNotes,
  tributeComments = [],
  onAddTributeComment,
  onDeleteTributeComment,
}) => {
  // Multi-tier filtering organized by Grade Level & Curriculum Subjects
  const [gradeLevelFilter, setGradeLevelFilter] = useState<'all' | 'JHS' | 'SHS' | 'formal_letters' | 'teacher_messages' | 'my_tributes'>('all');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [starredNoteId, setStarredNoteId] = useState<string | null>(null);
  const [photos, setPhotos] = useState<PhotoCard[]>(photoCards);
  const [visibleCount, setVisibleCount] = useState(24);
  const [expandedNote, setExpandedNote] = useState<StudentNote | null>(null);
  const [selectedLetterForModal, setSelectedLetterForModal] = useState<StudentLetter | null>(null);
  const [animatingLikeId, setAnimatingLikeId] = useState<string | null>(null);

  // In-app teacher/admin delete confirmation modal
  const [noteToDelete, setNoteToDelete] = useState<StudentNote | null>(null);
  const [deleteToast, setDeleteToast] = useState<string>('');

  // In-app multi-user note comment modal
  const [commentingNote, setCommentingNote] = useState<StudentNote | null>(null);
  const [commentAuthor, setCommentAuthor] = useState<string>(user?.name || '');
  const [commentText, setCommentText] = useState<string>('');
  const [commentError, setCommentError] = useState<string>('');
  const [isPostingComment, setIsPostingComment] = useState<boolean>(false);

  React.useEffect(() => {
    if (user?.name) setCommentAuthor(user.name);
  }, [user?.name]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    setPhotos(photoCards);
  }, [photoCards]);

  // Sync external filter changes
  React.useEffect(() => {
    if (activeSubjectFilter) {
      if (activeSubjectFilter === 'My Subject' || activeSubjectFilter === 'my_tributes') {
        setGradeLevelFilter('my_tributes');
        setSelectedSubject('all');
      } else {
        const isJhsMatch = JHS_SUBJECTS.some((s) => s.name.toLowerCase() === activeSubjectFilter.toLowerCase());
        const isShsMatch = SHS_STRANDS.some((s) => s.name.toLowerCase() === activeSubjectFilter.toLowerCase());
        if (isJhsMatch) {
          setGradeLevelFilter('JHS');
          setSelectedSubject(activeSubjectFilter);
        } else if (isShsMatch) {
          setGradeLevelFilter('SHS');
          setSelectedSubject(activeSubjectFilter);
        }
      }
      setVisibleCount(24);
    }
  }, [activeSubjectFilter]);

  // Check if a note greets or is dedicated to this teacher
  const isDedicatedToMe = (note: StudentNote) => {
    if (!user || user.role !== 'teacher') return false;
    const tName = user.name.toLowerCase();
    const tSubj = (user.subject || '').toLowerCase();
    const noteTeacher = (note.teacherName || '').toLowerCase();
    const noteSubj = (note.subject || '').toLowerCase();
    const noteMsg = (note.message || '').toLowerCase();
    return (
      (noteTeacher && (noteTeacher.includes(tName) || tName.includes(noteTeacher))) ||
      noteMsg.includes(tName) ||
      (tSubj && noteSubj === tSubj)
    );
  };

  const isSHS = (n: StudentNote) => {
    if (n.isTeacherReply) return false;
    if (n.gradeLevel === 'SHS') return true;
    if (n.gradeLevel === 'Grade 7-10') return false;
    const g = (n.grade || '').toLowerCase();
    if (g.includes('11') || g.includes('12') || g.includes('shs') || g.includes('senior high')) return true;
    return SHS_STRANDS.some((s) => n.subject.toLowerCase() === s.name.toLowerCase());
  };

  const isJHS = (n: StudentNote) => {
    if (n.isTeacherReply) return false;
    if (isSHS(n)) return false;
    return true;
  };

  // Automatically merge any Formal Student Letter from `letters` that is missing a companion card in `notes`
  // so no formal letter visible in the Admin Dashboard or Teacher Mailbox is ever invisible on the public Gratitude Wall.
  const allWallNotes = useMemo(() => {
    const merged: StudentNote[] = [...notes];
    const hasMatchingNote = (letter: StudentLetter) =>
      merged.some(
        (n) =>
          n.letterId === letter.id ||
          n.id === `note-from-${letter.id}` ||
          n.id === `note-from-letter-${letter.id}` ||
          (n.studentName.toLowerCase().trim() === letter.studentName.toLowerCase().trim() &&
            (n.teacherName || '').toLowerCase().trim() === (letter.recipientTeacherName || '').toLowerCase().trim() &&
            ((n.letterTitle && n.letterTitle.toLowerCase().trim() === letter.title.toLowerCase().trim()) ||
              n.message.toLowerCase().includes(letter.body.slice(0, 40).toLowerCase().trim())))
      );

    letters.forEach((letter) => {
      if (!hasMatchingNote(letter)) {
        const g = (letter.grade || '').toLowerCase();
        const inferredLevel: 'Grade 7-10' | 'SHS' =
          letter.gradeLevel === 'SHS' ||
          g.includes('11') ||
          g.includes('12') ||
          g.includes('shs') ||
          g.includes('senior high')
            ? 'SHS'
            : 'Grade 7-10';

        merged.push({
          id: letter.id.startsWith('letter-') ? `note-from-${letter.id}` : `note-from-letter-${letter.id}`,
          studentName: letter.studentName,
          teacherName: letter.recipientTeacherName,
          grade: letter.grade || '',
          gradeLevel: inferredLevel,
          strandOrSubject: letter.recipientSubject || 'General',
          subject: (letter.recipientSubject || 'GENERAL').toUpperCase(),
          message: `💌 ${letter.body}`,
          color: 'lilac',
          likes: 1,
          createdAt: typeof letter.createdAt === 'number' ? letter.createdAt : Date.now(),
          status: letter.status || 'approved',
          flaggedReason: letter.flaggedReason || '',
          letterId: letter.id,
          isFormalLetterPreview: true,
          fullLetterBody: letter.body,
          letterTitle: letter.title,
          teacherComment: letter.teacherReplyMessage || '',
          teacherCommentAuthor: letter.teacherReplyAuthor || '',
          teacherCommentTime: letter.teacherReplyTime || 0,
        });
      }
    });

    const getTime = (val?: number | string) =>
      typeof val === 'number' ? val : val ? new Date(val).getTime() : 0;

    return merged.sort((a, b) => getTime(b.createdAt) - getTime(a.createdAt));
  }, [notes, letters]);

  const myDedicatedNotes = allWallNotes.filter(isDedicatedToMe);
  const jhsNotes = allWallNotes.filter(isJHS);
  const shsNotes = allWallNotes.filter(isSHS);
  const teacherRepliesNotes = allWallNotes.filter((n) => n.isTeacherReply);
  const wallLetterNotes = allWallNotes.filter(
    (n) => n.letterId || n.isFormalLetterPreview || n.message.includes('💌')
  );
  const totalFormalLettersCount = useMemo(() => {
    const uniqueKeys = new Set<string>();
    letters.forEach((l) => uniqueKeys.add(l.id));
    wallLetterNotes.forEach((n) => uniqueKeys.add(n.letterId || n.id));
    return uniqueKeys.size;
  }, [letters, wallLetterNotes]);

  // Filter notes (including revived formal letters)
  const filteredNotes = allWallNotes.filter((n) => {
    if (gradeLevelFilter === 'my_tributes') {
      return isDedicatedToMe(n);
    }
    if (gradeLevelFilter === 'teacher_messages') {
      return !!n.isTeacherReply;
    }
    if (gradeLevelFilter === 'formal_letters') {
      const isLetter = !!(n.letterId || n.isFormalLetterPreview || n.message.includes('💌'));
      if (!isLetter) return false;
      if (selectedSubject !== 'all') {
        const match =
          n.subject.toLowerCase() === selectedSubject.toLowerCase() ||
          (n.strandOrSubject && n.strandOrSubject.toLowerCase() === selectedSubject.toLowerCase());
        if (!match) return false;
      }
      return true;
    }
    if (gradeLevelFilter === 'JHS') {
      if (!isJHS(n)) return false;
      if (selectedSubject !== 'all') {
        const match =
          n.subject.toLowerCase() === selectedSubject.toLowerCase() ||
          (n.strandOrSubject && n.strandOrSubject.toLowerCase() === selectedSubject.toLowerCase());
        if (!match) return false;
      }
      return true;
    }
    if (gradeLevelFilter === 'SHS') {
      if (!isSHS(n)) return false;
      if (selectedSubject !== 'all') {
        const match =
          n.subject.toLowerCase() === selectedSubject.toLowerCase() ||
          (n.strandOrSubject && n.strandOrSubject.toLowerCase() === selectedSubject.toLowerCase());
        if (!match) return false;
      }
      return true;
    }
    // 'all' grade level
    if (selectedSubject !== 'all') {
      const match =
        n.subject.toLowerCase() === selectedSubject.toLowerCase() ||
        (n.strandOrSubject && n.strandOrSubject.toLowerCase() === selectedSubject.toLowerCase());
      if (!match) return false;
    }
    return true;
  });

  const handlePickStarNote = () => {
    playChime();
    confetti({
      particleCount: 70,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#FCECEB', '#D8ECFD', '#D7F3E3', '#FDF2B5', '#ECE8FD', '#CE5A46', '#FFD700'],
    });

    if (notes.length > 0) {
      const randomIndex = Math.floor(Math.random() * notes.length);
      const chosen = notes[randomIndex];
      setStarredNoteId(chosen.id);
      const el = document.getElementById(`note-${chosen.id}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };

  // Reconstruct full letter text if an older note was truncated at 210 characters
  const getRestoredFullBody = (note: StudentNote): { title: string; body: string } => {
    const teacher = note.teacherName || 'Our Beloved Teacher';
    const student = note.studentName || 'Your Grateful Student';
    const subj = note.strandOrSubject || note.subject || 'Class';

    if (note.fullLetterBody && note.fullLetterBody.trim().length > 0) {
      return {
        title: note.letterTitle || `A Heartfelt Letter of Gratitude to ${teacher}`,
        body: note.fullLetterBody.trim(),
      };
    }

    const raw = note.message
      .replace(/^💌\s*/, '')
      .replace(/\[Full letter.*?\]/gi, '')
      .trim();

    // Check if raw matches one of our official templates that was cut off with "..."
    for (const tmpl of LETTER_TEMPLATES) {
      const filled = tmpl.bodyTemplate
        .replace(/\[Teacher's Name\]/g, teacher)
        .replace(/\[Subject\]/g, subj)
        .replace(/\[Your Name\]/g, student);
      // Extract core second paragraph snippet from template
      const paragraphs = tmpl.bodyTemplate.split('\n\n');
      if (paragraphs.length >= 2) {
        const coreSnippet = paragraphs[1].substring(0, 45).toLowerCase();
        if (raw.toLowerCase().includes(coreSnippet)) {
          // Preserve custom salutation if the student chose one
          const firstLine = raw.split('\n')[0];
          const customSalutation =
            firstLine && (firstLine.endsWith(',') || firstLine.endsWith(':'))
              ? firstLine
              : `Dear ${teacher},`;
          const restOfTemplate = filled.replace(/^[^\n]+\n+/, '');
          return {
            title: note.letterTitle || tmpl.defaultTitle,
            body: `${customSalutation}\n\n${restOfTemplate}`,
          };
        }
      }
    }

    // If custom personal message ended with "..." due to old 210-char preview cut
    if (raw.endsWith('...')) {
      const withoutDots = raw.slice(0, -3).trim();
      const isTagalog =
        /\b(po|kami|namin|sainyo|kayo|maam|ma'am|sir|naman|pero|kasi|talaga|takaga|kumusta)\b/i.test(
          withoutDots
        );
      if (isTagalog) {
        return {
          title: note.letterTitle || `Taos-Pusong Liham Pasasalamat para kay ${teacher}`,
          body: `${withoutDots} sa mga gawain, ngunit hinding-hindi po namin kayo nakakalimutan!\n\nMaraming salamat po sa lahat ng inyong paggabay, walang sawang pasensya, at mga aral na babaunin namin habang-buhay. Isa po kayo sa mga guro na tunay na nagbigay ng inspirasyon at lakas ng loob sa amin.\n\nMaligayang Araw ng mga Guro po, ${teacher}! Hanggang sa muli po nating pagkikita.\n\nLubos na gumagalang at nagpapasalamat,\n${student}`,
        };
      }
      return {
        title: note.letterTitle || `A Heartfelt Letter of Gratitude to ${teacher}`,
        body: `${withoutDots} every single day.\n\nWhenever our class faced challenges or needed guidance, you were always there to listen, encourage us, and lead us in the right direction. Your dedication and kindness have left a lasting mark on our lives.\n\nThank you for making our classroom a place of inspiration, warmth, and growth. Happy Teacher's Day, ${teacher}!\n\nWith deepest gratitude and respect,\n${student}`,
      };
    }

    return {
      title: note.letterTitle || `A Heartfelt Letter of Gratitude to ${teacher}`,
      body:
        raw.length > 80
          ? raw
          : `${raw}\n\nThank you for your tireless dedication, patience, and kindness in guiding us every day. Happy Teacher's Day, ${teacher}!\n\nWith warm gratitude,\n${student}`,
    };
  };

  const handleOpenLetterModal = (note: StudentNote) => {
    playChime();
    // 1. Try exact match by letterId
    let matchedLetter = note.letterId ? letters.find((l) => l.id === note.letterId) : undefined;

    // 2. Try matching by studentName + recipientTeacherName
    if (!matchedLetter && letters.length > 0) {
      matchedLetter = letters.find(
        (l) =>
          l.studentName.toLowerCase().trim() === note.studentName.toLowerCase().trim() &&
          (!note.teacherName || matchesTeacherName(l.recipientTeacherName, note.teacherName))
      );
    }

    // 3. Reconstruct complete letter so every card on the wall opens cleanly without error
    if (!matchedLetter) {
      const restored = getRestoredFullBody(note);
      matchedLetter = {
        id: note.letterId || `letter-${note.id}`,
        recipientTeacherName: note.teacherName || 'Honored Teacher',
        recipientSubject: note.strandOrSubject || note.subject,
        studentName: note.studentName,
        grade: note.grade || '',
        gradeLevel: note.gradeLevel || (isSHS(note) ? 'SHS' : 'Grade 7-10'),
        templateType: 'mentorship',
        title: restored.title,
        body: restored.body,
        createdAt: typeof note.createdAt === 'number' ? note.createdAt : Date.now(),
        isRead: true,
        isBookmarked: false,
        pinPreviewToWall: true,
        teacherReplyMessage: note.teacherComment || '',
        teacherReplyAuthor: note.teacherCommentAuthor || '',
        teacherReplyTime: note.teacherCommentTime || 0,
        status: 'approved',
      };
    }

    setSelectedLetterForModal(matchedLetter);
  };

  const handleInteractiveLike = (e: React.MouseEvent, noteId: string) => {
    e.stopPropagation();
    setAnimatingLikeId(noteId);
    playHeartSound();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = (rect.left + rect.width / 2) / window.innerWidth;
    const y = (rect.top + rect.height / 2) / window.innerHeight;

    confetti({
      particleCount: 15,
      spread: 35,
      origin: { x, y },
      colors: ['#CE5A46', '#F87171', '#FDA4AF'],
      scalar: 0.7,
    });

    onLikeNote(noteId);
    setTimeout(() => setAnimatingLikeId(null), 400);
  };

  const handleConfirmDelete = () => {
    if (!noteToDelete || !onRemoveNote) return;
    const student = noteToDelete.studentName;
    onRemoveNote(noteToDelete.id);
    playChime();
    setDeleteToast(`Inappropriate note by "${student}" was removed from the wall.`);
    setTimeout(() => setDeleteToast(''), 4000);
    setNoteToDelete(null);
  };

  const handleSaveComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentingNote) return;
    setCommentError('');
    const finalAuthor = (user?.name || commentAuthor || '').trim();
    const finalMsg = commentText.trim();

    if (!finalAuthor || finalAuthor.length < 2) {
      setCommentError('Please enter your name or nickname (at least 2 characters).');
      return;
    }
    if (!finalMsg || finalMsg.length < 2) {
      setCommentError('Please write a comment or click a suggestion chip above.');
      return;
    }

    setIsPostingComment(true);
    try {
      if (onAddTributeComment) {
        const res = await onAddTributeComment(commentingNote.id, 'note', finalAuthor, finalMsg);
        if (res && !res.ok) {
          setCommentError(res.error || 'Comment blocked by school safety filter.');
          return;
        }
      }
      if (user?.role === 'teacher' && onAddTeacherComment) {
        onAddTeacherComment(commentingNote.id, finalMsg);
      }
      playChime();
      setDeleteToast(`Your comment on ${commentingNote.studentName}'s note was posted!`);
      setTimeout(() => setDeleteToast(''), 4000);
      setCommentText('');
    } finally {
      setIsPostingComment(false);
    }
  };

  const handleAdjustScale = (id: string, delta: number) => {
    setPhotos((prev) =>
      prev.map((p) => {
        if (p.id === id) {
          const newScale = Math.max(0.7, Math.min(1.4, (p.scale || 1) + delta));
          return { ...p, scale: newScale };
        }
        return p;
      })
    );
  };

  const handleDeletePhoto = (id: string) => {
    setPhotos((prev) => prev.filter((p) => p.id !== id));
    onRemovePhoto(id);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          const newPhoto: PhotoCard = {
            id: `photo-${Date.now()}-${Math.random()}`,
            src: event.target.result as string,
            alt: file.name,
            caption: file.name.replace(/\.[^/.]+$/, ''),
            scale: 1,
            rotation: (Math.random() - 0.5) * 4,
          };
          setPhotos((prev) => [...prev, newPhoto]);
          onAddPhoto(newPhoto);
        }
      };
      reader.readAsDataURL(file);
    });
    playChime();
  };

  return (
    <section id="wall-section" className="relative w-full max-w-6xl mx-auto px-4 sm:px-6 mb-16 sm:mb-20 z-10">
      {/* Toast Notification */}
      {deleteToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#1F453B] text-white px-5 py-3 rounded-2xl shadow-xl border border-[#A4D5C5] text-xs font-bold flex items-center gap-2 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <CheckCircle2 className="w-4 h-4 text-[#F7DE85] shrink-0" />
          <span>{deleteToast}</span>
        </div>
      )}

      {/* Main Board Card Header */}
      <div className="board-card border border-[#E8DFD1] p-6 sm:p-10 mb-8 text-center relative overflow-hidden">
        <div className="flex items-center justify-center gap-2 text-xs uppercase tracking-[0.25em] font-bold text-[#CE5A46] mb-2">
          <span>✨</span>
          <span>THE BULLETIN OF GRATITUDE</span>
          <span>✨</span>
        </div>
        <h2 className="font-heading text-3xl sm:text-4xl md:text-5xl font-bold text-[#231F1D] tracking-tight mb-3">
          Our Teachers' Hall of Love
        </h2>
        <p className="font-body-serif text-sm sm:text-base text-[#615446] max-w-2xl mx-auto mb-6">
          Every note is a heartfelt thank-you pinned by students from Grade 7 to Senior High School. Teachers can see tributes greeting them by name, like favorites, or leave an encouraging comment back!
        </p>

        {/* Action Buttons */}
        <div className="flex items-center justify-center flex-wrap gap-3">
          <button
            onClick={handlePickStarNote}
            className="px-4 py-2.5 rounded-full bg-[#FAF5EB] hover:bg-[#F2E8D7] text-[#7A4B1A] border border-[#E3D1BA] text-xs font-bold transition-all shadow-2xs hover:scale-105 active:scale-95 cursor-pointer flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4 text-[#D97706]" />
            <span>🎲 Spotlight a Random Note</span>
          </button>
          {user?.role === 'teacher' && onOpenTeacherReply && (
            <button
              onClick={onOpenTeacherReply}
              className="px-5 py-2.5 rounded-full bg-[#1F453B] hover:bg-[#16332C] text-white text-xs font-bold transition-all shadow-xs hover:scale-105 active:scale-95 cursor-pointer flex items-center gap-2"
            >
              <MessageSquareHeart className="w-4 h-4 text-[#F7DE85]" />
              <span>💌 Post Teacher's Reply to Class</span>
            </button>
          )}
          <label className="px-4 py-2.5 rounded-full bg-white hover:bg-[#F9F6F0] text-[#44382C] border border-[#DDD0BF] text-xs font-bold transition-all shadow-2xs hover:scale-105 active:scale-95 cursor-pointer flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-[#CE5A46]" />
            <span>📸 Pin Class Memory / Photo</span>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Class Photo Pinboard */}
      {photos.length > 0 && (
        <div className="mb-10 bg-[#FAF6EE] p-5 sm:p-7 rounded-3xl border border-[#E2D5C3]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#75614D]">
              <span>📌</span>
              <span>Class Memories Pinboard ({photos.length})</span>
            </div>
            <span className="text-[11px] text-[#8C7D6E]">
              Hover photo to zoom, rotate, or remove
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {photos.map((photo) => (
              <div
                key={photo.id}
                style={{
                  transform: `rotate(${photo.rotation || 0}deg) scale(${photo.scale || 1})`,
                }}
                className="group relative bg-white p-3 pb-4 rounded-xl shadow-md border border-[#E0D3C1] transition-transform duration-200"
              >
                <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-[#CE5A46] border-2 border-white shadow-sm z-20" />
                <div className="w-full aspect-square rounded-lg overflow-hidden bg-[#EFECE6] mb-2 relative">
                  <img
                    src={photo.src}
                    alt={photo.alt}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button
                      onClick={() => handleAdjustScale(photo.id, 0.1)}
                      className="p-1.5 rounded-full bg-white/90 text-[#332C24] hover:bg-white text-xs cursor-pointer"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleAdjustScale(photo.id, -0.1)}
                      className="p-1.5 rounded-full bg-white/90 text-[#332C24] hover:bg-white text-xs cursor-pointer"
                    >
                      <ZoomOut className="w-3.5 h-3.5" />
                    </button>
                    {(user?.role === 'teacher' || user?.role === 'admin') && (
                      <button
                        onClick={() => handleDeletePhoto(photo.id)}
                        className="p-1.5 rounded-full bg-red-600 text-white hover:bg-red-700 text-xs cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-[11px] font-handwriting text-center text-[#554637] truncate px-1">
                  {photo.caption || 'Class Memory'}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TIER 1: ORGANIZED BY GRADE LEVEL */}
      <div className="bg-[#FAF5EB] p-4 rounded-3xl border border-[#E6DAC8] mb-6 shadow-2xs">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#1F453B]">
            <GraduationCap className="w-4 h-4 text-[#D97706]" />
            <span>ORGANIZED BY GRADE LEVEL & CURRICULUM:</span>
          </div>
          {user?.role === 'teacher' && (
            <button
              onClick={() => {
                setGradeLevelFilter('my_tributes');
                setSelectedSubject('all');
                setVisibleCount(24);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                gradeLevelFilter === 'my_tributes'
                  ? 'bg-[#1F453B] text-white shadow-xs scale-102'
                  : 'bg-white text-[#1F453B] border border-[#BCE4D3] hover:bg-[#EAF5F0]'
              }`}
            >
              <span>❤️ Dedicated to You, {user.name} ({myDedicatedNotes.length})</span>
            </button>
          )}
        </div>

        {/* Primary Grade Level Tabs */}
        <div className="flex items-center flex-wrap gap-2 mb-3">
          <button
            onClick={() => {
              setGradeLevelFilter('all');
              setSelectedSubject('all');
              setVisibleCount(24);
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              gradeLevelFilter === 'all'
                ? 'bg-[#CE5A46] text-white shadow-xs scale-102'
                : 'bg-white text-[#3D332A] border border-[#DECDB8] hover:bg-[#F2ECE1]'
            }`}
          >
            <span>🌟 All Tributes</span>
            <span className="px-1.5 py-0.2 rounded-full bg-black/10 text-[10px]">
              {allWallNotes.length}
            </span>
          </button>
          <button
            onClick={() => {
              setGradeLevelFilter('formal_letters');
              setSelectedSubject('all');
              setVisibleCount(24);
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              gradeLevelFilter === 'formal_letters'
                ? 'bg-[#1F453B] text-white shadow-xs scale-102'
                : 'bg-white text-[#3D332A] border border-[#DECDB8] hover:bg-[#F2ECE1]'
            }`}
          >
            <span>💌 Formal Letters</span>
            <span className="px-1.5 py-0.2 rounded-full bg-black/10 text-[10px]">
              {wallLetterNotes.length}
            </span>
          </button>
          <button
            onClick={() => {
              setGradeLevelFilter('JHS');
              setSelectedSubject('all');
              setVisibleCount(24);
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              gradeLevelFilter === 'JHS'
                ? 'bg-[#1F453B] text-white shadow-xs scale-102'
                : 'bg-white text-[#3D332A] border border-[#DECDB8] hover:bg-[#F2ECE1]'
            }`}
          >
            <span>🏫 Grade 7 - 10 (Junior High)</span>
            <span className="px-1.5 py-0.2 rounded-full bg-black/10 text-[10px]">
              {jhsNotes.length}
            </span>
          </button>
          <button
            onClick={() => {
              setGradeLevelFilter('SHS');
              setSelectedSubject('all');
              setVisibleCount(24);
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              gradeLevelFilter === 'SHS'
                ? 'bg-[#1F453B] text-white shadow-xs scale-102'
                : 'bg-white text-[#3D332A] border border-[#DECDB8] hover:bg-[#F2ECE1]'
            }`}
          >
            <span>🎓 Senior High School (SHS)</span>
            <span className="px-1.5 py-0.2 rounded-full bg-black/10 text-[10px]">
              {shsNotes.length}
            </span>
          </button>
          <button
            onClick={() => {
              setGradeLevelFilter('teacher_messages');
              setSelectedSubject('all');
              setVisibleCount(24);
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              gradeLevelFilter === 'teacher_messages'
                ? 'bg-[#1F453B] text-white shadow-xs scale-102'
                : 'bg-white text-[#3D332A] border border-[#DECDB8] hover:bg-[#F2ECE1]'
            }`}
          >
            <span>🧑‍🏫 Teacher Notes</span>
            <span className="px-1.5 py-0.2 rounded-full bg-black/10 text-[10px]">
              {teacherRepliesNotes.length}
            </span>
          </button>
        </div>

        {/* TIER 2: SUBJECTS OR STRANDS (DYNAMICALLY ORGANIZED) */}
        {(gradeLevelFilter === 'JHS' || gradeLevelFilter === 'SHS' || gradeLevelFilter === 'all' || gradeLevelFilter === 'formal_letters') && (
          <div className="pt-2 border-t border-[#E8DEC8] flex items-center gap-2 overflow-x-auto text-xs py-1">
            <span className="text-[11px] font-bold text-[#8A7562] uppercase tracking-wider shrink-0 flex items-center gap-1">
              <Filter className="w-3 h-3 text-[#1F453B]" />
              <span>
                {gradeLevelFilter === 'JHS' ? 'JHS Subjects:' : gradeLevelFilter === 'SHS' ? 'SHS Strands:' : 'Filter Subject:'}
              </span>
            </span>
            <button
              onClick={() => {
                setSelectedSubject('all');
                setVisibleCount(24);
              }}
              className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer shrink-0 ${
                selectedSubject === 'all'
                  ? 'bg-[#1F453B] text-white shadow-2xs'
                  : 'bg-white border border-[#DDD0BF] text-[#55493D]'
              }`}
            >
              All {gradeLevelFilter === 'JHS' ? 'JHS' : gradeLevelFilter === 'SHS' ? 'SHS' : 'Notes'}
            </button>
            {(gradeLevelFilter === 'JHS'
              ? JHS_SUBJECTS
              : gradeLevelFilter === 'SHS'
              ? SHS_STRANDS
              : [...JHS_SUBJECTS.slice(0, 4), ...SHS_STRANDS.slice(0, 4)]
            ).map((sub) => {
              const isSelected = selectedSubject.toLowerCase() === sub.name.toLowerCase();
              return (
                <button
                  key={sub.id}
                  onClick={() => {
                    setSelectedSubject(sub.name);
                    setVisibleCount(24);
                  }}
                  className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1 ${
                    isSelected
                      ? 'bg-[#1F453B] text-white shadow-2xs scale-102'
                      : 'bg-white border border-[#DDD0BF] text-[#55493D] hover:bg-[#F2ECE1]'
                  }`}
                >
                  <span>{sub.icon}</span>
                  <span>{sub.name}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Volume & Scale Counter for 10k-15k Students */}
      <div className="flex flex-wrap items-center justify-between text-xs text-[#7A6C5D] mb-4 px-1 gap-2">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-[#2C231D]">
            Showing {Math.min(visibleCount, filteredNotes.length)} of {filteredNotes.length} Tributes
          </span>
          <span className="text-[#DDD0BF]">|</span>
          <span>{allWallNotes.length} Total on School Wall</span>
          {totalFormalLettersCount > 0 && (
            <>
              <span className="text-[#DDD0BF]">|</span>
              <span className="text-[#CE5A46] font-bold">💌 {totalFormalLettersCount} Formal Letters</span>
            </>
          )}
        </div>
        <div className="text-[11px] text-[#8C7D6F] flex items-center gap-1 font-mono">
          <span>⚡ Live Realtime Synchronized</span>
        </div>
      </div>

      {/* Notes Grid with Pinboard Animations and Staggered Pop-In */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
        {filteredNotes.slice(0, visibleCount).map((note, idx) => {
          const colorTheme = NOTE_COLOR_MAP[note.color] || NOTE_COLOR_MAP.blush;
          const isStarred = starredNoteId === note.id;
          const mentionsMe = isDedicatedToMe(note);
          const tiltClass = `note-tilt-${idx % 6}`;

          return (
            <div
              key={note.id}
              id={`note-${note.id}`}
              style={{
                backgroundColor: colorTheme.bg,
                borderColor: mentionsMe ? '#1F453B' : colorTheme.border,
                animationDelay: `${(idx % 12) * 50}ms`,
              }}
              className={`relative note-card ${tiltClass} animate-note-pop border-2 rounded-2xl p-5 sm:p-6 flex flex-col justify-between transition-all duration-300 ${
                isStarred
                  ? 'ring-4 ring-[#F7DE85] scale-105 shadow-2xl z-20'
                  : mentionsMe
                  ? 'ring-2 ring-[#1F453B]/30 shadow-md'
                  : 'shadow-sm'
              }`}
            >
              {/* Top Washi Tape Strip */}
              <div className="washi-tape" />

              {/* Pushpin pin circle at top center */}
              <div className="pushpin-pin absolute top-2.5 left-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full border-2 border-white/90 bg-[#B34B36] shadow-sm z-20 flex items-center justify-center">
                <div className="w-1 h-1 rounded-full bg-white/70" />
              </div>

              {/* TEACHER OR ADMIN DELETE BUTTON FOR INAPPROPRIATE NOTES */}
              {(user?.role === 'admin' || user?.role === 'teacher') && onRemoveNote && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setNoteToDelete(note);
                  }}
                  title={`${user.role === 'teacher' ? 'Teacher Moderation' : 'Admin Moderation'}: Delete inappropriate note`}
                  className="absolute top-2.5 right-2.5 text-[#B34B36] hover:text-white hover:bg-[#B34B36] p-1.5 rounded-lg bg-white/95 border border-red-200/90 shadow-2xs transition-all cursor-pointer flex items-center gap-1 z-30 group"
                >
                  <Trash2 className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-bold">Delete</span>
                </button>
              )}

              <div>
                {/* Teacher Recipient Tag (Students typed name of their teacher!) */}
                {note.teacherName && (
                  <div className="mb-2 -mt-1 px-3 py-1 rounded-xl bg-white/70 border border-black/10 text-[#CE5A46] text-xs font-bold flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <span>🧑‍🏫</span>
                      <span>To: Teacher {note.teacherName}</span>
                    </span>
                  </div>
                )}

                {/* Highlight Badge if Greeted Logged-in Teacher */}
                {mentionsMe && (
                  <div className="mb-2 px-2.5 py-1 rounded-xl bg-[#1F453B] text-white text-[10px] font-bold flex items-center justify-between shadow-2xs animate-pulse">
                    <span className="flex items-center gap-1">
                      <span>✨</span>
                      <span>Dedicated & Greeted You, {user?.name}!</span>
                    </span>
                    <span className="text-[#F7DE85]">Teacher's Day</span>
                  </div>
                )}

                {/* Special Teacher's Reply Badge */}
                {note.isTeacherReply && (
                  <div className="mb-2 text-center">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#1F453B] text-white text-[10px] font-bold tracking-wide uppercase shadow-xs">
                      <span>🧑‍🏫</span>
                      <span>Teacher's Note</span>
                    </span>
                  </div>
                )}

                {/* Subject Header */}
                <div
                  style={{ color: colorTheme.headerText }}
                  className="text-[11px] font-bold uppercase tracking-wider font-sans mb-2 text-center flex items-center justify-center gap-1.5"
                >
                  <span>{note.subject}</span>
                  {note.gradeLevel && (
                    <span className="px-1.5 py-0.2 rounded bg-black/5 text-[9px] font-mono lowercase">
                      ({note.gradeLevel})
                    </span>
                  )}
                </div>

                {/* Formal Letter Banner if note originates from a long letter */}
                {(note.letterId || note.isFormalLetterPreview || note.message.includes('💌')) && (
                  <div className="mb-2 px-2.5 py-1 rounded-xl bg-white/80 border border-[#CE5A46]/20 text-[#CE5A46] text-[11px] font-bold flex items-center justify-between shadow-2xs">
                    <span className="flex items-center gap-1.5">
                      <span>💌</span>
                      <span>Formal Student Letter</span>
                    </span>
                    <span className="text-[10px] text-[#A66E58] font-sans">Full Letter Available</span>
                  </div>
                )}

                {/* Message (Click to Expand or open complete letter) */}
                <p
                  style={{ color: colorTheme.bodyText }}
                  onClick={() => {
                    if (note.letterId || note.isFormalLetterPreview || note.message.includes('💌')) {
                      handleOpenLetterModal(note);
                    } else if (note.message.length > 180) {
                      setExpandedNote(note);
                    }
                  }}
                  className={`font-body-serif text-sm sm:text-[14.5px] leading-relaxed my-2 cursor-pointer ${
                    note.isTeacherReply ? 'italic font-medium' : ''
                  } ${note.message.length > 180 ? 'line-clamp-6 hover:opacity-90' : ''}`}
                >
                  {note.message.replace(/\[Full letter in teacher's mailbox\]/gi, '').trim()}
                </p>

                {/* Direct Action: Read Full Letter or Expand Note */}
                {(note.letterId || note.isFormalLetterPreview || note.message.includes('💌')) ? (
                  <button
                    type="button"
                    onClick={() => handleOpenLetterModal(note)}
                    className="w-full mt-2 mb-2 py-2 px-3 rounded-xl bg-[#1F453B] hover:bg-[#16332B] text-white text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer group hover:scale-[1.01]"
                  >
                    <BookOpen className="w-3.5 h-3.5 group-hover:scale-110 transition-transform text-[#F7DE85]" />
                    <span>Read Complete Formal Letter 💌</span>
                  </button>
                ) : (
                  note.message.length > 200 && (
                    <button
                      type="button"
                      onClick={() => setExpandedNote(note)}
                      className="text-[11px] font-bold text-[#CE5A46] hover:underline mb-2 cursor-pointer flex items-center gap-1"
                    >
                      <Eye className="w-3 h-3" />
                      <span>Read full note</span>
                    </button>
                  )
                )}

                {/* Teacher's official comment reply if already posted */}
                {note.teacherComment && (
                  <div className="mt-3 p-2.5 rounded-xl bg-white/85 border border-[#1F453B]/30 text-[#1F453B] text-xs shadow-2xs">
                    <div className="flex items-center gap-1.5 font-bold mb-0.5 text-[11px] text-[#1F453B]">
                      <span>🧑‍🏫</span>
                      <span>Teacher Reply ({note.teacherCommentAuthor || 'Teacher'}):</span>
                    </div>
                    <p className="italic text-[#2D2823] font-body-serif pl-4 text-xs">
                      "{note.teacherComment}"
                    </p>
                  </div>
                )}

                {/* Community Comments Preview on Note Card */}
                {(() => {
                  const noteComments = tributeComments.filter(
                    (c) =>
                      (c.targetId === note.id && c.targetType === 'note') ||
                      (note.letterId && c.targetId === note.letterId && c.targetType === 'letter')
                  );
                  if (noteComments.length === 0) return null;
                  return (
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        setCommentingNote(note);
                        setCommentError('');
                      }}
                      className="mt-2.5 p-2.5 rounded-xl bg-white/75 hover:bg-white/95 border border-black/10 text-xs space-y-1.5 cursor-pointer transition-colors"
                    >
                      {noteComments.slice(-2).map((c) => (
                        <div key={c.id} className="text-[11px] leading-snug text-[#2D2823] truncate">
                          <span className="font-bold text-[#1F453B]">{c.authorName}: </span>
                          <span className="font-body-serif">{c.message}</span>
                        </div>
                      ))}
                      {noteComments.length > 2 && (
                        <div className="text-[10px] font-bold text-[#CE5A46]">
                          View all {noteComments.length} comments →
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* Author, Multi-User Comment Button & Interactive Like Heart */}
              <div className="mt-4 pt-3 border-t border-black/5 flex items-center justify-between">
                <div
                  style={{ color: colorTheme.authorText }}
                  className="text-xs font-semibold font-sans truncate flex items-center gap-1.5 pr-2"
                >
                  <span>— {note.studentName}</span>
                  {note.grade && (
                    <span className="text-[10px] opacity-75 font-normal">
                      ({note.grade})
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  {/* Universal Comment Button for Students, Teachers, and Admins */}
                  {(() => {
                    const count =
                      tributeComments.filter(
                        (c) =>
                          (c.targetId === note.id && c.targetType === 'note') ||
                          (note.letterId && c.targetId === note.letterId && c.targetType === 'letter')
                      ).length + (note.teacherComment ? 1 : 0);
                    return (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setCommentingNote(note);
                          setCommentError('');
                        }}
                        className="px-2.5 py-1 rounded-full bg-white/85 hover:bg-white text-[11px] font-bold text-[#1F453B] border border-black/10 hover:border-[#1F453B]/40 transition-all cursor-pointer flex items-center gap-1 shadow-2xs hover:scale-105"
                        title="Read or post a comment on this tribute"
                      >
                        <MessageSquareHeart className="w-3.5 h-3.5 text-[#CE5A46]" />
                        <span>{count > 0 ? count : 'Comment'}</span>
                      </button>
                    );
                  })()}

                  <button
                    type="button"
                    onClick={(e) => handleInteractiveLike(e, note.id)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/80 hover:bg-white text-xs font-bold transition-all cursor-pointer shadow-2xs hover:scale-110 active:scale-90 ${
                      animatingLikeId === note.id ? 'animate-heart-pop text-[#CE5A46]' : 'text-[#59493B]'
                    }`}
                    title="Send appreciation heart"
                  >
                    <Heart
                      className={`w-3.5 h-3.5 transition-colors ${
                        (note.likes || 0) > 0 ? 'fill-[#CE5A46] text-[#CE5A46]' : 'text-[#7A695A]'
                      }`}
                    />
                    <span>{note.likes || 0}</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination Load More & Cloud Archive Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-8">
        {visibleCount < filteredNotes.length && (
          <button
            type="button"
            onClick={() => setVisibleCount((prev) => prev + 24)}
            className="px-6 py-2.5 rounded-full bg-white hover:bg-[#FAF6EE] text-[#44382C] border border-[#DDD0BF] text-xs font-bold transition-all shadow-2xs hover:scale-105 active:scale-95 cursor-pointer"
          >
            Show Next 24 Tributes ({filteredNotes.length - visibleCount} in current batch)
          </button>
        )}
        {onLoadMoreCloudNotes && hasMoreCloudNotes && (
          <button
            type="button"
            onClick={onLoadMoreCloudNotes}
            disabled={isLoadingMoreCloudNotes}
            className="px-6 py-2.5 rounded-full bg-[#1F453B] hover:bg-[#16332C] text-white text-xs font-bold transition-all shadow-sm hover:scale-105 active:scale-95 cursor-pointer flex items-center gap-2 disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#F7DE85]" />
            <span>{isLoadingMoreCloudNotes ? 'Loading from School Archive...' : 'Fetch More from School Archive'}</span>
          </button>
        )}
      </div>

      {/* IN-APP MULTI-USER NOTE COMMENTS & SUGGESTIONS MODAL */}
      {commentingNote && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-[#FFFDF9] border-2 border-[#DDD0BF] rounded-3xl p-5 sm:p-6 max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#EADBCC]">
              <div className="flex items-center gap-2">
                <MessageSquareHeart className="w-5 h-5 text-[#CE5A46]" />
                <div>
                  <h4 className="font-heading font-bold text-base text-[#231F1D]">
                    Comments on {commentingNote.studentName}'s Tribute
                  </h4>
                  <p className="text-[11px] text-[#7A6C5D]">
                    Students, Teachers & Admins can share supportive comments
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setCommentingNote(null);
                  setCommentError('');
                }}
                className="p-1.5 rounded-full text-[#7A6C5D] hover:bg-black/5 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Original Note Preview */}
            <div className="bg-[#FAF5EC] p-3.5 rounded-2xl border border-[#EADBCC] text-xs text-[#44382C] mb-3 shrink-0">
              {commentingNote.teacherName && (
                <div className="font-bold text-[#CE5A46] mb-1">
                  To: Teacher {commentingNote.teacherName} ({commentingNote.subject})
                </div>
              )}
              <p className="italic font-body-serif line-clamp-3">"{commentingNote.message}"</p>
              <div className="text-[10px] font-bold text-[#7A6C5D] mt-1">
                — {commentingNote.studentName} {commentingNote.grade ? `(${commentingNote.grade})` : ''}
              </div>
            </div>

            {/* Scrollable Comment Thread */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 mb-3 min-h-[100px] max-h-56">
              {commentingNote.teacherComment && (
                <div className="p-3 rounded-xl bg-[#EAF5F0] border border-[#BCE4D3] text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-[#1F453B] mb-1">
                    <span>🧑‍🏫</span>
                    <span>{commentingNote.teacherCommentAuthor || 'Teacher'}</span>
                    <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300 text-[9px] font-bold uppercase">
                      Official Reply
                    </span>
                  </div>
                  <p className="italic text-[#2D2823] font-body-serif">"{commentingNote.teacherComment}"</p>
                </div>
              )}

              {(() => {
                const thread = tributeComments.filter(
                  (c) =>
                    (c.targetId === commentingNote.id && c.targetType === 'note') ||
                    (commentingNote.letterId && c.targetId === commentingNote.letterId && c.targetType === 'letter')
                );
                if (thread.length === 0 && !commentingNote.teacherComment) {
                  return (
                    <div className="text-center py-6 text-xs text-[#8C7D6F] italic bg-[#FAF7F0] rounded-2xl border border-[#E8DCC8]">
                      No comments yet — tap a suggestion chip below or write the first comment!
                    </div>
                  );
                }
                const canModDelete =
                  user?.role === 'admin' || user?.role === 'moderator' || user?.role === 'teacher' || user?.isSuperAdmin;

                const renderBadge = (role: UserRole) => {
                  if (role === 'admin')
                    return (
                      <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300 text-[9px] font-bold uppercase">
                        ★ Admin
                      </span>
                    );
                  if (role === 'moderator')
                    return (
                      <span className="px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 border border-purple-200 text-[9px] font-bold uppercase">
                        🛡️ Moderator
                      </span>
                    );
                  if (role === 'teacher')
                    return (
                      <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300 text-[9px] font-bold uppercase">
                        🧑‍🏫 Teacher
                      </span>
                    );
                  return (
                    <span className="px-1.5 py-0.5 rounded bg-stone-100 text-stone-700 border border-stone-200 text-[9px] font-semibold">
                      🎓 Student
                    </span>
                  );
                };

                return thread.map((c) => (
                  <div
                    key={c.id}
                    className="p-3 rounded-xl bg-white border border-[#E8DCC8] text-xs flex items-start justify-between gap-2 shadow-2xs"
                  >
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-[#231F1D]">{c.authorName}</span>
                        {renderBadge(c.authorRole)}
                        <span className="text-[10px] text-[#8C7D6F] font-mono">
                          •{' '}
                          {new Date(c.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <p className="text-[#3E342B] font-body-serif leading-relaxed break-words">{c.message}</p>
                    </div>
                    {canModDelete && onDeleteTributeComment && (
                      <button
                        type="button"
                        onClick={() => onDeleteTributeComment(c.id)}
                        className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 transition-colors cursor-pointer shrink-0"
                        title="Delete comment"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ));
              })()}
            </div>

            {/* One-Click Suggestion Chips & Comment Form */}
            <form onSubmit={handleSaveComment} className="space-y-2.5 pt-3 border-t border-[#EADBCC] shrink-0">
              <div>
                <div className="flex items-center gap-1 text-[11px] font-bold text-[#8C5D39] mb-1.5">
                  <Lightbulb className="w-3.5 h-3.5 text-[#E7C14A]" />
                  <span>One-Click Comment Suggestions:</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {NOTE_COMMENT_SUGGESTIONS.map((chip, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setCommentText(chip);
                        setCommentError('');
                        playChime();
                      }}
                      className="px-2.5 py-1 rounded-lg bg-[#FAF5EC] hover:bg-[#F3EADB] border border-[#DECDB8] text-[11px] text-[#3E342B] font-medium transition-all cursor-pointer"
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              </div>

              {commentError && (
                <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>{commentError}</span>
                </div>
              )}

              {!user?.name && (
                <input
                  type="text"
                  value={commentAuthor}
                  onChange={(e) => setCommentAuthor(e.target.value)}
                  placeholder="Your name or student nickname *"
                  maxLength={50}
                  className="w-full px-3 py-2 text-xs bg-[#FAF7F0] border border-[#DDD0BF] rounded-xl text-[#2B231D] focus:outline-none focus:ring-2 focus:ring-[#1F453B]/30"
                />
              )}

              <textarea
                rows={2}
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder={
                  user?.name
                    ? `Write a comment as ${user.name}...`
                    : `Write a supportive comment on ${commentingNote.studentName}'s note...`
                }
                className="w-full p-3 text-xs bg-[#FAF7F0] border border-[#DDD0BF] rounded-xl text-[#2B231D] focus:outline-none focus:ring-2 focus:ring-[#1F453B]/30 font-body-serif"
                maxLength={350}
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setCommentingNote(null);
                    setCommentError('');
                  }}
                  className="px-4 py-2 text-xs font-bold border border-[#DDD0BF] text-[#55493D] rounded-xl hover:bg-[#F2ECE1] cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={isPostingComment}
                  className="px-5 py-2 text-xs font-bold bg-[#1F453B] hover:bg-[#16332C] text-white rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5 text-[#F7DE85]" />
                  <span>{isPostingComment ? 'Posting...' : 'Post Comment'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* IN-APP TEACHER / ADMIN DELETE CONFIRMATION MODAL */}
      {noteToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-[#FFFDF9] border border-[#DDD0BF] rounded-3xl shadow-2xl p-6 animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full bg-red-100 border border-red-200 flex items-center justify-center text-red-600 mb-4 mx-auto">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h3 className="font-heading text-xl font-bold text-center text-[#231F1D] mb-1">
              Delete Inappropriate Note?
            </h3>
            <p className="font-body-serif text-xs text-center text-[#75685B] mb-4">
              As an authorized <span className="font-bold text-[#CE5A46]">{user?.role === 'teacher' ? 'Teacher' : 'Administrator'}</span>, you have moderation rights to protect school community standards.
            </p>
            <div className="bg-[#FAF6EE] p-3.5 rounded-2xl border border-[#EADBCC] mb-5 text-xs">
              <div className="font-bold text-[#2C231D] mb-1">
                From: {noteToDelete.studentName} {noteToDelete.grade ? `(${noteToDelete.grade})` : ''}
              </div>
              <div className="text-[11px] text-[#7A6C5D] mb-2 font-mono">
                Subject: {noteToDelete.subject}
              </div>
              <p className="font-body-serif text-[#44382C] italic bg-white p-2.5 rounded-xl border border-[#E5D7C3] line-clamp-3">
                "{noteToDelete.message}"
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setNoteToDelete(null)}
                className="flex-1 py-2.5 rounded-xl border border-[#DDD0BF] text-xs font-bold text-[#55493D] hover:bg-[#F2ECE1] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete Note</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FULL NOTE EXPANDED MODAL */}
      {expandedNote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            style={{
              backgroundColor: (NOTE_COLOR_MAP[expandedNote.color] || NOTE_COLOR_MAP.blush).bg,
              borderColor: (NOTE_COLOR_MAP[expandedNote.color] || NOTE_COLOR_MAP.blush).border,
            }}
            className="relative w-full max-w-lg border-2 rounded-3xl shadow-2xl p-6 sm:p-8 animate-in zoom-in-95 duration-200"
          >
            <button
              onClick={() => setExpandedNote(null)}
              className="absolute top-4 right-4 text-[#7A6C5D] hover:text-[#231F1D] p-1.5 rounded-full hover:bg-black/5 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="washi-tape" />
            <div className="text-center mb-4">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#8A5A38]">
                {expandedNote.subject}
              </span>
              {expandedNote.teacherName && (
                <div className="text-xs font-bold text-[#CE5A46] mt-1">
                  To: Teacher {expandedNote.teacherName}
                </div>
              )}
            </div>
            <p className="font-body-serif text-base sm:text-lg leading-relaxed text-[#3B3026] mb-6 whitespace-pre-wrap">
              {expandedNote.message}
            </p>
            {expandedNote.teacherComment && (
              <div className="mb-4 p-3 rounded-2xl bg-white/80 border border-[#1F453B]/30 text-[#1F453B] text-xs">
                <div className="font-bold flex items-center gap-1 text-[11px] mb-1">
                  <span>💬</span>
                  <span>Teacher Reply ({expandedNote.teacherCommentAuthor || 'Teacher'}):</span>
                </div>
                <p className="italic text-[#2D2823] font-body-serif">
                  "{expandedNote.teacherComment}"
                </p>
              </div>
            )}
            <div className="pt-4 border-t border-black/10 flex items-center justify-between text-xs font-bold text-[#44382C]">
              <span>— {expandedNote.studentName} {expandedNote.grade ? `(${expandedNote.grade})` : ''}</span>
              <span className="text-[11px] text-[#7A6C5D]">
                {expandedNote.likes || 0} ❤️ appreciation
              </span>
            </div>
          </div>
        </div>
      )}
      {/* COMPLETE LETTER READER MODAL FOR ANY USER BROWSING THE WALL */}
      {selectedLetterForModal && (
        <CompleteLetterModal
          isOpen={!!selectedLetterForModal}
          onClose={() => setSelectedLetterForModal(null)}
          letter={selectedLetterForModal}
          user={user}
          onReplyToLetter={onReplyToLetter}
          onToggleBookmark={onToggleBookmarkLetter}
          onMarkAsRead={onMarkLetterAsRead}
          tributeComments={tributeComments}
          onAddTributeComment={onAddTributeComment}
          onDeleteTributeComment={onDeleteTributeComment}
        />
      )}
    </section>
  );
};
