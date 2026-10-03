import React from 'react';
import { UserSession, StudentNote } from '../types';
import { X, Sparkles, Heart, MessageSquare, PenLine, GraduationCap, Award } from 'lucide-react';
import confetti from 'canvas-confetti';

interface TeacherIntroModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserSession;
  notes: StudentNote[];
  onWriteReply: () => void;
  onViewSubjectNotes: (subject: string) => void;
}

export const TeacherIntroModal: React.FC<TeacherIntroModalProps> = ({
  isOpen,
  onClose,
  user,
  notes,
  onWriteReply,
  onViewSubjectNotes,
}) => {
  React.useEffect(() => {
    if (isOpen) {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#CE5A46', '#F59E0B', '#10B981', '#6366F1'],
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const teacherSubject = user.subject || '';
  const myNotes = notes.filter((n) => {
    const matchSubj = teacherSubject && n.subject.toLowerCase() === teacherSubject.toLowerCase();
    const matchName = user.name && n.message.toLowerCase().includes(user.name.toLowerCase());
    return matchSubj || matchName;
  });

  const totalHearts = myNotes.reduce((acc, curr) => acc + (curr.likes || 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-[#FFFDF9] border-2 border-[#E8DCC8] rounded-3xl p-6 sm:p-8 shadow-2xl text-center">
        {/* Top Washi Tape */}
        <div className="washi-tape" />

        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-black/5 text-[#6D5E4F] hover:text-[#26211D] transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Celebratory Icon */}
        <div className="w-16 h-16 rounded-3xl bg-[#FFF0F3] border-2 border-[#FFD6DF] text-[#CE5A46] flex items-center justify-center mx-auto mb-4 shadow-sm animate-gentle-float">
          <Award className="w-8 h-8" />
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1F453B]/10 border border-[#1F453B]/20 text-xs font-bold text-[#1F453B] mb-2">
          <Sparkles className="w-3.5 h-3.5 text-[#F59E0B]" />
          <span>Happy Teacher's Day, {user.name}!</span>
        </div>

        <h2 className="text-2xl sm:text-3xl font-black text-[#2D2823] mb-2">
          Welcome to Your Tribute Wall
        </h2>

        <p className="text-sm text-[#5A4F43] max-w-md mx-auto mb-6">
          Your students have been writing heartfelt notes, letters, and gratitude for your {user.subject ? `dedication in ${user.subject}` : 'mentorship'}.
        </p>

        {/* Stats Pill Card */}
        <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-[#FAF5EB] border border-[#EADECC] mb-6">
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-1.5 text-lg font-black text-[#1F453B]">
              <MessageSquare className="w-5 h-5" />
              <span>{myNotes.length}</span>
            </div>
            <span className="text-xs font-bold text-[#7A6A58]">Student Notes</span>
          </div>

          <div className="flex flex-col items-center">
            <div className="flex items-center gap-1.5 text-lg font-black text-[#CE5A46]">
              <Heart className="w-5 h-5 fill-current" />
              <span>{totalHearts}</span>
            </div>
            <span className="text-xs font-bold text-[#7A6A58]">Hearts & Likes</span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => {
              onViewSubjectNotes(teacherSubject);
              onClose();
            }}
            className="flex-1 py-3 px-4 rounded-xl bg-[#1F453B] hover:bg-[#16332C] text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <GraduationCap className="w-4 h-4 text-[#F7DE85]" />
            <span>Read My Subject Notes</span>
          </button>
          <button
            onClick={() => {
              onClose();
              onWriteReply();
            }}
            className="flex-1 py-3 px-4 rounded-xl bg-[#CE5A46] hover:bg-[#B84E3C] text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <PenLine className="w-4 h-4" />
            <span>Write Appreciation Reply</span>
          </button>
        </div>
      </div>
    </div>
  );
};
