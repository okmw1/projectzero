import React, { useState } from 'react';
import { StudentNote, StudentLetter, UserSession } from '../types';
import { JHS_SUBJECTS, SHS_STRANDS } from '../data/curriculum';
import {
  X,
  Mail,
  StickyNote,
  GraduationCap,
  MessageSquareHeart,
  Send,
  Trash2,
  Star,
  Search,
  CheckCircle2,
  CornerDownRight,
  Filter,
  Paperclip,
  BookOpen,
} from 'lucide-react';
import { playChime } from '../utils/audio';
import { CompleteLetterModal } from './CompleteLetterModal.tsx';
import { matchesTeacherName } from '../utils/teacherMatcher';

interface TeacherDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserSession;
  notes: StudentNote[];
  letters: StudentLetter[];
  onAddTeacherCommentToNote: (noteId: string, comment: string) => void;
  onAddTeacherReplyToLetter: (letterId: string, reply: string) => void;
  onBroadcastMessageToAll: (message: string) => void;
  onDeleteNote: (noteId: string) => void;
  onDeleteLetter: (letterId: string) => void;
  onToggleBookmarkLetter: (letterId: string, current: boolean) => void;
  onMarkLetterAsRead: (letterId: string) => void;
}

export const TeacherDashboardModal: React.FC<TeacherDashboardModalProps> = ({
  isOpen,
  onClose,
  user,
  notes,
  letters,
  onAddTeacherCommentToNote,
  onAddTeacherReplyToLetter,
  onBroadcastMessageToAll,
  onDeleteNote,
  onDeleteLetter,
  onToggleBookmarkLetter,
  onMarkLetterAsRead,
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'jhs' | 'shs' | 'letters'>('all');
  const [selectedCurriculumFilter, setSelectedCurriculumFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Comment on a single note / letter
  const [commentingNote, setCommentingNote] = useState<StudentNote | null>(null);
  const [commentingLetter, setCommentingLetter] = useState<StudentLetter | null>(null);
  const [commentText, setCommentText] = useState<string>('');

  // Broadcast to all students
  const [isBroadcasting, setIsBroadcasting] = useState<boolean>(false);
  const [broadcastText, setBroadcastText] = useState<string>('');

  // Delete confirmations
  const [itemToDelete, setItemToDelete] = useState<{ id: string; type: 'note' | 'letter'; student: string } | null>(null);
  const [toastMessage, setToastMessage] = useState<string>('');

  // Selected letter for letter reader view
  const [selectedLetterId, setSelectedLetterId] = useState<string | null>(null);
  const [showDashboardAttachedPhoto, setShowDashboardAttachedPhoto] = useState<boolean>(true);
  const [selectedCompleteLetterId, setSelectedCompleteLetterId] = useState<string | null>(null);
  const selectedCompleteLetter = letters.find((l) => l.id === selectedCompleteLetterId) || null;

  if (!isOpen) return null;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  // Filter notes that mention or are dedicated to this teacher
  const isDedicatedToMe = (note: StudentNote) => {
    const tName = user.name.toLowerCase();
    const tSubj = (user.subject || '').toLowerCase();
    const noteTeacher = (note.teacherName || '').toLowerCase();
    const noteSubj = (note.subject || '').toLowerCase();
    const noteMsg = (note.message || '').toLowerCase();
    return (
      matchesTeacherName(note.teacherName || '', user.name) ||
      noteTeacher.includes(tName) ||
      tName.includes(noteTeacher && noteTeacher.length > 2 ? noteTeacher : '_____') ||
      noteMsg.includes(tName) ||
      (tSubj && (noteSubj === tSubj || (note.strandOrSubject && note.strandOrSubject.toLowerCase() === tSubj)))
    );
  };

  // Filter letters for this teacher (with fuzzy name & honorific normalization)
  const myLetters = letters.filter((l) => {
    const tName = user.name.toLowerCase();
    const recName = (l.recipientTeacherName || '').toLowerCase();
    const tSubj = (user.subject || '').toLowerCase();
    const recSubj = (l.recipientSubject || '').toLowerCase();
    return (
      matchesTeacherName(l.recipientTeacherName || '', user.name) ||
      recName.includes(tName) ||
      tName.includes(recName && recName.length > 2 ? recName : '_____') ||
      (tSubj && recSubj === tSubj) ||
      !l.recipientTeacherName
    );
  });

  // Notes filtering based on Grade Level separation (Grade 7 to SHS)
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

  const filteredNotes = notes.filter((n) => {
    // Grade Level tab separation
    if (activeTab === 'jhs' && !isJHS(n)) return false;
    if (activeTab === 'shs' && !isSHS(n)) return false;

    // Secondary subject/strand filter
    if (selectedCurriculumFilter !== 'all') {
      const match =
        n.subject.toLowerCase() === selectedCurriculumFilter.toLowerCase() ||
        (n.strandOrSubject && n.strandOrSubject.toLowerCase() === selectedCurriculumFilter.toLowerCase());
      if (!match) return false;
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchSearch =
        n.studentName.toLowerCase().includes(q) ||
        n.message.toLowerCase().includes(q) ||
        (n.teacherName && n.teacherName.toLowerCase().includes(q)) ||
        n.subject.toLowerCase().includes(q);
      if (!matchSearch) return false;
    }

    return true;
  });

  const jhsNotesCount = notes.filter(isJHS).length;
  const shsNotesCount = notes.filter(isSHS).length;

  // Single Comment Submit
  const handleSaveSingleComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    if (commentingNote) {
      onAddTeacherCommentToNote(commentingNote.id, commentText.trim());
      showToast(`Comment posted to ${commentingNote.studentName}'s note!`);
      playChime();
      setCommentingNote(null);
    } else if (commentingLetter) {
      onAddTeacherReplyToLetter(commentingLetter.id, commentText.trim());
      showToast(`Reply sent to ${commentingLetter.studentName}'s letter!`);
      playChime();
      setCommentingLetter(null);
    }
    setCommentText('');
  };

  // Broadcast Message to All Students
  const handleSaveBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastText.trim()) return;

    onBroadcastMessageToAll(broadcastText.trim());
    showToast(`Broadcast note posted to all Grade 7-10 and SHS students!`);
    playChime();
    setBroadcastText('');
    setIsBroadcasting(false);
  };

  const handleConfirmDelete = () => {
    if (!itemToDelete) return;
    if (itemToDelete.type === 'note') {
      onDeleteNote(itemToDelete.id);
      showToast(`Note by ${itemToDelete.student} removed.`);
    } else {
      onDeleteLetter(itemToDelete.id);
      showToast(`Letter from ${itemToDelete.student} removed.`);
    }
    playChime();
    setItemToDelete(null);
  };

  const selectedLetter = myLetters.find((l) => l.id === selectedLetterId) || myLetters[0] || null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/65 backdrop-blur-xs no-print animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl bg-[#FAF6EE] border-2 border-[#D8C7B0] rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Top Header */}
        <div className="p-4 sm:p-5 border-b border-[#E2D4C0] flex items-center justify-between bg-[#F4EDE1]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#1F453B] text-white flex items-center justify-center shadow-xs">
              <GraduationCap className="w-5 h-5 text-[#F7DE85]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold font-heading text-[#2B2520]">
                  Teacher's Interactive Dashboard
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-[#1F453B] text-white text-[11px] font-bold">
                  {user.name}
                </span>
              </div>
              <p className="text-xs text-[#7A6C5D] font-sans">
                Review Grade 7 to SHS tributes, reply to students individually, or post an announcement to everyone!
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsBroadcasting(true)}
              className="px-3.5 py-1.5 rounded-xl bg-[#CE5A46] hover:bg-[#B74A37] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <span>📢</span>
              <span>Message All Students</span>
            </button>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-white/80 hover:bg-white text-[#7A6C5D] hover:text-[#2B2520] border border-[#DDD0BF] flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Toast Alert */}
        {toastMessage && (
          <div className="bg-[#D7F3E3] border-b border-[#B2E7C6] px-4 py-2 text-xs font-bold text-[#246B46] flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Navigation Tabs separating Grade 7-10 vs SHS vs Letters */}
        <div className="bg-[#F0E8DC] px-4 py-2.5 border-b border-[#DECDB8] flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center flex-wrap gap-1.5">
            <button
              onClick={() => {
                setActiveTab('all');
                setSelectedCurriculumFilter('all');
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'all'
                  ? 'bg-[#1F453B] text-white shadow-xs'
                  : 'bg-white/80 text-[#55493D] hover:bg-white'
              }`}
            >
              <span>🌟 All Tributes</span>
              <span className="px-1.5 py-0.2 rounded-full bg-black/10 text-[10px]">
                {notes.length}
              </span>
            </button>
            <button
              onClick={() => {
                setActiveTab('jhs');
                setSelectedCurriculumFilter('all');
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'jhs'
                  ? 'bg-[#1F453B] text-white shadow-xs'
                  : 'bg-white/80 text-[#55493D] hover:bg-white'
              }`}
            >
              <span>🏫 Grade 7 - 10 (Junior High)</span>
              <span className="px-1.5 py-0.2 rounded-full bg-black/10 text-[10px]">
                {jhsNotesCount}
              </span>
            </button>
            <button
              onClick={() => {
                setActiveTab('shs');
                setSelectedCurriculumFilter('all');
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'shs'
                  ? 'bg-[#1F453B] text-white shadow-xs'
                  : 'bg-white/80 text-[#55493D] hover:bg-white'
              }`}
            >
              <span>🎓 Senior High School (SHS)</span>
              <span className="px-1.5 py-0.2 rounded-full bg-black/10 text-[10px]">
                {shsNotesCount}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('letters')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'letters'
                  ? 'bg-[#1F453B] text-white shadow-xs'
                  : 'bg-white/80 text-[#55493D] hover:bg-white'
              }`}
            >
              <span>💌 Heartfelt Letters</span>
              <span className="px-1.5 py-0.2 rounded-full bg-[#CE5A46] text-white text-[10px]">
                {myLetters.length}
              </span>
            </button>
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#8C7D6F]" />
            <input
              type="text"
              placeholder="Search by student or message..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs rounded-xl bg-white border border-[#D8C7B0] text-[#2B2017] placeholder-[#A09384] focus:outline-none focus:ring-1 focus:ring-[#1F453B]"
            />
          </div>
        </div>

        {/* Secondary Category / Subject Filter Bar when viewing JHS or SHS */}
        {activeTab !== 'letters' && (
          <div className="bg-[#FAF5EB] px-4 py-2 border-b border-[#E2D5C3] flex items-center gap-1.5 overflow-x-auto text-xs">
            <span className="text-[11px] font-bold text-[#8A7562] uppercase tracking-wider shrink-0 flex items-center gap-1">
              <Filter className="w-3 h-3 text-[#1F453B]" />
              <span>Subject / Strand:</span>
            </span>
            <button
              onClick={() => setSelectedCurriculumFilter('all')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer shrink-0 ${
                selectedCurriculumFilter === 'all'
                  ? 'bg-[#1F453B] text-white'
                  : 'bg-white border border-[#DECDB8] text-[#55493D]'
              }`}
            >
              All
            </button>
            {(activeTab === 'jhs' ? JHS_SUBJECTS : activeTab === 'shs' ? SHS_STRANDS : [...JHS_SUBJECTS, ...SHS_STRANDS]).map((s) => (
              <button
                key={s.id}
                onClick={() => setSelectedCurriculumFilter(s.name)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer shrink-0 flex items-center gap-1 ${
                  selectedCurriculumFilter.toLowerCase() === s.name.toLowerCase()
                    ? 'bg-[#1F453B] text-white'
                    : 'bg-white border border-[#DECDB8] text-[#55493D] hover:bg-[#F2ECE1]'
                }`}
              >
                <span>{s.icon}</span>
                <span>{s.name}</span>
              </button>
            ))}
          </div>
        )}

        {/* Main Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#FAF7F0]">
          {activeTab !== 'letters' ? (
            <div>
              {/* Wall of Notes with Single Comment / Reply Button */}
              {filteredNotes.length === 0 ? (
                <div className="py-16 text-center text-[#8C7D6F] text-xs">
                  <StickyNote className="w-10 h-10 mx-auto mb-2 opacity-30 text-[#1F453B]" />
                  <p className="font-bold text-[#44382C]">No notes found in this grade level or filter.</p>
                  <p className="text-[11px] mt-1">Students can post tributes for their teachers anytime!</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredNotes.map((note) => {
                    const mentionsMe = isDedicatedToMe(note);
                    return (
                      <div
                        key={note.id}
                        className={`p-4 rounded-2xl border bg-white shadow-2xs flex flex-col justify-between transition-all ${
                          mentionsMe ? 'border-[#1F453B] ring-2 ring-[#1F453B]/20' : 'border-[#E2D5C3]'
                        }`}
                      >
                        <div>
                          {/* Top Badges */}
                          <div className="flex items-center justify-between gap-1 mb-2">
                            <span className="px-2 py-0.5 rounded-md bg-[#FAF5EB] border border-[#EADBCC] text-[10px] font-bold text-[#6D5A46] uppercase font-mono">
                              {note.subject}
                            </span>
                            <div className="flex items-center gap-1">
                              {mentionsMe && (
                                <span className="px-2 py-0.5 rounded-full bg-[#1F453B] text-white text-[10px] font-bold flex items-center gap-1 shadow-2xs">
                                  <span>✨</span>
                                  <span>Dedicated to You!</span>
                                </span>
                              )}
                              <button
                                onClick={() => setItemToDelete({ id: note.id, type: 'note', student: note.studentName })}
                                className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                title="Delete inappropriate note"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Teacher Recipient tag */}
                          {note.teacherName && (
                            <div className="text-[11px] font-bold text-[#CE5A46] mb-1">
                              To: {note.teacherName}
                            </div>
                          )}

                          {/* Message */}
                          <p className="font-body-serif text-xs sm:text-sm text-[#2D241C] leading-relaxed italic my-2">
                            {note.message}
                          </p>

                          {/* Student Author */}
                          <div className="text-xs font-bold text-[#55493D] flex items-center gap-1.5 mt-2">
                            <span>— {note.studentName}</span>
                            {note.grade && (
                              <span className="text-[10px] text-[#8C7D6F] font-normal">
                                ({note.grade})
                              </span>
                            )}
                          </div>

                          {/* Teacher's existing comment if present */}
                          {note.teacherComment && (
                            <div className="mt-3 p-2.5 rounded-xl bg-[#EAF5F0] border border-[#BCE4D3] text-[#1F453B] text-xs">
                              <div className="font-bold flex items-center gap-1 text-[11px] mb-0.5">
                                <span>💬</span>
                                <span>Your Reply ({note.teacherCommentAuthor || user.name}):</span>
                              </div>
                              <p className="italic text-[#2D2823] font-body-serif pl-4 text-xs">
                                "{note.teacherComment}"
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Card Footer: Comment Single One Button */}
                        <div className="mt-4 pt-3 border-t border-[#F0E8DC] flex items-center justify-between">
                          <span className="text-[11px] text-[#8C7D6F]">
                            {note.likes || 1} ❤️ appreciation
                          </span>
                          <button
                            onClick={() => {
                              setCommentingNote(note);
                              setCommentText(note.teacherComment || '');
                            }}
                            className="px-3 py-1.5 rounded-xl bg-[#1F453B] hover:bg-[#16332C] text-white text-xs font-bold transition-all shadow-2xs hover:scale-102 cursor-pointer flex items-center gap-1.5"
                          >
                            <MessageSquareHeart className="w-3.5 h-3.5 text-[#F7DE85]" />
                            <span>{note.teacherComment ? 'Edit Comment' : 'Comment / Reply'}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            /* Letters Two-Column View */
            <div className="flex flex-col md:flex-row gap-4 h-full min-h-[450px]">
              {/* Letters List */}
              <div className="w-full md:w-80 border-r border-[#E2D4C0] pr-3 space-y-2">
                <div className="text-xs font-bold text-[#6D5A46] uppercase tracking-wider mb-2">
                  Student Letters ({myLetters.length})
                </div>
                {myLetters.length === 0 ? (
                  <div className="py-12 text-center text-xs text-[#8C7D6F]">
                    No formal letters received yet.
                  </div>
                ) : (
                  myLetters.map((l) => (
                    <div
                      key={l.id}
                      onClick={() => {
                        setSelectedLetterId(l.id);
                        if (!l.isRead) onMarkLetterAsRead(l.id);
                      }}
                      className={`p-3 rounded-xl border transition-all cursor-pointer ${
                        selectedLetter?.id === l.id
                          ? 'bg-white border-[#1F453B] shadow-xs'
                          : 'bg-white/70 border-[#E2D5C3] hover:bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-[#2B231D] truncate">
                          {l.studentName}
                        </span>
                        {!l.isRead && (
                          <span className="w-2 h-2 rounded-full bg-[#CE5A46]" />
                        )}
                      </div>
                      <div className="text-[11px] font-semibold text-[#1F453B] truncate mb-0.5">
                        {l.title}
                      </div>
                      <div className="text-[10px] text-[#7A6C5D] line-clamp-2">
                        {l.body}
                      </div>
                      <div className="mt-2 pt-1.5 border-t border-[#EADBCC]/60 flex items-center justify-between">
                        <span className="text-[9.5px] uppercase font-bold text-[#1F453B]/70 bg-[#1F453B]/5 px-1.5 py-0.5 rounded">
                          {l.templateType || 'Letter'}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedLetterId(l.id);
                            setSelectedCompleteLetterId(l.id);
                          }}
                          className="text-[11px] font-bold text-[#1F453B] hover:text-[#16332C] hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <BookOpen className="w-3 h-3 text-[#1F453B]" />
                          <span>Full Letter →</span>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Letter Reader Pane */}
              <div className="flex-1 bg-white p-6 rounded-2xl border border-[#D5C2A8] shadow-sm flex flex-col justify-between">
                {selectedLetter ? (
                  <div>
                    <div className="border-b border-[#E8DEC8] pb-3 mb-4 flex items-center justify-between">
                      <div>
                        <div className="text-sm font-bold text-[#1F453B] font-heading">
                          Letter to: {selectedLetter.recipientTeacherName}
                        </div>
                        <div className="text-xs text-[#7A6C5D]">
                          From: <span className="font-semibold">{selectedLetter.studentName}</span> {selectedLetter.grade && `(${selectedLetter.grade})`}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => onToggleBookmarkLetter(selectedLetter.id, !!selectedLetter.isBookmarked)}
                          className={`p-1.5 rounded-lg border text-xs cursor-pointer ${
                            selectedLetter.isBookmarked ? 'bg-amber-100 text-amber-700 border-amber-300' : 'bg-[#FAF6EE] text-[#55493D]'
                          }`}
                        >
                          <Star className="w-3.5 h-3.5 fill-current" />
                        </button>
                        <button
                          onClick={() => setItemToDelete({ id: selectedLetter.id, type: 'letter', student: selectedLetter.studentName })}
                          className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <h3 className="font-heading font-bold text-base text-[#2C231D] mb-3">
                      {selectedLetter.title}
                    </h3>
                    <p className="font-body-serif text-sm leading-relaxed text-[#3B3026] whitespace-pre-wrap mb-4">
                      {selectedLetter.body}
                    </p>

                    {/* Attached Keepsake Photo if provided */}
                    {selectedLetter.attachedPhoto && (
                      <div className="mt-4 p-3 rounded-xl bg-[#FAF5EB] border border-[#EADBCC]">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-[#1F453B]">
                            <Paperclip className="w-3.5 h-3.5 text-[#1F453B]" />
                            <span>Attached Keepsake Photo</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setShowDashboardAttachedPhoto((prev) => !prev)}
                            className="px-2.5 py-1 rounded-lg bg-white border border-[#DDD0BF] text-[11px] font-bold text-[#55493D] hover:bg-[#F2ECE1] transition-colors cursor-pointer"
                          >
                            {showDashboardAttachedPhoto ? 'Hide Photo' : 'View Attached Photo'}
                          </button>
                        </div>
                        {showDashboardAttachedPhoto && (
                          <div className="mt-2 rounded-xl overflow-hidden border border-[#D5C2A8] bg-black/5 p-2 flex justify-center">
                            <img
                              src={selectedLetter.attachedPhoto}
                              alt="Attached keepsake from student"
                              className="max-h-64 w-auto object-contain rounded-lg shadow-2xs"
                            />
                          </div>
                        )}
                      </div>
                    )}

                    {/* Teacher's reply to this letter */}
                    {selectedLetter.teacherReplyMessage && (
                      <div className="mt-4 p-3 rounded-xl bg-[#EAF5F0] border border-[#BCE4D3] text-[#1F453B] text-xs">
                        <div className="font-bold mb-1 flex items-center gap-1">
                          <span>💬</span>
                          <span>Your Reply:</span>
                        </div>
                        <p className="italic text-[#2D2823] font-body-serif">
                          "{selectedLetter.teacherReplyMessage}"
                        </p>
                      </div>
                    )}

                    <div className="mt-6 pt-3 border-t border-[#E8DEC8] flex items-center justify-between flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedCompleteLetterId(selectedLetter.id)}
                        className="px-3.5 py-2 rounded-xl bg-[#FAF4EA] hover:bg-[#F2ECE1] text-[#1F453B] border border-[#DDD0BF] text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
                        title="View complete vintage letterhead with attached photo and full student message"
                      >
                        <BookOpen className="w-3.5 h-3.5 text-[#1F453B]" />
                        <span>Read Complete Letter</span>
                      </button>
                      <button
                        onClick={() => {
                          setCommentingLetter(selectedLetter);
                          setCommentText(selectedLetter.teacherReplyMessage || '');
                        }}
                        className="px-4 py-2 rounded-xl bg-[#1F453B] hover:bg-[#16332C] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                      >
                        <CornerDownRight className="w-3.5 h-3.5 text-[#F7DE85]" />
                        <span>{selectedLetter.teacherReplyMessage ? 'Edit Letter Reply' : 'Reply to Student'}</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center p-8 text-[#8C7D6F]">
                    <Mail className="w-10 h-10 mb-2 opacity-30 text-[#1F453B]" />
                    <p className="text-xs font-bold text-[#44382C]">Select a student letter to read and reply.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* MODAL 1: COMMENT ON SINGLE NOTE / LETTER */}
        {(commentingNote || commentingLetter) && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="bg-[#FFFDF9] border border-[#DDD0BF] rounded-3xl p-6 max-w-lg w-full shadow-2xl animate-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#EADBCC]">
                <div className="flex items-center gap-2">
                  <span className="text-base">💬</span>
                  <h4 className="font-heading font-bold text-base text-[#231F1D]">
                    Comment & Reply to {commentingNote?.studentName || commentingLetter?.studentName}
                  </h4>
                </div>
                <button
                  onClick={() => {
                    setCommentingNote(null);
                    setCommentingLetter(null);
                  }}
                  className="p-1 rounded-full text-[#7A6C5D] hover:bg-black/5 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-[#6B5C4D] mb-3">
                Your encouraging comment will be attached directly to this tribute for the student and class to see!
              </p>
              <form onSubmit={handleSaveSingleComment} className="space-y-3">
                <textarea
                  rows={4}
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder={`Write your thank-you message to ${commentingNote?.studentName || commentingLetter?.studentName}...`}
                  className="w-full p-3 text-xs bg-[#FAF7F0] border border-[#DDD0BF] rounded-xl text-[#2B231D] focus:outline-none focus:ring-2 focus:ring-[#1F453B]/30 font-body-serif"
                  maxLength={400}
                />
                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setCommentingNote(null);
                      setCommentingLetter(null);
                    }}
                    className="px-4 py-2 text-xs font-bold border border-[#DDD0BF] text-[#55493D] rounded-xl hover:bg-[#F2ECE1] cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 text-xs font-bold bg-[#1F453B] hover:bg-[#16332C] text-white rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5 text-[#F7DE85]" />
                    <span>Post Comment</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL 2: BROADCAST TO ALL STUDENTS */}
        {isBroadcasting && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="bg-[#FFFDF9] border border-[#DDD0BF] rounded-3xl p-6 max-w-lg w-full shadow-2xl animate-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#EADBCC]">
                <div className="flex items-center gap-2">
                  <span className="text-base">📢</span>
                  <h4 className="font-heading font-bold text-base text-[#231F1D]">
                    Broadcast Message to All Students (Grade 7 - SHS)
                  </h4>
                </div>
                <button
                  onClick={() => setIsBroadcasting(false)}
                  className="p-1 rounded-full text-[#7A6C5D] hover:bg-black/5 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-[#6B5C4D] mb-3">
                This message from <span className="font-bold text-[#1F453B]">{user.name}</span> will be pinned to the public Gratitude Wall as a featured Teacher Tribute to thank all your students!
              </p>
              <form onSubmit={handleSaveBroadcast} className="space-y-3">
                <textarea
                  rows={5}
                  value={broadcastText}
                  onChange={(e) => setBroadcastText(e.target.value)}
                  placeholder="Dear students, thank you from the bottom of my heart for all your notes, letters, and wonderful Teacher's Day greetings..."
                  className="w-full p-3 text-xs bg-[#FAF7F0] border border-[#DDD0BF] rounded-xl text-[#2B231D] focus:outline-none focus:ring-2 focus:ring-[#1F453B]/30 font-body-serif leading-relaxed"
                  maxLength={600}
                />
                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsBroadcasting(false)}
                    className="px-4 py-2 text-xs font-bold border border-[#DDD0BF] text-[#55493D] rounded-xl hover:bg-[#F2ECE1] cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 text-xs font-bold bg-[#CE5A46] hover:bg-[#B74A37] text-white rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Broadcast to Wall</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL 3: IN-APP DELETE CONFIRMATION */}
        {itemToDelete && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="bg-[#FFFDF9] border border-[#DDD0BF] rounded-3xl p-6 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-150">
              <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-3">
                <Trash2 className="w-6 h-6" />
              </div>
              <h4 className="font-heading font-bold text-center text-lg text-[#231F1D] mb-1">
                Delete Inappropriate {itemToDelete.type === 'note' ? 'Note' : 'Letter'}?
              </h4>
              <p className="text-xs text-center text-[#75685B] mb-4">
                As an authorized teacher, you can permanently remove this tribute by "{itemToDelete.student}".
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setItemToDelete(null)}
                  className="flex-1 py-2.5 text-xs font-bold border border-[#DDD0BF] text-[#55493D] rounded-xl hover:bg-[#F2ECE1] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  className="flex-1 py-2.5 text-xs font-bold bg-red-600 text-white rounded-xl hover:bg-red-700 shadow-xs cursor-pointer flex items-center justify-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* COMPLETE LETTER READER MODAL FOR TEACHER DASHBOARD */}
        {selectedCompleteLetter && (
          <CompleteLetterModal
            isOpen={!!selectedCompleteLetter}
            onClose={() => setSelectedCompleteLetterId(null)}
            letter={selectedCompleteLetter}
            user={user}
            onReplyToLetter={onAddTeacherReplyToLetter}
            onToggleBookmark={onToggleBookmarkLetter}
            onMarkAsRead={onMarkLetterAsRead}
            onDeleteLetter={(id) => {
              onDeleteLetter(id);
              setSelectedCompleteLetterId(null);
            }}
          />
        )}
      </div>
    </div>
  );
};
