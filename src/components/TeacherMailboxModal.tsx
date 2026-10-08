import React, { useState } from 'react';
import { StudentLetter, TributeComment } from '../types';
import { X, Mail, Star, Search, Printer, CornerDownRight, Trash2, Paperclip, Send, BookOpen } from 'lucide-react';
import { CompleteLetterModal } from './CompleteLetterModal.tsx';
import { playChime } from '../utils/audio';
import { matchesTeacherName } from '../utils/teacherMatcher';

interface TeacherMailboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  teacherName: string;
  teacherSubject?: string;
  letters: StudentLetter[];
  onMarkAsRead: (letterId: string) => void;
  onToggleBookmark: (letterId: string, currentBookmark: boolean) => void;
  onReplyToStudent?: (studentName: string) => void;
  onReplyToLetter?: (letterId: string, reply: string) => void;
  onDeleteLetter?: (letterId: string) => void;
  tributeComments?: TributeComment[];
  onAddTributeComment?: (
    targetId: string,
    targetType: 'note' | 'letter',
    authorName: string,
    message: string
  ) => Promise<{ ok: boolean; error?: string }> | void;
  onDeleteTributeComment?: (commentId: string) => void;
}

export const TeacherMailboxModal: React.FC<TeacherMailboxModalProps> = ({
  isOpen,
  onClose,
  teacherName,
  teacherSubject,
  letters,
  onMarkAsRead,
  onToggleBookmark,
  onReplyToStudent,
  onReplyToLetter,
  onDeleteLetter,
  tributeComments = [],
  onAddTributeComment,
  onDeleteTributeComment,
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'bookmarked'>('all');
  const [scope, setScope] = useState<'my' | 'school'>('my');
  const [selectedLetterId, setSelectedLetterId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAttachedPhoto, setShowAttachedPhoto] = useState(true);
  const [isReplyingInline, setIsReplyingInline] = useState(false);
  const [inlineReplyText, setInlineReplyText] = useState('');
  const [isFullLetterOpen, setIsFullLetterOpen] = useState(false);
  const [letterToDelete, setLetterToDelete] = useState<{ id: string; studentName: string } | null>(null);

  if (!isOpen) return null;

  const handleConfirmDeleteLetter = () => {
    if (!letterToDelete) return;
    if (onDeleteLetter) {
      onDeleteLetter(letterToDelete.id);
    }
    if (selectedLetterId === letterToDelete.id) {
      setSelectedLetterId(null);
    }
    setLetterToDelete(null);
  };

  // Filter letters for this teacher (or all school letters if scope is 'school')
  const teacherLetters = letters.filter((l) => {
    if (scope === 'school') return true;
    return (
      !l.recipientTeacherName ||
      matchesTeacherName(l.recipientTeacherName, teacherName) ||
      l.recipientTeacherName.toLowerCase().includes(teacherName.toLowerCase()) ||
      teacherName.toLowerCase().includes(l.recipientTeacherName.toLowerCase()) ||
      (teacherSubject && l.recipientSubject && l.recipientSubject.toLowerCase() === teacherSubject.toLowerCase())
    );
  });

  const filteredLetters = teacherLetters.filter((l) => {
    if (activeTab === 'unread' && l.isRead) return false;
    if (activeTab === 'bookmarked' && !l.isBookmarked) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        l.studentName.toLowerCase().includes(q) ||
        l.title.toLowerCase().includes(q) ||
        l.body.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const selectedLetter =
    teacherLetters.find((l) => l.id === selectedLetterId) || filteredLetters[0] || null;

  const currentFullLetter = (selectedLetter ? letters.find((l) => l.id === selectedLetter.id) : null) || selectedLetter;

  const unreadCount = teacherLetters.filter((l) => !l.isRead).length;
  const bookmarkedCount = teacherLetters.filter((l) => l.isBookmarked).length;

  const handleSelectLetter = (letter: StudentLetter) => {
    setSelectedLetterId(letter.id);
    if (!letter.isRead) {
      onMarkAsRead(letter.id);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
      <div className="relative w-full max-w-5xl bg-[#FAF6EE] rounded-3xl border-2 border-[#D8C7B0] shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Modal Top Header */}
        <div className="p-4 sm:p-5 border-b border-[#E2D4C0] flex items-center justify-between bg-[#F4EDE1]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#1F453B] text-white flex items-center justify-center shadow-xs">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold font-heading text-[#2B2520]">
                  Teacher's Mailbox
                </h2>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-[#CE5A46] text-white text-[11px] font-bold">
                    {unreadCount} new
                  </span>
                )}
              </div>
              <p className="text-xs text-[#7A6C5D] font-sans">
                Heartfelt long-form student letters sent to{' '}
                <span className="font-semibold text-[#1F453B]">{teacherName}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/80 hover:bg-white text-[#7A6C5D] hover:text-[#2B2520] border border-[#DDD0BF] flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Main Body: Two-Column Layout */}
        <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
          {/* Left Column: Letter Index */}
          <div className="w-full md:w-80 lg:w-96 border-b md:border-b-0 md:border-r border-[#E2D4C0] flex flex-col bg-[#F7F1E6]">
            {/* Filter Tabs & Search */}
            <div className="p-3 border-b border-[#E2D4C0] space-y-2">
              {/* Scope Switcher: My Mailbox vs All School Letters */}
              <div className="flex items-center gap-1 p-1 bg-[#ECE2D4] rounded-xl text-xs">
                <button
                  onClick={() => setScope('my')}
                  className={`flex-1 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    scope === 'my'
                      ? 'bg-[#1F453B] text-white shadow-2xs'
                      : 'text-[#615346] hover:bg-white/50'
                  }`}
                >
                  My Letters
                </button>
                <button
                  onClick={() => setScope('school')}
                  className={`flex-1 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    scope === 'school'
                      ? 'bg-[#1F453B] text-white shadow-2xs'
                      : 'text-[#615346] hover:bg-white/50'
                  }`}
                >
                  All School ({letters.length})
                </button>
              </div>

              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#8C7D6F]" />
                <input
                  type="text"
                  placeholder="Search by student, teacher or title..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-white border border-[#D8C7B0] text-[#2B2520] placeholder-[#A09384] focus:outline-none focus:ring-1 focus:ring-[#1F453B]"
                />
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setActiveTab('all')}
                  className={`flex-1 py-1 text-[11px] font-bold rounded-lg transition-colors cursor-pointer ${
                    activeTab === 'all'
                      ? 'bg-[#1F453B] text-white shadow-2xs'
                      : 'bg-white/70 text-[#5F5245] hover:bg-white'
                  }`}
                >
                  All ({teacherLetters.length})
                </button>
                <button
                  onClick={() => setActiveTab('unread')}
                  className={`flex-1 py-1 text-[11px] font-bold rounded-lg transition-colors cursor-pointer ${
                    activeTab === 'unread'
                      ? 'bg-[#1F453B] text-white shadow-2xs'
                      : 'bg-white/70 text-[#5F5245] hover:bg-white'
                  }`}
                >
                  Unread ({unreadCount})
                </button>
                <button
                  onClick={() => setActiveTab('bookmarked')}
                  className={`flex-1 py-1 text-[11px] font-bold rounded-lg transition-colors cursor-pointer ${
                    activeTab === 'bookmarked'
                      ? 'bg-[#1F453B] text-white shadow-2xs'
                      : 'bg-white/70 text-[#5F5245] hover:bg-white'
                  }`}
                >
                  Saved ⭐ ({bookmarkedCount})
                </button>
              </div>
            </div>

            {/* List of Letters */}
            <div className="flex-1 overflow-y-auto divide-y divide-[#EADECF]">
              {filteredLetters.length === 0 ? (
                <div className="p-8 text-center text-[#8C7D6F]">
                  <Mail className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-xs font-semibold">No letters in this view.</p>
                  <p className="text-[11px] mt-1 text-[#A39586]">
                    Students can choose "Heartfelt Letter" when writing on the wall.
                  </p>
                </div>
              ) : (
                filteredLetters.map((letter) => {
                  const isSelected = selectedLetter?.id === letter.id;
                  const dateStr = new Date(letter.createdAt).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                  });

                  return (
                    <div
                      key={letter.id}
                      onClick={() => handleSelectLetter(letter)}
                      className={`p-3.5 transition-all cursor-pointer relative ${
                        isSelected
                          ? 'bg-white shadow-xs border-l-4 border-l-[#1F453B]'
                          : 'hover:bg-white/60'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-1 mb-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          {!letter.isRead && (
                            <span className="w-2 h-2 rounded-full bg-[#CE5A46] shrink-0" />
                          )}
                          <span
                            className={`text-xs truncate ${
                              !letter.isRead ? 'font-bold text-[#2B2520]' : 'font-semibold text-[#4A3E33]'
                            }`}
                          >
                            {letter.studentName}
                          </span>
                          {letter.grade && (
                            <span className="text-[10px] text-[#8C7D6F] truncate">
                              • {letter.grade}
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-[#9E9080] font-mono shrink-0">
                          {dateStr}
                        </span>
                      </div>
                      <div className="text-xs font-medium text-[#2B2520] truncate mb-1">
                        {letter.title}
                      </div>
                      <p className="text-[11px] text-[#736556] line-clamp-2 leading-relaxed">
                        {letter.body}
                      </p>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-[9.5px] uppercase tracking-wider font-bold text-[#1F453B]/80 bg-[#1F453B]/8 px-1.5 py-0.5 rounded">
                          {letter.templateType}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectLetter(letter);
                              setIsFullLetterOpen(true);
                            }}
                            className="p-1 text-[#1F453B] hover:bg-[#1F453B]/10 rounded-md transition-colors cursor-pointer flex items-center gap-0.5 text-[10px] font-bold"
                            title="Read complete letter"
                          >
                            <BookOpen className="w-3 h-3 text-[#1F453B]" />
                            <span>Read</span>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleBookmark(letter.id, !!letter.isBookmarked);
                            }}
                            className={`p-1 rounded-md transition-colors cursor-pointer ${
                              letter.isBookmarked
                                ? 'text-[#D97706] hover:text-[#B45309]'
                                : 'text-[#B8A896] hover:text-[#7A6C5D]'
                            }`}
                            title={letter.isBookmarked ? 'Remove bookmark' : 'Bookmark letter'}
                          >
                            <Star
                              className={`w-3.5 h-3.5 ${letter.isBookmarked ? 'fill-current' : ''}`}
                            />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setLetterToDelete({ id: letter.id, studentName: letter.studentName });
                            }}
                            className="p-1 text-[#C49B90] hover:text-red-700 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                            title="Delete inappropriate letter"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: High-Fidelity Parchment Letter Reader */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 flex flex-col justify-between bg-[#F4EFE6]">
            {selectedLetter ? (
              <div className="max-w-2xl mx-auto w-full flex flex-col">
                {/* Vintage Letter Stationery Card */}
                <div className="relative bg-[#FFFDF9] border border-[#D5C2A8] rounded-2xl p-6 sm:p-10 shadow-md">
                  {/* Decorative Vintage Stamp */}
                  <div className="absolute top-5 right-5 w-12 h-14 border-2 border-dashed border-[#B34B36]/60 rounded-xs flex flex-col items-center justify-center bg-[#FFF8F0] rotate-2 shadow-2xs">
                    <span className="text-xs">🏫</span>
                    <span className="text-[7.5px] font-bold text-[#B34B36] uppercase tracking-tighter">
                      ROOM 204
                    </span>
                    <span className="text-[7px] text-[#8C7D6F] font-mono">OCT 2026</span>
                  </div>

                  {/* Formal Letterhead */}
                  <div className="border-b border-[#E8DEC8] pb-4 mb-6 pr-16">
                    <div className="text-[11px] font-mono text-[#8C7D6F] uppercase tracking-wider">
                      TO THE ATTENTION OF
                    </div>
                    <div className="text-lg font-bold text-[#1F453B] font-heading">
                      {selectedLetter.recipientTeacherName}
                    </div>
                    <div className="text-xs text-[#7A6C5D] font-serif italic">
                      Department of {selectedLetter.recipientSubject}
                    </div>
                  </div>

                  {/* Letter Title */}
                  <h3 className="text-base sm:text-lg font-bold text-[#2B2520] font-heading mb-4">
                    {selectedLetter.title}
                  </h3>

                  {/* Letter Body with Serif Styling */}
                  <div className="font-serif text-[#2F2923] text-sm sm:text-[15px] leading-relaxed whitespace-pre-line space-y-4">
                    {selectedLetter.body}
                  </div>

                  {/* Attached Keepsake Photo if provided */}
                  {selectedLetter.attachedPhoto && (
                    <div className="mt-6 pt-4 border-t border-[#E8DEC8]">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-[#1F453B]">
                          <Paperclip className="w-3.5 h-3.5 text-[#1F453B]" />
                          <span>Attached Student Keepsake Photo</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowAttachedPhoto((prev) => !prev)}
                          className="px-2.5 py-1 rounded-lg bg-white border border-[#DDD0BF] text-[11px] font-bold text-[#55493D] hover:bg-[#F2ECE1] transition-colors cursor-pointer"
                        >
                          {showAttachedPhoto ? 'Hide Photo' : 'View Attached Photo'}
                        </button>
                      </div>
                      {showAttachedPhoto && (
                        <div className="mt-2 rounded-xl overflow-hidden border border-[#D5C2A8] bg-black/5 p-2 flex justify-center">
                          <img
                            src={selectedLetter.attachedPhoto}
                            alt="Attached keepsake from student"
                            className="max-h-72 w-auto object-contain rounded-lg shadow-2xs"
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Letter Sign-off Footer */}
                  <div className="mt-8 pt-4 border-t border-[#E8DEC8] flex items-center justify-between text-xs font-sans text-[#5A4F43]">
                    <div>
                      <span className="font-semibold text-[#2B2520]">From: </span>
                      <span>{selectedLetter.studentName}</span>
                      {selectedLetter.grade && <span> ({selectedLetter.grade})</span>}
                    </div>
                    <div className="text-[11px] text-[#8C7D6F] font-mono">
                      {new Date(selectedLetter.createdAt).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </div>
                  </div>
                </div>

                {/* Bottom Reader Action Toolbar */}
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setIsFullLetterOpen(true)}
                      className="px-3.5 py-1.5 rounded-xl bg-[#1F453B] hover:bg-[#16332C] text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs hover:shadow-xs transition-all cursor-pointer"
                      title="Read complete formal student letter keepsake with vintage letterhead"
                    >
                      <BookOpen className="w-3.5 h-3.5 text-[#F7DE85]" />
                      <span>Read Complete Letter</span>
                    </button>
                    <button
                      onClick={() => onToggleBookmark(selectedLetter.id, !!selectedLetter.isBookmarked)}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                        selectedLetter.isBookmarked
                          ? 'bg-[#FEF3C7] text-[#92400E] border-[#FCD34D]'
                          : 'bg-white text-[#5F5245] border-[#D8C7B0] hover:bg-[#F9F5EE]'
                      }`}
                    >
                      <Star
                        className={`w-3.5 h-3.5 ${
                          selectedLetter.isBookmarked ? 'fill-current text-[#D97706]' : ''
                        }`}
                      />
                      <span>
                        {selectedLetter.isBookmarked ? 'Saved to Keepsakes' : 'Save to Keepsakes'}
                      </span>
                    </button>
                    <button
                      onClick={handlePrint}
                      className="px-3 py-1.5 rounded-xl border border-[#D8C7B0] bg-white hover:bg-[#F9F5EE] text-[#5F5245] text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                      title="Print or save as PDF"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Print Keepsake</span>
                    </button>
                    {onDeleteLetter && (
                      <button
                        onClick={() => setLetterToDelete({ id: selectedLetter.id, studentName: selectedLetter.studentName })}
                        className="px-3 py-1.5 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                        title="Delete inappropriate letter"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete Inappropriate</span>
                      </button>
                    )}
                  </div>

                  {onReplyToStudent && (
                    <button
                      onClick={() => {
                        onClose();
                        onReplyToStudent(selectedLetter.studentName);
                      }}
                      className="px-4 py-1.5 rounded-xl bg-[#1F453B] hover:bg-[#16332B] text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs hover:shadow-xs transition-all cursor-pointer"
                    >
                      <CornerDownRight className="w-3.5 h-3.5" />
                      <span>Reply to {selectedLetter.studentName}</span>
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 text-[#8C7D6F]">
                <Mail className="w-12 h-12 mb-3 opacity-30" />
                <h4 className="font-heading font-bold text-base text-[#4A3E33]">
                  Select a student letter
                </h4>
                <p className="text-xs max-w-sm mt-1">
                  Choose any student tribute on the left to read their formal Teacher's Day letter.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* IN-APP LETTER DELETE CONFIRMATION MODAL */}
        {letterToDelete && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="bg-[#FFFDF9] border border-[#DDD0BF] rounded-3xl p-6 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-150">
              <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-3">
                <Trash2 className="w-6 h-6" />
              </div>
              <h4 className="font-heading font-bold text-center text-lg text-[#231F1D] mb-1">
                Delete Inappropriate Letter?
              </h4>
              <p className="text-xs text-center text-[#75685B] mb-4">
                As an authorized teacher, you can permanently remove this letter from your mailbox and the database.
              </p>
              <div className="bg-[#FAF5EC] p-3 rounded-xl border border-[#EADBCC] text-xs text-[#44382C] mb-4">
                From: <span className="font-bold text-[#2B231D]">{letterToDelete.studentName}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setLetterToDelete(null)}
                  className="flex-1 py-2.5 text-xs font-bold border border-[#DDD0BF] text-[#55493D] rounded-xl hover:bg-[#F2ECE1] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteLetter}
                  className="flex-1 py-2.5 text-xs font-bold bg-red-600 text-white rounded-xl hover:bg-red-700 shadow-xs cursor-pointer flex items-center justify-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Letter</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* IN-APP COMPLETE LETTER MODAL FOR TEACHER */}
        {isFullLetterOpen && currentFullLetter && (
          <CompleteLetterModal
            isOpen={isFullLetterOpen}
            onClose={() => setIsFullLetterOpen(false)}
            letter={currentFullLetter}
            user={{ role: 'teacher', name: teacherName, subject: teacherSubject }}
            onReplyToLetter={onReplyToLetter}
            onToggleBookmark={onToggleBookmark}
            onMarkAsRead={onMarkAsRead}
            onDeleteLetter={(id) => {
              if (onDeleteLetter) onDeleteLetter(id);
              setIsFullLetterOpen(false);
            }}
            tributeComments={tributeComments}
            onAddTributeComment={onAddTributeComment}
            onDeleteTributeComment={onDeleteTributeComment}
          />
        )}
      </div>
    </div>
  );
};
