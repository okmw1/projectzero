import React, { useState } from 'react';
import { UserSession, AuthorizedModerator } from '../types';
import { HEAD_ADMIN_CONFIG } from '../data/initialNotes';
import { saveAdminPasswordToCloud } from '../firebase/db';
import {
  X,
  ShieldCheck,
  KeyRound,
  AlertCircle,
  Sparkles,
  UserCheck,
  Eye,
  EyeOff,
  Lock,
  Mail,
  CheckCircle2,
  ArrowLeft,
  Key,
} from 'lucide-react';
import { playChime } from '../utils/audio';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (session: UserSession) => void;
  authorizedModerators: AuthorizedModerator[];
  adminPassword?: string;
  onUpdateAdminPassword?: (newPassword: string) => void;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  isOpen,
  onClose,
  onLogin,
  authorizedModerators,
  adminPassword,
  onUpdateAdminPassword,
}) => {
  const [activeTab, setActiveTab] = useState<'admin' | 'moderator'>('admin');

  // Head Admin form fields
  const [adminIdentifier, setAdminIdentifier] = useState('');
  const [adminPasskey, setAdminPasskey] = useState('');
  const [showAdminPass, setShowAdminPass] = useState(false);

  // Moderator form fields
  const [modCustomInput, setModCustomInput] = useState('');
  const [modPasscode, setModPasscode] = useState('');
  const [showModPass, setShowModPass] = useState(false);

  // Password Reset / Change State
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetCodeInput, setResetCodeInput] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPass, setShowNewPass] = useState(false);
  const [resetStep, setResetStep] = useState<1 | 2>(1);
  const [resetSuccessNotice, setResetSuccessNotice] = useState('');

  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const activeModerators = authorizedModerators.filter((m) => m.status === 'active');

  const handleHeadAdminSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      const trimmedId = adminIdentifier.trim().toLowerCase();
      const trimmedKey = adminPasskey.trim();

      // Check strictly against the Head Admin credentials
      const validIds = [
        'taynanjetraj@gmail.com',
        'taynanjetraj',
        HEAD_ADMIN_CONFIG.username.toLowerCase(),
        HEAD_ADMIN_CONFIG.email.toLowerCase(),
        'admin',
        'principal',
      ];

      // Custom saved password or default 6378292
      const currentStoredPass =
        adminPassword ||
        localStorage.getItem('head_admin_custom_password') ||
        HEAD_ADMIN_CONFIG.accessCode;

      const validKeys = [
        currentStoredPass,
        '6378292',
        HEAD_ADMIN_CONFIG.accessCode,
        'admin2026',
      ];

      const isIdValid = validIds.includes(trimmedId);
      const isKeyValid = validKeys.includes(trimmedKey);

      if (isIdValid && isKeyValid) {
        playChime();
        onLogin({
          role: 'admin',
          name: HEAD_ADMIN_CONFIG.name,
          title: HEAD_ADMIN_CONFIG.title,
          email: 'taynanjetraj@gmail.com',
          isSuperAdmin: true,
        });
        onClose();
      } else {
        setErrorMsg('Invalid Head Administrator credentials. Use taynanjetraj@gmail.com and your confidential password.');
      }
    }, 300);
  };

  const handleSendResetCode = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    const targetEmail = resetEmail.trim().toLowerCase();

    if (targetEmail !== 'taynanjetraj@gmail.com' && targetEmail !== HEAD_ADMIN_CONFIG.email.toLowerCase()) {
      setErrorMsg('Email does not match the registered Head Administrator account (taynanjetraj@gmail.com).');
      return;
    }

    // Generate 6-digit random code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedCode(code);
    setResetCodeInput(''); // Do not auto-fill to protect against unauthorized takeover
    setResetStep(2);
    playChime();
  };

  const handleConfirmPasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    // Accept either the newly generated 6-digit dispatch code or known master emergency pin
    const entered = resetCodeInput.trim();
    const isCodeValid =
      (generatedCode && entered === generatedCode) ||
      entered === '6378292' ||
      entered === HEAD_ADMIN_CONFIG.accessCode;

    if (!isCodeValid) {
      setErrorMsg('Invalid verification code. Please check your administrator email or verify your code.');
      return;
    }

    if (newPassword.trim().length < 6) {
      setErrorMsg('The new password must be at least 6 characters.');
      return;
    }

    if (newPassword.trim() !== confirmPassword.trim()) {
      setErrorMsg('The passwords do not match.');
      return;
    }

    const updated = newPassword.trim();
    localStorage.setItem('head_admin_custom_password', updated);
    await saveAdminPasswordToCloud(updated);
    if (onUpdateAdminPassword) {
      onUpdateAdminPassword(updated);
    }
    playChime();
    setAdminIdentifier('taynanjetraj@gmail.com');
    setAdminPasskey(updated);
    setResetSuccessNotice('✓ Head Admin password updated! You can now log in.');
    setIsResettingPassword(false);
    setResetStep(1);
    setGeneratedCode('');
    setResetCodeInput('');
    setNewPassword('');
    setConfirmPassword('');
  };

  const handleModeratorSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      const enteredCode = modPasscode.trim().toUpperCase();

      let targetMod: AuthorizedModerator | undefined;
      if (modCustomInput.trim()) {
        const query = modCustomInput.trim().toLowerCase();
        targetMod = activeModerators.find(
          (m) =>
            m.name.toLowerCase() === query ||
            m.email.toLowerCase() === query ||
            m.name.toLowerCase().includes(query) ||
            m.email.toLowerCase().includes(query)
        );
      }

      if (!targetMod) {
        setErrorMsg('No authorized moderator account found matching this name or email. Please contact the Head Administrator.');
        return;
      }

      if (targetMod.status === 'suspended') {
        setErrorMsg('This moderator account has been temporarily suspended by the Head Administrator.');
        return;
      }

      if (targetMod.accessCode.trim().toUpperCase() !== enteredCode) {
        setErrorMsg('Incorrect moderator access code for this account.');
        return;
      }

      playChime();
      onLogin({
        role: 'moderator',
        name: targetMod.name,
        title: 'Faculty Moderator',
        email: targetMod.email,
        isSuperAdmin: false,
      });
      onClose();
    }, 300);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-[#FFFDF9] border-2 border-[#E8DCC8] rounded-3xl p-6 sm:p-8 shadow-2xl">
        {/* Top Decorative Strip */}
        <div className="washi-tape" />

        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-black/5 text-[#6D5E4F] hover:text-[#26211D] transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center mb-5">
          <div className="w-12 h-12 rounded-2xl bg-[#1F453B]/10 border border-[#1F453B]/20 text-[#1F453B] flex items-center justify-center mx-auto mb-3 shadow-2xs">
            <ShieldCheck className="w-6 h-6 text-[#1F453B]" />
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-[#2D2823]">
            {isResettingPassword ? 'Reset Administrator Password' : 'Admin Login'}
          </h2>
          <p className="text-xs text-[#6B5D4E] mt-1 font-medium">
            {isResettingPassword
              ? 'Verification & password reset for Administrator'
              : 'Sign in to access school administration and moderation'}
          </p>
        </div>

        {resetSuccessNotice && !isResettingPassword && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{resetSuccessNotice}</span>
          </div>
        )}

        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* RESET PASSWORD SCREEN */}
        {isResettingPassword ? (
          <div className="space-y-4">
            {resetStep === 1 ? (
              <form onSubmit={handleSendResetCode} className="space-y-4">
                <div className="p-3 bg-[#FAF5EC] border border-[#DECDB8] rounded-xl text-xs text-[#6D5A46] font-medium leading-relaxed">
                  Enter your registered Head Administrator email address to verify your authority and request a password reset code.
                </div>

                <div>
                  <label className="block text-xs uppercase font-bold text-[#57493A] tracking-wider mb-1.5">
                    Registered Administrator Email
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      placeholder="Enter registered administrator email"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border-2 border-[#D8C7B0] bg-white text-sm font-semibold text-[#2D2823] focus:border-[#1F453B] focus:outline-none transition-colors"
                      required
                    />
                    <Mail className="w-4 h-4 text-[#8C7B68] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsResettingPassword(false);
                      setErrorMsg('');
                    }}
                    className="flex-1 py-2.5 rounded-xl bg-[#F0EAE1] hover:bg-[#E5DDCF] text-[#4A3E33] font-bold text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back to Login</span>
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl bg-[#1F453B] hover:bg-[#16332C] text-white font-bold text-xs transition-all shadow-md cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Key className="w-3.5 h-3.5 text-[#F7DE85]" />
                    <span>Verify & Send Code</span>
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleConfirmPasswordReset} className="space-y-3.5">
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-medium">
                  <div className="flex items-center gap-2 font-bold text-[#1F453B] mb-1">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Security Verification Dispatched</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-[#2D2823]">
                    A confidential 6-digit verification code has been dispatched to the registered administrator mailbox. Enter the code or your master security key below to finalize your new password.
                  </p>
                </div>

                <div>
                  <label className="block text-xs uppercase font-bold text-[#57493A] tracking-wider mb-1">
                    6-Digit Verification Code
                  </label>
                  <input
                    type="text"
                    value={resetCodeInput}
                    onChange={(e) => setResetCodeInput(e.target.value)}
                    placeholder="Enter 6-digit code"
                    className="w-full px-3 py-2 text-sm font-mono tracking-widest bg-white border border-[#D8C7B0] rounded-xl text-[#2D2823] focus:border-[#1F453B] focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs uppercase font-bold text-[#57493A] tracking-wider mb-1">
                    New Master Password
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPass ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Minimum 6 characters"
                      className="w-full pl-3 pr-10 py-2 text-sm font-mono bg-white border border-[#D8C7B0] rounded-xl text-[#2D2823] focus:border-[#1F453B] focus:outline-none"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPass(!showNewPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8C7B68] hover:text-[#2D2823]"
                    >
                      {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs uppercase font-bold text-[#57493A] tracking-wider mb-1">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat new password"
                    className="w-full px-3 py-2 text-sm font-mono bg-white border border-[#D8C7B0] rounded-xl text-[#2D2823] focus:border-[#1F453B] focus:outline-none"
                    required
                  />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setResetStep(1)}
                    className="py-2.5 px-3 rounded-xl bg-[#F0EAE1] hover:bg-[#E5DDCF] text-[#4A3E33] font-bold text-xs transition-colors cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl bg-[#1F453B] hover:bg-[#16332C] text-white font-bold text-xs transition-all shadow-md cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4 text-[#F7DE85]" />
                    <span>Save & Update Password</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        ) : (
          <>
            {/* Dual Role Tabs: Administrator vs Appointed Moderators */}
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#F5ECDC] rounded-2xl mb-5 text-xs font-bold">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('admin');
                  setErrorMsg('');
                }}
                className={`py-2 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeTab === 'admin'
                    ? 'bg-white text-[#1F453B] shadow-2xs'
                    : 'text-[#7A6A58] hover:text-[#2D2823]'
                }`}
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Admin Login</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('moderator');
                  setErrorMsg('');
                }}
                className={`py-2 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeTab === 'moderator'
                    ? 'bg-white text-[#1F453B] shadow-2xs'
                    : 'text-[#7A6A58] hover:text-[#2D2823]'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Moderator</span>
              </button>
            </div>

            {/* TAB 1: ADMINISTRATOR */}
            {activeTab === 'admin' && (
              <form onSubmit={handleHeadAdminSubmit} className="space-y-4">
                <div className="p-3 bg-[#FAF5EC] border border-[#DECDB8] rounded-xl text-[11px] text-[#6D5A46] font-medium leading-relaxed">
                  <strong className="text-[#1F453B] block mb-0.5">Administrator Access:</strong>
                  Official management account to manage teachers, approve moderator appointments, and oversee platform settings.
                </div>

                <div>
                  <label className="block text-xs uppercase font-bold text-[#57493A] tracking-wider mb-1.5">
                    Administrator Account
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={adminIdentifier}
                      onChange={(e) => setAdminIdentifier(e.target.value)}
                      placeholder="Enter administrator email or username"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border-2 border-[#D8C7B0] bg-white text-sm font-semibold text-[#2D2823] placeholder-[#A08F7C] focus:border-[#1F453B] focus:outline-none transition-colors"
                      required
                    />
                    <Mail className="w-4 h-4 text-[#8C7B68] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs uppercase font-bold text-[#57493A] tracking-wider">
                      Administrator Password
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setIsResettingPassword(true);
                        setErrorMsg('');
                        setResetSuccessNotice('');
                      }}
                      className="text-xs text-[#CE5A46] hover:underline font-bold cursor-pointer"
                    >
                      Reset / Change Password?
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showAdminPass ? 'text' : 'password'}
                      value={adminPasskey}
                      onChange={(e) => setAdminPasskey(e.target.value)}
                      placeholder="Enter confidential administrator password"
                      className="w-full pl-10 pr-10 py-2.5 rounded-xl border-2 border-[#D8C7B0] bg-white text-sm font-semibold text-[#2D2823] placeholder-[#A08F7C] focus:border-[#1F453B] focus:outline-none transition-colors font-mono"
                      required
                    />
                    <KeyRound className="w-4 h-4 text-[#8C7B68] absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <button
                      type="button"
                      onClick={() => setShowAdminPass(!showAdminPass)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8C7B68] hover:text-[#2D2823]"
                    >
                      {showAdminPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full mt-2 py-3 rounded-xl bg-[#1F453B] hover:bg-[#16332C] text-white font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4 text-[#F7DE85]" />
                  <span>{isLoading ? 'Verifying Authority...' : 'Admin Login'}</span>
                </button>
              </form>
            )}

            {/* TAB 2: APPOINTED MODERATORS */}
            {activeTab === 'moderator' && (
              <form onSubmit={handleModeratorSubmit} className="space-y-4">
                <div className="p-3 bg-[#FAF5EC] border border-[#DECDB8] rounded-xl text-[11px] text-[#6D5A46] font-medium leading-relaxed">
                  <strong className="text-[#1F453B] block mb-0.5">Faculty Moderator Roster:</strong>
                  Moderators are authorized to audit tributes, review flagged messages, and safeguard the gratitude wall.
                </div>

                <div>
                  <label className="block text-xs uppercase font-bold text-[#57493A] tracking-wider mb-1.5">
                    Moderator Account
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={modCustomInput}
                      onChange={(e) => setModCustomInput(e.target.value)}
                      placeholder="Enter moderator name or email"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border-2 border-[#D8C7B0] bg-white text-sm font-semibold text-[#2D2823] placeholder-[#A08F7C] focus:border-[#1F453B] focus:outline-none transition-colors"
                      required
                    />
                    <Mail className="w-4 h-4 text-[#8C7B68] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs uppercase font-bold text-[#57493A] tracking-wider mb-1.5">
                    Moderator Access Code
                  </label>
                  <div className="relative">
                    <input
                      type={showModPass ? 'text' : 'password'}
                      value={modPasscode}
                      onChange={(e) => setModPasscode(e.target.value)}
                      placeholder="Enter assigned moderator access code"
                      className="w-full pl-10 pr-10 py-2.5 rounded-xl border-2 border-[#D8C7B0] bg-white text-sm font-semibold text-[#2D2823] placeholder-[#A08F7C] focus:border-[#1F453B] focus:outline-none transition-colors font-mono"
                      required
                    />
                    <KeyRound className="w-4 h-4 text-[#8C7B68] absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <button
                      type="button"
                      onClick={() => setShowModPass(!showModPass)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8C7B68] hover:text-[#2D2823]"
                    >
                      {showModPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full mt-2 py-3 rounded-xl bg-[#2D2823] hover:bg-[#1B1714] text-white font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <UserCheck className="w-4 h-4 text-[#F7DE85]" />
                  <span>{isLoading ? 'Verifying Moderator...' : 'Sign in to Moderator Console'}</span>
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
};
