import React, { useState, useRef } from 'react';
import { StudentNote, PhotoCard, UserSession, StudentLetter } from '../types';
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
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { playChime, playHeartSound } from '../utils/audio';
import { CompleteLetterModal } from './CompleteLetterModal.tsx';

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
}) => {
  // Multi-tier filtering organized by Grade Level & Curriculum Subjects
  const [gradeLevelFilter, setGradeLevelFilter] = useState<'all' | 'JHS' | 'SHS' | 'teacher_messages' | 'my_tributes'>('all');
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

  // In-app single note comment modal for teacher
  const [commentingNote, setCommentingNote] = useState<StudentNote | null>(null);
  const [commentText, setCommentText] = useState<string>('');

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

  const isJHS = (n: StudentNote) => {
    if (n.gradeLevel === 'Grade 7-10') return true;
    const g = (n.grade || '').toLowerCase();
    if (g.includes('7') || g.includes('8') || g.includes('9') || g.includes('10')) return true;
    return JHS_SUBJECTS.some((s) => n.subject.toLowerCase().includes(s.name.toLowerCase()));
  };

  const isSHS = (n: StudentNote) => {
    if (n.gradeLevel === 'SHS') return true;
    const g = (n.grade || '').toLowerCase();
    if (g.includes('11') || g.includes('12') || g.includes('shs')) return true;
    return SHS_STRANDS.some((s) => n.subject.toLowerCase().includes(s.name.toLowerCase()));
  };

  const myDedicatedNotes = notes.filter(isDedicatedToMe);
  const jhsNotes = notes.filter(isJHS);
  const shsNotes = notes.filter(isSHS);
  const teacherRepliesNotes = notes.filter((n) => n.isTeacherReply);

  // Filter notes
  const filteredNotes = notes.filter((n) => {
    if (gradeLevelFilter === 'my_tributes') {
      return isDedicatedToMe(n);
    }
    if (gradeLevelFilter === 'teacher_messages') {
      return !!n.isTeacherReply;
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

  const handleSaveComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentingNote || !commentText.trim() || !onAddTeacherComment) return;
    onAddTeacherComment(commentingNote.id, commentText.trim());
    playChime();
    setDeleteToast(`Your reply to ${commentingNote.studentName}'s note was posted!`);
    setTimeout(() => setDeleteToast(''), 4000);
    setCommentingNote(null);
    setCommentText('');
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
              {notes.length}
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
        {(gradeLevelFilter === 'JHS' || gradeLevelFilter === 'SHS' || gradeLevelFilter === 'all') && (
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
          <span>{notes.length} Total on School Wall</span>
          {letters.length > 0 && (
            <>
              <span className="text-[#DDD0BF]">|</span>
              <span className="text-[#CE5A46] font-bold">💌 {letters.length} Formal Letters</span>
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

                {/* Teacher's single comment reply if already posted */}
                {note.teacherComment && (
                  <div className="mt-3 p-2.5 rounded-xl bg-white/80 border border-[#1F453B]/30 text-[#1F453B] text-xs shadow-2xs">
                    <div className="flex items-center gap-1.5 font-bold mb-0.5 text-[11px] text-[#1F453B]">
                      <span>💬</span>
                      <span>Teacher Reply from {note.teacherCommentAuthor || 'Teacher'}:</span>
                    </div>
                    <p className="italic text-[#2D2823] font-body-serif pl-5 text-xs">
                      "{note.teacherComment}"
                    </p>
                  </div>
                )}
              </div>

              {/* Author, Single Comment Button & Interactive Like Heart */}
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
                  {/* Teacher Comment Button for logged-in teachers */}
                  {user?.role === 'teacher' && onAddTeacherComment && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setCommentingNote(note);
                        setCommentText(note.teacherComment || '');
                      }}
                      className="px-2 py-1 rounded-lg bg-white/90 hover:bg-white text-[11px] font-bold text-[#1F453B] border border-[#1F453B]/30 hover:border-[#1F453B] transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                      title="Comment / reply to this student"
                    >
                      <MessageSquareHeart className="w-3 h-3 text-[#CE5A46]" />
                      <span>{note.teacherComment ? 'Edit' : 'Comment'}</span>
                    </button>
                  )}

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

      {/* IN-APP TEACHER SINGLE COMMENT MODAL */}
      {commentingNote && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-[#FFFDF9] border border-[#DDD0BF] rounded-3xl p-6 max-w-lg w-full shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#EADBCC]">
              <div className="flex items-center gap-2">
                <span className="text-base">💬</span>
                <h4 className="font-heading font-bold text-base text-[#231F1D]">
                  Reply to {commentingNote.studentName}'s Note
                </h4>
              </div>
              <button
                onClick={() => setCommentingNote(null)}
                className="p-1 rounded-full text-[#7A6C5D] hover:bg-black/5 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-[#6B5C4D] mb-3">
              Your comment will be displayed on this note card on the Gratitude Wall for everyone to see!
            </p>
            <div className="bg-[#FAF5EC] p-3 rounded-xl border border-[#EADBCC] text-xs italic text-[#44382C] mb-3">
              "{commentingNote.message}"
            </div>
            <form onSubmit={handleSaveComment} className="space-y-3">
              <textarea
                rows={4}
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder={`Write your thank-you comment to ${commentingNote.studentName}...`}
                className="w-full p-3 text-xs bg-[#FAF7F0] border border-[#DDD0BF] rounded-xl text-[#2B231D] focus:outline-none focus:ring-2 focus:ring-[#1F453B]/30 font-body-serif"
                maxLength={400}
              />
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCommentingNote(null)}
                  className="px-4 py-2 text-xs font-bold border border-[#DDD0BF] text-[#55493D] rounded-xl hover:bg-[#F2ECE1] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold bg-[#1F453B] hover:bg-[#16332C] text-white rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5 text-[#F7DE85]" />
                  <span>Post Reply</span>
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
        />
      )}
    </section>
  );
};
