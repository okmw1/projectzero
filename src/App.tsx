import { useState, useEffect, useMemo } from 'react';
import { StudentNote, PhotoCard, UserSession, AuthorizedTeacher, StudentLetter, AuthorizedModerator } from './types';
import { INITIAL_STUDENT_NOTES, INITIAL_PHOTO_CARDS, INITIAL_AUTHORIZED_TEACHERS, INITIAL_AUTHORIZED_MODERATORS, INITIAL_STUDENT_LETTERS, HEAD_ADMIN_CONFIG } from './data/initialNotes';
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
  subscribeToPhotos,
  savePhotoToCloud,
  deletePhotoFromCloud,
  seedInitialPhotosIfEmpty,
} from './firebase/db';

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
    } catch (e) {
      console.error('Error loading session', e);
    }
    return null;
  });

  const [authorizedTeachers, setAuthorizedTeachers] = useState<AuthorizedTeacher[]>(() => {
    try {
      const saved = localStorage.getItem('authorized_teachers_v1');
      if (saved) {
        return cleanTeacherList(JSON.parse(saved));
      }
    } catch (e) {
      console.error('Error loading authorized teachers', e);
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
    } catch (e) {
      console.error('Error loading authorized moderators', e);
    }
    return INITIAL_AUTHORIZED_MODERATORS;
  });

  const [adminPassword, setAdminPassword] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('head_admin_custom_password');
      if (saved) return saved;
    } catch (e) {
      console.error('Error loading admin password', e);
    }
    return HEAD_ADMIN_CONFIG.accessCode;
  });

  const [notes, setNotes] = useState<StudentNote[]>(() => {
    try {
      const saved = localStorage.getItem('teachers_day_gratitude_notes_v2');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Error loading notes', e);
    }
    return INITIAL_STUDENT_NOTES;
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
    } catch (e) {
      console.error('Error loading photos', e);
    }
    return INITIAL_PHOTO_CARDS;
  });

  const [letters, setLetters] = useState<StudentLetter[]>(() => {
    try {
      const saved = localStorage.getItem('teacher_day_letters_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error('Error loading letters', e);
    }
    return INITIAL_STUDENT_LETTERS;
  });

  // Modal open states & active filters
  const [isTeacherLoginOpen, setIsTeacherLoginOpen] = useState(false);
  const [isAdminLoginOpen, setIsAdminLoginOpen] = useState(false);
  const [isAdminDashboardOpen, setIsAdminDashboardOpen] = useState(false);
  const [isTeacherIntroOpen, setIsTeacherIntroOpen] = useState(false);
  const [isTeacherReplyOpen, setIsTeacherReplyOpen] = useState(false);
  const [isTeacherMailboxOpen, setIsTeacherMailboxOpen] = useState(false);
  const [isTeacherDashboardOpen, setIsTeacherDashboardOpen] = useState(false);
  const [isSchoolPublishingOpen, setIsSchoolPublishingOpen] = useState(false);
  const [activeSubjectFilter, setActiveSubjectFilter] = useState<string | null>(null);
  const [liveRealtimeNotice, setLiveRealtimeNotice] = useState<{ id: string; text: string } | null>(null);
  const [onlineCount, setOnlineCount] = useState<number>(1);

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
    cleanupInvalidTeachers();
    cleanupInvalidModerators();

    const unsubscribeNotes = subscribeToRecentNotes((cloudNotes) => {
      if (cloudNotes) {
        setNotes((prev) => {
          if (cloudNotes.length === 0) return prev;
          const cloudIds = new Set(cloudNotes.map((n) => n.id));
          const recentCutoff = Date.now() - 20000;
          const optimisticNotes = prev.filter(
            (n) => !cloudIds.has(n.id) && typeof n.createdAt === 'number' && n.createdAt > recentCutoff
          );

          const map = new Map<string, StudentNote>();
          cloudNotes.forEach((n) => map.set(n.id, n));
          optimisticNotes.forEach((n) => {
            if (!map.has(n.id)) map.set(n.id, n);
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

    const unsubscribeLetters = subscribeToLetters((cloudLetters) => {
      if (cloudLetters && cloudLetters.length > 0) {
        setLetters((prev) => {
          const map = new Map<string, StudentLetter>();
          INITIAL_STUDENT_LETTERS.forEach((l) => map.set(l.id, l));
          prev.forEach((l) => map.set(l.id, l));
          cloudLetters.forEach((l) => map.set(l.id, l));
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

    return () => {
      unsubscribeNotes();
      unsubscribeTeachers();
      unsubscribeLetters();
      unsubscribeModerators();
      unsubscribePhotos();
      unsubscribeAdmin();
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
    } catch (e) {
      console.warn('Notice saving notes to cache:', e);
    }
  }, [notes]);

  // Save photos to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('teachers_day_photos_v4', JSON.stringify(photoCards));
    } catch (e) {
      console.error('Error saving photos', e);
    }
  }, [photoCards]);

  // Save authorized teachers to localStorage as cache
  useEffect(() => {
    try {
      localStorage.setItem('authorized_teachers_v1', JSON.stringify(authorizedTeachers));
    } catch (e) {
      console.error('Error saving authorized teachers', e);
    }
  }, [authorizedTeachers]);

  // Save authorized moderators to localStorage as cache
  useEffect(() => {
    try {
      localStorage.setItem('authorized_moderators_v1', JSON.stringify(authorizedModerators));
    } catch (e) {
      console.error('Error saving authorized moderators', e);
    }
  }, [authorizedModerators]);

  // Save letters to localStorage as cache
  useEffect(() => {
    try {
      localStorage.setItem('teacher_day_letters_v1', JSON.stringify(letters));
    } catch (e) {
      console.error('Error saving letters', e);
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
    } catch (e) {
      console.error('Error saving user session', e);
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
    setNotes((prev) => prev.filter((n) => n.id !== noteId));
    realtimeHub.broadcast({ type: 'NOTE_DELETED', noteId });
    deleteNoteFromCloud(noteId);
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
    setLetters((prev) => prev.filter((l) => l.id !== letterId));
    realtimeHub.broadcast({ type: 'LETTER_DELETED', letterId });
    await deleteLetterFromCloud(letterId);
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
    } catch (e) {
      console.warn('Notice loading more notes:', e);
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

  return (
    <div className="min-h-screen bg-[#FDF2CA] text-[#2D2823] relative overflow-x-hidden selection:bg-[#E8D5C4] selection:text-[#2D2823]">
      {/* Background Floating Stickers & Doodles */}
      <BackgroundDoodles />

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
          onOpenAdminDashboard={() => setIsAdminDashboardOpen(true)}
          onLogout={handleLogout}
        />
      )}

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
        />

        {/* Section 4: Writing Ideas & Inspiration Suggestions Bank */}
        <SuggestionsSection />

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
          onClose={() => setIsAdminDashboardOpen(false)}
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
    </div>
  );
}
