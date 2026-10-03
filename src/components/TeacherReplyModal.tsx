import React, { useState } from 'react';
import { UserSession, StudentNote } from '../types';
import { X, Send, Heart, Sparkles, AlertTriangle } from 'lucide-react';
import confetti from 'canvas-confetti';
import { playChime } from '../utils/audio';
import { detectInappropriateContent } from '../utils/contentSensor';

interface TeacherReplyModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserSession;
  onPostReply: (note: StudentNote) => void;
}

export const TeacherReplyModal: React.FC<TeacherReplyModalProps> = ({
  isOpen,
  onClose,
  user,
  onPostReply,
}) => {
  const [replyMessage, setReplyMessage] = useState(
    'Thank you so much to all my wonderful students! Reading your kind words and seeing your smiles today fills my heart with joy. Teaching you is an absolute privilege. Keep dreaming big and asking questions!'
  );
  const [warning, setWarning] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setWarning('');
    if (!replyMessage.trim()) return;

    const sensorCheck = detectInappropriateContent(replyMessage);
    if (sensorCheck.isInappropriate) {
      setWarning(`⚠️ Positivity Sensor: Inappropriate words detected (${sensorCheck.flaggedWords.join(', ')}). Please keep replies uplifting for students.`);
      return;
    }

    const teacherNote: StudentNote = {
      id: `teacher-reply-${Date.now()}`,
      studentName: user.name,
      grade: user.subject ? `${user.subject} Teacher` : 'Teacher',
      subject: "TEACHER'S MESSAGE TO THE CLASS",
      message: `"${replyMessage.trim().replace(/^"|"$/g, '')}"`,
      color: 'mint',
      likes: 99,
      isTeacherReply: true,
      createdAt: Date.now(),
    };

    onPostReply(teacherNote);
    playChime();
    confetti({
      particleCount: 90,
      spread: 75,
      origin: { y: 0.6 },
      colors: ['#D7F3E3', '#1F453B', '#FDF2B5', '#CE5A46'],
    });
    onClose();

    // Scroll to gratitude wall
    const wallEl = document.getElementById('wall-section');
    if (wallEl) {
      wallEl.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-xs no-print">
      <div className="relative w-full max-w-md bg-[#FFFDF9] border border-[#EADBCC] rounded-3xl shadow-xl p-6 sm:p-8 animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-[#8A7D70] hover:text-[#231F1C] p-1.5 rounded-full hover:bg-[#F3EDE2] transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#D7F3E3] border border-[#B2E7C6] text-[#246B46] text-xs font-bold uppercase tracking-wider mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Teacher's Note of Appreciation</span>
          </div>
          <h3 className="font-heading text-2xl font-bold text-[#231F1D]">
            Reply to Your Students
          </h3>
          <p className="font-body-serif text-xs text-[#6E6153] mt-1">
            Pin a response card from {user.name} directly onto the class Gratitude Wall.
          </p>
        </div>

        {warning && (
          <div className="mb-4 p-3 bg-[#FFF8E6] border border-[#E7C14A] rounded-xl text-xs font-semibold text-[#805000] flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-[#B87A00]" />
            <span>{warning}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#352D26] mb-1.5">
              Your message to the class
            </label>
            <textarea
              rows={4}
              value={replyMessage}
              onChange={(e) => setReplyMessage(e.target.value)}
              className="w-full px-4 py-3 text-sm bg-white border border-[#DDD0BF] rounded-xl text-[#2B2520] focus:outline-none focus:ring-2 focus:ring-[#246B46]/30 focus:border-[#246B46] font-body-serif"
            />
          </div>

          <div className="p-3 bg-[#EAF8F0] border border-[#C5ECD6] rounded-xl text-xs text-[#285E40] flex items-center gap-2">
            <Heart className="w-4 h-4 text-[#CE5A46] shrink-0 fill-current" />
            <span>This special note will be pinned at the top of the Gratitude Wall with a verified Teacher badge!</span>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-[#665B50] hover:bg-[#F2ECE0] rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold text-white bg-[#1F453B] hover:bg-[#16332C] rounded-xl shadow-xs transition-all hover:scale-102 cursor-pointer flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Pin Teacher's Reply</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
