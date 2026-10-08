import React, { useState, useEffect } from 'react';
import { AnnouncementSettings, AnnouncementComment, UserSession } from '../types';
import {
  Sparkles,
  X,
  PartyPopper,
  Heart,
  Megaphone,
  Award,
  MessageSquare,
  Send,
  Trash2,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { playChime } from '../utils/audio';
import { detectInappropriateContent } from '../utils/contentSensor';

interface AnnouncementBroadcastViewProps {
  announcement: AnnouncementSettings;
  user: UserSession | null;
  onOpenAdminAnnouncementTab?: () => void;
  onAddComment?: (comment: AnnouncementComment) => void;
  onDeleteComment?: (commentId: string) => void;
}

export const AnnouncementBroadcastView: React.FC<AnnouncementBroadcastViewProps> = ({
  announcement,
  user,
  onOpenAdminAnnouncementTab,
  onAddComment,
  onDeleteComment,
}) => {
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [commentAuthor, setCommentAuthor] = useState(user?.name || '');
  const [commentText, setCommentText] = useState('');
  const [commentError, setCommentError] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  useEffect(() => {
    if (user?.name && !user.name.startsWith('@')) {
      setCommentAuthor(user.name);
    }
  }, [user]);

  const fireCelebrationConfetti = () => {
    playChime();
    confetti({
      particleCount: 95,
      spread: 85,
      origin: { y: 0.6 },
      colors: ['#F7DE85', '#CE5A46', '#1F453B', '#FDA4AF', '#6EE7B7', '#FBBF24'],
    });
  };

  // Automatically open the pop-up greeting card when a new announcement version is broadcasted
  useEffect(() => {
    if (!announcement.enabled) {
      setIsCardModalOpen(false);
      return;
    }

    const storageKey = 'teacher_day_seen_announcement_ts';
    const lastSeenTs = Number(localStorage.getItem(storageKey) || '0');

    if (announcement.updatedAt > lastSeenTs) {
      if (announcement.showPopupModal) {
        setIsCardModalOpen(true);
      }
      if (announcement.triggerConfetti) {
        setTimeout(() => {
          confetti({
            particleCount: 80,
            spread: 80,
            origin: { y: 0.55 },
            colors: ['#F7DE85', '#CE5A46', '#1F453B', '#FDA4AF', '#FBBF24'],
          });
        }, 250);
      }
      try {
        localStorage.setItem(storageKey, String(announcement.updatedAt));
      } catch {
        // ignore storage errors
      }
    }
  }, [announcement.enabled, announcement.updatedAt, announcement.showPopupModal, announcement.triggerConfetti]);

  if (!announcement.enabled) return null;

  const comments = announcement.comments || [];
  const canModerateComments =
    user?.role === 'admin' || user?.role === 'moderator' || user?.role === 'teacher';

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    setCommentError('');

    const rawAuthor = (commentAuthor || user?.name || '').trim();
    const rawMsg = commentText.trim();

    if (!rawAuthor) {
      setCommentError('Please enter your name before posting a comment.');
      return;
    }
    if (!rawMsg) {
      setCommentError('Please write a celebratory comment or greeting.');
      return;
    }

    // Client-side XSS & script guard
    if (/<\s*script|javascript:|onerror\s*=|onload\s*=/i.test(rawAuthor + ' ' + rawMsg)) {
      setCommentError('Security notice: Script tags or HTML code are not allowed.');
      return;
    }

    // Client-side profanity sensor check
    const authorCheck = detectInappropriateContent(rawAuthor);
    const msgCheck = detectInappropriateContent(rawMsg);
    if (authorCheck.isInappropriate || msgCheck.isInappropriate) {
      setCommentError(
        'Comment blocked by security filter: Please use respectful and celebratory language.'
      );
      return;
    }

    setIsSubmittingComment(true);
    let finalAuthor = rawAuthor.replace(/<[^>]+>/g, '').slice(0, 80);
    let finalMsg = rawMsg.replace(/<[^>]+>/g, '').slice(0, 500);

    try {
      const res = await fetch('/api/moderate/comment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          authorName: finalAuthor,
          message: finalMsg,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.status === 'blocked') {
        setCommentError(
          data.error || 'Comment blocked: Please keep announcement comments respectful.'
        );
        setIsSubmittingComment(false);
        return;
      }
      if (data.sanitizedAuthor) finalAuthor = data.sanitizedAuthor;
      if (data.sanitizedMessage) finalMsg = data.sanitizedMessage;
    } catch {
      // Offline fallback uses client-side sanitization already verified above
    }

    const newComment: AnnouncementComment = {
      id: `ann-comment-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      authorName: finalAuthor,
      authorRole: user?.role || 'student',
      message: finalMsg,
      createdAt: Date.now(),
    };

    if (onAddComment) {
      onAddComment(newComment);
    }

    playChime();
    setCommentText('');
    setIsSubmittingComment(false);
  };

  const bannerThemeClasses: Record<
    AnnouncementSettings['theme'],
    { bar: string; badge: string; button: string; subtext: string }
  > = {
    gold: {
      bar: 'bg-gradient-to-r from-[#FFF3C4] via-[#FDE68A] to-[#FCE79C] text-[#231F1D] border-b-2 border-[#D97706]/30',
      badge: 'bg-[#1F453B] text-[#F7DE85]',
      button: 'bg-[#1F453B] hover:bg-[#16332C] text-white',
      subtext: 'text-[#5C4938]',
    },
    emerald: {
      bar: 'bg-gradient-to-r from-[#16332C] via-[#1F453B] to-[#234F43] text-[#FAF6EE] border-b-2 border-[#F7DE85]/40',
      badge: 'bg-[#F7DE85] text-[#1F453B]',
      button: 'bg-[#F7DE85] hover:bg-[#F5D061] text-[#1F453B]',
      subtext: 'text-[#D7F3E3]',
    },
    rose: {
      bar: 'bg-gradient-to-r from-[#CE5A46] via-[#B84A39] to-[#D96B56] text-white border-b-2 border-[#FCECEB]/40',
      badge: 'bg-[#FFFDF9] text-[#B84A39]',
      button: 'bg-[#FFFDF9] hover:bg-[#FAF6EE] text-[#B84A39]',
      subtext: 'text-[#FCECEB]',
    },
    parchment: {
      bar: 'bg-[#FAF6EE] text-[#231F1D] border-b-2 border-[#DECDB8]',
      badge: 'bg-[#CE5A46] text-white',
      button: 'bg-[#1F453B] hover:bg-[#16332C] text-white',
      subtext: 'text-[#6B5C4D]',
    },
  };

  const cardThemeClasses: Record<
    AnnouncementSettings['theme'],
    { cardBg: string; headerBadge: string; accentBorder: string; titleColor: string; bodyBg: string }
  > = {
    gold: {
      cardBg: 'bg-gradient-to-b from-[#FFFDF7] to-[#FEF6D8]',
      headerBadge: 'bg-[#1F453B] text-[#F7DE85]',
      accentBorder: 'border-[#E6B84D]',
      titleColor: 'text-[#1F453B]',
      bodyBg: 'bg-white/90 border-[#E8D59E]',
    },
    emerald: {
      cardBg: 'bg-gradient-to-b from-[#1F453B] to-[#16332C] text-white',
      headerBadge: 'bg-[#F7DE85] text-[#1F453B]',
      accentBorder: 'border-[#F7DE85]/50',
      titleColor: 'text-[#F7DE85]',
      bodyBg: 'bg-white/10 border-white/20 text-[#FAF6EE]',
    },
    rose: {
      cardBg: 'bg-gradient-to-b from-[#FFF9F8] to-[#FCECEB]',
      headerBadge: 'bg-[#CE5A46] text-white',
      accentBorder: 'border-[#E5A398]',
      titleColor: 'text-[#9E3B2B]',
      bodyBg: 'bg-white/90 border-[#F2C9C2]',
    },
    parchment: {
      cardBg: 'bg-[#FFFDF9]',
      headerBadge: 'bg-[#1F453B] text-[#F7DE85]',
      accentBorder: 'border-[#DECDB8]',
      titleColor: 'text-[#231F1D]',
      bodyBg: 'bg-[#FAF5EC] border-[#E5D7C3]',
    },
  };

  const currentBanner = bannerThemeClasses[announcement.theme] || bannerThemeClasses.gold;
  const currentCard = cardThemeClasses[announcement.theme] || cardThemeClasses.gold;
  const isEmeraldCard = announcement.theme === 'emerald';

  const getRoleBadge = (role: AnnouncementComment['authorRole']) => {
    if (role === 'admin') {
      return (
        <span className="px-2 py-0.5 rounded-full bg-amber-400 text-amber-950 text-[9px] font-black uppercase tracking-wider">
          ★ Admin
        </span>
      );
    }
    if (role === 'moderator') {
      return (
        <span className="px-2 py-0.5 rounded-full bg-emerald-400 text-emerald-950 text-[9px] font-black uppercase tracking-wider">
          🛡️ Moderator
        </span>
      );
    }
    if (role === 'teacher') {
      return (
        <span className="px-2 py-0.5 rounded-full bg-[#CE5A46] text-white text-[9px] font-bold uppercase tracking-wider">
          🧑‍🏫 Teacher
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded-full bg-black/10 text-current text-[9px] font-semibold uppercase tracking-wider">
        🎓 Student
      </span>
    );
  };

  return (
    <>
      {/* Celebratory Top Website Banner */}
      <div className={`relative z-40 px-4 py-2.5 shadow-sm transition-all ${currentBanner.bar}`}>
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0 shadow-2xs ${currentBanner.badge}`}
            >
              <Megaphone className="w-3 h-3" />
              <span>Official Celebration Announcement</span>
            </span>

            <div className="min-w-0 flex-1 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <span className="font-heading font-bold text-xs sm:text-sm truncate">
                {announcement.title}
              </span>
              <span className={`text-xs truncate max-w-xl hidden md:inline ${currentBanner.subtext}`}>
                — {announcement.message}
              </span>
              {announcement.senderName && (
                <span className={`text-[11px] font-bold italic shrink-0 ${currentBanner.subtext}`}>
                  (From: {announcement.senderName})
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                playChime();
                setIsCardModalOpen(true);
              }}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer flex items-center gap-1.5 hover:scale-105 active:scale-95 ${currentBanner.button}`}
            >
              <PartyPopper className="w-3.5 h-3.5" />
              <span>Open Announcement</span>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full bg-black/15 text-[10px]">
                💬 {comments.length}
              </span>
            </button>

            {(user?.role === 'admin' || user?.role === 'moderator') && onOpenAdminAnnouncementTab && (
              <button
                type="button"
                onClick={onOpenAdminAnnouncementTab}
                className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-black/15 hover:bg-black/25 transition-colors cursor-pointer"
                title="Edit or Turn Off Announcement in Admin Console"
              >
                Edit
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Celebratory Pop-Up Greeting Card & Comment Section Modal */}
      {isCardModalOpen && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-5 bg-black/65 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setIsCardModalOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`relative w-full max-w-2xl max-h-[92vh] overflow-y-auto border-2 rounded-3xl shadow-2xl p-5 sm:p-8 animate-in zoom-in-95 duration-200 ${currentCard.cardBg} ${currentCard.accentBorder}`}
          >
            {/* Decorative Top Washi Tape */}
            <div className="washi-tape" />

            {/* Close Button */}
            <button
              type="button"
              onClick={() => setIsCardModalOpen(false)}
              className={`absolute top-4 right-4 p-2 rounded-full transition-colors cursor-pointer ${
                isEmeraldCard
                  ? 'text-white/75 hover:text-white hover:bg-white/10'
                  : 'text-[#7A6C5D] hover:text-[#231F1D] hover:bg-black/5'
              }`}
              aria-label="Close Announcement Card"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Revised Header Badge: OFFICIAL CELEBRATION ANNOUNCEMENT */}
            <div className="text-center mb-3">
              <span
                className={`inline-flex items-center gap-1.5 px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-xs ${currentCard.headerBadge}`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Official Celebration Announcement</span>
              </span>
            </div>

            {/* Decorative Seal Icon */}
            <div className="w-12 h-12 rounded-2xl bg-[#CE5A46] text-white flex items-center justify-center mx-auto mb-3 shadow-md">
              <Award className="w-6 h-6 text-[#F7DE85]" />
            </div>

            {/* Announcement Title */}
            <h2
              className={`font-heading text-xl sm:text-3xl font-bold text-center leading-tight mb-3 ${currentCard.titleColor}`}
            >
              {announcement.title}
            </h2>

            {/* Announcement Full Message Body */}
            <div className={`p-4 sm:p-5 rounded-2xl border mb-4 shadow-inner ${currentCard.bodyBg}`}>
              <p
                className={`font-body-serif text-sm sm:text-base leading-relaxed whitespace-pre-wrap text-center ${
                  isEmeraldCard ? 'text-[#FAF6EE]' : 'text-[#2D251E]'
                }`}
              >
                {announcement.message}
              </p>
            </div>

            {/* Sender Signature & Celebrate Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pb-4 mb-4 border-b border-current/15">
              <div className="text-center sm:text-left">
                <div
                  className={`text-[10px] font-bold uppercase tracking-wider ${
                    isEmeraldCard ? 'text-[#A4D5C5]' : 'text-[#8C7B68]'
                  }`}
                >
                  Warmest Wishes From
                </div>
                <div
                  className={`font-heading font-bold text-sm sm:text-base flex items-center justify-center sm:justify-start gap-1.5 ${
                    isEmeraldCard ? 'text-[#F7DE85]' : 'text-[#1F453B]'
                  }`}
                >
                  <Heart className="w-4 h-4 fill-[#CE5A46] text-[#CE5A46] shrink-0" />
                  <span>{announcement.senderName || 'School Administration & Student Council'}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-center">
                <button
                  type="button"
                  onClick={fireCelebrationConfetti}
                  className="px-4 py-2 rounded-xl bg-[#CE5A46] hover:bg-[#B84A39] text-white text-xs font-bold shadow-sm transition-all cursor-pointer flex items-center gap-1.5 hover:scale-105 active:scale-95"
                >
                  <PartyPopper className="w-4 h-4 text-[#F7DE85]" />
                  <span>Celebrate 🎉</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsCardModalOpen(false)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                    isEmeraldCard
                      ? 'bg-white text-[#1F453B] border-white hover:bg-[#FAF6EE]'
                      : 'bg-[#1F453B] text-white border-[#1F453B] hover:bg-[#16332C]'
                  }`}
                >
                  Continue to Wall
                </button>
              </div>
            </div>

            {/* COMMUNITY ANNOUNCEMENT COMMENT SECTION */}
            <div
              className={`rounded-2xl p-4 border ${
                isEmeraldCard
                  ? 'bg-black/20 border-white/15 text-[#FAF6EE]'
                  : 'bg-[#FAF5EC] border-[#E5D7C3] text-[#2D251E]'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <MessageSquare
                    className={`w-4 h-4 ${isEmeraldCard ? 'text-[#F7DE85]' : 'text-[#1F453B]'}`}
                  />
                  <h3 className="font-heading font-bold text-sm sm:text-base">
                    Celebration Comments ({comments.length})
                  </h3>
                </div>
                <span
                  className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    isEmeraldCard
                      ? 'bg-emerald-900/60 text-[#A4D5C5] border border-emerald-400/30'
                      : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  }`}
                >
                  <ShieldCheck className="w-3 h-3" />
                  <span>Protected & Moderated</span>
                </span>
              </div>

              {/* Comment Input Form */}
              <form onSubmit={handlePostComment} className="space-y-2.5 mb-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={commentAuthor}
                    onChange={(e) => setCommentAuthor(e.target.value)}
                    placeholder="Your Name / Grade or Role..."
                    maxLength={60}
                    className={`px-3 py-2 rounded-xl text-xs border focus:outline-none ${
                      isEmeraldCard
                        ? 'bg-white/10 border-white/25 text-white placeholder:text-white/50 focus:border-[#F7DE85]'
                        : 'bg-white border-[#DDD0BF] text-[#231F1D] placeholder:text-[#8C7B68] focus:border-[#1F453B]'
                    }`}
                  />
                  <div className="sm:col-span-2 flex gap-2">
                    <input
                      type="text"
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder="Write a Happy Teacher's Day comment..."
                      maxLength={350}
                      className={`flex-1 px-3 py-2 rounded-xl text-xs border focus:outline-none ${
                        isEmeraldCard
                          ? 'bg-white/10 border-white/25 text-white placeholder:text-white/50 focus:border-[#F7DE85]'
                          : 'bg-white border-[#DDD0BF] text-[#231F1D] placeholder:text-[#8C7B68] focus:border-[#1F453B]'
                      }`}
                    />
                    <button
                      type="submit"
                      disabled={isSubmittingComment}
                      className="px-3.5 py-2 rounded-xl bg-[#CE5A46] hover:bg-[#B84A39] text-white text-xs font-bold shadow-xs transition-all cursor-pointer flex items-center gap-1.5 shrink-0 disabled:opacity-50"
                    >
                      <Send className="w-3.5 h-3.5 text-[#F7DE85]" />
                      <span>{isSubmittingComment ? 'Posting...' : 'Comment'}</span>
                    </button>
                  </div>
                </div>

                {commentError && (
                  <div className="p-2 rounded-xl bg-red-500/20 border border-red-400/50 text-xs font-semibold flex items-center gap-1.5 text-red-200">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-300" />
                    <span className={isEmeraldCard ? 'text-red-100' : 'text-red-800'}>
                      {commentError}
                    </span>
                  </div>
                )}
              </form>

              {/* Comments Feed */}
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {comments.length === 0 ? (
                  <p
                    className={`text-xs italic text-center py-3 ${
                      isEmeraldCard ? 'text-white/60' : 'text-[#7A6C5D]'
                    }`}
                  >
                    Be the first to leave a celebratory comment on this announcement! 🎉
                  </p>
                ) : (
                  comments.map((c) => (
                    <div
                      key={c.id}
                      className={`p-2.5 rounded-xl border flex items-start justify-between gap-2 text-xs ${
                        isEmeraldCard
                          ? 'bg-white/10 border-white/15 text-[#FAF6EE]'
                          : 'bg-white border-[#E5D7C3] text-[#2D251E]'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                          <span className="font-bold truncate">{c.authorName}</span>
                          {getRoleBadge(c.authorRole)}
                        </div>
                        <p className="font-body-serif leading-snug break-words">{c.message}</p>
                      </div>

                      {canModerateComments && onDeleteComment && (
                        <button
                          type="button"
                          onClick={() => onDeleteComment(c.id)}
                          title="Delete Comment (Admin/Teacher Moderation)"
                          className="p-1.5 rounded-lg text-red-400 hover:text-white hover:bg-red-600 transition-colors cursor-pointer shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
