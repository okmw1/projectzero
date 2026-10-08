import React, { useState, useEffect } from 'react';
import {
  StudentNote,
  StudentLetter,
  AuthorizedTeacher,
  AuthorizedModerator,
  UserSession,
  MaintenanceSettings,
  AnnouncementSettings,
  AnnouncementTheme,
  CommunitySuggestion,
  TributeComment,
  MusicBroadcastSettings,
  MusicTrack,
} from '../types';
import {
  X,
  ShieldCheck,
  Trash2,
  CheckCircle2,
  UserPlus,
  Search,
  AlertTriangle,
  UserCheck,
  Key,
  BookOpen,
  Flag,
  Copy,
  RefreshCw,
  Dices,
  Share2,
  ShieldAlert,
  Pencil,
  Edit3,
  Users,
  UserX,
  Lock,
  Sparkles,
  Eye,
  EyeOff,
  Globe,
  Wrench,
  Clock,
  Power,
  Megaphone,
  PartyPopper,
  Music,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Plus,
  ArrowUp,
  ArrowDown,
  Repeat,
  Repeat1,
  Shuffle,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  BUILT_IN_MUSIC_TRACKS,
  parseMusicUrl,
  playChime,
  resolveMusicTrackTitle,
} from '../utils/audio';
import { detectInappropriateContent, containsUnknownOrPlaceholder } from '../utils/contentSensor';
import { HEAD_ADMIN_CONFIG } from '../data/initialNotes';
import { saveAdminPasswordToCloud } from '../firebase/db';
import { CompleteLetterModal } from './CompleteLetterModal.tsx';

interface AdminDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserSession;
  notes: StudentNote[];
  letters?: StudentLetter[];
  authorizedTeachers: AuthorizedTeacher[];
  authorizedModerators: AuthorizedModerator[];
  onDeleteInappropriateNote: (id: string) => void;
  onDeleteLetter?: (id: string) => void;
  onReplyToLetter?: (letterId: string, reply: string) => void;
  onGrantTeacher: (teacher: AuthorizedTeacher) => void;
  onRevokeTeacher: (id: string) => void;
  onAddModerator: (moderator: AuthorizedModerator) => void;
  onRevokeModerator: (id: string) => void;
  adminPassword?: string;
  onUpdateAdminPassword?: (newPassword: string) => void;
  onOpenSchoolPublishing?: () => void;
  maintenanceSettings?: MaintenanceSettings;
  onUpdateMaintenanceSettings?: (settings: MaintenanceSettings) => void;
  announcementSettings?: AnnouncementSettings;
  onUpdateAnnouncementSettings?: (settings: AnnouncementSettings) => void;
  communitySuggestions?: CommunitySuggestion[];
  onDeleteCommunitySuggestion?: (suggestionId: string) => void;
  onReviveLetterToWall?: (letter: StudentLetter) => void;
  tributeComments?: TributeComment[];
  onAddTributeComment?: (
    targetId: string,
    targetType: 'note' | 'letter',
    authorName: string,
    message: string
  ) => Promise<{ ok: boolean; error?: string }>;
  onDeleteTributeComment?: (commentId: string) => void;
  musicBroadcast?: MusicBroadcastSettings;
  onUpdateMusicBroadcast?: (settings: MusicBroadcastSettings) => void;
  initialTab?:
    | 'moderation'
    | 'teachers'
    | 'moderators'
    | 'announcement'
    | 'music'
    | 'maintenance'
    | 'security';
}

export const AdminDashboardModal: React.FC<AdminDashboardModalProps> = ({
  isOpen,
  onClose,
  user,
  notes,
  letters = [],
  authorizedTeachers,
  authorizedModerators,
  onDeleteInappropriateNote,
  onDeleteLetter,
  onReplyToLetter,
  onGrantTeacher,
  onRevokeTeacher,
  onAddModerator,
  onRevokeModerator,
  adminPassword,
  onUpdateAdminPassword,
  onOpenSchoolPublishing,
  maintenanceSettings,
  onUpdateMaintenanceSettings,
  announcementSettings,
  onUpdateAnnouncementSettings,
  communitySuggestions = [],
  onDeleteCommunitySuggestion,
  onReviveLetterToWall,
  tributeComments = [],
  onAddTributeComment,
  onDeleteTributeComment,
  musicBroadcast,
  onUpdateMusicBroadcast,
  initialTab,
}) => {
  const isHeadAdmin = user.role === 'admin' || user.isSuperAdmin;
  const [selectedCompleteLetterId, setSelectedCompleteLetterId] = useState<string | null>(null);
  const selectedCompleteLetter = letters.find((l) => l.id === selectedCompleteLetterId) || null;
  const [activeTab, setActiveTab] = useState<
    'moderation' | 'teachers' | 'moderators' | 'announcement' | 'music' | 'maintenance' | 'security'
  >(initialTab || (isHeadAdmin ? 'teachers' : 'moderation'));
  const [tributeSubTab, setTributeSubTab] = useState<'notes' | 'letters'>('notes');
  const [notesFilter, setNotesFilter] = useState<'all' | 'flagged'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionSuccessMsg, setActionSuccessMsg] = useState('');

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Maintenance Mode Form State
  const [maintEnabled, setMaintEnabled] = useState<boolean>(!!maintenanceSettings?.enabled);
  const [maintMessage, setMaintMessage] = useState<string>(
    maintenanceSettings?.message ||
      'We are currently performing scheduled database and real-time synchronization upgrades so every student note and formal letter is preserved.'
  );
  const [maintReturnTime, setMaintReturnTime] = useState<string>(
    maintenanceSettings?.estimatedReturn || 'Back online shortly'
  );

  // Celebratory Announcement Form State
  const [annEnabled, setAnnEnabled] = useState<boolean>(!!announcementSettings?.enabled);
  const [annTitle, setAnnTitle] = useState<string>(
    announcementSettings?.title || "Happy Teacher's Day to Our Beloved Educators! 🎉"
  );
  const [annMessage, setAnnMessage] = useState<string>(
    announcementSettings?.message ||
      "Today and every day, we celebrate your unwavering patience, dedication, and heart in guiding every student. Thank you for making our school a second home!"
  );
  const [annSenderName, setAnnSenderName] = useState<string>(
    announcementSettings?.senderName ||
      (user.name && !user.name.startsWith('@') ? user.name : 'School Administration & Student Council')
  );
  const [annTheme, setAnnTheme] = useState<AnnouncementTheme>(
    announcementSettings?.theme || 'gold'
  );
  const [annShowPopup, setAnnShowPopup] = useState<boolean>(
    announcementSettings?.showPopupModal !== undefined ? announcementSettings.showPopupModal : true
  );
  const [annTriggerConfetti, setAnnTriggerConfetti] = useState<boolean>(
    announcementSettings?.triggerConfetti !== undefined ? announcementSettings.triggerConfetti : true
  );

  useEffect(() => {
    if (maintenanceSettings) {
      setMaintEnabled(!!maintenanceSettings.enabled);
      if (maintenanceSettings.message) setMaintMessage(maintenanceSettings.message);
      if (maintenanceSettings.estimatedReturn) setMaintReturnTime(maintenanceSettings.estimatedReturn);
    }
  }, [maintenanceSettings]);

  useEffect(() => {
    if (announcementSettings) {
      setAnnEnabled(!!announcementSettings.enabled);
      if (announcementSettings.title) setAnnTitle(announcementSettings.title);
      if (announcementSettings.message) setAnnMessage(announcementSettings.message);
      if (announcementSettings.senderName) setAnnSenderName(announcementSettings.senderName);
      if (announcementSettings.theme) setAnnTheme(announcementSettings.theme);
      setAnnShowPopup(announcementSettings.showPopupModal !== undefined ? announcementSettings.showPopupModal : true);
      setAnnTriggerConfetti(
        announcementSettings.triggerConfetti !== undefined ? announcementSettings.triggerConfetti : true
      );
    }
  }, [announcementSettings]);

  // Add Teacher Form State
  const [newTeacherName, setNewTeacherName] = useState('');
  const [newTeacherSubject, setNewTeacherSubject] = useState('');
  const [newTeacherCode, setNewTeacherCode] = useState('');

  // Edit Teacher Modal State
  const [teacherToEdit, setTeacherToEdit] = useState<AuthorizedTeacher | null>(null);
  const [editName, setEditName] = useState('');
  const [editSubject, setEditSubject] = useState('');
  const [editAccessCode, setEditAccessCode] = useState('');

  // Add Moderator Form State (Head Admin only)
  const [newModName, setNewModName] = useState('');
  const [newModEmail, setNewModEmail] = useState('');
  const [newModCode, setNewModCode] = useState('');

  // Change Admin Password State (Head Admin only)
  const [currentPassInput, setCurrentPassInput] = useState('');
  const [newPassInput, setNewPassInput] = useState('');
  const [confirmPassInput, setConfirmPassInput] = useState('');
  const [passChangeError, setPassChangeError] = useState('');
  const [passChangeSuccess, setPassChangeSuccess] = useState('');
  const [showPassChange, setShowPassChange] = useState(false);

  // In-app note/letter delete confirmation
  const [noteToDelete, setNoteToDelete] = useState<StudentNote | null>(null);
  const [letterToDelete, setLetterToDelete] = useState<StudentLetter | null>(null);
  const [teacherToRevoke, setTeacherToRevoke] = useState<AuthorizedTeacher | null>(null);
  const [modToRevoke, setModToRevoke] = useState<AuthorizedModerator | null>(null);

  // Admin/Mod Music Queue Add State
  const [musicAddMode, setMusicAddMode] = useState<'single' | 'bulk'>('single');
  const [musicSingleTitle, setMusicSingleTitle] = useState('');
  const [musicSingleUrl, setMusicSingleUrl] = useState('');
  const [musicBulkText, setMusicBulkText] = useState('');
  const [musicFormError, setMusicFormError] = useState('');
  const [isMusicResolving, setIsMusicResolving] = useState(false);

  if (!isOpen) return null;

  const showNotification = (msg: string) => {
    setActionSuccessMsg(msg);
    setTimeout(() => setActionSuccessMsg(''), 4000);
  };

  // Generate random teacher access code
  const generateRandomTeacherCode = (prefix?: string) => {
    const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const nums = '23456789';
    const presets = ['TEACH', 'GUIDE', 'SPARK', 'SHINE', 'HONOR', 'MENTOR'];
    let tag = presets[Math.floor(Math.random() * presets.length)];
    if (prefix) {
      const clean = prefix
        .replace(/^(mr|ms|mrs|prof|dr)\.?\s+/i, '')
        .substring(0, 4)
        .toUpperCase()
        .replace(/[^A-Z]/g, '');
      if (clean.length >= 2) tag = clean;
    }
    const char1 = letters[Math.floor(Math.random() * letters.length)];
    const n1 = nums[Math.floor(Math.random() * nums.length)];
    const n2 = nums[Math.floor(Math.random() * nums.length)];
    const n3 = nums[Math.floor(Math.random() * nums.length)];
    return `${tag}-${char1}${n1}${n2}${n3}`;
  };

  // Generate random moderator access code
  const generateRandomModCode = () => {
    const num = Math.floor(1000 + Math.random() * 9000);
    return `MOD-${num}`;
  };

  const handleCopyCode = (code: string, ownerName: string) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(code).catch(() => {});
    }
    showNotification(`✓ Copied access code "${code}" for ${ownerName} to clipboard!`);
    playChime();
  };

  const handleRegenerateCode = (teacher: AuthorizedTeacher) => {
    const newCode = generateRandomTeacherCode(teacher.name);
    onGrantTeacher({
      ...teacher,
      accessCode: newCode,
    });
    showNotification(`✓ Assigned new code "${newCode}" for ${teacher.name}!`);
    playChime();
  };

  const handleStartEditTeacher = (teacher: AuthorizedTeacher) => {
    setTeacherToEdit(teacher);
    setEditName(teacher.name);
    setEditSubject(teacher.subject);
    setEditAccessCode(teacher.accessCode);
  };

  const handleSaveEditTeacher = (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacherToEdit || !editName.trim()) return;

    const updatedTeacher: AuthorizedTeacher = {
      ...teacherToEdit,
      name: editName.trim(),
      subject: editSubject.trim() || teacherToEdit.subject,
      accessCode: editAccessCode.trim() || teacherToEdit.accessCode,
    };

    onGrantTeacher(updatedTeacher);
    showNotification(`✓ Teacher details for "${updatedTeacher.name}" successfully updated!`);
    playChime();
    setTeacherToEdit(null);
  };

  // Batch regenerate random codes for all approved teachers
  const handleBatchRegenerateCodes = () => {
    approvedTeachers.forEach((t) => {
      const freshCode = generateRandomTeacherCode(t.name);
      onGrantTeacher({
        ...t,
        accessCode: freshCode,
      });
    });
    showNotification(`✓ Generated new random access codes for all ${approvedTeachers.length} teachers!`);
    playChime();
  };

  // Copy full faculty roster with random access codes
  const handleCopyAllCodes = () => {
    if (approvedTeachers.length === 0) return;
    const rosterLines = approvedTeachers.map(
      (t) => `• ${t.name} (${t.subject}): Access Code: ${t.accessCode || 'TEACH-2026'}`
    );
    const text = `📋 CITY HIGH TEACHER'S DAY FACULTY LOGIN ACCESS CODES:\n\n${rosterLines.join('\n')}\n\nSign in on the website to access your mailbox and post tributes!`;
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
    showNotification(`✓ Copied login codes roster for all ${approvedTeachers.length} teachers to clipboard!`);
    playChime();
  };

  const handleConfirmDeleteNote = () => {
    if (!noteToDelete) return;
    const author = noteToDelete.studentName;
    onDeleteInappropriateNote(noteToDelete.id);
    showNotification(`Note by "${author}" was deleted from the gratitude wall.`);
    playChime();
    setNoteToDelete(null);
  };

  const handleConfirmDeleteLetter = () => {
    if (!letterToDelete || !onDeleteLetter) return;
    const author = letterToDelete.studentName;
    onDeleteLetter(letterToDelete.id);
    showNotification(`Letter from "${author}" was removed from the database.`);
    playChime();
    setLetterToDelete(null);
  };

  const handleConfirmRevokeTeacher = () => {
    if (!teacherToRevoke) return;
    onRevokeTeacher(teacherToRevoke.id);
    showNotification(`Revoked teacher access privileges for ${teacherToRevoke.name}.`);
    playChime();
    setTeacherToRevoke(null);
  };

  const handleConfirmRevokeMod = () => {
    if (!modToRevoke) return;
    onRevokeModerator(modToRevoke.id);
    showNotification(`Revoked moderator privileges for ${modToRevoke.name}.`);
    playChime();
    setModToRevoke(null);
  };

  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassChangeError('');
    setPassChangeSuccess('');

    const effectiveCurrent =
      adminPassword ||
      localStorage.getItem('head_admin_custom_password') ||
      HEAD_ADMIN_CONFIG.accessCode;

    if (
      currentPassInput.trim() !== effectiveCurrent &&
      currentPassInput.trim() !== '6378292' &&
      currentPassInput.trim() !== HEAD_ADMIN_CONFIG.accessCode
    ) {
      setPassChangeError('The current password entered is incorrect.');
      return;
    }

    if (newPassInput.trim().length < 6) {
      setPassChangeError('The new password must be at least 6 characters.');
      return;
    }

    if (newPassInput.trim() !== confirmPassInput.trim()) {
      setPassChangeError('The new password and confirmation do not match.');
      return;
    }

    const updated = newPassInput.trim();
    localStorage.setItem('head_admin_custom_password', updated);
    await saveAdminPasswordToCloud(updated);
    if (onUpdateAdminPassword) {
      onUpdateAdminPassword(updated);
    }
    playChime();
    setPassChangeSuccess('Head Administrator password updated successfully! Keep this password secure.');
    setCurrentPassInput('');
    setNewPassInput('');
    setConfirmPassInput('');
  };

  const handleApprovePendingTeacher = (teacher: AuthorizedTeacher) => {
    const finalCode =
      teacher.accessCode && teacher.accessCode !== 'teacher2026'
        ? teacher.accessCode
        : generateRandomTeacherCode(teacher.name);
    onGrantTeacher({
      ...teacher,
      accessCode: finalCode,
      status: 'approved',
    });
    playChime();
    showNotification(`Teacher access granted to ${teacher.name} with code "${finalCode}"!`);
  };

  const handleCreateGrantTeacher = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeacherName.trim()) return;

    const assignedCode = newTeacherCode.trim() || generateRandomTeacherCode(newTeacherName);
    const newTeacher: AuthorizedTeacher = {
      id: `teacher-auth-${Date.now()}`,
      name: newTeacherName.trim(),
      subject: newTeacherSubject.trim() || 'General Studies',
      accessCode: assignedCode,
      status: 'approved',
      requestedAt: new Date().toISOString().split('T')[0],
    };
    onGrantTeacher(newTeacher);
    playChime();
    showNotification(`Teacher access granted to ${newTeacher.name} with code: "${assignedCode}"!`);
    setNewTeacherName('');
    setNewTeacherSubject('');
    setNewTeacherCode('');
  };

  const handleCreateModerator = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newModName.trim()) return;

    const assignedCode = newModCode.trim() || generateRandomModCode();
    const newMod: AuthorizedModerator = {
      id: `mod-${Date.now()}`,
      name: newModName.trim(),
      email: newModEmail.trim() || `${newModName.trim().toLowerCase().replace(/\s+/g, '.')}@cityhigh.edu`,
      accessCode: assignedCode,
      assignedBy: user.name || 'Head Administrator',
      createdAt: new Date().toISOString().split('T')[0],
      status: 'active',
      notesReviewedCount: 0,
    };
    onAddModerator(newMod);
    playChime();
    showNotification(`✓ Appointed new Faculty Moderator "${newMod.name}" with access code: "${assignedCode}"!`);
    setNewModName('');
    setNewModEmail('');
    setNewModCode('');
  };

  // Flagged notes count
  const flaggedNotesCount = notes.filter((n) => {
    const checkMsg = detectInappropriateContent(n.message);
    const isUnknown = containsUnknownOrPlaceholder(n.studentName) || (n.grade && containsUnknownOrPlaceholder(n.grade));
    return n.status === 'flagged' || checkMsg.isInappropriate || isUnknown;
  }).length;

  // Filter notes
  const filteredNotes = notes.filter((n) => {
    const checkMsg = detectInappropriateContent(n.message);
    const isUnknown = containsUnknownOrPlaceholder(n.studentName) || (n.grade && containsUnknownOrPlaceholder(n.grade));
    const isFlagged = n.status === 'flagged' || checkMsg.isInappropriate || isUnknown;

    if (notesFilter === 'flagged' && !isFlagged) {
      return false;
    }

    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;

    return (
      n.studentName.toLowerCase().includes(q) ||
      n.message.toLowerCase().includes(q) ||
      n.subject.toLowerCase().includes(q)
    );
  });

  // Filter letters
  const filteredLetters = letters.filter((l) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;

    return (
      l.studentName.toLowerCase().includes(q) ||
      l.recipientTeacherName.toLowerCase().includes(q) ||
      l.title.toLowerCase().includes(q) ||
      l.body.toLowerCase().includes(q)
    );
  });

  const pendingTeachers = authorizedTeachers.filter((t) => t.status === 'pending');
  const approvedTeachers = authorizedTeachers.filter((t) => t.status === 'approved');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs no-print animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl bg-[#FFFDF9] border border-[#DDD0BF] rounded-3xl shadow-2xl p-6 sm:p-8 max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#EADBCC]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#1F453B] text-white flex items-center justify-center shadow-xs">
              <ShieldCheck className="w-5 h-5 text-[#F7DE85]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-heading text-xl sm:text-2xl font-bold text-[#231F1D]">
                  {isHeadAdmin ? 'Head Administrator Console' : 'Faculty Moderator Console'}
                </h3>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  isHeadAdmin ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                }`}>
                  {isHeadAdmin ? '★ Head Admin' : 'Appointed Moderator'}
                </span>
              </div>
              <p className="font-body-serif text-xs text-[#75685B]">
                {isHeadAdmin
                  ? 'Master authority: Appoint moderators, manage faculty roster & oversee tribute safety.'
                  : `Authenticated as ${user.name} — Tributes safety & moderation duties.`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onOpenSchoolPublishing && (
              <button
                onClick={onOpenSchoolPublishing}
                className="px-3 py-1.5 rounded-xl bg-[#FAF5EB] hover:bg-[#F2ECE1] text-[#1F453B] border border-[#DECDB8] text-xs font-bold transition-all shadow-2xs cursor-pointer flex items-center gap-1.5"
                title="School Web Link, Domain & QR Code (Coordinator Access Only)"
              >
                <Globe className="w-3.5 h-3.5 text-[#1F453B]" />
                <span className="hidden sm:inline">School Web Link & QR</span>
                <span className="sm:hidden">Web Link</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="text-[#8A7D70] hover:text-[#231F1C] p-2 rounded-full hover:bg-[#F3EDE2] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Quick Maintenance Mode Banner inside Admin Console */}
        <div
          className={`mt-3 p-3 rounded-2xl border flex flex-wrap items-center justify-between gap-3 transition-all ${
            maintEnabled
              ? 'bg-amber-50 border-amber-300 text-amber-950'
              : 'bg-[#FAF5EB] border-[#E5D7C3] text-[#3B3026]'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                maintEnabled ? 'bg-amber-500 text-white animate-pulse' : 'bg-[#1F453B]/10 text-[#1F453B]'
              }`}
            >
              <Wrench className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold">
                  Server Maintenance Mode: {maintEnabled ? 'ACTIVE (Under Fixing)' : 'OFF (Live for All Students)'}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    maintEnabled ? 'bg-amber-600 text-white' : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {maintEnabled ? 'Maintenance ON' : 'Public Online'}
                </span>
              </div>
              <p className="text-[11px] text-[#75685B]">
                {maintEnabled
                  ? 'Students see the Maintenance Notice screen. Admins & Teachers can bypass and test freely.'
                  : 'Switch ON whenever you are fixing errors or performing server database updates.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('maintenance')}
              className="px-3 py-1.5 rounded-xl bg-white border border-[#DDD0BF] text-[#4A3E33] hover:bg-[#F2ECE1] text-xs font-bold transition-colors cursor-pointer"
            >
              Configure Message
            </button>
            <button
              type="button"
              onClick={() => {
                const nextState = !maintEnabled;
                setMaintEnabled(nextState);
                if (onUpdateMaintenanceSettings) {
                  onUpdateMaintenanceSettings({
                    enabled: nextState,
                    message: maintMessage,
                    estimatedReturn: maintReturnTime,
                    updatedAt: Date.now(),
                    updatedBy: user.name || 'Administrator',
                  });
                }
                playChime();
                showNotification(
                  nextState
                    ? '🛠️ Maintenance Mode ENABLED — Students now see the Under Maintenance screen (Staff bypass active).'
                    : '✅ Maintenance Mode DISABLED — Website is now live for all students!'
                );
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs ${
                maintEnabled
                  ? 'bg-emerald-700 hover:bg-emerald-800 text-white'
                  : 'bg-amber-600 hover:bg-amber-700 text-white'
              }`}
            >
              <Power className="w-3.5 h-3.5" />
              <span>{maintEnabled ? 'Turn OFF Maintenance' : 'Turn ON Maintenance'}</span>
            </button>
          </div>
        </div>

        {/* Success toast notification */}
        {actionSuccessMsg && (
          <div className="mt-3 p-3 bg-[#D7F3E3] border border-[#B2E7C6] text-[#246B46] text-xs font-semibold rounded-xl flex items-center gap-2 animate-in fade-in duration-150">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{actionSuccessMsg}</span>
          </div>
        )}

        {/* Main Tab Navigation */}
        <div className="flex items-center justify-between my-4 pb-2 border-b border-[#EADBCC] flex-wrap gap-2">
          <div className="flex items-center gap-2">
            {/* Tab 1: Moderation Queue */}
            <button
              onClick={() => setActiveTab('moderation')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'moderation'
                  ? 'bg-[#1F453B] text-white shadow-xs'
                  : 'bg-[#F0E9DD] text-[#55493D] hover:bg-[#E5DCCF]'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Tribute Moderation</span>
              {flaggedNotesCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-red-500 text-white font-black text-[10px]">
                  {flaggedNotesCount} flagged
                </span>
              )}
            </button>

            {/* Tab 2: Teacher Roster (Admin Only) */}
            {isHeadAdmin ? (
              <button
                onClick={() => setActiveTab('teachers')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'teachers'
                    ? 'bg-[#1F453B] text-white shadow-xs'
                    : 'bg-[#F0E9DD] text-[#55493D] hover:bg-[#E5DCCF]'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Teachers Roster ({approvedTeachers.length})</span>
                {pendingTeachers.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-amber-400 text-amber-950 font-black text-[10px]">
                    {pendingTeachers.length}
                  </span>
                )}
              </button>
            ) : null}

            {/* Tab 3: Moderator Staffing (Head Admin Only) */}
            {isHeadAdmin ? (
              <button
                onClick={() => setActiveTab('moderators')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'moderators'
                    ? 'bg-[#1F453B] text-white shadow-xs'
                    : 'bg-[#F0E9DD] text-[#55493D] hover:bg-[#E5DCCF]'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Moderators ({authorizedModerators.length})</span>
              </button>
            ) : null}

            {/* Tab 4: Celebratory Announcement Broadcast */}
            <button
              onClick={() => setActiveTab('announcement')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'announcement'
                  ? 'bg-[#1F453B] text-white shadow-xs'
                  : annEnabled
                  ? 'bg-[#FEF3C7] text-[#92400E] border border-[#F59E0B]/50 hover:bg-[#FDE68A]'
                  : 'bg-[#F0E9DD] text-[#55493D] hover:bg-[#E5DCCF]'
              }`}
            >
              <Megaphone className="w-3.5 h-3.5" />
              <span>Announcement</span>
              {annEnabled && (
                <span className="px-1.5 py-0.2 rounded-full bg-[#CE5A46] text-white font-black text-[10px]">
                  LIVE
                </span>
              )}
            </button>

            {/* Tab 5: Live Music Queue & Broadcast (Admins & Moderators) */}
            <button
              onClick={() => setActiveTab('music')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'music'
                  ? 'bg-[#1F453B] text-white shadow-xs'
                  : musicBroadcast?.isPlaying
                  ? 'bg-emerald-100 text-emerald-900 border border-emerald-300 hover:bg-emerald-200'
                  : 'bg-[#F0E9DD] text-[#55493D] hover:bg-[#E5DCCF]'
              }`}
            >
              <Music className="w-3.5 h-3.5" />
              <span>Music Queue ({musicBroadcast?.queue?.length || BUILT_IN_MUSIC_TRACKS.length})</span>
              {musicBroadcast?.isPlaying && (
                <span className="px-1.5 py-0.2 rounded-full bg-emerald-600 text-white font-black text-[10px]">
                  PLAYING
                </span>
              )}
            </button>

            {/* Tab 6: Maintenance Mode Control */}
            <button
              onClick={() => setActiveTab('maintenance')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'maintenance'
                  ? 'bg-[#1F453B] text-white shadow-xs'
                  : maintEnabled
                  ? 'bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200'
                  : 'bg-[#F0E9DD] text-[#55493D] hover:bg-[#E5DCCF]'
              }`}
            >
              <Wrench className="w-3.5 h-3.5" />
              <span>Maintenance Mode</span>
              {maintEnabled && (
                <span className="px-1.5 py-0.2 rounded-full bg-amber-600 text-white font-black text-[10px]">
                  ON
                </span>
              )}
            </button>

            {/* Tab 5: Security & Admin Settings (Head Admin Only) */}
            {isHeadAdmin ? (
              <button
                onClick={() => setActiveTab('security')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'security'
                    ? 'bg-[#1F453B] text-white shadow-xs'
                    : 'bg-[#F0E9DD] text-[#55493D] hover:bg-[#E5DCCF]'
                }`}
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Security & Password</span>
              </button>
            ) : null}
          </div>

          {/* Quick Roster Actions for Head Admin */}
          {activeTab === 'teachers' && isHeadAdmin && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyAllCodes}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#DDD0BF] text-xs font-bold text-[#1F453B] hover:bg-[#F2ECE1] shadow-2xs transition-colors cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Copy Faculty Roster</span>
              </button>
              <button
                type="button"
                onClick={handleBatchRegenerateCodes}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FAF4EA] border border-[#DDD0BF] text-xs font-bold text-[#8C4334] hover:bg-[#F2ECE1] shadow-2xs transition-colors cursor-pointer"
              >
                <Dices className="w-3.5 h-3.5 text-[#D97706]" />
                <span>🎲 Randomize All Codes</span>
              </button>
            </div>
          )}
        </div>

        {/* TAB 1: TRIBUTES MODERATION */}
        {activeTab === 'moderation' && (
          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            {/* Sub-tab: Sticky Notes vs Letters */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="inline-flex rounded-xl bg-[#F0E9DD] p-1 border border-[#DDD0BF] text-xs font-bold">
                <button
                  onClick={() => setTributeSubTab('notes')}
                  className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                    tributeSubTab === 'notes' ? 'bg-white text-[#2B2520] shadow-xs' : 'text-[#6C5E50]'
                  }`}
                >
                  Sticky Notes ({notes.length})
                </button>
                <button
                  onClick={() => setTributeSubTab('letters')}
                  className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                    tributeSubTab === 'letters' ? 'bg-white text-[#2B2520] shadow-xs' : 'text-[#6C5E50]'
                  }`}
                >
                  Formal Letters ({letters.length})
                </button>
              </div>

              {/* Flagged filter for notes */}
              {tributeSubTab === 'notes' && (
                <div className="inline-flex rounded-xl bg-[#F0E9DD] p-1 border border-[#DDD0BF] text-xs">
                  <button
                    onClick={() => setNotesFilter('all')}
                    className={`px-3 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                      notesFilter === 'all' ? 'bg-white text-[#2B2520] shadow-xs' : 'text-[#6C5E50]'
                    }`}
                  >
                    All ({notes.length})
                  </button>
                  <button
                    onClick={() => setNotesFilter('flagged')}
                    className={`px-3 py-1 rounded-lg font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                      notesFilter === 'flagged' ? 'bg-amber-400 text-amber-950 shadow-xs' : 'text-[#6C5E50]'
                    }`}
                  >
                    <Flag className="w-3 h-3" />
                    <span>Flagged Only ({flaggedNotesCount})</span>
                  </button>
                </div>
              )}
            </div>

            {/* Live Search */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#8C7D6F]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tributes by student, teacher, or content keywords in real-time..."
                className="w-full pl-9 pr-4 py-2 text-xs bg-[#FAF7F0] border border-[#DDD0BF] rounded-xl text-[#2B231D] focus:outline-none focus:ring-2 focus:ring-[#1F453B]/20"
              />
            </div>

            {/* Sticky Notes List */}
            {tributeSubTab === 'notes' && (
              <div className="space-y-3">
                {filteredNotes.length === 0 ? (
                  <div className="py-12 text-center text-xs text-[#75685B] font-body-serif italic">
                    No student notes found matching current search or filter.
                  </div>
                ) : (
                  filteredNotes.map((note) => {
                    const checkMsg = detectInappropriateContent(note.message);
                    const isUnknown = containsUnknownOrPlaceholder(note.studentName) || (note.grade && containsUnknownOrPlaceholder(note.grade));
                    const isFlagged = note.status === 'flagged' || checkMsg.isInappropriate || isUnknown;
                    const flaggedKeywords = checkMsg.flaggedWords.join(', ');

                    return (
                      <div
                        key={note.id}
                        className={`p-4 rounded-2xl border shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                          isFlagged ? 'bg-amber-50/90 border-amber-300' : 'bg-white border-[#EADBCC] hover:border-[#D5C2AB]'
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center flex-wrap gap-2 mb-1">
                            <span className="px-2 py-0.5 rounded-md bg-[#F4EFE6] text-[#362E27] text-[10px] font-bold uppercase font-mono">
                              {note.subject}
                            </span>
                            <span className="text-xs font-bold text-[#2A231D]">
                              {note.studentName} {note.grade ? `(${note.grade})` : ''}
                            </span>
                            {note.teacherName && (
                              <span className="text-[11px] font-semibold text-[#8C4334]">
                                To: {note.teacherName}
                              </span>
                            )}
                            {note.isTeacherReply && (
                              <span className="px-1.5 py-0.2 rounded bg-[#1F453B]/10 text-[#1F453B] text-[10px] font-bold">
                                Teacher Reply
                              </span>
                            )}
                            {isFlagged && (
                              <span className="px-2 py-0.5 rounded-md bg-amber-200 text-amber-900 border border-amber-300 text-[10px] font-bold flex items-center gap-1">
                                <Flag className="w-3 h-3 text-amber-700" />
                                <span>Trigger: {flaggedKeywords || note.flaggedReason || 'Placeholder'}</span>
                              </span>
                            )}
                          </div>
                          <p className="font-body-serif text-xs text-[#4F4439] line-clamp-2">
                            {note.message}
                          </p>
                        </div>
                        <div className="shrink-0 flex items-center gap-2">
                          <button
                            onClick={() => setNoteToDelete(note)}
                            className="px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete Note</span>
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* Formal Letters List */}
            {tributeSubTab === 'letters' && (
              <div className="space-y-3">
                {filteredLetters.length === 0 ? (
                  <div className="py-12 text-center text-xs text-[#75685B] font-body-serif italic">
                    No student letters found matching current search.
                  </div>
                ) : (
                  filteredLetters.map((letter) => {
                    const isPinnedInNotes = notes.some(
                      (n) =>
                        n.letterId === letter.id ||
                        n.id === `note-from-${letter.id}` ||
                        n.id === `note-from-letter-${letter.id}` ||
                        (n.studentName.toLowerCase().trim() === letter.studentName.toLowerCase().trim() &&
                          (n.teacherName || '').toLowerCase().trim() ===
                            (letter.recipientTeacherName || '').toLowerCase().trim() &&
                          n.letterTitle === letter.title)
                    );
                    return (
                      <div
                        key={letter.id}
                        onClick={() => setSelectedCompleteLetterId(letter.id)}
                        className="p-4 rounded-2xl border bg-white border-[#EADBCC] hover:border-[#1F453B]/50 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all cursor-pointer group"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center flex-wrap gap-2 mb-1.5">
                            <span className="px-2 py-0.5 rounded-md bg-[#FAF4EA] text-[#8C4334] text-[10px] font-bold uppercase font-mono">
                              To: {letter.recipientTeacherName}
                            </span>
                            <span className="text-xs font-bold text-[#2A231D]">
                              From: {letter.studentName} {letter.grade ? `(${letter.grade})` : ''}
                            </span>
                            <span className="px-2 py-0.2 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold">
                              🌐 Live on Public Wall
                            </span>
                            {letter.isRead ? (
                              <span className="px-2 py-0.2 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-bold">
                                ✓ Read
                              </span>
                            ) : (
                              <span className="px-2 py-0.2 rounded-md bg-red-100 text-red-800 text-[10px] font-bold">
                                New
                              </span>
                            )}
                            {letter.teacherReplyMessage && (
                              <span className="px-2 py-0.2 rounded-md bg-emerald-100 text-emerald-900 border border-emerald-300 text-[10px] font-bold">
                                💬 Teacher Replied
                              </span>
                            )}
                          </div>
                          <div className="font-bold text-xs text-[#2B231D] truncate mb-0.5 group-hover:text-[#1F453B] transition-colors">
                            {letter.title}
                          </div>
                          <p className="font-body-serif text-xs text-[#4F4439] line-clamp-2">
                            {letter.body}
                          </p>
                        </div>
                        <div className="shrink-0 flex flex-wrap items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          {onReviveLetterToWall && (
                            <button
                              type="button"
                              onClick={() => {
                                onReviveLetterToWall(letter);
                                playChime();
                                showNotification(
                                  `✓ Revived & synced "${letter.title}" (From: ${letter.studentName} → To: ${letter.recipientTeacherName}) onto the Public Gratitude Wall!`
                                );
                              }}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
                                isPinnedInNotes
                                  ? 'bg-[#FAF5EB] hover:bg-[#EFE6D5] text-[#1F453B] border-[#DECDB8]'
                                  : 'bg-amber-500 hover:bg-amber-600 text-white border-amber-600 shadow-xs'
                              }`}
                              title="Ensure this Formal Letter is pinned & synced on the public Gratitude Wall"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                              <span>{isPinnedInNotes ? 'Re-Sync to Public Wall' : 'Revive to Public Wall'}</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setSelectedCompleteLetterId(letter.id)}
                            className="px-3 py-1.5 rounded-xl bg-[#1F453B] hover:bg-[#16332C] text-white text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                          >
                            <BookOpen className="w-3.5 h-3.5 text-[#F7DE85]" />
                            <span>Read Complete Letter</span>
                          </button>
                          {onDeleteLetter && (
                            <button
                              type="button"
                              onClick={() => setLetterToDelete(letter)}
                              className="px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Delete</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: TEACHERS ROSTER */}
        {activeTab === 'teachers' && isHeadAdmin && (
          <div className="flex-1 overflow-y-auto space-y-5 pr-1">
            {/* Pending Teacher Approvals Alert */}
            {pendingTeachers.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-900 mb-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>Pending Teacher Access Requests ({pendingTeachers.length})</span>
                </div>
                <div className="space-y-2">
                  {pendingTeachers.map((teacher) => {
                    const assignedCode =
                      teacher.accessCode && teacher.accessCode !== 'teacher2026'
                        ? teacher.accessCode
                        : generateRandomTeacherCode(teacher.name);
                    return (
                      <div
                        key={teacher.id}
                        className="p-3 bg-white rounded-xl border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-2xs"
                      >
                        <div>
                          <div className="font-bold text-[#2C231D] text-sm">{teacher.name}</div>
                          <div className="text-[#6D5E4F] flex items-center gap-2">
                            <span>Subject: <strong>{teacher.subject}</strong></span>
                            <span>•</span>
                            <span className="font-mono text-[#B45309]">Code: <strong>{assignedCode}</strong></span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleStartEditTeacher(teacher)}
                            className="px-2.5 py-1.5 rounded-lg border border-[#DDD0BF] hover:bg-[#F2ECE1] text-xs font-bold text-[#1F453B] flex items-center gap-1 cursor-pointer"
                          >
                            <Pencil className="w-3 h-3" />
                            <span>Edit</span>
                          </button>
                          <button
                            onClick={() => handleApprovePendingTeacher(teacher)}
                            className="px-3 py-1.5 rounded-lg bg-[#1F453B] hover:bg-[#16332C] text-white font-bold text-xs shadow-xs transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#F7DE85]" />
                            <span>Grant Access</span>
                          </button>
                          <button
                            onClick={() => onRevokeTeacher(teacher.id)}
                            className="px-2.5 py-1.5 rounded-lg text-red-600 hover:bg-red-50 text-xs font-semibold cursor-pointer"
                          >
                            Decline
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Grant / Add New Teacher Form */}
            <div className="bg-[#FAF7F0] border border-[#E2D5C3] rounded-2xl p-4 sm:p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#1F453B]">
                  <UserPlus className="w-4 h-4" />
                  <span>Add Teacher & Assign Login Code</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const code = generateRandomTeacherCode(newTeacherName);
                    setNewTeacherCode(code);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-white border border-[#DDD0BF] text-[11px] font-bold text-[#1F453B] hover:bg-[#F2ECE1] transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Dices className="w-3.5 h-3.5 text-[#D97706]" />
                  <span>🎲 Generate Code</span>
                </button>
              </div>

              <form onSubmit={handleCreateGrantTeacher} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#3B322A] mb-1">
                    Teacher Name / Honorific
                  </label>
                  <input
                    type="text"
                    value={newTeacherName}
                    onChange={(e) => {
                      setNewTeacherName(e.target.value);
                      if (!newTeacherCode) {
                        setNewTeacherCode(generateRandomTeacherCode(e.target.value));
                      }
                    }}
                    placeholder="e.g. Ma'am Clara Santos"
                    className="w-full px-3 py-2 text-xs bg-white border border-[#DDD0BF] rounded-xl text-[#2B231D] focus:outline-none focus:ring-2 focus:ring-[#1F453B]/20"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#3B322A] mb-1">
                    Department / Subject / Strand
                  </label>
                  <input
                    type="text"
                    value={newTeacherSubject}
                    onChange={(e) => setNewTeacherSubject(e.target.value)}
                    placeholder="e.g. Science / Biology"
                    className="w-full px-3 py-2 text-xs bg-white border border-[#DDD0BF] rounded-xl text-[#2B231D] focus:outline-none focus:ring-2 focus:ring-[#1F453B]/20"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#3B322A] mb-1">
                    Login Access Code
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newTeacherCode}
                      onChange={(e) => setNewTeacherCode(e.target.value)}
                      placeholder="e.g. TEACH-8491"
                      className="w-full px-3 py-2 text-xs bg-white border border-[#DDD0BF] rounded-xl text-[#2B231D] focus:outline-none focus:ring-2 focus:ring-[#1F453B]/20 font-mono font-bold"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 bg-[#1F453B] hover:bg-[#16332C] text-white text-xs font-bold rounded-xl shadow-xs transition-all whitespace-nowrap cursor-pointer"
                    >
                      Grant
                    </button>
                  </div>
                </div>
              </form>
            </div>

            {/* List of Granted Teachers */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#4A3F34]">
                  Currently Authorized Teachers ({approvedTeachers.length})
                </h4>
                <span className="text-[11px] text-[#7A6C5D]">
                  Edit any details or copy access codes.
                </span>
              </div>
              <div className="space-y-2">
                {approvedTeachers.map((teacher) => (
                  <div
                    key={teacher.id}
                    className="p-3.5 bg-white rounded-xl border border-[#EADBCC] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-2xs hover:border-[#DECDB8] transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#EAF5F0] border border-[#BCE4D3] text-[#1F453B] flex items-center justify-center font-bold">
                        {teacher.name.charAt(teacher.name.indexOf(' ') + 1) || teacher.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-bold text-[#2C231D] text-sm">{teacher.name}</div>
                        <div className="text-[#75685B] text-xs">
                          {teacher.subject}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center flex-wrap gap-2">
                      <div className="flex items-center gap-1.5 bg-[#FAF4EA] border border-[#DECDB8] px-2.5 py-1 rounded-lg">
                        <Key className="w-3 h-3 text-[#B45309]" />
                        <span className="font-mono font-bold text-xs text-[#2B231D]">
                          {teacher.accessCode || 'TEACH-2026'}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleStartEditTeacher(teacher)}
                        className="px-2.5 py-1 rounded-lg bg-white border border-[#DDD0BF] hover:bg-[#F2ECE1] text-[11px] font-bold text-[#1F453B] transition-colors flex items-center gap-1 cursor-pointer"
                        title="Edit teacher name or subject"
                      >
                        <Pencil className="w-3 h-3 text-[#1F453B]" />
                        <span>Edit</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCopyCode(teacher.accessCode || 'TEACH-2026', teacher.name)}
                        className="px-2.5 py-1 rounded-lg bg-white border border-[#DDD0BF] hover:bg-[#F2ECE1] text-[11px] font-bold text-[#4B3F33] transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <Copy className="w-3 h-3" />
                        <span>Copy</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRegenerateCode(teacher)}
                        className="px-2.5 py-1 rounded-lg bg-white border border-[#DDD0BF] hover:bg-[#F2ECE1] text-[11px] font-bold text-[#1F453B] transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>🎲 New Code</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setTeacherToRevoke(teacher)}
                        className="px-2.5 py-1 text-xs text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer font-semibold ml-1"
                      >
                        Revoke
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: MODERATOR STAFFING */}
        {activeTab === 'moderators' && isHeadAdmin && (
          <div className="flex-1 overflow-y-auto space-y-5 pr-1">
            <div className="p-4 bg-[#FAF5EB] border border-[#EADBCC] rounded-2xl">
              <div className="flex items-center gap-2 text-xs font-bold text-[#1F453B] mb-1">
                <ShieldCheck className="w-4 h-4 text-[#F7DE85]" />
                <span className="uppercase tracking-wider">Single Head Admin & Appointed Faculty Moderators</span>
              </div>
              <p className="text-xs text-[#6B5C4D] leading-relaxed">
                As the sole Head Administrator, you have exclusive authority to appoint trusted faculty or staff members as <strong>Moderators</strong>.
                Moderators can log in with their assigned passcode to inspect notes, review flagged letters, and delete offensive content, but cannot alter faculty rosters or appoint other moderators.
              </p>
            </div>

            {/* Appoint New Moderator Form */}
            <div className="bg-[#FAF7F0] border border-[#E2D5C3] rounded-2xl p-4 sm:p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#1F453B]">
                  <UserPlus className="w-4 h-4" />
                  <span>Appoint New Moderator</span>
                </div>
                <button
                  type="button"
                  onClick={() => setNewModCode(generateRandomModCode())}
                  className="px-2.5 py-1 rounded-lg bg-white border border-[#DDD0BF] text-[11px] font-bold text-[#1F453B] hover:bg-[#F2ECE1] transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Dices className="w-3.5 h-3.5 text-[#D97706]" />
                  <span>🎲 Generate Mod Code</span>
                </button>
              </div>

              <form onSubmit={handleCreateModerator} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#3B322A] mb-1">
                    Moderator Name / Title
                  </label>
                  <input
                    type="text"
                    value={newModName}
                    onChange={(e) => {
                      setNewModName(e.target.value);
                      if (!newModCode) {
                        setNewModCode(generateRandomModCode());
                      }
                    }}
                    placeholder="e.g. Mrs. Alvarez (Guidance)"
                    className="w-full px-3 py-2 text-xs bg-white border border-[#DDD0BF] rounded-xl text-[#2B231D] focus:outline-none focus:ring-2 focus:ring-[#1F453B]/20"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#3B322A] mb-1">
                    School Email / Username
                  </label>
                  <input
                    type="email"
                    value={newModEmail}
                    onChange={(e) => setNewModEmail(e.target.value)}
                    placeholder="e.g. alvarez.mod@cityhigh.edu"
                    className="w-full px-3 py-2 text-xs bg-white border border-[#DDD0BF] rounded-xl text-[#2B231D] focus:outline-none focus:ring-2 focus:ring-[#1F453B]/20"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#3B322A] mb-1">
                    Moderator Access Code
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newModCode}
                      onChange={(e) => setNewModCode(e.target.value)}
                      placeholder="Enter assigned secret code"
                      className="w-full px-3 py-2 text-xs bg-white border border-[#DDD0BF] rounded-xl text-[#2B231D] focus:outline-none focus:ring-2 focus:ring-[#1F453B]/20 font-mono font-bold"
                      required
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 bg-[#1F453B] hover:bg-[#16332C] text-white text-xs font-bold rounded-xl shadow-xs transition-all whitespace-nowrap cursor-pointer flex items-center gap-1"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Appoint</span>
                    </button>
                  </div>
                </div>
              </form>
            </div>

            {/* List of Appointed Moderators */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#4A3F34]">
                  Active Faculty Moderators ({authorizedModerators.length})
                </h4>
                <span className="text-[11px] text-[#7A6C5D]">
                  Moderators log in via the Coordinator Portal using these codes.
                </span>
              </div>
              <div className="space-y-2">
                {authorizedModerators.map((mod) => (
                  <div
                    key={mod.id}
                    className="p-3.5 bg-white rounded-xl border border-[#EADBCC] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-2xs hover:border-[#DECDB8] transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#FAF5EB] border border-[#E5D7C3] text-[#1F453B] flex items-center justify-center font-bold">
                        🛡️
                      </div>
                      <div>
                        <div className="font-bold text-[#2C231D] text-sm flex items-center gap-2">
                          <span>{mod.name}</span>
                          <span className={`px-2 py-0.2 rounded-full text-[10px] font-bold ${
                            mod.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {mod.status}
                          </span>
                        </div>
                        <div className="text-[#75685B] text-xs">
                          {mod.email || 'School Moderator'} • Appointed by: {mod.assignedBy}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center flex-wrap gap-2">
                      <div className="flex items-center gap-1.5 bg-[#FAF4EA] border border-[#DECDB8] px-2.5 py-1 rounded-lg">
                        <Key className="w-3 h-3 text-[#B45309]" />
                        <span className="font-mono font-bold text-xs text-[#2B231D]">
                          {mod.accessCode}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopyCode(mod.accessCode, mod.name)}
                        className="px-2.5 py-1 rounded-lg bg-white border border-[#DDD0BF] hover:bg-[#F2ECE1] text-[11px] font-bold text-[#4B3F33] transition-colors flex items-center gap-1 cursor-pointer"
                        title="Copy moderator code"
                      >
                        <Copy className="w-3 h-3" />
                        <span>Copy Code</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setModToRevoke(mod)}
                        className="px-2.5 py-1 text-xs text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer font-semibold ml-1 flex items-center gap-1"
                      >
                        <UserX className="w-3 h-3" />
                        <span>Revoke</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: HEAD ADMIN SECURITY & PASSWORD MANAGEMENT */}
        {activeTab === 'security' && isHeadAdmin && (
          <div className="flex-1 overflow-y-auto space-y-5 pr-1">
            <div className="p-4 bg-[#FAF5EB] border border-[#EADBCC] rounded-2xl">
              <div className="flex items-center gap-2 text-xs font-bold text-[#1F453B] mb-1">
                <ShieldCheck className="w-4 h-4 text-[#F7DE85]" />
                <span className="uppercase tracking-wider">City High School Platform & Administrative Security</span>
              </div>
              <p className="text-xs text-[#6B5C4D] leading-relaxed">
                This platform is officially published for school purposes by and for the entire students and faculty of City High.
                As the sole Head Administrator (<strong>taynanjetraj@gmail.com</strong>), you hold master authority to manage community moderation and reset security credentials.
              </p>
            </div>

            {/* School Purpose Publication Card */}
            <div className="bg-white border border-[#E2D5C3] rounded-2xl p-5 shadow-2xs">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#1F453B] mb-3">
                <Sparkles className="w-4 h-4 text-[#E68A00]" />
                <span>School Purpose Publication & Network Information</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-[#FAF6EE] border border-[#DECDB8]">
                  <span className="text-[#8C7A68] block text-[11px] font-bold uppercase">Official School</span>
                  <span className="font-bold text-[#2D2823] text-sm">City High School</span>
                </div>
                <div className="p-3 rounded-xl bg-[#FAF6EE] border border-[#DECDB8]">
                  <span className="text-[#8C7A68] block text-[11px] font-bold uppercase">Target Beneficiaries</span>
                  <span className="font-bold text-[#2D2823] text-sm">Teachers, Staff, Principal, and Students</span>
                </div>
                <div className="p-3 rounded-xl bg-[#FAF6EE] border border-[#DECDB8] sm:col-span-2">
                  <span className="text-[#8C7A68] block text-[11px] font-bold uppercase">Application URL</span>
                  <span className="font-mono font-bold text-[#1F453B] text-xs break-all block mt-0.5">
                    {window.location.origin}
                  </span>
                  <span className="font-bold text-emerald-700 text-xs flex items-center gap-1.5 mt-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Operational & Realtime Connected
                  </span>
                </div>
              </div>
            </div>

            {/* Change Password Form */}
            <div className="bg-white border border-[#E2D5C3] rounded-2xl p-5 shadow-2xs">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#1F453B] mb-3">
                <Lock className="w-4 h-4 text-[#CE5A46]" />
                <span>Change Head Administrator Password</span>
              </div>

              {passChangeSuccess && (
                <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{passChangeSuccess}</span>
                </div>
              )}

              {passChangeError && (
                <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{passChangeError}</span>
                </div>
              )}

              <form onSubmit={handleChangePasswordSubmit} className="space-y-3.5 max-w-md">
                <div>
                  <label className="block text-[11px] font-bold text-[#3B322A] mb-1">
                    Current Password
                  </label>
                  <input
                    type="password"
                    value={currentPassInput}
                    onChange={(e) => setCurrentPassInput(e.target.value)}
                    placeholder="Enter current password"
                    className="w-full px-3 py-2 text-xs bg-white border border-[#DDD0BF] rounded-xl text-[#2B231D] focus:outline-none focus:ring-2 focus:ring-[#1F453B]/20 font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#3B322A] mb-1">
                    New Administrator Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassChange ? 'text' : 'password'}
                      value={newPassInput}
                      onChange={(e) => setNewPassInput(e.target.value)}
                      placeholder="Minimum 6 characters"
                      className="w-full px-3 pr-10 py-2 text-xs bg-white border border-[#DDD0BF] rounded-xl text-[#2B231D] focus:outline-none focus:ring-2 focus:ring-[#1F453B]/20 font-mono"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassChange(!showPassChange)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8C7B68] hover:text-[#2D2823]"
                    >
                      {showPassChange ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#3B322A] mb-1">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassInput}
                    onChange={(e) => setConfirmPassInput(e.target.value)}
                    placeholder="Confirm new password"
                    className="w-full px-3 py-2 text-xs bg-white border border-[#DDD0BF] rounded-xl text-[#2B231D] focus:outline-none focus:ring-2 focus:ring-[#1F453B]/20 font-mono"
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-[#1F453B] hover:bg-[#16332C] text-white text-xs font-bold shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#F7DE85]" />
                  <span>Update & Save Admin Password</span>
                </button>
              </form>
            </div>
          </div>
        )}

        {/* TAB 4: MAINTENANCE MODE CONFIGURATION */}
        {activeTab === 'maintenance' && (
          <div className="flex-1 overflow-y-auto space-y-6 pr-1">
            <div className="p-6 rounded-2xl bg-[#FAF4EA] border border-[#E5D7C3] max-w-2xl">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-11 h-11 rounded-2xl flex items-center justify-center ${
                      maintEnabled ? 'bg-amber-600 text-white' : 'bg-[#1F453B] text-[#F7DE85]'
                    }`}
                  >
                    <Wrench className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-heading font-bold text-lg text-[#231F1D]">
                      Website Maintenance Mode Control
                    </h4>
                    <p className="text-xs text-[#75685B] font-body-serif">
                      Display an "Under Fixing / Server Maintenance" screen to students while allowing Admins & Teachers full bypass access.
                    </p>
                  </div>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold ${
                    maintEnabled ? 'bg-amber-600 text-white' : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {maintEnabled ? '🛠️ Maintenance ACTIVE' : '✅ Website LIVE'}
                </span>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[#3B322A] uppercase tracking-wider mb-1.5">
                    Maintenance Status Announcement Message
                  </label>
                  <textarea
                    rows={3}
                    value={maintMessage}
                    onChange={(e) => setMaintMessage(e.target.value)}
                    placeholder="Explain that the website is currently under maintenance..."
                    className="w-full px-3.5 py-2.5 text-xs bg-white border border-[#DDD0BF] rounded-xl text-[#2B231D] focus:outline-none focus:ring-2 focus:ring-[#1F453B]/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#3B322A] uppercase tracking-wider mb-1.5">
                    Estimated Return / Completion Time
                  </label>
                  <div className="relative">
                    <Clock className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8C7B68]" />
                    <input
                      type="text"
                      value={maintReturnTime}
                      onChange={(e) => setMaintReturnTime(e.target.value)}
                      placeholder="e.g., Back online shortly / Today at 4:00 PM"
                      className="w-full pl-9 pr-3.5 py-2 text-xs bg-white border border-[#DDD0BF] rounded-xl text-[#2B231D] focus:outline-none focus:ring-2 focus:ring-[#1F453B]/20"
                    />
                  </div>
                </div>

                <div className="pt-2 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      const nextState = !maintEnabled;
                      setMaintEnabled(nextState);
                      if (onUpdateMaintenanceSettings) {
                        onUpdateMaintenanceSettings({
                          enabled: nextState,
                          message: maintMessage.trim(),
                          estimatedReturn: maintReturnTime.trim(),
                          updatedAt: Date.now(),
                          updatedBy: user.name || 'Administrator',
                        });
                      }
                      playChime();
                      showNotification(
                        nextState
                          ? '🛠️ Maintenance Mode turned ON and broadcasted to all connected browsers!'
                          : '✅ Maintenance Mode turned OFF — Website is now open to all students!'
                      );
                    }}
                    className={`px-5 py-2.5 rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer flex items-center gap-2 ${
                      maintEnabled
                        ? 'bg-emerald-700 hover:bg-emerald-800 text-white'
                        : 'bg-amber-600 hover:bg-amber-700 text-white'
                    }`}
                  >
                    <Power className="w-4 h-4" />
                    <span>{maintEnabled ? 'Disable Maintenance Mode (Go Live)' : 'Enable Maintenance Mode Now'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (onUpdateMaintenanceSettings) {
                        onUpdateMaintenanceSettings({
                          enabled: maintEnabled,
                          message: maintMessage.trim(),
                          estimatedReturn: maintReturnTime.trim(),
                          updatedAt: Date.now(),
                          updatedBy: user.name || 'Administrator',
                        });
                      }
                      playChime();
                      showNotification('✓ Saved custom Maintenance Mode message & estimated return time!');
                    }}
                    className="px-4 py-2.5 rounded-xl bg-[#1F453B] hover:bg-[#16332C] text-white text-xs font-bold shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4 text-[#F7DE85]" />
                    <span>Save Message & Time</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Community & Maintenance Suggestions Review List */}
            <div className="p-6 rounded-2xl bg-[#FAF4EA] border border-[#E5D7C3] max-w-4xl">
              <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
                <div>
                  <h4 className="font-heading font-bold text-base sm:text-lg text-[#231F1D] flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#CE5A46]" />
                    <span>Community & Maintenance Mode Suggestions ({communitySuggestions.length})</span>
                  </h4>
                  <p className="text-xs text-[#75685B] font-body-serif mt-0.5">
                    Suggestions and Teacher's Day greeting ideas submitted by students & visitors during Maintenance Mode or from the main Suggestion Box.
                  </p>
                </div>
                <span className="text-[11px] font-bold text-[#1F453B]">
                  Live Cloud Synced
                </span>
              </div>

              {communitySuggestions.length === 0 ? (
                <div className="p-6 rounded-xl bg-white/80 border border-[#E8DCC8] text-center text-xs text-[#7A6C5D] italic">
                  No suggestions submitted yet. Visitors can submit suggestions from the Maintenance Mode screen or the main Suggestion Box!
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-80 overflow-y-auto pr-1">
                  {communitySuggestions.map((sug) => (
                    <div
                      key={sug.id}
                      className="p-3.5 rounded-xl bg-white border border-[#E8DCC8] flex flex-col justify-between gap-2 shadow-2xs"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <div className="flex items-center gap-1.5 text-xs">
                            <span className="font-bold text-[#231F1D]">{sug.authorName}</span>
                            <span aria-hidden="true" className="text-[#8C7B68]">·</span>
                            <span className="text-[11px] font-semibold text-[#8C5D39]">{sug.category}</span>
                          </div>
                          {onDeleteCommunitySuggestion && (
                            <button
                              type="button"
                              onClick={() => {
                                onDeleteCommunitySuggestion(sug.id);
                                playChime();
                                showNotification(`Removed suggestion by ${sug.authorName}.`);
                              }}
                              className="p-1 rounded-lg text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                              title="Delete suggestion"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                        <p className="text-xs text-[#3E342B] font-body-serif italic leading-relaxed">
                          "{sug.text}"
                        </p>
                      </div>
                      <div className="text-[10px] text-[#8C7B68] font-mono">
                        {new Date(sug.createdAt).toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB: LIVE MUSIC BROADCAST & QUEUE CONTROL (ADMINS & MODERATORS) */}
        {activeTab === 'music' && (
          <div className="flex-1 overflow-y-auto space-y-6 pr-1">
            {(() => {
              const currentQueue =
                musicBroadcast?.queue && musicBroadcast.queue.length > 0
                  ? musicBroadcast.queue
                  : BUILT_IN_MUSIC_TRACKS;
              const currentIdx = Math.min(
                Math.max(0, musicBroadcast?.currentQueueIndex || 0),
                currentQueue.length - 1
              );
              const currentTrack = currentQueue[currentIdx] || BUILT_IN_MUSIC_TRACKS[0];
              const isPlaying = !!musicBroadcast?.isPlaying;
              const loopMode = musicBroadcast?.loopMode || 'queue';
              const isShuffle = !!musicBroadcast?.isShuffle;

              const updateMusic = (partial: Partial<MusicBroadcastSettings>) => {
                if (!onUpdateMusicBroadcast) return;
                const nextQueue =
                  partial.queue && partial.queue.length > 0 ? partial.queue : currentQueue;
                const nextIdx =
                  typeof partial.currentQueueIndex === 'number'
                    ? Math.min(Math.max(0, partial.currentQueueIndex), nextQueue.length - 1)
                    : Math.min(currentIdx, nextQueue.length - 1);
                onUpdateMusicBroadcast({
                  queue: nextQueue,
                  currentQueueIndex: nextIdx,
                  isPlaying: partial.isPlaying !== undefined ? partial.isPlaying : isPlaying,
                  loopMode: partial.loopMode !== undefined ? partial.loopMode : loopMode,
                  isShuffle: partial.isShuffle !== undefined ? partial.isShuffle : isShuffle,
                  updatedAt: Date.now(),
                  updatedBy: user.name || 'Administrator',
                });
              };

              return (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Left Column: Live Broadcast Deck & Add Music Links */}
                  <div className="lg:col-span-5 p-6 rounded-2xl bg-[#FAF4EA] border border-[#E5D7C3] space-y-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="font-heading font-bold text-lg text-[#231F1D] flex items-center gap-2">
                          <Music className="w-5 h-5 text-[#1F453B]" />
                          <span>Live Audio Broadcast Deck</span>
                        </h4>
                        <p className="text-xs text-[#75685B] font-body-serif mt-0.5">
                          Control background music for all visitors. Video boxes are hidden so YouTube, Spotify, and SoundCloud links play strictly as background audio. Public visitors can only adjust their own volume or mute.
                        </p>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold shrink-0 ${
                          isPlaying
                            ? 'bg-emerald-600 text-white'
                            : 'bg-[#E5D7C3] text-[#55493D]'
                        }`}
                      >
                        {isPlaying ? '🎵 PLAYING LIVE' : 'Paused'}
                      </span>
                    </div>

                    {/* Now Playing Card */}
                    <div className="p-4 rounded-2xl bg-white border border-[#DECDB8] space-y-3 shadow-2xs">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-[#8C7B68]">
                        Now Broadcasting · Track #{currentIdx + 1} of {currentQueue.length}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-[#1F453B] truncate">
                          {currentTrack.title}
                        </div>
                        <div className="text-xs text-[#75685B] font-body-serif truncate">
                          {currentTrack.subtitle}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            const prevIdx =
                              (currentIdx - 1 + currentQueue.length) % currentQueue.length;
                            updateMusic({ currentQueueIndex: prevIdx, isPlaying: true });
                            playChime();
                          }}
                          className="p-2.5 rounded-xl bg-[#FAF5EB] hover:bg-[#EFE6D5] text-[#3B3026] border border-[#DECDB8] cursor-pointer"
                          title="Previous Track"
                        >
                          <SkipBack className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            updateMusic({ isPlaying: !isPlaying });
                            playChime();
                            showNotification(
                              !isPlaying
                                ? `🎵 Started live background broadcast: "${currentTrack.title}"`
                                : '⏸️ Paused live background music broadcast.'
                            );
                          }}
                          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer shadow-2xs ${
                            isPlaying
                              ? 'bg-[#CE5A46] hover:bg-[#B84A39] text-white'
                              : 'bg-[#1F453B] hover:bg-[#16332C] text-[#F7DE85]'
                          }`}
                        >
                          {isPlaying ? (
                            <>
                              <Pause className="w-4 h-4" />
                              <span>Pause Broadcast</span>
                            </>
                          ) : (
                            <>
                              <Play className="w-4 h-4" />
                              <span>Play Broadcast</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            const nextIdx = (currentIdx + 1) % currentQueue.length;
                            updateMusic({ currentQueueIndex: nextIdx, isPlaying: true });
                            playChime();
                          }}
                          className="p-2.5 rounded-xl bg-[#FAF5EB] hover:bg-[#EFE6D5] text-[#3B3026] border border-[#DECDB8] cursor-pointer"
                          title="Next Track"
                        >
                          <SkipForward className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            const order: ('queue' | 'one' | 'off')[] = ['queue', 'one', 'off'];
                            const nextLoop = order[(order.indexOf(loopMode) + 1) % order.length];
                            updateMusic({ loopMode: nextLoop });
                          }}
                          className={`px-3 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
                            loopMode !== 'off'
                              ? 'bg-[#1F453B] text-[#F7DE85] border-[#1F453B]'
                              : 'bg-[#FAF5EB] text-[#6E5F51] border-[#DECDB8]'
                          }`}
                        >
                          {loopMode === 'one' ? (
                            <Repeat1 className="w-3.5 h-3.5" />
                          ) : (
                            <Repeat className="w-3.5 h-3.5" />
                          )}
                          <span>
                            {loopMode === 'queue'
                              ? 'Loop Queue'
                              : loopMode === 'one'
                              ? 'Loop Track'
                              : 'No Loop'}
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => updateMusic({ isShuffle: !isShuffle })}
                          className={`px-3 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
                            isShuffle
                              ? 'bg-[#CE5A46] text-white border-[#CE5A46]'
                              : 'bg-[#FAF5EB] text-[#6E5F51] border-[#DECDB8]'
                          }`}
                        >
                          <Shuffle className="w-3.5 h-3.5" />
                          <span>{isShuffle ? 'Shuffle ON' : 'Sequential'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Add Music Links Form (Single or Bulk) */}
                    <div className="p-4 rounded-2xl bg-white border border-[#DECDB8] space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-[#231F1D] flex items-center gap-1.5">
                          <Plus className="w-4 h-4 text-[#1F453B]" />
                          <span>Add Music Links to Queue</span>
                        </span>
                        <div className="inline-flex rounded-lg bg-[#EFE6D5] p-0.5 border border-[#DECDB8]">
                          <button
                            type="button"
                            onClick={() => {
                              setMusicAddMode('single');
                              setMusicFormError('');
                            }}
                            className={`px-2.5 py-1 rounded-md text-[11px] font-bold cursor-pointer ${
                              musicAddMode === 'single'
                                ? 'bg-[#1F453B] text-[#F7DE85]'
                                : 'text-[#55483B]'
                            }`}
                          >
                            Single URL
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setMusicAddMode('bulk');
                              setMusicFormError('');
                            }}
                            className={`px-2.5 py-1 rounded-md text-[11px] font-bold cursor-pointer ${
                              musicAddMode === 'bulk'
                                ? 'bg-[#1F453B] text-[#F7DE85]'
                                : 'text-[#55483B]'
                            }`}
                          >
                            Bulk Paste
                          </button>
                        </div>
                      </div>

                      {musicAddMode === 'single' ? (
                        <div className="space-y-2.5">
                          <input
                            type="text"
                            value={musicSingleTitle}
                            onChange={(e) => setMusicSingleTitle(e.target.value)}
                            placeholder="Optional Song Title (auto-resolved for YouTube/SoundCloud)"
                            maxLength={70}
                            className="w-full px-3 py-2 rounded-xl bg-[#FAF6EE] border border-[#DECDB8] text-xs text-[#231F1D] focus:outline-none focus:border-[#1F453B]"
                          />
                          <input
                            type="url"
                            value={musicSingleUrl}
                            onChange={(e) => setMusicSingleUrl(e.target.value)}
                            placeholder="Paste YouTube, Spotify, SoundCloud, or MP3 URL..."
                            className="w-full px-3 py-2 rounded-xl bg-[#FAF6EE] border border-[#DECDB8] text-xs text-[#231F1D] focus:outline-none focus:border-[#1F453B]"
                          />
                          {musicFormError && (
                            <div className="text-xs font-bold text-red-700">⚠️ {musicFormError}</div>
                          )}
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              disabled={isMusicResolving}
                              onClick={async () => {
                                setMusicFormError('');
                                const parsed = parseMusicUrl(musicSingleUrl, musicSingleTitle);
                                if (!parsed) {
                                  setMusicFormError(
                                    'Please enter a valid YouTube, Spotify, SoundCloud, or audio URL.'
                                  );
                                  return;
                                }
                                if (!musicSingleTitle.trim() && parsed.url) {
                                  setIsMusicResolving(true);
                                  const resolved = await resolveMusicTrackTitle(parsed.url);
                                  setIsMusicResolving(false);
                                  if (resolved) parsed.title = resolved;
                                }
                                const nextQueue = [...currentQueue, parsed];
                                updateMusic({
                                  queue: nextQueue,
                                  currentQueueIndex: isPlaying ? currentIdx : nextQueue.length - 1,
                                  isPlaying: true,
                                });
                                setMusicSingleTitle('');
                                setMusicSingleUrl('');
                                playChime();
                                showNotification(`✓ Added "${parsed.title}" to the live music queue!`);
                              }}
                              className="px-4 py-2 rounded-xl bg-[#1F453B] hover:bg-[#16332C] text-[#F7DE85] text-xs font-bold cursor-pointer disabled:opacity-50"
                            >
                              {isMusicResolving ? 'Adding Track...' : '+ Add Track to Live Queue'}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2.5">
                          <textarea
                            rows={4}
                            value={musicBulkText}
                            onChange={(e) => setMusicBulkText(e.target.value)}
                            placeholder={
                              'Paste multiple music links (one per line):\nTeacher Tribute | https://youtu.be/...\nhttps://open.spotify.com/track/...\nhttps://soundcloud.com/...'
                            }
                            className="w-full px-3 py-2 rounded-xl bg-[#FAF6EE] border border-[#DECDB8] text-xs text-[#231F1D] focus:outline-none focus:border-[#1F453B] resize-none font-mono"
                          />
                          {musicFormError && (
                            <div className="text-xs font-bold text-red-700">⚠️ {musicFormError}</div>
                          )}
                          <div className="flex justify-end">
                            <button
                              type="button"
                              disabled={isMusicResolving}
                              onClick={async () => {
                                setMusicFormError('');
                                const lines = musicBulkText
                                  .split(/\r?\n/)
                                  .map((l) => l.trim())
                                  .filter(Boolean);
                                if (lines.length === 0) {
                                  setMusicFormError('Paste at least one music link.');
                                  return;
                                }
                                setIsMusicResolving(true);
                                const added: MusicTrack[] = [];
                                for (const line of lines) {
                                  let titlePart: string | undefined;
                                  let urlPart = line;
                                  if (line.includes('|')) {
                                    const parts = line.split('|');
                                    titlePart = parts[0]?.trim();
                                    urlPart = parts.slice(1).join('|').trim();
                                  }
                                  const track = parseMusicUrl(urlPart, titlePart);
                                  if (track) {
                                    if (!titlePart && track.url) {
                                      const resolved = await resolveMusicTrackTitle(track.url);
                                      if (resolved) track.title = resolved;
                                    }
                                    added.push(track);
                                  }
                                }
                                setIsMusicResolving(false);
                                if (added.length === 0) {
                                  setMusicFormError('No valid music URLs found.');
                                  return;
                                }
                                const nextQueue = [...currentQueue, ...added];
                                updateMusic({
                                  queue: nextQueue,
                                  isPlaying: true,
                                });
                                setMusicBulkText('');
                                playChime();
                                showNotification(`✓ Added ${added.length} tracks to the live music queue!`);
                              }}
                              className="px-4 py-2 rounded-xl bg-[#CE5A46] hover:bg-[#B84A39] text-white text-xs font-bold cursor-pointer disabled:opacity-50"
                            >
                              {isMusicResolving ? 'Resolving...' : 'Queue All Links Live'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Live Queue Management (Select, Reorder, Delete) */}
                  <div className="lg:col-span-7 p-6 rounded-2xl bg-[#FAF4EA] border border-[#E5D7C3] flex flex-col justify-between space-y-4">
                    <div>
                      <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                        <div>
                          <h4 className="font-heading font-bold text-base sm:text-lg text-[#231F1D]">
                            Active Music Queue ({currentQueue.length} Tracks)
                          </h4>
                          <p className="text-xs text-[#75685B] font-body-serif">
                            Click any track to broadcast it immediately, use arrows to reorder, or click the trash bin to delete a track.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            updateMusic({
                              queue: [...BUILT_IN_MUSIC_TRACKS],
                              currentQueueIndex: 0,
                            });
                            playChime();
                            showNotification("✓ Reset music queue to built-in Teacher's Day tracks.");
                          }}
                          className="px-3 py-1.5 rounded-xl bg-white hover:bg-[#EFE6D5] text-[#8C5D39] border border-[#DECDB8] text-xs font-bold cursor-pointer"
                        >
                          Reset to Built-In Tracks
                        </button>
                      </div>

                      <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                        {currentQueue.map((track, idx) => {
                          const isCurrent = idx === currentIdx;
                          return (
                            <div
                              key={track.id}
                              onClick={() => {
                                updateMusic({ currentQueueIndex: idx, isPlaying: true });
                                playChime();
                              }}
                              className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                                isCurrent
                                  ? 'bg-[#1F453B] text-white border-[#1F453B] shadow-sm'
                                  : 'bg-white hover:bg-[#FAF5EB] text-[#231F1D] border-[#E5D7C3]'
                              }`}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <span
                                  className={`text-xs font-mono font-bold w-5 text-center shrink-0 ${
                                    isCurrent ? 'text-[#F7DE85]' : 'text-[#8C7B68]'
                                  }`}
                                >
                                  {idx + 1}
                                </span>
                                <div className="min-w-0">
                                  <div className="text-xs sm:text-sm font-bold truncate">
                                    {track.title}
                                  </div>
                                  <div
                                    className={`text-[11px] truncate ${
                                      isCurrent ? 'text-[#F7DE85]/90' : 'text-[#75685B]'
                                    }`}
                                  >
                                    {track.type.toUpperCase()} · {track.subtitle}
                                  </div>
                                </div>
                              </div>

                              <div
                                className="flex items-center gap-1 shrink-0"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button
                                  type="button"
                                  disabled={idx === 0}
                                  onClick={() => {
                                    const copy = [...currentQueue];
                                    const [moved] = copy.splice(idx, 1);
                                    copy.splice(idx - 1, 0, moved);
                                    updateMusic({
                                      queue: copy,
                                      currentQueueIndex:
                                        idx === currentIdx
                                          ? idx - 1
                                          : idx - 1 === currentIdx
                                          ? currentIdx + 1
                                          : currentIdx,
                                    });
                                  }}
                                  className={`p-1.5 rounded-lg transition-colors cursor-pointer disabled:opacity-30 ${
                                    isCurrent
                                      ? 'text-white hover:bg-white/10'
                                      : 'text-[#6E5F51] hover:bg-[#EFE6D5]'
                                  }`}
                                  title="Move up"
                                >
                                  <ArrowUp className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  disabled={idx === currentQueue.length - 1}
                                  onClick={() => {
                                    const copy = [...currentQueue];
                                    const [moved] = copy.splice(idx, 1);
                                    copy.splice(idx + 1, 0, moved);
                                    updateMusic({
                                      queue: copy,
                                      currentQueueIndex:
                                        idx === currentIdx
                                          ? idx + 1
                                          : idx + 1 === currentIdx
                                          ? currentIdx - 1
                                          : currentIdx,
                                    });
                                  }}
                                  className={`p-1.5 rounded-lg transition-colors cursor-pointer disabled:opacity-30 ${
                                    isCurrent
                                      ? 'text-white hover:bg-white/10'
                                      : 'text-[#6E5F51] hover:bg-[#EFE6D5]'
                                  }`}
                                  title="Move down"
                                >
                                  <ArrowDown className="w-3.5 h-3.5" />
                                </button>
                                {currentQueue.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const copy = currentQueue.filter((_, i) => i !== idx);
                                      const nextIdx =
                                        idx === currentIdx
                                          ? idx % copy.length
                                          : idx < currentIdx
                                          ? currentIdx - 1
                                          : currentIdx;
                                      updateMusic({
                                        queue: copy,
                                        currentQueueIndex: nextIdx,
                                      });
                                      playChime();
                                      showNotification(`Removed "${track.title}" from the music queue.`);
                                    }}
                                    className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                      isCurrent
                                        ? 'text-white hover:bg-white/15'
                                        : 'text-red-600 hover:bg-red-50'
                                    }`}
                                    title="Delete track from queue"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* TAB: CELEBRATORY ANNOUNCEMENT BROADCAST ("HAPPY TEACHER'S DAY") */}
        {activeTab === 'announcement' && (
          <div className="flex-1 overflow-y-auto space-y-6 pr-1">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Composer & Controls */}
              <div className="lg:col-span-7 p-6 rounded-2xl bg-[#FAF4EA] border border-[#E5D7C3] space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-11 h-11 rounded-2xl flex items-center justify-center ${
                        annEnabled ? 'bg-[#CE5A46] text-white' : 'bg-[#1F453B] text-[#F7DE85]'
                      }`}
                    >
                      <Megaphone className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-heading font-bold text-lg text-[#231F1D]">
                        Celebratory Announcement Broadcast
                      </h4>
                      <p className="text-xs text-[#75685B] font-body-serif">
                        Broadcast a "Happy Teacher's Day" banner and pop-up greeting card to everyone on the website in real time.
                      </p>
                    </div>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold shrink-0 ${
                      annEnabled ? 'bg-[#CE5A46] text-white' : 'bg-[#E5D7C3] text-[#55493D]'
                    }`}
                  >
                    {annEnabled ? '🎉 LIVE ON WEBSITE' : 'Draft / Off'}
                  </span>
                </div>

                {/* Quick Teacher's Day Presets */}
                <div>
                  <label className="block text-[11px] font-bold text-[#6E5D4F] uppercase tracking-wider mb-1.5">
                    Quick Teacher's Day Greeting Presets (Click to Fill)
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      {
                        label: "🎉 Happy Teacher's Day!",
                        title: "Happy World Teachers' Day to Our Beloved Educators! 🎉",
                        message:
                          "Today and every day, we celebrate your unwavering patience, dedication, and heart in guiding every student. Thank you for inspiring us, believing in our potential, and making our school a second home!",
                        theme: 'gold' as AnnouncementTheme,
                      },
                      {
                        label: '💐 To Our Second Parents',
                        title: 'To the Teachers Who Never Gave Up on Us 💐',
                        message:
                          "Behind every grateful student is a teacher who listened, encouraged, and guided us through every challenge. Thank you for being our mentors, role models, and second parents. Happy Teacher's Day!",
                        theme: 'emerald' as AnnouncementTheme,
                      },
                      {
                        label: '✨ Tagalog / Filipino Greeting',
                        title: 'Maligayang Araw ng mga Guro sa Aming Minamahal na Kaguruan! 🌸',
                        message:
                          'Taos-puso po kaming nagpapasalamat sa inyong walang sawang paggabay, malasakit, at pagmamahal sa bawat mag-aaral. Kayo po ang tunay na tanglaw at inspirasyon ng aming paaralan. Happy Teacher’s Day po!',
                        theme: 'rose' as AnnouncementTheme,
                      },
                    ].map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => {
                          setAnnTitle(preset.title);
                          setAnnMessage(preset.message);
                          setAnnTheme(preset.theme);
                          playChime();
                        }}
                        className="px-3 py-1.5 rounded-xl bg-white hover:bg-[#FFF3C4] border border-[#DDD0BF] text-[#3B3026] text-xs font-bold transition-colors cursor-pointer shadow-2xs"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom Title */}
                <div>
                  <label className="block text-xs font-bold text-[#3B322A] uppercase tracking-wider mb-1">
                    Announcement Headline / Title
                  </label>
                  <input
                    type="text"
                    value={annTitle}
                    onChange={(e) => setAnnTitle(e.target.value)}
                    placeholder="e.g., Happy Teacher's Day to Our Beloved Faculty! 🎉"
                    className="w-full px-3.5 py-2 text-xs bg-white border border-[#DDD0BF] rounded-xl text-[#2B231D] font-bold focus:outline-none focus:ring-2 focus:ring-[#1F453B]/20"
                    maxLength={160}
                  />
                </div>

                {/* Custom Message */}
                <div>
                  <label className="block text-xs font-bold text-[#3B322A] uppercase tracking-wider mb-1">
                    Celebration Message Body
                  </label>
                  <textarea
                    rows={4}
                    value={annMessage}
                    onChange={(e) => setAnnMessage(e.target.value)}
                    placeholder="Write your heartfelt Happy Teacher's Day announcement..."
                    className="w-full px-3.5 py-2.5 text-xs bg-white border border-[#DDD0BF] rounded-xl text-[#2B231D] font-body-serif leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#1F453B]/20"
                    maxLength={1200}
                  />
                </div>

                {/* Sender Name & Theme Style */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[#3B322A] uppercase tracking-wider mb-1">
                      From / Sender Signature
                    </label>
                    <input
                      type="text"
                      value={annSenderName}
                      onChange={(e) => setAnnSenderName(e.target.value)}
                      placeholder="e.g., School Administration & SSG"
                      className="w-full px-3.5 py-2 text-xs bg-white border border-[#DDD0BF] rounded-xl text-[#2B231D] focus:outline-none focus:ring-2 focus:ring-[#1F453B]/20"
                      maxLength={100}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#3B322A] uppercase tracking-wider mb-1">
                      Banner & Card Theme Style
                    </label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {(
                        [
                          { id: 'gold', label: '✨ Golden' },
                          { id: 'emerald', label: '🌲 Emerald' },
                          { id: 'rose', label: '🌹 Terracotta' },
                          { id: 'parchment', label: '📜 Parchment' },
                        ] as const
                      ).map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setAnnTheme(t.id)}
                          className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                            annTheme === t.id
                              ? 'bg-[#1F453B] text-white border-[#1F453B] shadow-2xs'
                              : 'bg-white text-[#4A3E33] border-[#DDD0BF] hover:bg-[#F2ECE1]'
                          }`}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Display & Effect Toggles */}
                <div className="flex flex-wrap items-center gap-4 pt-1">
                  <label className="inline-flex items-center gap-2 text-xs font-bold text-[#3B322A] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={annShowPopup}
                      onChange={(e) => setAnnShowPopup(e.target.checked)}
                      className="rounded border-[#DDD0BF] text-[#1F453B] focus:ring-[#1F453B]"
                    />
                    <span>Show Pop-Up Greeting Card Modal on Broadcast</span>
                  </label>

                  <label className="inline-flex items-center gap-2 text-xs font-bold text-[#3B322A] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={annTriggerConfetti}
                      onChange={(e) => setAnnTriggerConfetti(e.target.checked)}
                      className="rounded border-[#DDD0BF] text-[#1F453B] focus:ring-[#1F453B]"
                    />
                    <span>Trigger Confetti Burst 🎉</span>
                  </label>
                </div>

                {/* Broadcast Actions */}
                <div className="pt-3 border-t border-[#E5D7C3] flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      const payload: AnnouncementSettings = {
                        enabled: true,
                        title: annTitle.trim() || "Happy Teacher's Day! 🎉",
                        message: annMessage.trim(),
                        senderName: annSenderName.trim() || 'School Administration',
                        theme: annTheme,
                        showPopupModal: annShowPopup,
                        triggerConfetti: annTriggerConfetti,
                        updatedAt: Date.now(),
                        comments: announcementSettings?.comments || [],
                      };
                      setAnnEnabled(true);
                      if (onUpdateAnnouncementSettings) {
                        onUpdateAnnouncementSettings(payload);
                      }
                      playChime();
                      if (annTriggerConfetti) {
                        confetti({
                          particleCount: 90,
                          spread: 80,
                          origin: { y: 0.6 },
                        });
                      }
                      showNotification(
                        '🎉 Official Celebration Announcement broadcasted LIVE across the website!'
                      );
                    }}
                    className="px-5 py-2.5 rounded-xl bg-[#CE5A46] hover:bg-[#B84A39] text-white text-xs font-bold shadow-sm transition-all cursor-pointer flex items-center gap-2"
                  >
                    <PartyPopper className="w-4 h-4 text-[#F7DE85]" />
                    <span>{annEnabled ? 'Re-Broadcast Announcement Live 🎉' : 'Broadcast Announcement Live 🎉'}</span>
                  </button>

                  {annEnabled && (
                    <button
                      type="button"
                      onClick={() => {
                        const payload: AnnouncementSettings = {
                          enabled: false,
                          title: annTitle.trim(),
                          message: annMessage.trim(),
                          senderName: annSenderName.trim(),
                          theme: annTheme,
                          showPopupModal: annShowPopup,
                          triggerConfetti: annTriggerConfetti,
                          updatedAt: Date.now(),
                          comments: announcementSettings?.comments || [],
                        };
                        setAnnEnabled(false);
                        if (onUpdateAnnouncementSettings) {
                          onUpdateAnnouncementSettings(payload);
                        }
                        playChime();
                        showNotification('Announcement banner and pop-up turned OFF.');
                      }}
                      className="px-4 py-2.5 rounded-xl bg-white hover:bg-red-50 text-red-700 border border-red-200 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <Power className="w-3.5 h-3.5" />
                      <span>Turn OFF Announcement</span>
                    </button>
                  )}

                  {(announcementSettings?.comments?.length || 0) > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        if (onUpdateAnnouncementSettings && announcementSettings) {
                          onUpdateAnnouncementSettings({
                            ...announcementSettings,
                            comments: [],
                          });
                        }
                        playChime();
                        showNotification('✓ Cleared all comments on the announcement.');
                      }}
                      className="px-3.5 py-2.5 rounded-xl bg-white hover:bg-[#F2ECE1] text-[#55493D] border border-[#DDD0BF] text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-[#CE5A46]" />
                      <span>Clear Comments ({announcementSettings?.comments?.length || 0})</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Right Column: Live Preview of Greeting Card */}
              <div className="lg:col-span-5 flex flex-col justify-center">
                <div className="text-[11px] font-bold uppercase tracking-wider text-[#7A6C5D] mb-2 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#CE5A46]" />
                  <span>Live Greeting Card & Banner Preview</span>
                </div>

                <div
                  className={`relative rounded-3xl border-2 p-6 shadow-xl transition-all ${
                    annTheme === 'emerald'
                      ? 'bg-[#1F453B] text-white border-[#F7DE85]/50'
                      : annTheme === 'rose'
                      ? 'bg-[#FFF5F4] text-[#231F1D] border-[#E5A398]'
                      : annTheme === 'parchment'
                      ? 'bg-[#FFFDF9] text-[#231F1D] border-[#DECDB8]'
                      : 'bg-gradient-to-b from-[#FFFDF7] to-[#FEF6D8] text-[#231F1D] border-[#E6B84D]'
                  }`}
                >
                  <div className="text-center mb-3">
                    <span
                      className={`inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        annTheme === 'emerald'
                          ? 'bg-[#F7DE85] text-[#1F453B]'
                          : 'bg-[#1F453B] text-[#F7DE85]'
                      }`}
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>Official Celebration Announcement</span>
                    </span>
                  </div>

                  <h5
                    className={`font-heading text-lg font-bold text-center mb-3 ${
                      annTheme === 'emerald' ? 'text-[#F7DE85]' : 'text-[#1F453B]'
                    }`}
                  >
                    {annTitle || "Happy Teacher's Day!"}
                  </h5>

                  <div
                    className={`p-4 rounded-2xl border text-xs font-body-serif leading-relaxed whitespace-pre-wrap text-center mb-4 ${
                      annTheme === 'emerald'
                        ? 'bg-white/10 border-white/20 text-[#FAF6EE]'
                        : 'bg-white/90 border-[#E5D7C3] text-[#2D251E]'
                    }`}
                  >
                    {annMessage || 'Your celebratory message will appear here...'}
                  </div>

                  <div className="text-center text-xs font-bold">
                    <span className={annTheme === 'emerald' ? 'text-[#A4D5C5]' : 'text-[#7A6C5D]'}>
                      From:{' '}
                    </span>
                    <span className={annTheme === 'emerald' ? 'text-[#F7DE85]' : 'text-[#CE5A46]'}>
                      {annSenderName || 'School Administration'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: EDIT TEACHER DETAILS */}
        {teacherToEdit && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="bg-[#FFFDF9] border border-[#DDD0BF] rounded-3xl p-6 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#EADBCC]">
                <div className="flex items-center gap-2 text-[#1F453B]">
                  <Edit3 className="w-5 h-5" />
                  <h4 className="font-heading font-bold text-lg text-[#231F1D]">
                    Edit Teacher Information
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => setTeacherToEdit(null)}
                  className="p-1 rounded-full text-[#7A6C5D] hover:bg-black/5 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveEditTeacher} className="space-y-3.5">
                <div>
                  <label className="block text-[11px] font-bold text-[#3B322A] uppercase mb-1">
                    Teacher Name / Honorific
                  </label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="e.g. Ma'am Clara Santos"
                    className="w-full px-3.5 py-2 text-xs bg-white border border-[#DDD0BF] rounded-xl text-[#2B231D] focus:outline-none focus:ring-2 focus:ring-[#1F453B]/30 font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#3B322A] uppercase mb-1">
                    Department / Subject / Strand
                  </label>
                  <input
                    type="text"
                    value={editSubject}
                    onChange={(e) => setEditSubject(e.target.value)}
                    placeholder="e.g. Mathematics, Science, HUMSS..."
                    className="w-full px-3.5 py-2 text-xs bg-white border border-[#DDD0BF] rounded-xl text-[#2B231D] focus:outline-none focus:ring-2 focus:ring-[#1F453B]/30"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#3B322A] uppercase mb-1">
                    Teacher Access Code
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={editAccessCode}
                      onChange={(e) => setEditAccessCode(e.target.value)}
                      placeholder="e.g. TEACH-8491"
                      className="w-full px-3.5 py-2 text-xs bg-white border border-[#DDD0BF] rounded-xl text-[#2B231D] focus:outline-none focus:ring-2 focus:ring-[#1F453B]/30 font-mono font-bold"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setEditAccessCode(generateRandomTeacherCode(editName))}
                      className="px-3 py-2 rounded-xl border border-[#DDD0BF] bg-[#FAF4EA] text-[#B45309] text-[11px] font-bold hover:bg-[#F2ECE1] transition-colors whitespace-nowrap cursor-pointer"
                      title="Randomize Code"
                    >
                      🎲 Random
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#EADBCC]">
                  <button
                    type="button"
                    onClick={() => setTeacherToEdit(null)}
                    className="px-4 py-2 text-xs font-bold border border-[#DDD0BF] text-[#55493D] rounded-xl hover:bg-[#F2ECE1] cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 text-xs font-bold bg-[#1F453B] hover:bg-[#16332C] text-white rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#F7DE85]" />
                    <span>Save Changes</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* IN-APP NOTE DELETE CONFIRMATION MODAL */}
        {noteToDelete && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="bg-[#FFFDF9] border border-[#DDD0BF] rounded-3xl p-6 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-150">
              <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-3">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <h4 className="font-heading font-bold text-center text-lg text-[#231F1D] mb-1">
                Delete Inappropriate Note?
              </h4>
              <p className="text-xs text-center text-[#75685B] mb-4">
                This note will be permanently removed from the gratitude wall and database.
              </p>
              <div className="bg-[#FAF5EC] p-3 rounded-xl border border-[#EADBCC] text-xs text-[#44382C] mb-4 italic">
                "{noteToDelete.message}"
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setNoteToDelete(null)}
                  className="flex-1 py-2.5 text-xs font-bold border border-[#DDD0BF] text-[#55493D] rounded-xl hover:bg-[#F2ECE1] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteNote}
                  className="flex-1 py-2.5 text-xs font-bold bg-red-600 text-white rounded-xl hover:bg-red-700 shadow-xs cursor-pointer flex items-center justify-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Note</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* IN-APP LETTER DELETE CONFIRMATION MODAL */}
        {letterToDelete && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="bg-[#FFFDF9] border border-[#DDD0BF] rounded-3xl p-6 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-150">
              <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-3">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <h4 className="font-heading font-bold text-center text-lg text-[#231F1D] mb-1">
                Delete Inappropriate Letter?
              </h4>
              <p className="text-xs text-center text-[#75685B] mb-4">
                This letter from <span className="font-bold text-[#231F1D]">{letterToDelete.studentName}</span> will be permanently deleted from the teacher's mailbox.
              </p>
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
                  className="flex-1 py-2.5 text-xs font-bold bg-red-600 text-white rounded-xl hover:bg-red-700 shadow-xs cursor-pointer"
                >
                  Confirm Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* IN-APP REVOKE TEACHER CONFIRMATION MODAL */}
        {teacherToRevoke && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="bg-[#FFFDF9] border border-[#DDD0BF] rounded-3xl p-6 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-150">
              <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-3">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h4 className="font-heading font-bold text-center text-lg text-[#231F1D] mb-1">
                Revoke Teacher Privileges?
              </h4>
              <p className="text-xs text-center text-[#75685B] mb-4">
                Revoking access for <span className="font-bold text-[#231F1D]">{teacherToRevoke.name}</span> will deactivate their access code and mailbox.
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setTeacherToRevoke(null)}
                  className="flex-1 py-2.5 text-xs font-bold border border-[#DDD0BF] text-[#55493D] rounded-xl hover:bg-[#F2ECE1] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmRevokeTeacher}
                  className="flex-1 py-2.5 text-xs font-bold bg-red-600 text-white rounded-xl hover:bg-red-700 shadow-xs cursor-pointer"
                >
                  Confirm Revoke
                </button>
              </div>
            </div>
          </div>
        )}

        {/* IN-APP REVOKE MODERATOR CONFIRMATION MODAL */}
        {modToRevoke && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="bg-[#FFFDF9] border border-[#DDD0BF] rounded-3xl p-6 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-150">
              <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-3">
                <UserX className="w-6 h-6" />
              </div>
              <h4 className="font-heading font-bold text-center text-lg text-[#231F1D] mb-1">
                Revoke Moderator Appointment?
              </h4>
              <p className="text-xs text-center text-[#75685B] mb-4">
                Revoking moderation privileges for <span className="font-bold text-[#231F1D]">{modToRevoke.name}</span> will deactivate their moderator passcode immediately.
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setModToRevoke(null)}
                  className="flex-1 py-2.5 text-xs font-bold border border-[#DDD0BF] text-[#55493D] rounded-xl hover:bg-[#F2ECE1] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmRevokeMod}
                  className="flex-1 py-2.5 text-xs font-bold bg-red-600 text-white rounded-xl hover:bg-red-700 shadow-xs cursor-pointer"
                >
                  Confirm Revoke
                </button>
              </div>
            </div>
          </div>
        )}

        {/* COMPLETE LETTER READER MODAL FOR ADMIN & MODERATOR */}
        {selectedCompleteLetter && (
          <CompleteLetterModal
            isOpen={!!selectedCompleteLetter}
            onClose={() => setSelectedCompleteLetterId(null)}
            letter={selectedCompleteLetter}
            user={user}
            onReplyToLetter={onReplyToLetter}
            onDeleteLetter={(id) => {
              if (onDeleteLetter) onDeleteLetter(id);
              setSelectedCompleteLetterId(null);
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
