import React, { useState } from 'react';
import { AuthorizedTeacher, UserSession } from '../types';
import {
  X,
  GraduationCap,
  AlertCircle,
  CheckCircle2,
  Send,
  LogIn,
  Eye,
  EyeOff,
  ArrowLeft,
} from 'lucide-react';
import { ALL_CURRICULUM_OPTIONS } from '../data/curriculum';
import { playChime } from '../utils/audio';

interface TeacherLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  authorizedTeachers: AuthorizedTeacher[];
  onLogin: (session: UserSession) => void;
  onRequestAccess: (req: Omit<AuthorizedTeacher, 'id' | 'status'>) => void;
}

export const TeacherLoginModal: React.FC<TeacherLoginModalProps> = ({
  isOpen,
  onClose,
  authorizedTeachers,
  onLogin,
  onRequestAccess,
}) => {
  const [mode, setMode] = useState<'login' | 'request'>('login');
  const [teacherNameInput, setTeacherNameInput] = useState('');
  const [accessCodeInput, setAccessCodeInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Request Access state
  const [reqName, setReqName] = useState('');
  const [reqSubject, setReqSubject] = useState(ALL_CURRICULUM_OPTIONS[0]?.name || 'Mathematics');
  const [reqCode, setReqCode] = useState('');
  const [requestSubmitted, setRequestSubmitted] = useState(false);

  if (!isOpen) return null;

  const approvedTeachers = authorizedTeachers.filter((t) => t.status === 'approved');

  const normalize = (str: string) =>
    str
      .toLowerCase()
      .replace(/^(mr|ms|mrs|prof|dr|ma'am|maam|sir)\.?\s+/i, '')
      .replace(/[^a-z0-9]/g, '')
      .trim();

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const enteredName = teacherNameInput.trim();
    const enteredCode = accessCodeInput.trim().toUpperCase();

    if (!enteredName) {
      setErrorMsg('Please enter your teacher name.');
      return;
    }
    if (!enteredCode) {
      setErrorMsg('Please enter your teacher access code.');
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);

      const normEntered = normalize(enteredName);
      const rawLower = enteredName.toLowerCase();

      // Find candidate teachers matching the name
      const matchedTeacher = approvedTeachers.find((t) => {
        const normTarget = normalize(t.name);
        const targetLower = t.name.toLowerCase();

        const nameMatch =
          targetLower === rawLower ||
          targetLower.includes(rawLower) ||
          rawLower.includes(targetLower) ||
          normTarget === normEntered ||
          normTarget.includes(normEntered) ||
          normEntered.includes(normTarget);

        const codeMatch = t.accessCode.trim().toUpperCase() === enteredCode;
        return nameMatch && codeMatch;
      });

      if (matchedTeacher) {
        playChime();
        onLogin({
          role: 'teacher',
          name: matchedTeacher.name,
          subject: matchedTeacher.subject,
          id: matchedTeacher.id,
        });
        onClose();
        return;
      }

      // Check if code was correct for any approved teacher, but name was slightly mismatched
      const codeMatchedOnly = approvedTeachers.find(
        (t) => t.accessCode.trim().toUpperCase() === enteredCode
      );

      if (codeMatchedOnly) {
        // Log in with the verified profile
        playChime();
        onLogin({
          role: 'teacher',
          name: codeMatchedOnly.name,
          subject: codeMatchedOnly.subject,
          id: codeMatchedOnly.id,
        });
        onClose();
        return;
      }

      setErrorMsg('Invalid Teacher Name or Access Code. Please verify your details or request access from the Admin.');
    }, 280);
  };

  const handleRequestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!reqName.trim()) {
      setErrorMsg('Please enter your full name.');
      return;
    }
    if (!reqCode.trim()) {
      setErrorMsg('Please provide a preferred access code.');
      return;
    }

    onRequestAccess({
      name: reqName.trim(),
      subject: reqSubject,
      accessCode: reqCode.trim().toUpperCase(),
    });

    playChime();
    setRequestSubmitted(true);
    setTimeout(() => {
      setRequestSubmitted(false);
      setMode('login');
      setTeacherNameInput(reqName.trim());
      setAccessCodeInput(reqCode.trim().toUpperCase());
      setReqName('');
      setReqCode('');
    }, 2200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-sm sm:max-w-md bg-[#FFFDF9] border-2 border-[#E8DCC8] rounded-3xl p-6 sm:p-8 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-black/5 text-[#6D5E4F] hover:text-[#26211D] transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {mode === 'login' ? (
          <div>
            {/* Top Pink Bubble with Graduation Cap Icon matching pic reference */}
            <div className="w-14 h-14 rounded-full bg-[#FFEAE8] border border-[#FFD0CC] flex items-center justify-center mx-auto mb-3.5 shadow-2xs">
              <GraduationCap className="w-7 h-7 text-[#CE5A46]" />
            </div>

            {/* Title matching pic reference */}
            <h2 className="text-2xl font-black text-[#2D2823] text-center mb-1.5 font-heading">
              Teacher Sign In
            </h2>

            {/* Subtitle matching pic reference */}
            <p className="text-xs sm:text-[13px] text-[#6B5D4E] text-center mb-6 max-w-xs mx-auto leading-relaxed">
              Access is granted by the school administrator. Sign in to view your tribute and leave notes for your class.
            </p>

            {errorMsg && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleLoginSubmit} className="space-y-4">
              {/* Field 1: Teacher Name */}
              <div>
                <label className="block text-xs sm:text-sm font-bold text-[#2D2823] mb-1.5">
                  Teacher Name
                </label>
                <input
                  type="text"
                  list="faculty-names-list"
                  value={teacherNameInput}
                  onChange={(e) => setTeacherNameInput(e.target.value)}
                  placeholder="e.g. Ms. Rivera or Mr. Harrison"
                  className="w-full px-4 py-3 rounded-xl border-2 border-[#E0D3C1] bg-white text-sm font-semibold text-[#2D2823] placeholder-[#A08F7C] focus:border-[#CE5A46] focus:outline-none transition-colors"
                  required
                />
                <datalist id="faculty-names-list">
                  {approvedTeachers.map((t) => (
                    <option key={t.id} value={t.name}>
                      {t.subject ? `${t.name} (${t.subject})` : t.name}
                    </option>
                  ))}
                </datalist>
              </div>

              {/* Field 2: Teacher Access Code */}
              <div>
                <label className="block text-xs sm:text-sm font-bold text-[#2D2823] mb-1.5">
                  Teacher Access Code
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={accessCodeInput}
                    onChange={(e) => setAccessCodeInput(e.target.value)}
                    placeholder="Enter access code granted by admin"
                    className="w-full px-4 pr-11 py-3 rounded-xl border-2 border-[#E0D3C1] bg-white text-sm font-semibold text-[#2D2823] placeholder-[#A08F7C] focus:border-[#CE5A46] focus:outline-none transition-colors font-mono"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8C7B68] hover:text-[#2D2823] cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Terracotta Action Button matching pic reference: →] Sign In as Teacher */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-4 py-3.5 rounded-2xl bg-[#CE5A46] hover:bg-[#B84E3C] text-white font-bold text-sm sm:text-base shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <LogIn className="w-4 h-4" />
                <span>{isLoading ? 'Signing In...' : 'Sign In as Teacher'}</span>
              </button>
            </form>

            {/* Bottom Separator & Link matching pic reference */}
            <div className="my-5 border-t border-[#EADBCC]" />

            <button
              type="button"
              onClick={() => {
                setMode('request');
                setErrorMsg('');
              }}
              className="text-xs sm:text-[13px] font-bold text-[#6B5D4E] hover:text-[#2D2823] underline transition-colors cursor-pointer text-center block mx-auto"
            >
              New teacher? Request access from Admin →
            </button>
          </div>
        ) : requestSubmitted ? (
          <div className="py-8 text-center space-y-3 animate-in fade-in">
            <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto animate-bounce" />
            <h3 className="text-lg font-bold text-[#2D2823]">Request Forwarded!</h3>
            <p className="text-xs text-[#6B5D4E] leading-relaxed">
              Your access request has been sent to the Head Administrator for immediate approval.
            </p>
          </div>
        ) : (
          <form onSubmit={handleRequestSubmit} className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setErrorMsg('');
                }}
                className="text-xs font-bold text-[#CE5A46] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Teacher Sign In</span>
              </button>
            </div>

            <div className="text-center mb-4">
              <h3 className="text-xl font-black text-[#2D2823]">
                Request Faculty Access
              </h3>
              <p className="text-xs text-[#6B5D4E] mt-0.5">
                Submit your name and subject to the Head Administrator
              </p>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div>
              <label className="block text-xs uppercase font-bold text-[#57493A] tracking-wider mb-1">
                Teacher Name & Title
              </label>
              <input
                type="text"
                value={reqName}
                onChange={(e) => setReqName(e.target.value)}
                placeholder="e.g. Ms. Rivera or Mr. Harrison"
                className="w-full px-3.5 py-2.5 rounded-xl border-2 border-[#D8C7B0] bg-white text-sm font-semibold text-[#2D2823] placeholder-[#A08F7C] focus:border-[#CE5A46] focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs uppercase font-bold text-[#57493A] tracking-wider mb-1">
                Department / Subject
              </label>
              <select
                value={reqSubject}
                onChange={(e) => setReqSubject(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border-2 border-[#D8C7B0] bg-white text-sm font-semibold text-[#2D2823] focus:border-[#CE5A46] focus:outline-none"
              >
                {ALL_CURRICULUM_OPTIONS.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.icon} {c.name} ({c.category})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs uppercase font-bold text-[#57493A] tracking-wider mb-1">
                Preferred Access Code
              </label>
              <input
                type="text"
                value={reqCode}
                onChange={(e) => setReqCode(e.target.value)}
                placeholder="e.g. TEACH-2026"
                className="w-full px-3.5 py-2.5 rounded-xl border-2 border-[#D8C7B0] bg-white text-sm font-semibold text-[#2D2823] placeholder-[#A08F7C] focus:border-[#CE5A46] focus:outline-none font-mono"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full mt-2 py-3 rounded-2xl bg-[#CE5A46] hover:bg-[#B84E3C] text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>Submit Request to Admin</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
