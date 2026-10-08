import React, { useState } from 'react';
import { StudentLetter, UserSession, TributeComment, UserRole } from '../types';
import {
  X,
  Printer,
  Star,
  Trash2,
  Send,
  Sparkles,
  CheckCircle2,
  MessageCircle,
  Lightbulb,
  AlertTriangle,
} from 'lucide-react';
import { playChime } from '../utils/audio';

const LETTER_COMMENT_SUGGESTIONS = [
  "So touching! Happy Teacher's Day po! 💐",
  "Thank you for everything, Ma'am/Sir! ✨",
  'Best teacher ever! We appreciate you so much! 🙌',
  'Such a heartfelt letter! God bless our teachers! ❤️',
  'Thank you for your endless patience and guidance! 🌟',
  'We are so lucky to be in your class! 📚',
];

interface CompleteLetterModalProps {
  isOpen: boolean;
  onClose: () => void;
  letter: StudentLetter | null;
  user: UserSession | null;
  onReplyToLetter?: (letterId: string, reply: string) => void;
  onToggleBookmark?: (letterId: string, currentBookmark: boolean) => void;
  onMarkAsRead?: (letterId: string) => void;
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

export const CompleteLetterModal: React.FC<CompleteLetterModalProps> = ({
  isOpen,
  onClose,
  letter,
  user,
  onReplyToLetter,
  onToggleBookmark,
  onMarkAsRead,
  onDeleteLetter,
  tributeComments = [],
  onAddTributeComment,
  onDeleteTributeComment,
}) => {
  const [isReplying, setIsReplying] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [commentAuthor, setCommentAuthor] = useState(user?.name || '');
  const [commentText, setCommentText] = useState('');
  const [commentError, setCommentError] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  React.useEffect(() => {
    if (user?.name) setCommentAuthor(user.name);
  }, [user?.name]);

  React.useEffect(() => {
    if (letter && !letter.isRead && onMarkAsRead) {
      onMarkAsRead(letter.id);
    }
    if (letter?.teacherReplyMessage) {
      setReplyText(letter.teacherReplyMessage);
    } else {
      setReplyText('');
    }
  }, [letter?.id, letter?.teacherReplyMessage, letter?.body, letter?.title, letter?.isRead]);

  if (!isOpen || !letter) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !onReplyToLetter) return;
    onReplyToLetter(letter.id, replyText.trim());
    playChime();
    setIsReplying(false);
  };

  const isTeacher = user?.role === 'teacher';
  const isAdminOrMod = user?.role === 'admin' || user?.role === 'moderator' || user?.isSuperAdmin;

  const dateString = new Date(letter.createdAt).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-5 bg-black/65 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-[#FFFDF9] border-2 border-[#D5C2A8] rounded-3xl shadow-2xl p-6 sm:p-9 max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Top Washi Tape */}
        <div className="washi-tape" />

        {/* Top Controls */}
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#EADBCC]">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-1 rounded-full bg-[#1F453B]/10 text-[#1F453B] text-xs font-bold flex items-center gap-1.5">
              <span>💌</span>
              <span>Complete Formal Student Letter</span>
            </span>
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Realtime Live Synced</span>
            </div>
            {letter.isRead ? (
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                <span>Read</span>
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full bg-[#CE5A46] text-white text-[10px] font-bold">
                New Letter
              </span>
            )}
            {letter.teacherReplyMessage && (
              <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-900 border border-purple-200 text-[10px] font-bold">
                💬 Reply Added
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handlePrint}
              className="p-1.5 rounded-xl hover:bg-black/5 text-[#6D5E4F] hover:text-[#2D2823] transition-colors cursor-pointer"
              title="Print letter keepsake"
            >
              <Printer className="w-4 h-4" />
            </button>
            {onToggleBookmark && (
              <button
                onClick={() => onToggleBookmark(letter.id, !!letter.isBookmarked)}
                className={`p-1.5 rounded-xl hover:bg-black/5 transition-colors cursor-pointer ${
                  letter.isBookmarked ? 'text-amber-500 fill-amber-500' : 'text-[#6D5E4F]'
                }`}
                title={letter.isBookmarked ? 'Bookmarked in Keepsakes' : 'Bookmark Letter'}
              >
                <Star className={`w-4 h-4 ${letter.isBookmarked ? 'fill-current' : ''}`} />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-black/5 text-[#6D5E4F] hover:text-[#2D2823] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Letter Content */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-4">
          {/* Formal Letterhead */}
          <div className="relative bg-[#FAF6EE] border border-[#E5D7BE] rounded-2xl p-4 sm:p-5 shadow-2xs">
            {/* Vintage postage stamp */}
            <div className="absolute top-4 right-4 w-12 h-14 border-2 border-dashed border-[#B34B36]/60 rounded-xs flex flex-col items-center justify-center bg-[#FFF8F0] rotate-2 shadow-2xs select-none">
              <span className="text-xs">🏫</span>
              <span className="text-[7.5px] font-bold text-[#B34B36] uppercase tracking-tighter">CITY HIGH</span>
              <span className="text-[7px] text-[#8C7D6F] font-mono">2026</span>
            </div>

            <div className="pr-16">
              <span className="text-[10px] font-mono font-bold text-[#8C7D6F] uppercase tracking-wider block">
                TO THE ATTENTION OF
              </span>
              <h3 className="text-lg sm:text-xl font-bold text-[#1F453B] font-heading mt-0.5">
                {letter.recipientTeacherName}
              </h3>
              <p className="text-xs text-[#7A6C5D] font-serif italic">
                Department of {letter.recipientSubject}
              </p>
            </div>

            <div className="mt-3 pt-2.5 border-t border-[#DECDB8] flex items-center justify-between text-xs text-[#5A4F43] flex-wrap gap-2">
              <div>
                <span className="text-[#8C7D6F] font-semibold">From: </span>
                <span className="font-bold text-[#2D2823]">{letter.studentName}</span>
                {letter.grade && <span className="text-[#7A6C5D]"> ({letter.grade})</span>}
              </div>
              <div className="text-[11px] text-[#8C7D6F] font-mono">
                {dateString}
              </div>
            </div>
          </div>

          {/* Letter Title */}
          <div>
            <span className="text-[10px] uppercase font-bold text-[#CE5A46] tracking-wider block mb-1">
              SUBJECT / TITLE
            </span>
            <h2 className="text-lg sm:text-xl font-black text-[#2D2823] leading-snug">
              {letter.title}
            </h2>
          </div>

          {/* Complete Letter Body (Full text, no truncation) */}
          <div className="bg-white border-2 border-[#E8DCC8] rounded-2xl p-5 sm:p-7 shadow-xs">
            <p className="font-body-serif text-sm sm:text-base leading-relaxed text-[#2D241C] whitespace-pre-wrap">
              {letter.body}
            </p>
          </div>

          {/* Teacher's Reply Thread if exists */}
          {letter.teacherReplyMessage && (
            <div className="bg-[#EAF5F0] border-2 border-[#BCE4D3] rounded-2xl p-4 sm:p-5 shadow-2xs">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#1F453B]">
                  <span>🧑‍🏫</span>
                  <span>Official Reply from Teacher {letter.teacherReplyAuthor || letter.recipientTeacherName}</span>
                </div>
                {letter.teacherReplyTime && (
                  <span className="text-[10px] text-[#557F71] font-mono">
                    {new Date(letter.teacherReplyTime).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                )}
              </div>
              <p className="italic text-[#2D2823] font-body-serif text-xs sm:text-sm pl-4 leading-relaxed border-l-2 border-[#1F453B]/40">
                "{letter.teacherReplyMessage}"
              </p>
            </div>
          )}

          {/* Teacher in-modal reply form */}
          {isTeacher && isReplying && onReplyToLetter && (
            <form onSubmit={handleSendReply} className="bg-white border-2 border-[#1F453B]/40 rounded-2xl p-4 shadow-sm space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#1F453B] flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-[#F7DE85]" />
                  <span>Compose Your Reply to {letter.studentName}</span>
                </span>
                <button
                  type="button"
                  onClick={() => setIsReplying(false)}
                  className="text-xs text-[#8C7D6F] hover:text-[#2D2823]"
                >
                  Cancel
                </button>
              </div>
              <textarea
                rows={4}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder={`Dear ${letter.studentName}, thank you for your touching letter...`}
                className="w-full p-3 text-xs bg-[#FAF7F0] border border-[#DDD0BF] rounded-xl text-[#2B231D] focus:outline-none focus:ring-2 focus:ring-[#1F453B]/30 font-body-serif"
                required
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsReplying(false)}
                  className="px-3 py-1.5 text-xs font-bold border border-[#DDD0BF] text-[#55493D] rounded-xl hover:bg-[#F2ECE1] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold bg-[#1F453B] hover:bg-[#16332C] text-white rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Send className="w-3 h-3 text-[#F7DE85]" />
                  <span>Send Reply</span>
                </button>
              </div>
            </form>
          )}

          {/* Delete confirmation for admin / mod / teacher */}
          {deleteConfirm && onDeleteLetter && (
            <div className="p-4 rounded-2xl bg-red-50 border-2 border-red-200 text-xs animate-in fade-in">
              <p className="font-bold text-red-800 mb-2">
                Permanently delete this letter by "{letter.studentName}" from the database?
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setDeleteConfirm(false)}
                  className="px-3 py-1.5 rounded-lg border border-red-200 bg-white text-red-700 font-bold hover:bg-red-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onDeleteLetter(letter.id);
                    playChime();
                    onClose();
                  }}
                  className="px-4 py-1.5 rounded-lg bg-red-600 text-white font-bold hover:bg-red-700 shadow-xs cursor-pointer flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Confirm Delete</span>
                </button>
              </div>
            </div>
          )}

          {/* Community Comments & Appreciation Wishes on this Formal Letter */}
          {(() => {
            const letterComments = tributeComments.filter(
              (c) => c.targetId === letter.id && c.targetType === 'letter'
            );

            const renderRoleBadge = (role: UserRole) => {
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

            const handlePostLetterComment = async (e: React.FormEvent) => {
              e.preventDefault();
              setCommentError('');
              const finalAuthor = (user?.name || commentAuthor || '').trim();
              const finalMsg = commentText.trim();
              if (!finalAuthor || finalAuthor.length < 2) {
                setCommentError('Please enter your name or nickname (at least 2 characters).');
                return;
              }
              if (!finalMsg || finalMsg.length < 2) {
                setCommentError('Please write or select a comment suggestion before posting.');
                return;
              }
              if (!onAddTributeComment) return;
              setIsSubmittingComment(true);
              try {
                const res = await onAddTributeComment(letter.id, 'letter', finalAuthor, finalMsg);
                if (res && !res.ok) {
                  setCommentError(res.error || 'Unable to post comment due to safety filter.');
                } else {
                  setCommentText('');
                  playChime();
                }
              } finally {
                setIsSubmittingComment(false);
              }
            };

            return (
              <div className="bg-[#FAF6EE] border border-[#E2D5C3] rounded-2xl p-4 sm:p-5 space-y-3.5">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#1F453B]">
                    <MessageCircle className="w-4 h-4 text-[#CE5A46]" />
                    <span>Community Comments & Wishes ({letterComments.length})</span>
                  </div>
                  <span className="text-[10px] font-medium text-[#7A6C5D]">
                    Students, Teachers & Admins can leave supportive comments
                  </span>
                </div>

                {/* Existing Comments List */}
                {letterComments.length > 0 ? (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {letterComments.map((c) => (
                      <div
                        key={c.id}
                        className="bg-white border border-[#E8DCC8] rounded-xl p-3 text-xs flex items-start justify-between gap-2 shadow-2xs"
                      >
                        <div className="space-y-1 flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-[#231F1D]">{c.authorName}</span>
                            {renderRoleBadge(c.authorRole)}
                            <span className="text-[10px] text-[#8C7D6F] font-mono">
                              •{' '}
                              {new Date(c.createdAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                          <p className="text-[#3E342B] font-body-serif leading-relaxed break-words">
                            {c.message}
                          </p>
                        </div>
                        {(isAdminOrMod || isTeacher) && onDeleteTributeComment && (
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
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-[#7A6C5D] italic bg-white/70 p-3 rounded-xl border border-[#E8DCC8]">
                    No community comments yet — be the first to leave an encouraging message on this letter!
                  </p>
                )}

                {/* One-Click Suggestion Chips for Letter Comments */}
                {onAddTributeComment && (
                  <form onSubmit={handlePostLetterComment} className="space-y-2.5 pt-2 border-t border-[#E5D7C3]">
                    <div>
                      <div className="flex items-center gap-1 text-[11px] font-bold text-[#8C5D39] mb-1.5">
                        <Lightbulb className="w-3.5 h-3.5 text-[#E7C14A]" />
                        <span>One-Click Comment Suggestions (tap to fill):</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {LETTER_COMMENT_SUGGESTIONS.map((chip, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              setCommentText(chip);
                              setCommentError('');
                              playChime();
                            }}
                            className="px-2.5 py-1 rounded-lg bg-white hover:bg-[#F3EADB] border border-[#DDD0BF] text-[11px] text-[#3E342B] font-medium transition-all cursor-pointer"
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

                    <div className="flex flex-col sm:flex-row gap-2">
                      {!user?.name && (
                        <input
                          type="text"
                          value={commentAuthor}
                          onChange={(e) => setCommentAuthor(e.target.value)}
                          placeholder="Your name / nickname *"
                          maxLength={50}
                          className="sm:w-44 px-3 py-2 text-xs bg-white border border-[#DDD0BF] rounded-xl text-[#231F1D] focus:outline-none focus:ring-2 focus:ring-[#1F453B]/30"
                        />
                      )}
                      <input
                        type="text"
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        placeholder={
                          user?.name
                            ? `Comment as ${user.name}...`
                            : 'Write a supportive comment on this letter...'
                        }
                        maxLength={350}
                        className="flex-1 px-3 py-2 text-xs bg-white border border-[#DDD0BF] rounded-xl text-[#231F1D] focus:outline-none focus:ring-2 focus:ring-[#1F453B]/30"
                      />
                      <button
                        type="submit"
                        disabled={isSubmittingComment}
                        className="px-4 py-2 rounded-xl bg-[#1F453B] hover:bg-[#16332C] text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all disabled:opacity-50 shrink-0"
                      >
                        <Send className="w-3 h-3 text-[#F7DE85]" />
                        <span>{isSubmittingComment ? 'Posting...' : 'Post Comment'}</span>
                      </button>
                    </div>
                  </form>
                )}
              </div>
            );
          })()}
        </div>

        {/* Modal Bottom Actions Footer */}
        <div className="mt-4 pt-3 border-t border-[#DECDB8] flex items-center justify-between flex-wrap gap-2 text-xs">
          <div className="flex items-center gap-2">
            {(isAdminOrMod || isTeacher) && onDeleteLetter && !deleteConfirm && (
              <button
                type="button"
                onClick={() => setDeleteConfirm(true)}
                className="px-3 py-1.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 font-bold flex items-center gap-1 cursor-pointer transition-colors"
                title="Delete inappropriate letter"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            )}
            {isTeacher && !isReplying && onReplyToLetter && (
              <button
                type="button"
                onClick={() => setIsReplying(true)}
                className="px-4 py-1.5 rounded-xl bg-[#1F453B] hover:bg-[#16332C] text-white font-bold flex items-center gap-1.5 shadow-xs cursor-pointer transition-all"
              >
                <span>💬</span>
                <span>{letter.teacherReplyMessage ? 'Edit Reply' : 'Reply to Student'}</span>
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-[#F0EAE1] hover:bg-[#E5DDCF] text-[#4A3E33] font-bold transition-colors cursor-pointer"
          >
            Close Letter
          </button>
        </div>
      </div>
    </div>
  );
};
