import { useState, useEffect, useMemo, useRef } from 'react';
import {
  StudentNote,
  PhotoCard,
  UserSession,
  AuthorizedTeacher,
  StudentLetter,
  AuthorizedModerator,
  MaintenanceSettings,
  AnnouncementSettings,
  AnnouncementComment,
  TributeComment,
  CommunitySuggestion,
  MusicBroadcastSettings,
} from './types';
import {
  INITIAL_STUDENT_NOTES,
  INITIAL_PHOTO_CARDS,
  INITIAL_AUTHORIZED_TEACHERS,
  INITIAL_AUTHORIZED_MODERATORS,
  INITIAL_STUDENT_LETTERS,
  HEAD_ADMIN_CONFIG,
} from './data/initialNotes';
import { BUILT_IN_MUSIC_TRACKS } from './utils/audio';
import { Navbar } from './components/Navbar';
import { BackgroundDoodles } from './components/BackgroundDoodles';
import { HeroSection } from './components/HeroSection';
import { ClassLetterSection } from './components/ClassLetterSection';
import { GratitudeWallSection } from './components/GratitudeWallSection';
import { SuggestionsSection } from './components/SuggestionsSection';
import { WriteNoteSection } from './components/WriteNoteSection';
import { Footer } from './components/Footer';
import { TeacherLoginModal } from './components/TeacherLoginModal';
import { AdminLoginModal } from './components/AdminLoginModal';
import { AdminDashboardModal } from './components/AdminDashboardModal';
import { TeacherIntroModal } from './components/TeacherIntroModal';
import { TeacherGreetingBanner } from './components/TeacherGreetingBanner';
import { TeacherReplyModal } from './components/TeacherReplyModal';
import { TeacherMailboxModal } from './components/TeacherMailboxModal';
import { TeacherDashboardModal } from './components/TeacherDashboardModal';
import { SchoolPublishingModal } from './components/SchoolPublishingModal';
import { AnnouncementBroadcastView } from './components/AnnouncementBroadcastView';
import { MusicPlayerWidget } from './components/MusicPlayerWidget';
import { realtimeHub } from './utils/realtime';
import {
  addNoteToCloud,
  likeNoteInCloud,
  deleteNoteFromCloud,
  fetchNotesPage,
  subscribeToRecentNotes,
  subscribeToAuthorizedTeachers,
  saveTeacherToCloud,
  deleteTeacherFromCloud,
  seedInitialNotesIfEmpty,
  seedInitialLettersIfEmpty,
  seedInitialTeachersIfEmpty,
  sendLetterToCloud,
  subscribeToLetters,
  markLetterAsReadInCloud,
  toggleLetterBookmarkInCloud,
  deleteLetterFromCloud,
  cleanupInvalidTeachers,
  cleanupInvalidModerators,
  addTeacherCommentToNoteInCloud,
  addTeacherReplyToLetterInCloud,
  subscribeToModerators,
  saveModeratorToCloud,
  deleteModeratorFromCloud,
  seedInitialModeratorsIfEmpty,
  subscribeToAdminSettings,
  saveAdminPasswordToCloud,
  subscribeToMaintenanceSettings,
  saveMaintenanceSettingsToCloud,
  subscribeToAnnouncementSettings,
  saveAnnouncementSettingsToCloud,
  subscribeToTributeComments,
  saveTributeCommentsToCloud,
  subscribeToCommunitySuggestions,
  saveCommunitySuggestionsToCloud,
  subscribeToPhotos,
  savePhotoToCloud,
  deletePhotoFromCloud,
  seedInitialPhotosIfEmpty,
  subscribeToMusicBroadcast,
  saveMusicBroadcastToCloud,
} from './firebase/db';
import { detectInappropriateContent, containsUnknownOrPlaceholder } from './utils/contentSensor';

const getDeletedIdsSet = (): Set<string> => {
  try {
    const raw = localStorage.getItem('teacher_day_deleted_ids_v1');
    if (raw) return new Set(JSON.parse(raw));
  } catch {
    // ignore
  }
  return new Set();
};

const addDeletedIdToStorage = (id: string) => {
  try {
    const current = getDeletedIdsSet();
    current.add(id);
    localStorage.setItem('teacher_day_deleted_ids_v1', JSON.stringify(Array.from(current)));
  } catch {
    // ignore
  }
};

const removeDeletedIdFromStorage = (id: string) => {
  try {
    const current = getDeletedIdsSet();
    if (current.has(id)) {
      current.delete(id);
      localStorage.setItem('teacher_day_deleted_ids_v1', JSON.stringify(Array.from(current)));
    }
  } catch {
    // ignore
  }
};

const cleanTeacherList = (list: AuthorizedTeacher[]) =>
  list.filter((t) => {
    if (!t || !t.name) return false;
    const name = t.name.toLowerCase();
    const subject = (t.subject || '').trim().toLowerCase();
    return (
      !name.startsWith('@') &&
      !name.includes('projectastra') &&
      !name.includes('unknown') &&
      subject !== '' &&
      subject !== '-' &&
      subject !== '(-)' &&
      subject !== 'unknown'
    );
  });

export default function App() {
  const [user, setUser] = useState<UserSession | null>(() => {
    try {
      const savedUser = localStorage.getItem('teacher_day_user_session_v2');
      if (savedUser) {
        return JSON.parse(savedUser);
      }
    } catch {
      // ignore session parse notice
    }
    return null;
  });

  const [authorizedTeachers, setAuthorizedTeachers] = useState<AuthorizedTeacher[]>(() => {
    try {
      const saved = localStorage.getItem('authorized_teachers_v1');
      if (saved) {
        return cleanTeacherList(JSON.parse(saved));
      }
    } catch {
      // ignore teacher cache parse notice
    }
    return INITIAL_AUTHORIZED_TEACHERS;
  });

  const [authorizedModerators, setAuthorizedModerators] = useState<AuthorizedModerator[]>(() => {
    try {
      const saved = localStorage.getItem('authorized_moderators_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter((m: AuthorizedModerator) => {
            const name = (m.name || '').toLowerCase();
            const email = (m.email || '').toLowerCase();
            return !name.includes('alvarez') && !name.includes('david') && !email.includes('alvarez') && !email.includes('david') && m.id !== 'mod-1' && m.id !== 'mod-2';
          });
        }
      }
    } catch {
      // ignore moderator cache parse notice
    }
    return INITIAL_AUTHORIZED_MODERATORS;
  });

  const [adminPassword, setAdminPassword] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('head_admin_custom_password');
      if (saved) return saved;
    } catch {
      // ignore admin password cache parse notice
    }
    return HEAD_ADMIN_CONFIG.accessCode;
  });

  const [notes, setNotes] = useState<StudentNote[]>(() => {
    removeDeletedIdFromStorage('note-revived-angelica-b-she');
    removeDeletedIdFromStorage('letter-revived-angelica-b-she');
    const deleted = getDeletedIdsSet();
    try {
      const saved = localStorage.getItem('teachers_day_gratitude_notes_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const filtered: StudentNote[] = parsed.filter((n: StudentNote) => !deleted.has(n.id));
          const revivedNote = INITIAL_STUDENT_NOTES[0];
          const hasAngelicaSheNote = filtered.some(
            (n) =>
              n.id === revivedNote.id ||
              (n.studentName.toLowerCase().trim() === 'she' &&
                (n.teacherName || '').toLowerCase().includes('angelica'))
          );
          if (!hasAngelicaSheNote && revivedNote) {
            return [revivedNote, ...filtered];
          }
          return filtered;
        }
      }
    } catch {
      // ignore
    }
    return INITIAL_STUDENT_NOTES.filter((n) => !deleted.has(n.id));
  });

  const [photoCards, setPhotoCards] = useState<PhotoCard[]>(() => {
    try {
      const saved = localStorage.getItem('teachers_day_photos_v4');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const map = new Map<string, PhotoCard>();
          INITIAL_PHOTO_CARDS.forEach((p) => map.set(p.id, p));
          parsed.forEach((p) => map.set(p.id, p));
          return Array.from(map.values());
        }
      }
    } catch {
      // ignore
    }
    return INITIAL_PHOTO_CARDS;
  });

  const [letters, setLetters] = useState<StudentLetter[]>(() => {
    const deleted = getDeletedIdsSet();
    try {
      const saved = localStorage.getItem('teacher_day_letters_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const filtered: StudentLetter[] = parsed.filter((l: StudentLetter) => !deleted.has(l.id));
          const revivedLetter = INITIAL_STUDENT_LETTERS[0];
          const hasAngelicaSheLetter = filtered.some(
            (l) =>
              l.id === revivedLetter.id ||
              (l.studentName.toLowerCase().trim() === 'she' &&
                (l.recipientTeacherName || '').toLowerCase().includes('angelica'))
          );
          if (!hasAngelicaSheLetter && revivedLetter) {
            return [revivedLetter, ...filtered];
          }
          return filtered;
        }
      }
    } catch {
      // ignore
    }
    return INITIAL_STUDENT_LETTERS.filter((l) => !deleted.has(l.id));
  });

  // Maintenance Mode State (synced via Cloud Firestore & Realtime WebSocket)
  const [maintenanceSettings, setMaintenanceSettings] = useState<MaintenanceSettings>(() => {
    try {
      const saved = localStorage.getItem('teacher_day_maintenance_v1');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return {
      enabled: false,
      message:
        'We are currently performing scheduled database and real-time synchronization upgrades so every student note and formal letter is preserved.',
      estimatedReturn: 'Back online shortly',
      updatedAt: Date.now(),
    };
  });

  // Celebratory Announcement State (synced via Cloud Firestore & Realtime WebSocket)
  const [announcementSettings, setAnnouncementSettings] = useState<AnnouncementSettings>(() => {
    try {
      const saved = localStorage.getItem('teacher_day_announcement_v1');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return {
      enabled: false,
      title: "Happy World Teachers' Day to Our Beloved Educators! 🎉",
      message:
        'Today and every day, we celebrate your unwavering patience, dedication, and heart in guiding every student. Thank you for making our school a second home!',
      senderName: 'School Administration & Student Council',
      theme: 'gold',
      showPopupModal: true,
      triggerConfetti: true,
      updatedAt: 0,
    };
  });

  // Tribute Comments on Notes & Formal Letters (synced via Cloud Firestore & WebSocket)
  const [tributeComments, setTributeComments] = useState<TributeComment[]>(() => {
    try {
      const saved = localStorage.getItem('teacher_day_tribute_comments_v1');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return [];
  });

  // Community Suggestions Box (synced via Cloud Firestore & WebSocket)
  const [communitySuggestions, setCommunitySuggestions] = useState<CommunitySuggestion[]>(() => {
    try {
      const saved = localStorage.getItem('teacher_day_community_suggestions_v1');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return [];
  });

  // Official Admin & Moderator Live Music Broadcast State (synced via Cloud Firestore & WebSocket)
  const [musicBroadcast, setMusicBroadcast] = useState<MusicBroadcastSettings>(() => {
    try {
      const saved = localStorage.getItem('teacher_day_music_broadcast_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && Array.isArray(parsed.queue) && parsed.queue.length > 0) {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
    return {
      queue: [...BUILT_IN_MUSIC_TRACKS],
      currentQueueIndex: 0,
      isPlaying: false,
      loopMode: 'queue',
      isShuffle: false,
      updatedAt: 0,
      updatedBy: 'Administrator',
    };
  });

  // Modal open states & active filters
  const [isTeacherLoginOpen, setIsTeacherLoginOpen] = useState(false);
  const [isAdminLoginOpen, setIsAdminLoginOpen] = useState(false);
  const [isAdminDashboardOpen, setIsAdminDashboardOpen] = useState(false);
  const [adminInitialTab, setAdminInitialTab] = useState<
    | 'moderation'
    | 'teachers'
    | 'moderators'
    | 'announcement'
    | 'music'
    | 'maintenance'
    | 'security'
    | undefined
  >(undefined);
  const [isTeacherIntroOpen, setIsTeacherIntroOpen] = useState(false);
  const [isTeacherReplyOpen, setIsTeacherReplyOpen] = useState(false);
  const [isTeacherMailboxOpen, setIsTeacherMailboxOpen] = useState(false);
  const [isTeacherDashboardOpen, setIsTeacherDashboardOpen] = useState(false);
  const [isSchoolPublishingOpen, setIsSchoolPublishingOpen] = useState(false);
  const [activeSubjectFilter, setActiveSubjectFilter] = useState<string | null>(null);
  const [liveRealtimeNotice, setLiveRealtimeNotice] = useState<{ id: string; text: string } | null>(null);
  const [onlineCount, setOnlineCount] = useState<number>(1);

  // Maintenance Mode Interactive Suggestion Box & Writing Prompts State
  const [maintSugTab, setMaintSugTab] = useState<'submit' | 'ideas'>('submit');
  const [maintSugAuthor, setMaintSugAuthor] = useState('');
  const [maintSugCategory, setMaintSugCategory] = useState('Sticky Note Phrase');
  const [maintSugText, setMaintSugText] = useState('');
  const [maintSugError, setMaintSugError] = useState('');
  const [maintSugSuccess, setMaintSugSuccess] = useState(false);
  const [maintSugSubmitting, setMaintSugSubmitting] = useState(false);
  const [maintCopiedText, setMaintCopiedText] = useState<string | null>(null);

  // Cloud Archive Pagination for 10,000-15,000 scale
  const [lastCloudDoc, setLastCloudDoc] = useState<any>(null);
  const [hasMoreCloudNotes, setHasMoreCloudNotes] = useState<boolean>(true);
  const [isLoadingMoreCloudNotes, setIsLoadingMoreCloudNotes] = useState<boolean>(false);

  // Announce join when student or teacher joins the web
  useEffect(() => {
    if (user?.name) {
      realtimeHub.announceJoin(user.name, user.role);
    } else {
      realtimeHub.announceJoin('Student Visitor', 'student');
    }
  }, [user]);

  // Cloud Firestore subscriptions for multi-device sync supporting 10,000+ students & letters
  useEffect(() => {
    seedInitialNotesIfEmpty(INITIAL_STUDENT_NOTES);
    seedInitialLettersIfEmpty(INITIAL_STUDENT_LETTERS);
    seedInitialTeachersIfEmpty(INITIAL_AUTHORIZED_TEACHERS);
    seedInitialModeratorsIfEmpty(INITIAL_AUTHORIZED_MODERATORS);
    seedInitialPhotosIfEmpty(INITIAL_PHOTO_CARDS);
    // Guarantee the revived letter to Angelica B. from she (Grade 8 - CORDIALITY) is synced to Cloud Firestore
    if (INITIAL_STUDENT_LETTERS[0]) {
      sendLetterToCloud(INITIAL_STUDENT_LETTERS[0]);
    }
    if (INITIAL_STUDENT_NOTES[0]) {
      addNoteToCloud(INITIAL_STUDENT_NOTES[0]);
    }
    cleanupInvalidTeachers();
    cleanupInvalidModerators();

    const unsubscribeNotes = subscribeToRecentNotes((cloudNotes, removedIds = []) => {
      if (removedIds.length > 0) {
        removedIds.forEach((id) => addDeletedIdToStorage(id));
      }
      if (cloudNotes) {
        const deleted = getDeletedIdsSet();
        setNotes((prev) => {
          if (cloudNotes.length === 0 && removedIds.length === 0) {
            return prev.filter((n) => !deleted.has(n.id));
          }
          const cloudIds = new Set(cloudNotes.map((n) => n.id));
          const recentCutoff = Date.now() - 45000;
          const optimisticNotes = prev.filter(
            (n) =>
              !deleted.has(n.id) &&
              !cloudIds.has(n.id) &&
              typeof n.createdAt === 'number' &&
              n.createdAt > recentCutoff
          );

          const map = new Map<string, StudentNote>();
          cloudNotes.forEach((n) => {
            if (!deleted.has(n.id)) map.set(n.id, n);
          });
          optimisticNotes.forEach((n) => {
            if (!map.has(n.id) && !deleted.has(n.id)) map.set(n.id, n);
          });

          const getTime = (val?: number | string) =>
            typeof val === 'number' ? val : val ? new Date(val).getTime() : 0;

          return Array.from(map.values()).sort((a, b) => getTime(b.createdAt) - getTime(a.createdAt));
        });
      }
    });

    const unsubscribeTeachers = subscribeToAuthorizedTeachers((cloudTeachers) => {
      if (cloudTeachers && cloudTeachers.length > 0) {
        const cleaned = cleanTeacherList(cloudTeachers);
        setAuthorizedTeachers((prev) => {
          const map = new Map<string, AuthorizedTeacher>();
          cleanTeacherList(prev).forEach((t) => map.set(t.id, t));
          cleaned.forEach((t) => map.set(t.id, t));
          return Array.from(map.values());
        });
      }
    });

    const unsubscribeLetters = subscribeToLetters((cloudLetters, removedIds = []) => {
      if (removedIds.length > 0) {
        removedIds.forEach((id) => addDeletedIdToStorage(id));
      }
      if (cloudLetters) {
        const deleted = getDeletedIdsSet();
        setLetters((prev) => {
          if (cloudLetters.length === 0 && removedIds.length === 0) {
            return prev.filter((l) => !deleted.has(l.id));
          }
          const cloudIds = new Set(cloudLetters.map((l) => l.id));
          const recentCutoff = Date.now() - 45000;
          const optimisticLetters = prev.filter(
            (l) => !deleted.has(l.id) && !cloudIds.has(l.id) && l.createdAt > recentCutoff
          );

          const map = new Map<string, StudentLetter>();
          cloudLetters.forEach((l) => {
            if (!deleted.has(l.id)) map.set(l.id, l);
          });
          optimisticLetters.forEach((l) => {
            if (!map.has(l.id) && !deleted.has(l.id)) map.set(l.id, l);
          });
          return Array.from(map.values()).sort((a, b) => b.createdAt - a.createdAt);
        });
      }
    });

    const unsubscribeModerators = subscribeToModerators((cloudMods) => {
      if (cloudMods && cloudMods.length > 0) {
        setAuthorizedModerators(cloudMods);
      }
    });

    const unsubscribePhotos = subscribeToPhotos((cloudPhotos) => {
      if (cloudPhotos && cloudPhotos.length > 0) {
        setPhotoCards((prev) => {
          const map = new Map<string, PhotoCard>();
          INITIAL_PHOTO_CARDS.forEach((p) => map.set(p.id, p));
          prev.forEach((p) => map.set(p.id, p));
          cloudPhotos.forEach((p) => map.set(p.id, p));
          return Array.from(map.values());
        });
      }
    });

    const unsubscribeAdmin = subscribeToAdminSettings((settings) => {
      if (settings.adminPassword) {
        setAdminPassword(settings.adminPassword);
        localStorage.setItem('head_admin_custom_password', settings.adminPassword);
      }
    });

    const unsubscribeMaintenance = subscribeToMaintenanceSettings((maint) => {
      setMaintenanceSettings(maint);
      try {
        localStorage.setItem('teacher_day_maintenance_v1', JSON.stringify(maint));
      } catch {
        // ignore
      }
    });

    const unsubscribeAnnouncement = subscribeToAnnouncementSettings((ann) => {
      setAnnouncementSettings(ann);
      try {
        localStorage.setItem('teacher_day_announcement_v1', JSON.stringify(ann));
      } catch {
        // ignore
      }
    });

    const unsubscribeTributeComments = subscribeToTributeComments((comments) => {
      setTributeComments(comments);
      try {
        localStorage.setItem('teacher_day_tribute_comments_v1', JSON.stringify(comments));
      } catch {
        // ignore
      }
    });

    const unsubscribeSuggestions = subscribeToCommunitySuggestions((suggestions) => {
      setCommunitySuggestions(suggestions);
      try {
        localStorage.setItem('teacher_day_community_suggestions_v1', JSON.stringify(suggestions));
      } catch {
        // ignore
      }
    });

    const unsubscribeMusic = subscribeToMusicBroadcast((musicSettings) => {
      setMusicBroadcast((prev) => {
        if (prev.updatedAt > musicSettings.updatedAt) return prev;
        try {
          localStorage.setItem('teacher_day_music_broadcast_v1', JSON.stringify(musicSettings));
        } catch {
          // ignore
        }
        return musicSettings;
      });
    });

    return () => {
      unsubscribeNotes();
      unsubscribeTeachers();
      unsubscribeLetters();
      unsubscribeModerators();
      unsubscribePhotos();
      unsubscribeAdmin();
      unsubscribeMaintenance();
      unsubscribeAnnouncement();
      unsubscribeTributeComments();
      unsubscribeSuggestions();
      unsubscribeMusic();
    };
  }, []);

  // Real-time synchronization subscription
  useEffect(() => {
    const unsubscribe = realtimeHub.subscribe((event) => {
      if (event.type === 'NOTE_ADDED') {
        setNotes((prev) => {
          if (prev.some((n) => n.id === event.note.id)) return prev;
          return [event.note, ...prev];
        });
        setLiveRealtimeNotice({
          id: event.note.id,
          text: `✨ New tribute from ${event.note.studentName} pinned to the wall!`,
        });
        setTimeout(() => setLiveRealtimeNotice((curr) => (curr?.id === event.note.id ? null : curr)), 5000);
      } else if (event.type === 'NOTE_FLAGGED') {
        setNotes((prev) =>
          prev.map((n) => (n.id === event.noteId ? { ...n, status: 'flagged', flaggedReason: event.reason } : n))
        );
      } else if (event.type === 'NOTE_LIKED') {
        setNotes((prev) =>
          prev.map((n) => (n.id === event.noteId ? { ...n, likes: event.likes } : n))
        );
      } else if (event.type === 'NOTE_DELETED') {
        setNotes((prev) => prev.filter((n) => n.id !== event.noteId));
      } else if (event.type === 'NOTE_COMMENTED') {
        setNotes((prev) =>
          prev.map((n) =>
            n.id === event.noteId
              ? {
                  ...n,
                  teacherComment: event.comment,
                  teacherCommentAuthor: event.author,
                  teacherCommentTime: event.time,
                }
              : n
          )
        );
        setLiveRealtimeNotice({
          id: `comment-${event.noteId}`,
          text: `💬 Teacher ${event.author} commented on a note!`,
        });
        setTimeout(() => setLiveRealtimeNotice((curr) => (curr?.id === `comment-${event.noteId}` ? null : curr)), 5000);
      } else if (event.type === 'TEACHER_REPLY') {
        setNotes((prev) => {
          if (prev.some((n) => n.id === event.note.id)) return prev;
          return [event.note, ...prev];
        });
        setLiveRealtimeNotice({
          id: event.note.id,
          text: `🧑‍🏫 Teacher reply from ${event.note.teacherName || 'Teacher'} posted!`,
        });
        setTimeout(() => setLiveRealtimeNotice((curr) => (curr?.id === event.note.id ? null : curr)), 5000);
      } else if (event.type === 'LETTER_SENT') {
        if (event.letter) {
          setLetters((prev) => {
            if (prev.some((l) => l.id === event.letter!.id)) return prev;
            return [event.letter!, ...prev];
          });
        }
        setLiveRealtimeNotice({
          id: event.letterId || String(Date.now()),
          text: `💌 New formal letter for ${event.recipientTeacherName || 'Faculty'} from ${event.studentName || 'Student'}!`,
        });
        setTimeout(() => setLiveRealtimeNotice(null), 5000);
      } else if (event.type === 'LETTER_UPDATED') {
        setLetters((prev) =>
          prev.map((l) => (l.id === event.letter.id ? event.letter : l))
        );
        setLiveRealtimeNotice({
          id: `letter-updated-${event.letter.id}`,
          text: `💌 Letter for ${event.letter.recipientTeacherName} updated in real-time!`,
        });
        setTimeout(() => setLiveRealtimeNotice(null), 4000);
      } else if (event.type === 'LETTER_REPLIED') {
        setLetters((prev) =>
          prev.map((l) =>
            l.id === event.letterId
              ? {
                  ...l,
                  teacherReplyMessage: event.reply,
                  teacherReplyAuthor: event.author,
                  teacherReplyTime: event.time,
                  isRead: true,
                }
              : l
          )
        );
        setLiveRealtimeNotice({
          id: `letter-replied-${event.letterId}`,
          text: `🧑‍🏫 Teacher ${event.author} sent an official reply to a student letter!`,
        });
        setTimeout(() => setLiveRealtimeNotice(null), 5000);
      } else if (event.type === 'LETTER_DELETED') {
        setLetters((prev) => prev.filter((l) => l.id !== event.letterId));
      } else if (event.type === 'LETTER_READ') {
        setLetters((prev) =>
          prev.map((l) => (l.id === event.letterId ? { ...l, isRead: true } : l))
        );
      } else if (event.type === 'LETTER_BOOKMARKED') {
        setLetters((prev) =>
          prev.map((l) => (l.id === event.letterId ? { ...l, isBookmarked: event.isBookmarked } : l))
        );
      } else if (event.type === 'PHOTO_ADDED') {
        setPhotoCards((prev) => {
          if (prev.some((p) => p.id === event.photo.id)) return prev;
          return [...prev, event.photo];
        });
      } else if (event.type === 'PHOTO_REMOVED') {
        setPhotoCards((prev) => prev.filter((p) => p.id !== event.photoId));
      } else if (event.type === 'MAINTENANCE_UPDATED') {
        setMaintenanceSettings(event.settings);
        try {
          localStorage.setItem('teacher_day_maintenance_v1', JSON.stringify(event.settings));
        } catch {
          // ignore
        }
      } else if (event.type === 'ANNOUNCEMENT_UPDATED') {
        setAnnouncementSettings(event.settings);
        try {
          localStorage.setItem('teacher_day_announcement_v1', JSON.stringify(event.settings));
        } catch {
          // ignore
        }
        if (event.settings.enabled) {
          setLiveRealtimeNotice({
            id: `ann-${event.settings.updatedAt}`,
            text: `🎉 ${event.settings.title}`,
          });
          setTimeout(() => setLiveRealtimeNotice(null), 6000);
        }
      } else if (event.type === 'ANNOUNCEMENT_COMMENT_ADDED') {
        setAnnouncementSettings((prev) => {
          const existing = prev.comments || [];
          if (existing.some((c) => c.id === event.comment.id)) return prev;
          const next = { ...prev, comments: [event.comment, ...existing] };
          try {
            localStorage.setItem('teacher_day_announcement_v1', JSON.stringify(next));
          } catch {
            // ignore
          }
          return next;
        });
      } else if (event.type === 'ANNOUNCEMENT_COMMENT_DELETED') {
        setAnnouncementSettings((prev) => {
          const existing = prev.comments || [];
          const next = { ...prev, comments: existing.filter((c) => c.id !== event.commentId) };
          try {
            localStorage.setItem('teacher_day_announcement_v1', JSON.stringify(next));
          } catch {
            // ignore
          }
          return next;
        });
      } else if (event.type === 'TRIBUTE_COMMENT_ADDED') {
        setTributeComments((prev) => {
          if (prev.some((c) => c.id === event.comment.id)) return prev;
          const next = [...prev, event.comment];
          try {
            localStorage.setItem('teacher_day_tribute_comments_v1', JSON.stringify(next));
          } catch {
            // ignore
          }
          return next;
        });
      } else if (event.type === 'TRIBUTE_COMMENT_DELETED') {
        setTributeComments((prev) => {
          const next = prev.filter((c) => c.id !== event.commentId);
          try {
            localStorage.setItem('teacher_day_tribute_comments_v1', JSON.stringify(next));
          } catch {
            // ignore
          }
          return next;
        });
      } else if (event.type === 'SUGGESTION_ADDED') {
        setCommunitySuggestions((prev) => {
          if (prev.some((s) => s.id === event.suggestion.id)) return prev;
          const next = [event.suggestion, ...prev];
          try {
            localStorage.setItem('teacher_day_community_suggestions_v1', JSON.stringify(next));
          } catch {
            // ignore
          }
          return next;
        });
      } else if (event.type === 'SUGGESTION_DELETED') {
        setCommunitySuggestions((prev) => {
          const next = prev.filter((s) => s.id !== event.suggestionId);
          try {
            localStorage.setItem('teacher_day_community_suggestions_v1', JSON.stringify(next));
          } catch {
            // ignore
          }
          return next;
        });
      } else if (event.type === 'MUSIC_BROADCAST_UPDATED') {
        setMusicBroadcast((prev) => {
          if (prev.updatedAt > event.settings.updatedAt) return prev;
          try {
            localStorage.setItem('teacher_day_music_broadcast_v1', JSON.stringify(event.settings));
          } catch {
            // ignore
          }
          return event.settings;
        });
      } else if (event.type === 'PRESENCE_UPDATE') {
        if (event.onlineCount && typeof event.onlineCount === 'number') {
          setOnlineCount(event.onlineCount);
        }
      } else if (event.type === 'USER_JOINED') {
        setOnlineCount((prev) => Math.max(prev, 2));
        setLiveRealtimeNotice({
          id: `join-${Date.now()}`,
          text: `👋 ${event.name} (${event.role === 'teacher' ? 'Faculty Teacher' : event.role === 'admin' ? 'Coordinator' : 'Student'}) joined the celebration!`,
        });
        setTimeout(() => setLiveRealtimeNotice(null), 4500);
      }
    });

    return () => unsubscribe();
  }, []);

  // Save notes to localStorage as cache (bounded to 60 items to prevent QuotaExceededError at 10k-15k scale)
  useEffect(() => {
    try {
      const topNotes = notes.slice(0, 60);
      localStorage.setItem('teachers_day_gratitude_notes_v2', JSON.stringify(topNotes));
    } catch {
      // ignore cache quota
    }
  }, [notes]);

  // Save photos to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('teachers_day_photos_v4', JSON.stringify(photoCards));
    } catch {
      // ignore cache quota
    }
  }, [photoCards]);

  // Save authorized teachers to localStorage as cache
  useEffect(() => {
    try {
      localStorage.setItem('authorized_teachers_v1', JSON.stringify(authorizedTeachers));
    } catch {
      // ignore cache quota
    }
  }, [authorizedTeachers]);

  // Save authorized moderators to localStorage as cache
  useEffect(() => {
    try {
      localStorage.setItem('authorized_moderators_v1', JSON.stringify(authorizedModerators));
    } catch {
      // ignore cache quota
    }
  }, [authorizedModerators]);

  // Save letters to localStorage as cache
  useEffect(() => {
    try {
      localStorage.setItem('teacher_day_letters_v1', JSON.stringify(letters));
    } catch {
      // ignore cache quota
    }
  }, [letters]);

  // Save session to localStorage
  useEffect(() => {
    try {
      if (user) {
        localStorage.setItem('teacher_day_user_session_v2', JSON.stringify(user));
      } else {
        localStorage.removeItem('teacher_day_user_session_v2');
      }
    } catch {
      // ignore cache quota
    }
  }, [user]);

  const handleSendLetter = (newLetter: StudentLetter) => {
    setLetters((prev) => [newLetter, ...prev]);
    realtimeHub.broadcast({
      type: 'LETTER_SENT',
      letter: newLetter,
      letterId: newLetter.id,
      studentName: newLetter.studentName,
      recipientTeacherName: newLetter.recipientTeacherName,
    });
    sendLetterToCloud(newLetter);
  };

  const handleReviveLetterToWall = (letter: StudentLetter) => {
    removeDeletedIdFromStorage(letter.id);
    const companionId = letter.id.startsWith('letter-')
      ? `note-from-${letter.id}`
      : `note-from-letter-${letter.id}`;
    removeDeletedIdFromStorage(companionId);

    const g = (letter.grade || '').toLowerCase();
    const inferredLevel: 'Grade 7-10' | 'SHS' =
      letter.gradeLevel === 'SHS' ||
      g.includes('11') ||
      g.includes('12') ||
      g.includes('shs') ||
      g.includes('senior high')
        ? 'SHS'
        : 'Grade 7-10';

    const revivedNote: StudentNote = {
      id: companionId,
      studentName: letter.studentName,
      teacherName: letter.recipientTeacherName,
      grade: letter.grade || '',
      gradeLevel: inferredLevel,
      strandOrSubject: letter.recipientSubject || 'General',
      subject: (letter.recipientSubject || 'GENERAL').toUpperCase(),
      message: `💌 ${letter.body}`,
      color: 'lilac',
      likes: 1,
      createdAt: typeof letter.createdAt === 'number' ? letter.createdAt : Date.now(),
      status: 'approved',
      letterId: letter.id,
      isFormalLetterPreview: true,
      fullLetterBody: letter.body,
      letterTitle: letter.title,
      teacherComment: letter.teacherReplyMessage || '',
      teacherCommentAuthor: letter.teacherReplyAuthor || '',
      teacherCommentTime: letter.teacherReplyTime || 0,
    };

    setLetters((prev) => {
      const exists = prev.some((l) => l.id === letter.id);
      return exists ? prev.map((l) => (l.id === letter.id ? { ...l, pinPreviewToWall: true } : l)) : [letter, ...prev];
    });
    setNotes((prev) => {
      const filtered = prev.filter((n) => n.id !== companionId && n.letterId !== letter.id);
      return [revivedNote, ...filtered];
    });

    sendLetterToCloud({ ...letter, pinPreviewToWall: true, status: 'approved' });
    addNoteToCloud(revivedNote);
    realtimeHub.broadcast({ type: 'NOTE_ADDED', note: revivedNote });
  };

  const syncedCompanionLetterIdsRef = useRef<Set<string>>(new Set());

  // Automatically ensure every Formal Letter in `letters` has a live companion card synced in `notes` once per session
  useEffect(() => {
    if (letters.length === 0) return;
    const deleted = getDeletedIdsSet();
    const newlySynthesized: StudentNote[] = [];

    letters.forEach((letter) => {
      if (deleted.has(letter.id) || syncedCompanionLetterIdsRef.current.has(letter.id)) return;
      const hasNote = notes.some(
        (n) =>
          n.letterId === letter.id ||
          n.id === `note-from-${letter.id}` ||
          n.id === `note-from-letter-${letter.id}` ||
          (n.studentName.toLowerCase().trim() === letter.studentName.toLowerCase().trim() &&
            (n.teacherName || '').toLowerCase().trim() ===
              (letter.recipientTeacherName || '').toLowerCase().trim() &&
            ((n.letterTitle && n.letterTitle.toLowerCase().trim() === letter.title.toLowerCase().trim()) ||
              n.message.toLowerCase().includes(letter.body.slice(0, 40).toLowerCase().trim())))
      );
      if (hasNote) {
        syncedCompanionLetterIdsRef.current.add(letter.id);
        return;
      }

      const companionId = letter.id.startsWith('letter-')
        ? `note-from-${letter.id}`
        : `note-from-letter-${letter.id}`;
      if (deleted.has(companionId)) return;

      syncedCompanionLetterIdsRef.current.add(letter.id);
      const g = (letter.grade || '').toLowerCase();
      const inferredLevel: 'Grade 7-10' | 'SHS' =
        letter.gradeLevel === 'SHS' ||
        g.includes('11') ||
        g.includes('12') ||
        g.includes('shs') ||
        g.includes('senior high')
          ? 'SHS'
          : 'Grade 7-10';

      const companionNote: StudentNote = {
        id: companionId,
        studentName: letter.studentName,
        teacherName: letter.recipientTeacherName,
        grade: letter.grade || '',
        gradeLevel: inferredLevel,
        strandOrSubject: letter.recipientSubject || 'General',
        subject: (letter.recipientSubject || 'GENERAL').toUpperCase(),
        message: `💌 ${letter.body}`,
        color: 'lilac',
        likes: 1,
        createdAt: typeof letter.createdAt === 'number' ? letter.createdAt : Date.now(),
        status: letter.status || 'approved',
        letterId: letter.id,
        isFormalLetterPreview: true,
        fullLetterBody: letter.body,
        letterTitle: letter.title,
        teacherComment: letter.teacherReplyMessage || '',
        teacherCommentAuthor: letter.teacherReplyAuthor || '',
        teacherCommentTime: letter.teacherReplyTime || 0,
      };
      newlySynthesized.push(companionNote);
      addNoteToCloud(companionNote);
    });

    if (newlySynthesized.length > 0) {
      setNotes((prev) => {
        const existingIds = new Set(prev.map((n) => n.id));
        const uniqueNew = newlySynthesized.filter((n) => !existingIds.has(n.id));
        return uniqueNew.length > 0 ? [...uniqueNew, ...prev] : prev;
      });
    }
  }, [letters, notes]);

  const handleMarkLetterAsRead = (letterId: string) => {
    setLetters((prev) =>
      prev.map((l) => (l.id === letterId ? { ...l, isRead: true } : l))
    );
    realtimeHub.broadcast({ type: 'LETTER_READ', letterId });
    markLetterAsReadInCloud(letterId);
  };

  const handleToggleBookmarkLetter = (letterId: string, currentBookmark: boolean) => {
    const newBookmark = !currentBookmark;
    setLetters((prev) =>
      prev.map((l) => (l.id === letterId ? { ...l, isBookmarked: newBookmark } : l))
    );
    realtimeHub.broadcast({ type: 'LETTER_BOOKMARKED', letterId, isBookmarked: newBookmark });
    toggleLetterBookmarkInCloud(letterId, newBookmark);
  };

  const teacherUnreadLettersCount = useMemo(() => {
    if (user?.role !== 'teacher') return 0;
    return letters.filter(
      (l) =>
        !l.isRead &&
        (!l.recipientTeacherName ||
          l.recipientTeacherName.toLowerCase().includes(user.name.toLowerCase()) ||
          user.name.toLowerCase().includes(l.recipientTeacherName.toLowerCase()))
    ).length;
  }, [user, letters]);

  const handleTeacherLogin = (session: UserSession) => {
    setUser(session);
    setActiveSubjectFilter('My Subject');
    setIsTeacherIntroOpen(true);
  };

  const handleAdminLogin = (session: UserSession) => {
    setUser(session);
    setIsAdminDashboardOpen(true);
  };

  const handleLogout = () => {
    setUser(null);
    setActiveSubjectFilter(null);
    setIsTeacherIntroOpen(false);
    setIsAdminDashboardOpen(false);
  };

  const handleScrollTo = (sectionId: string) => {
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleAddNote = (newNote: StudentNote) => {
    setNotes((prev) => [newNote, ...prev]);
    realtimeHub.broadcast({ type: 'NOTE_ADDED', note: newNote });
    addNoteToCloud(newNote);
  };

  const handleLikeNote = (noteId: string) => {
    setNotes((prev) => {
      let updatedLikes = 1;
      const next = prev.map((n) => {
        if (n.id === noteId) {
          updatedLikes = (n.likes || 0) + 1;
          return { ...n, likes: updatedLikes };
        }
        return n;
      });
      realtimeHub.broadcast({ type: 'NOTE_LIKED', noteId, likes: updatedLikes });
      return next;
    });
    likeNoteInCloud(noteId);
  };

  const handleDeleteInappropriateNote = (noteId: string) => {
    addDeletedIdToStorage(noteId);
    const targetNote = notes.find((n) => n.id === noteId);
    setNotes((prev) => prev.filter((n) => n.id !== noteId));
    realtimeHub.broadcast({ type: 'NOTE_DELETED', noteId });
    deleteNoteFromCloud(noteId);

    // If this note is linked to a formal letter, also remove the formal letter so counters stay 100% synced
    if (targetNote?.letterId) {
      addDeletedIdToStorage(targetNote.letterId);
      setLetters((prev) => prev.filter((l) => l.id !== targetNote.letterId));
      realtimeHub.broadcast({ type: 'LETTER_DELETED', letterId: targetNote.letterId });
      deleteLetterFromCloud(targetNote.letterId);
    }
  };

  const handleAddPhoto = (newPhoto: PhotoCard) => {
    setPhotoCards((prev) => [...prev, newPhoto]);
    realtimeHub.broadcast({ type: 'PHOTO_ADDED', photo: newPhoto });
    savePhotoToCloud(newPhoto);
  };

  const handleRemovePhoto = (id: string) => {
    setPhotoCards((prev) => prev.filter((p) => p.id !== id));
    realtimeHub.broadcast({ type: 'PHOTO_REMOVED', photoId: id });
    deletePhotoFromCloud(id);
  };

  const handlePostTeacherReply = (teacherNote: StudentNote) => {
    setNotes((prev) => [teacherNote, ...prev]);
    realtimeHub.broadcast({ type: 'TEACHER_REPLY', note: teacherNote });
    addNoteToCloud(teacherNote);
  };

  const handleAddTeacherCommentToNote = async (noteId: string, comment: string) => {
    if (!user || user.role !== 'teacher') return;
    const now = Date.now();
    setNotes((prev) =>
      prev.map((n) =>
        n.id === noteId
          ? {
              ...n,
              teacherComment: comment,
              teacherCommentAuthor: user.name,
              teacherCommentTime: now,
            }
          : n
      )
    );
    realtimeHub.broadcast({
      type: 'NOTE_COMMENTED',
      noteId,
      comment,
      author: user.name,
      time: now,
    });
    await addTeacherCommentToNoteInCloud(noteId, comment, user.name);
  };

  const handleAddTeacherReplyToLetter = async (letterId: string, reply: string) => {
    const authorName = user?.name || 'Faculty / Administration';
    const replyTime = Date.now();
    let updatedLetter: StudentLetter | undefined;
    setLetters((prev) =>
      prev.map((l) => {
        if (l.id === letterId) {
          updatedLetter = {
            ...l,
            teacherReplyMessage: reply,
            teacherReplyAuthor: authorName,
            teacherReplyTime: replyTime,
            isRead: true,
          };
          return updatedLetter;
        }
        return l;
      })
    );
    realtimeHub.broadcast({
      type: 'LETTER_REPLIED',
      letterId,
      reply,
      author: authorName,
      time: replyTime,
    });
    if (updatedLetter) {
      realtimeHub.broadcast({
        type: 'LETTER_UPDATED',
        letter: updatedLetter,
      });
    }
    await addTeacherReplyToLetterInCloud(letterId, reply, authorName);
  };

  const handleBroadcastMessageToAll = async (broadcastText: string) => {
    if (!user || user.role !== 'teacher') return;
    const newReplyNote: StudentNote = {
      id: `reply-${Date.now()}`,
      subject: user.subject || 'All Students',
      teacherName: user.name,
      message: broadcastText,
      studentName: `Teacher ${user.name}`,
      color: 'mint',
      isTeacherReply: true,
      likes: 0,
      createdAt: Date.now(),
      gradeLevel: 'Grade 7-10 & SHS',
    };
    handleAddNote(newReplyNote);
  };

  const handleDeleteLetter = async (letterId: string) => {
    addDeletedIdToStorage(letterId);
    setLetters((prev) => prev.filter((l) => l.id !== letterId));
    realtimeHub.broadcast({ type: 'LETTER_DELETED', letterId });
    await deleteLetterFromCloud(letterId);

    // Also remove any linked preview note on the wall so wall and letter counters update together
    const linkedWallNotes = notes.filter((n) => n.letterId === letterId);
    linkedWallNotes.forEach((wn) => {
      addDeletedIdToStorage(wn.id);
      setNotes((prev) => prev.filter((n) => n.id !== wn.id));
      realtimeHub.broadcast({ type: 'NOTE_DELETED', noteId: wn.id });
      deleteNoteFromCloud(wn.id);
    });
  };

  const handleGrantTeacher = (teacher: AuthorizedTeacher) => {
    setAuthorizedTeachers((prev) => {
      const existing = prev.find((t) => t.id === teacher.id);
      if (existing) {
        return prev.map((t) => (t.id === teacher.id ? teacher : t));
      }
      return [...prev, teacher];
    });
    saveTeacherToCloud(teacher);
  };

  const handleRevokeTeacher = (id: string) => {
    setAuthorizedTeachers((prev) => prev.filter((t) => t.id !== id));
    deleteTeacherFromCloud(id);
  };

  const handleAddModerator = (moderator: AuthorizedModerator) => {
    setAuthorizedModerators((prev) => {
      const existing = prev.find((m) => m.id === moderator.id);
      if (existing) {
        return prev.map((m) => (m.id === moderator.id ? moderator : m));
      }
      return [...prev, moderator];
    });
    saveModeratorToCloud(moderator);
  };

  const handleRevokeModerator = (id: string) => {
    setAuthorizedModerators((prev) => prev.filter((m) => m.id !== id));
    deleteModeratorFromCloud(id);
  };

  const handleUpdateAdminPassword = (newPassword: string) => {
    setAdminPassword(newPassword);
    localStorage.setItem('head_admin_custom_password', newPassword);
    saveAdminPasswordToCloud(newPassword);
  };

  const handleUpdateMaintenanceSettings = (newSettings: MaintenanceSettings) => {
    setMaintenanceSettings(newSettings);
    try {
      localStorage.setItem('teacher_day_maintenance_v1', JSON.stringify(newSettings));
    } catch {
      // ignore
    }
    realtimeHub.broadcast({ type: 'MAINTENANCE_UPDATED', settings: newSettings });
    saveMaintenanceSettingsToCloud(newSettings);
  };

  const handleUpdateAnnouncementSettings = (newSettings: AnnouncementSettings) => {
    setAnnouncementSettings(newSettings);
    try {
      localStorage.setItem('teacher_day_announcement_v1', JSON.stringify(newSettings));
    } catch {
      // ignore
    }
    realtimeHub.broadcast({ type: 'ANNOUNCEMENT_UPDATED', settings: newSettings });
    saveAnnouncementSettingsToCloud(newSettings);
  };

  const handleAddAnnouncementComment = (newComment: AnnouncementComment) => {
    setAnnouncementSettings((prev) => {
      const existing = prev.comments || [];
      const next: AnnouncementSettings = {
        ...prev,
        comments: [newComment, ...existing].slice(0, 100),
      };
      try {
        localStorage.setItem('teacher_day_announcement_v1', JSON.stringify(next));
      } catch {
        // ignore
      }
      saveAnnouncementSettingsToCloud(next);
      return next;
    });
    realtimeHub.broadcast({ type: 'ANNOUNCEMENT_COMMENT_ADDED', comment: newComment });
  };

  const handleDeleteAnnouncementComment = (commentId: string) => {
    setAnnouncementSettings((prev) => {
      const existing = prev.comments || [];
      const next: AnnouncementSettings = {
        ...prev,
        comments: existing.filter((c) => c.id !== commentId),
      };
      try {
        localStorage.setItem('teacher_day_announcement_v1', JSON.stringify(next));
      } catch {
        // ignore
      }
      saveAnnouncementSettingsToCloud(next);
      return next;
    });
    realtimeHub.broadcast({ type: 'ANNOUNCEMENT_COMMENT_DELETED', commentId });
  };

  const handleAddTributeComment = async (
    targetId: string,
    targetType: 'note' | 'letter',
    authorName: string,
    message: string
  ): Promise<{ ok: boolean; error?: string }> => {
    const cleanAuthor = authorName.replace(/[<>]/g, '').trim();
    const cleanMsg = message.replace(/[<>]/g, '').trim();

    if (containsUnknownOrPlaceholder(cleanAuthor)) {
      return { ok: false, error: 'Please use your real name or student nickname instead of "Unknown".' };
    }
    const nameCheck = detectInappropriateContent(cleanAuthor);
    if (nameCheck.isInappropriate) {
      return { ok: false, error: 'Inappropriate word detected in author name.' };
    }
    const msgCheck = detectInappropriateContent(cleanMsg);
    if (msgCheck.isInappropriate) {
      return { ok: false, error: 'Comment blocked by school positivity & profanity filter.' };
    }

    try {
      const resp = await fetch('/api/moderate/comment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          authorName: cleanAuthor,
          authorRole: user?.role || 'student',
          message: cleanMsg,
        }),
      });
      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        return {
          ok: false,
          error: errData.error || 'Comment blocked by server security & rate-limit protection.',
        };
      }
    } catch {
      // Fallback to client sensor if offline
    }

    const newComment: TributeComment = {
      id: `tc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      targetId,
      targetType,
      authorName: cleanAuthor.slice(0, 60),
      authorRole: user?.role || 'student',
      message: cleanMsg.slice(0, 400),
      createdAt: Date.now(),
    };

    setTributeComments((prev) => {
      const next = [...prev, newComment].slice(-300);
      try {
        localStorage.setItem('teacher_day_tribute_comments_v1', JSON.stringify(next));
      } catch {
        // ignore
      }
      saveTributeCommentsToCloud(next);
      return next;
    });

    realtimeHub.broadcast({ type: 'TRIBUTE_COMMENT_ADDED', comment: newComment });
    return { ok: true };
  };

  const handleDeleteTributeComment = (commentId: string) => {
    setTributeComments((prev) => {
      const next = prev.filter((c) => c.id !== commentId);
      try {
        localStorage.setItem('teacher_day_tribute_comments_v1', JSON.stringify(next));
      } catch {
        // ignore
      }
      saveTributeCommentsToCloud(next);
      return next;
    });
    realtimeHub.broadcast({ type: 'TRIBUTE_COMMENT_DELETED', commentId });
  };

  const handleAddCommunitySuggestion = async (
    authorName: string,
    category: string,
    text: string
  ): Promise<{ ok: boolean; error?: string }> => {
    const cleanAuthor = authorName.replace(/[<>]/g, '').trim();
    const cleanText = text.replace(/[<>]/g, '').trim();

    if (containsUnknownOrPlaceholder(cleanAuthor)) {
      return { ok: false, error: 'Please enter your name or nickname instead of "Unknown".' };
    }
    if (
      detectInappropriateContent(cleanAuthor).isInappropriate ||
      detectInappropriateContent(cleanText).isInappropriate
    ) {
      return { ok: false, error: 'Suggestion blocked by school positivity & profanity filter.' };
    }

    try {
      const resp = await fetch('/api/moderate/comment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          authorName: cleanAuthor,
          authorRole: user?.role || 'student',
          message: cleanText,
        }),
      });
      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        return {
          ok: false,
          error: errData.error || 'Suggestion blocked by server security protection.',
        };
      }
    } catch {
      // Fallback to client sensor
    }

    const newSuggestion: CommunitySuggestion = {
      id: `sug-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      authorName: cleanAuthor.slice(0, 60),
      authorRole: user?.role || 'student',
      category: category || 'Note Prompt Idea',
      text: cleanText.slice(0, 350),
      createdAt: Date.now(),
    };

    setCommunitySuggestions((prev) => {
      const next = [newSuggestion, ...prev].slice(0, 150);
      try {
        localStorage.setItem('teacher_day_community_suggestions_v1', JSON.stringify(next));
      } catch {
        // ignore
      }
      saveCommunitySuggestionsToCloud(next);
      return next;
    });

    realtimeHub.broadcast({ type: 'SUGGESTION_ADDED', suggestion: newSuggestion });
    return { ok: true };
  };

  const handleDeleteCommunitySuggestion = (suggestionId: string) => {
    setCommunitySuggestions((prev) => {
      const next = prev.filter((s) => s.id !== suggestionId);
      try {
        localStorage.setItem('teacher_day_community_suggestions_v1', JSON.stringify(next));
      } catch {
        // ignore
      }
      saveCommunitySuggestionsToCloud(next);
      return next;
    });
    realtimeHub.broadcast({ type: 'SUGGESTION_DELETED', suggestionId });
  };

  const handleUpdateMusicBroadcast = (next: MusicBroadcastSettings) => {
    const stamped: MusicBroadcastSettings = {
      ...next,
      updatedAt: Date.now(),
      updatedBy: user?.name || 'Administrator',
    };
    setMusicBroadcast(stamped);
    try {
      localStorage.setItem('teacher_day_music_broadcast_v1', JSON.stringify(stamped));
    } catch {
      // ignore
    }
    saveMusicBroadcastToCloud(stamped);
    realtimeHub.broadcast({ type: 'MUSIC_BROADCAST_UPDATED', settings: stamped });
  };

  const handleTeacherRequestAccess = (req: Omit<AuthorizedTeacher, 'id' | 'status'>) => {
    const newReq: AuthorizedTeacher = {
      id: `teacher-req-${Date.now()}`,
      name: req.name,
      subject: req.subject,
      accessCode: req.accessCode,
      status: 'pending',
      requestedAt: new Date().toISOString().split('T')[0],
    };
    setAuthorizedTeachers((prev) => [...prev, newReq]);
    saveTeacherToCloud(newReq);
  };

  const handleLoadMoreNotesFromCloud = async () => {
    if (isLoadingMoreCloudNotes || !hasMoreCloudNotes) return;
    setIsLoadingMoreCloudNotes(true);
    try {
      const res = await fetchNotesPage(lastCloudDoc, 30);
      if (res.notes.length > 0) {
        setNotes((prev) => {
          const map = new Map<string, StudentNote>();
          prev.forEach((n) => map.set(n.id, n));
          res.notes.forEach((n) => map.set(n.id, n));
          return Array.from(map.values());
        });
        setLastCloudDoc(res.lastVisibleDoc);
        setHasMoreCloudNotes(res.hasMore);
      } else {
        setHasMoreCloudNotes(false);
      }
    } catch {
      // ignore load more notice
    } finally {
      setIsLoadingMoreCloudNotes(false);
    }
  };

  // Real-time teacher's owned subject statistics
  const teacherSubject = user?.role === 'teacher' ? user.subject : null;
  const mySubjectNotes = useMemo(() => {
    if (!teacherSubject) return [];
    return notes.filter((n) => {
      const matchSubj = n.subject.toLowerCase() === teacherSubject.toLowerCase();
      const matchName = user?.name && n.message.toLowerCase().includes(user.name.toLowerCase());
      return matchSubj || matchName;
    });
  }, [notes, teacherSubject, user?.name]);

  const mySubjectHearts = useMemo(() => {
    return mySubjectNotes.reduce((acc, curr) => acc + (curr.likes || 0), 0);
  }, [mySubjectNotes]);

  const isStaffBypass =
    !!user && (user.role === 'admin' || user.role === 'moderator' || user.role === 'teacher');

  return (
    <div className="min-h-screen bg-[#FDF2CA] text-[#2D2823] relative overflow-x-hidden selection:bg-[#E8D5C4] selection:text-[#2D2823]">
      {/* Background Floating Stickers & Doodles */}
      <BackgroundDoodles />

      {/* Staff Maintenance Mode Active Banner (when Maintenance Mode is ON and Admin/Moderator/Teacher is signed in) */}
      {maintenanceSettings.enabled && isStaffBypass && (
        <div className="relative z-50 bg-amber-600 text-white px-4 py-2.5 shadow-md border-b border-amber-400/40 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-amber-900/40 text-[#FDF2CA] font-bold uppercase tracking-wider text-[10px]">
              🛠️ Maintenance Mode Active
            </span>
            <span className="font-semibold">
              Students & visitors currently see the Maintenance Screen. You have full access via Staff Bypass ({user?.role.toUpperCase()}).
            </span>
          </div>
          {(user?.role === 'admin' || user?.role === 'moderator') && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsAdminDashboardOpen(true)}
                className="px-3 py-1 rounded-lg bg-white/15 hover:bg-white/25 text-white font-bold transition-colors cursor-pointer"
              >
                Configure
              </button>
              <button
                type="button"
                onClick={() =>
                  handleUpdateMaintenanceSettings({
                    ...maintenanceSettings,
                    enabled: false,
                    updatedAt: Date.now(),
                    updatedBy: user?.name || 'Administrator',
                  })
                }
                className="px-3 py-1 rounded-lg bg-white text-amber-900 hover:bg-[#FAF6EE] font-bold transition-colors shadow-2xs cursor-pointer"
              >
                Turn OFF Maintenance (Go Live)
              </button>
            </div>
          )}
        </div>
      )}

      {/* Top Banner when Teacher or Admin is logged in */}
      {user && (
        <TeacherGreetingBanner
          user={user}
          subjectNotesCount={mySubjectNotes.length}
          subjectHeartsCount={mySubjectHearts}
          unreadLettersCount={teacherUnreadLettersCount}
          onOpenIntro={() => setIsTeacherIntroOpen(true)}
          onOpenMailbox={() => setIsTeacherMailboxOpen(true)}
          onOpenDashboard={() => setIsTeacherDashboardOpen(true)}
          onWriteReply={() => setIsTeacherReplyOpen(true)}
          onFilterMySubject={() => {
            setActiveSubjectFilter('My Subject');
            handleScrollTo('wall-section');
          }}
          onOpenAdminDashboard={() => {
            setAdminInitialTab(undefined);
            setIsAdminDashboardOpen(true);
          }}
          onLogout={handleLogout}
        />
      )}

      {/* Celebratory Admin Announcement Banner & Pop-Up Greeting Card Modal */}
      {(!maintenanceSettings.enabled || isStaffBypass) && (
        <AnnouncementBroadcastView
          announcement={announcementSettings}
          user={user}
          onOpenAdminAnnouncementTab={() => {
            setAdminInitialTab('announcement');
            setIsAdminDashboardOpen(true);
          }}
          onAddComment={handleAddAnnouncementComment}
          onDeleteComment={handleDeleteAnnouncementComment}
        />
      )}

      {maintenanceSettings.enabled && !isStaffBypass ? (
        /* Dedicated Maintenance Mode Screen for Students & Public Visitors */
        <main className="relative z-20 min-h-[92vh] flex flex-col items-center justify-center px-4 py-12">
          <div className="w-full max-w-2xl bg-[#FFFDF9] border-2 border-[#DECDB8] rounded-3xl shadow-2xl p-6 sm:p-10 text-center relative overflow-hidden">
            <div className="washi-tape" />

            {/* Live Status Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-100 border border-amber-300 text-amber-900 text-xs font-bold mb-5 shadow-2xs">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-500 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-600" />
              </span>
              <span>🛠️ Server Under Maintenance & Optimization</span>
            </div>

            <div className="w-16 h-16 rounded-2xl bg-[#1F453B] text-[#F7DE85] flex items-center justify-center mx-auto mb-4 shadow-md text-2xl">
              💌
            </div>

            <h1 className="font-heading text-2xl sm:text-3xl font-bold text-[#231F1D] mb-3">
              We're Polishing the Gratitude Wall!
            </h1>

            <p className="font-body-serif text-sm sm:text-base text-[#4A3E33] leading-relaxed mb-6 bg-[#FAF5EC] p-4 rounded-2xl border border-[#E5D7C3]">
              {maintenanceSettings.message ||
                'We are currently performing scheduled server and real-time synchronization fixes so every student note and formal letter is safely preserved.'}
            </p>

            {/* Estimated Return Time & Data Safety Assurance */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-7 text-left">
              <div className="p-3.5 rounded-2xl bg-[#FAF6EE] border border-[#E5D7C3]">
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#8C7B68] mb-0.5">
                  ⏰ Estimated Return
                </div>
                <div className="text-xs sm:text-sm font-bold text-[#1F453B]">
                  {maintenanceSettings.estimatedReturn || 'Back online shortly'}
                </div>
              </div>
              <div className="p-3.5 rounded-2xl bg-[#FAF6EE] border border-[#E5D7C3]">
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#8C7B68] mb-0.5">
                  ☁️ Cloud Backup Status
                </div>
                <div className="text-xs sm:text-sm font-bold text-[#246B46]">
                  {notes.length} Notes & {letters.length} Letters Safe
                </div>
              </div>
            </div>

            {/* Interactive Maintenance Mode Suggestion Box & Writing Ideas */}
            <div className="mb-7 text-left rounded-2xl bg-[#FAF5EB] border border-[#E2D3BE] p-4 sm:p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3">
                <div>
                  <h2 className="font-heading font-bold text-sm sm:text-base text-[#1F453B] flex items-center gap-1.5">
                    <span>💡 While You Wait: Suggestion Box & Writing Ideas</span>
                  </h2>
                  <p className="text-[11px] text-[#756759] font-body-serif mt-0.5">
                    Share a greeting idea for the Suggestion Box or copy a Teacher's Day prompt so you're ready when the Wall returns!
                  </p>
                </div>

                {/* Toggle Tabs */}
                <div className="inline-flex rounded-xl bg-[#EFE6D5] p-1 border border-[#DECDB8] self-start sm:self-auto shrink-0">
                  <button
                    type="button"
                    onClick={() => setMaintSugTab('submit')}
                    className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                      maintSugTab === 'submit'
                        ? 'bg-[#1F453B] text-[#F7DE85] shadow-2xs'
                        : 'text-[#55483B] hover:text-[#231F1D]'
                    }`}
                  >
                    📬 Suggestion Box
                  </button>
                  <button
                    type="button"
                    onClick={() => setMaintSugTab('ideas')}
                    className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                      maintSugTab === 'ideas'
                        ? 'bg-[#1F453B] text-[#F7DE85] shadow-2xs'
                        : 'text-[#55483B] hover:text-[#231F1D]'
                    }`}
                  >
                    ✨ Copy Writing Prompts ({communitySuggestions.length + 5})
                  </button>
                </div>
              </div>

              {maintSugTab === 'submit' ? (
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    setMaintSugError('');
                    const cleanAuthor = maintSugAuthor.trim();
                    const cleanText = maintSugText.trim();
                    if (!cleanAuthor || cleanAuthor.length < 2) {
                      setMaintSugError('Please enter your name or student nickname.');
                      return;
                    }
                    if (!cleanText || cleanText.length < 5) {
                      setMaintSugError('Please enter your suggestion or greeting phrase.');
                      return;
                    }
                    setMaintSugSubmitting(true);
                    const res = await handleAddCommunitySuggestion(
                      cleanAuthor,
                      maintSugCategory,
                      cleanText
                    );
                    setMaintSugSubmitting(false);
                    if (!res.ok) {
                      setMaintSugError(res.error || 'Could not submit suggestion.');
                      return;
                    }
                    setMaintSugText('');
                    setMaintSugSuccess(true);
                    setTimeout(() => setMaintSugSuccess(false), 4500);
                  }}
                  className="space-y-3 bg-white/90 p-3.5 sm:p-4 rounded-xl border border-[#E5D7C3]"
                >
                  {/* Quick Clickable Suggestion Starters */}
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-[#8C7B68] mb-1.5">
                      ✨ One-Click Suggestion Starters (Tap to Fill):
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        "Thank you for never giving up on our section and always believing in us!",
                        "Your lessons taught us not just academics, but kindness and confidence.",
                        "Maligayang Araw ng mga Guro po! Salamat sa walang sawang paggabay sa amin.",
                        "Can we add a special honor roll badge for our homeroom advisers?",
                      ].map((chip, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setMaintSugText(chip)}
                          className="text-left px-2.5 py-1 rounded-lg bg-[#FFFBEB] hover:bg-[#FEF3C7] border border-[#E8D59E] text-[#4A3B28] text-[11px] leading-snug transition-colors cursor-pointer"
                        >
                          + "{chip.length > 58 ? chip.slice(0, 56) + '...' : chip}"
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-[#6E5F51] mb-1">
                        Your Name / Nickname
                      </label>
                      <input
                        type="text"
                        value={maintSugAuthor}
                        onChange={(e) => setMaintSugAuthor(e.target.value)}
                        placeholder="e.g., Aly (Grade 10)"
                        maxLength={50}
                        className="w-full px-3 py-1.5 rounded-lg bg-[#FAF6EE] border border-[#DECDB8] text-xs text-[#231F1D] focus:outline-none focus:border-[#1F453B]"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-[#6E5F51] mb-1">
                        Suggestion Type
                      </label>
                      <select
                        value={maintSugCategory}
                        onChange={(e) => setMaintSugCategory(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg bg-[#FAF6EE] border border-[#DECDB8] text-xs text-[#231F1D] focus:outline-none focus:border-[#1F453B]"
                      >
                        <option value="Sticky Note Phrase">📌 Sticky Note Phrase</option>
                        <option value="Formal Letter Line">💌 Formal Letter Line</option>
                        <option value="Website / Event Idea">🎉 Website / Event Idea</option>
                        <option value="Maintenance Feedback">🛠️ Maintenance Feedback</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-[#6E5F51] mb-1">
                      Your Suggestion or Teacher's Day Greeting Idea
                    </label>
                    <textarea
                      rows={2}
                      value={maintSugText}
                      onChange={(e) => setMaintSugText(e.target.value)}
                      placeholder="Write a sweet Teacher's Day line or share an idea for the Gratitude Wall..."
                      maxLength={320}
                      className="w-full px-3 py-2 rounded-lg bg-[#FAF6EE] border border-[#DECDB8] text-xs text-[#231F1D] focus:outline-none focus:border-[#1F453B] resize-none"
                    />
                  </div>

                  {maintSugError && (
                    <div className="p-2 rounded-lg bg-red-50 border border-red-200 text-[11px] font-bold text-red-700">
                      ⚠️ {maintSugError}
                    </div>
                  )}

                  {maintSugSuccess && (
                    <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-[11px] font-bold text-emerald-800">
                      ✓ Sent! Your suggestion is now saved in the live Community Suggestion Box & Admin Review list.
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-2 pt-0.5">
                    <span className="text-[10px] text-[#8C7B68]">
                      Synced live with Community Suggestion Box & Admin Console
                    </span>
                    <button
                      type="submit"
                      disabled={maintSugSubmitting}
                      className="px-4 py-1.5 rounded-xl bg-[#CE5A46] hover:bg-[#B84936] text-white text-xs font-bold transition-all cursor-pointer shadow-2xs disabled:opacity-50"
                    >
                      {maintSugSubmitting ? 'Submitting...' : 'Submit Suggestion ✨'}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {[
                    {
                      tag: 'Popular Note Prompt',
                      text: "Thank you for making our classroom feel like a second home and always believing in what we can achieve!",
                      by: "Teacher's Day Prompt",
                    },
                    {
                      tag: 'Formal Letter Opening',
                      text: "Behind every confident student is a dedicated teacher who took the time to listen, guide, and inspire us.",
                      by: "Teacher's Day Prompt",
                    },
                    {
                      tag: 'Tagalog / Filipino Tribute',
                      text: "Taos-puso po kaming nagpapasalamat sa inyong walang sawang paggabay, pasensya, at malasakit sa bawat isa sa amin!",
                      by: "Teacher's Day Prompt",
                    },
                    {
                      tag: 'Science & Math Appreciation',
                      text: "Thank you for turning even the hardest equations and experiments into lessons we actually look forward to every day!",
                      by: "Teacher's Day Prompt",
                    },
                    {
                      tag: 'Adviser Gratitude',
                      text: "To our beloved class adviser: thank you for being our second parent in school and guiding our section with so much heart.",
                      by: "Teacher's Day Prompt",
                    },
                    ...communitySuggestions.map((s) => ({
                      tag: s.category,
                      text: s.text,
                      by: s.authorName,
                    })),
                  ].map((item, idx) => {
                    const isCopied = maintCopiedText === item.text;
                    return (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-white border border-[#E5D7C3] flex items-start justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#8C5D39] mb-0.5">
                            <span>{item.tag}</span>
                            <span aria-hidden="true">·</span>
                            <span className="text-[#7A6B5B]">by {item.by}</span>
                          </div>
                          <p className="text-xs text-[#2B231D] font-body-serif italic leading-relaxed">
                            "{item.text}"
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            if (navigator?.clipboard?.writeText) {
                              navigator.clipboard.writeText(item.text).catch(() => {});
                            }
                            setMaintCopiedText(item.text);
                            setTimeout(() => setMaintCopiedText(null), 2500);
                          }}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold shrink-0 border transition-all cursor-pointer ${
                            isCopied
                              ? 'bg-[#2E7D32] text-white border-[#2E7D32]'
                              : 'bg-[#FAF5EB] hover:bg-[#1F453B] text-[#3B3026] hover:text-white border-[#DECDB8]'
                          }`}
                        >
                          {isCopied ? '✓ Copied' : 'Copy'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Staff Bypass Controls for Teachers & Administrators */}
            <div className="pt-5 border-t border-[#EADBCC] flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setIsTeacherLoginOpen(true)}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#1F453B] hover:bg-[#16332C] text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                🧑‍🏫 Teacher Sign In (Bypass)
              </button>
              <button
                type="button"
                onClick={() => setIsAdminLoginOpen(true)}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#FAF5EB] hover:bg-[#F2ECE1] text-[#4A3E33] border border-[#DECDB8] text-xs font-bold transition-all cursor-pointer"
              >
                🛡️ Admin / Moderator Console
              </button>
            </div>
          </div>
        </main>
      ) : (
        <>
          {/* Top Navbar: Shows ONLY Teacher Login for public users; Admin is hidden */}
          <Navbar
            onScrollTo={handleScrollTo}
            user={user}
            onOpenTeacherLogin={() => setIsTeacherLoginOpen(true)}
            onOpenAdminDashboard={() => setIsAdminDashboardOpen(true)}
            onOpenTeacherDashboard={() => setIsTeacherDashboardOpen(true)}
            onOpenIntro={() => setIsTeacherIntroOpen(true)}
            onLogout={handleLogout}
            onlineCount={onlineCount}
          />

          {/* Live Realtime Update Toast */}
          {liveRealtimeNotice && (
            <div className="fixed top-20 right-4 sm:right-8 z-50 bg-[#1F453B] text-white px-4 py-2.5 rounded-2xl shadow-2xl border border-[#F7DE85]/50 text-xs font-bold flex items-center gap-2.5 animate-in fade-in slide-in-from-top-4 duration-300">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
              </span>
              <span className="text-[#FDF2CA]">{liveRealtimeNotice.text}</span>
              <button
                onClick={() => setLiveRealtimeNotice(null)}
                className="ml-1 text-white/60 hover:text-white cursor-pointer text-sm"
              >
                ✕
              </button>
            </div>
          )}

          {/* Main Content Sections */}
          <main className="relative z-10 pt-2 pb-8">
            {/* Section 1: Hero */}
            <HeroSection
              onWriteClick={() => handleScrollTo('write-section')}
              onlineCount={onlineCount}
            />

            {/* Section 2: Dear Teachers Note */}
            <ClassLetterSection />

            {/* Section 3: The Classroom Gratitude Wall & Photo Pinboard */}
            <GratitudeWallSection
              notes={notes}
              photoCards={photoCards}
              letters={letters}
              user={user}
              activeSubjectFilter={activeSubjectFilter}
              onFilterChange={(subj) => setActiveSubjectFilter(subj)}
              onAddPhoto={handleAddPhoto}
              onRemovePhoto={handleRemovePhoto}
              onLikeNote={handleLikeNote}
              onRemoveNote={handleDeleteInappropriateNote}
              onOpenTeacherReply={() => setIsTeacherReplyOpen(true)}
              onAddTeacherComment={handleAddTeacherCommentToNote}
              onReplyToLetter={handleAddTeacherReplyToLetter}
              onToggleBookmarkLetter={handleToggleBookmarkLetter}
              onMarkLetterAsRead={handleMarkLetterAsRead}
              onLoadMoreCloudNotes={handleLoadMoreNotesFromCloud}
              hasMoreCloudNotes={hasMoreCloudNotes}
              isLoadingMoreCloudNotes={isLoadingMoreCloudNotes}
              tributeComments={tributeComments}
              onAddTributeComment={handleAddTributeComment}
              onDeleteTributeComment={handleDeleteTributeComment}
            />

            {/* Section 4: Writing Ideas & Inspiration Suggestions Bank + Suggestion Box */}
            <SuggestionsSection
              communitySuggestions={communitySuggestions}
              onAddCommunitySuggestion={handleAddCommunitySuggestion}
              onDeleteCommunitySuggestion={handleDeleteCommunitySuggestion}
              user={user}
            />

            {/* Section 5: Add Your Appreciation Note / Send Formal Letter Form */}
            <WriteNoteSection
              onAddNote={handleAddNote}
              onSendLetter={handleSendLetter}
              authorizedTeachers={authorizedTeachers}
            />
          </main>

          {/* Footer with subtle hidden paperclip admin entry point */}
          <Footer
            onOpenAdminLogin={() => setIsAdminLoginOpen(true)}
          />
        </>
      )}

      {/* Teacher Interactive Dashboard (Grade 7 - SHS Separator, Single/Broadcast Comment Wall) */}
      {user && user.role === 'teacher' && (
        <TeacherDashboardModal
          isOpen={isTeacherDashboardOpen}
          onClose={() => setIsTeacherDashboardOpen(false)}
          user={user}
          notes={notes}
          letters={letters}
          onAddTeacherCommentToNote={handleAddTeacherCommentToNote}
          onAddTeacherReplyToLetter={handleAddTeacherReplyToLetter}
          onBroadcastMessageToAll={handleBroadcastMessageToAll}
          onDeleteNote={handleDeleteInappropriateNote}
          onDeleteLetter={handleDeleteLetter}
          onToggleBookmarkLetter={handleToggleBookmarkLetter}
          onMarkLetterAsRead={handleMarkLetterAsRead}
        />
      )}

      {/* Teacher Mailbox Modal for Reading Long-Form Student Letters */}
      {user && user.role === 'teacher' && (
        <TeacherMailboxModal
          isOpen={isTeacherMailboxOpen}
          onClose={() => setIsTeacherMailboxOpen(false)}
          teacherName={user.name}
          teacherSubject={user.subject}
          letters={letters}
          onMarkAsRead={handleMarkLetterAsRead}
          onToggleBookmark={handleToggleBookmarkLetter}
          onReplyToLetter={handleAddTeacherReplyToLetter}
          onReplyToStudent={(_studentName) => {
            setIsTeacherReplyOpen(true);
          }}
          onDeleteLetter={handleDeleteLetter}
          tributeComments={tributeComments}
          onAddTributeComment={handleAddTributeComment}
          onDeleteTributeComment={handleDeleteTributeComment}
        />
      )}

      {/* Dedicated Teacher Login Modal */}
      <TeacherLoginModal
        isOpen={isTeacherLoginOpen}
        onClose={() => setIsTeacherLoginOpen(false)}
        authorizedTeachers={authorizedTeachers}
        onLogin={handleTeacherLogin}
        onRequestAccess={handleTeacherRequestAccess}
      />

      {/* Separate Hidden Admin / Mod Login Modal */}
      <AdminLoginModal
        isOpen={isAdminLoginOpen}
        onClose={() => setIsAdminLoginOpen(false)}
        onLogin={handleAdminLogin}
        authorizedModerators={authorizedModerators}
        adminPassword={adminPassword}
        onUpdateAdminPassword={handleUpdateAdminPassword}
      />

      {/* Admin / Moderator Dashboard */}
      {user && (user.role === 'admin' || user.role === 'moderator') && (
        <AdminDashboardModal
          isOpen={isAdminDashboardOpen}
          onClose={() => {
            setIsAdminDashboardOpen(false);
            setAdminInitialTab(undefined);
          }}
          user={user}
          notes={notes}
          letters={letters}
          authorizedTeachers={authorizedTeachers}
          authorizedModerators={authorizedModerators}
          onDeleteInappropriateNote={handleDeleteInappropriateNote}
          onDeleteLetter={handleDeleteLetter}
          onReplyToLetter={handleAddTeacherReplyToLetter}
          onGrantTeacher={handleGrantTeacher}
          onRevokeTeacher={handleRevokeTeacher}
          onAddModerator={handleAddModerator}
          onRevokeModerator={handleRevokeModerator}
          adminPassword={adminPassword}
          onUpdateAdminPassword={handleUpdateAdminPassword}
          onOpenSchoolPublishing={() => setIsSchoolPublishingOpen(true)}
          maintenanceSettings={maintenanceSettings}
          onUpdateMaintenanceSettings={handleUpdateMaintenanceSettings}
          announcementSettings={announcementSettings}
          onUpdateAnnouncementSettings={handleUpdateAnnouncementSettings}
          communitySuggestions={communitySuggestions}
          onDeleteCommunitySuggestion={handleDeleteCommunitySuggestion}
          onReviveLetterToWall={handleReviveLetterToWall}
          tributeComments={tributeComments}
          onAddTributeComment={handleAddTributeComment}
          onDeleteTributeComment={handleDeleteTributeComment}
          musicBroadcast={musicBroadcast}
          onUpdateMusicBroadcast={handleUpdateMusicBroadcast}
          initialTab={adminInitialTab}
        />
      )}

      {/* Special Celebratory Teacher's Day Intro Modal */}
      {user && user.role === 'teacher' && (
        <TeacherIntroModal
          isOpen={isTeacherIntroOpen}
          onClose={() => setIsTeacherIntroOpen(false)}
          user={user}
          notes={notes}
          onWriteReply={() => setIsTeacherReplyOpen(true)}
          onViewSubjectNotes={(_subj) => {
            setActiveSubjectFilter('My Subject');
            handleScrollTo('wall-section');
          }}
        />
      )}

      {/* Teacher Reply Composer Modal */}
      {user && user.role === 'teacher' && (
        <TeacherReplyModal
          isOpen={isTeacherReplyOpen}
          onClose={() => setIsTeacherReplyOpen(false)}
          user={user}
          onPostReply={handlePostTeacherReply}
        />
      )}

      {/* Official School Domain, IP & Purpose Publishing Modal */}
      <SchoolPublishingModal
        isOpen={isSchoolPublishingOpen}
        onClose={() => setIsSchoolPublishingOpen(false)}
      />

      {/* Floating Teacher's Day Mini Music Player (Main Website & Maintenance Mode) */}
      <MusicPlayerWidget
        isMaintenanceMode={maintenanceSettings.enabled && !isStaffBypass}
        user={user}
        musicBroadcast={musicBroadcast}
        onUpdateMusicBroadcast={handleUpdateMusicBroadcast}
      />
    </div>
  );
}
