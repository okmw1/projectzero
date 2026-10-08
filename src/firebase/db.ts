import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  getDocFromServer,
  collection,
  query,
  orderBy,
  limit,
  startAfter,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  where,
  QueryDocumentSnapshot,
  DocumentData,
  increment,
  setLogLevel,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { StudentNote, AuthorizedTeacher, StudentLetter, AuthorizedModerator, PhotoCard, MaintenanceSettings, AnnouncementSettings, TributeComment, CommunitySuggestion, MusicBroadcastSettings, MusicTrack } from '../types';
import { matchesTeacherName } from '../utils/teacherMatcher';
import { INITIAL_STUDENT_LETTERS, INITIAL_AUTHORIZED_TEACHERS } from '../data/initialNotes';

try {
  setLogLevel('silent');
} catch {
  // ignore
}

export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

// Test connection on boot
export async function testFirestoreConnection() {
  try {
    await getDocFromServer(doc(db, 'notes', 'health-check'));
  } catch {
    // Offline fallback cache active
  }
}
testFirestoreConnection();

export const NOTES_PER_BATCH = 24;

export interface FetchNotesResult {
  notes: StudentNote[];
  lastVisibleDoc: QueryDocumentSnapshot<DocumentData> | null;
  hasMore: boolean;
}

/**
 * Fetch notes batch from Firestore supporting 10,000+ records via cursors
 */
export async function fetchNotesPage(
  lastDoc: QueryDocumentSnapshot<DocumentData> | null,
  batchSize: number = NOTES_PER_BATCH,
  subjectFilter?: string | null
): Promise<FetchNotesResult> {
  try {
    const notesRef = collection(db, 'notes');
    let q;
    if (subjectFilter && subjectFilter !== 'All notes') {
      if (lastDoc) {
        q = query(
          notesRef,
          where('subject', '==', subjectFilter.toUpperCase()),
          orderBy('createdAt', 'desc'),
          startAfter(lastDoc),
          limit(batchSize)
        );
      } else {
        q = query(
          notesRef,
          where('subject', '==', subjectFilter.toUpperCase()),
          orderBy('createdAt', 'desc'),
          limit(batchSize)
        );
      }
    } else {
      if (lastDoc) {
        q = query(notesRef, orderBy('createdAt', 'desc'), startAfter(lastDoc), limit(batchSize));
      } else {
        q = query(notesRef, orderBy('createdAt', 'desc'), limit(batchSize));
      }
    }

    const snapshot = await getDocs(q);
    const docs = snapshot.docs;
    const notes: StudentNote[] = docs.map((docSnap) => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        studentName: data.studentName || 'Student',
        grade: data.grade || '',
        gradeLevel: data.gradeLevel || '',
        strandOrSubject: data.strandOrSubject || '',
        teacherName: data.teacherName || '',
        subject: data.subject || 'GENERAL APPRECIATION',
        message: data.message || '',
        color: data.color || 'blush',
        likes: typeof data.likes === 'number' ? data.likes : 1,
        createdAt: data.createdAt || Date.now(),
        isTeacherReply: !!data.isTeacherReply,
        teacherComment: data.teacherComment || '',
        teacherCommentAuthor: data.teacherCommentAuthor || '',
        teacherCommentTime: data.teacherCommentTime || 0,
        status: data.status || 'approved',
        flaggedReason: data.flaggedReason || '',
        letterId: data.letterId || undefined,
        isFormalLetterPreview: !!data.isFormalLetterPreview,
        fullLetterBody: data.fullLetterBody || undefined,
        letterTitle: data.letterTitle || undefined,
      };
    });

    const lastVisibleDoc = docs.length > 0 ? docs[docs.length - 1] : null;
    const hasMore = docs.length === batchSize;
    return { notes, lastVisibleDoc, hasMore };
  } catch {
    return { notes: [], lastVisibleDoc: null, hasMore: false };
  }
}

/**
 * Subscribe to the newest live notes (optimized window for 10k-15k scale)
 */
export function subscribeToRecentNotes(
  onNotesUpdated: (notes: StudentNote[], removedIds?: string[]) => void,
  batchLimit = 100
) {
  const notesRef = collection(db, 'notes');
  const q = query(notesRef, orderBy('createdAt', 'desc'), limit(batchLimit));

  return onSnapshot(
    q,
    (snapshot) => {
      const removedIds = snapshot
        .docChanges()
        .filter((change) => change.type === 'removed')
        .map((change) => change.doc.id);

      const notes: StudentNote[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          studentName: data.studentName || 'Student',
          grade: data.grade || '',
          gradeLevel: data.gradeLevel || '',
          strandOrSubject: data.strandOrSubject || '',
          teacherName: data.teacherName || '',
          subject: data.subject || 'GENERAL APPRECIATION',
          message: data.message || '',
          color: data.color || 'blush',
          likes: typeof data.likes === 'number' ? data.likes : 1,
          createdAt: typeof data.createdAt === 'number' ? data.createdAt : Date.now(),
          isTeacherReply: !!data.isTeacherReply,
          teacherComment: data.teacherComment || '',
          teacherCommentAuthor: data.teacherCommentAuthor || '',
          teacherCommentTime: data.teacherCommentTime || 0,
          status: data.status || 'approved',
          flaggedReason: data.flaggedReason || '',
          letterId: data.letterId || undefined,
          isFormalLetterPreview: !!data.isFormalLetterPreview,
          fullLetterBody: data.fullLetterBody || undefined,
          letterTitle: data.letterTitle || undefined,
        };
      });
      onNotesUpdated(notes, removedIds);
    },
    () => {
      // Handled via local cache & realtime hub
    }
  );
}

/**
 * Add a new student note to Cloud Firestore (sanitized so no undefined values ever break setDoc)
 */
export async function addNoteToCloud(note: StudentNote) {
  try {
    const docRef = doc(db, 'notes', note.id);
    const existing = await getDoc(docRef);
    if (existing.exists()) return;
    const rawMessage = note.message || '';
    const safeMessage = rawMessage.slice(0, 980);
    const payload: Record<string, any> = {
      id: note.id,
      studentName: (note.studentName || 'Student').slice(0, 78),
      grade: note.grade || '',
      gradeLevel: note.gradeLevel || '',
      strandOrSubject: note.strandOrSubject || '',
      teacherName: note.teacherName || '',
      subject: (note.subject || 'GENERAL').toUpperCase().slice(0, 95),
      message: safeMessage,
      color: note.color || 'blush',
      likes: typeof note.likes === 'number' ? note.likes : 1,
      createdAt: typeof note.createdAt === 'number' ? note.createdAt : Date.now(),
      isTeacherReply: !!note.isTeacherReply,
      teacherComment: note.teacherComment || '',
      teacherCommentAuthor: note.teacherCommentAuthor || '',
      teacherCommentTime: note.teacherCommentTime || 0,
      status: note.status || 'approved',
      flaggedReason: note.flaggedReason || '',
      isFormalLetterPreview: !!note.isFormalLetterPreview,
    };

    if (note.letterId) {
      payload.letterId = note.letterId;
    }
    if (note.fullLetterBody) {
      payload.fullLetterBody = note.fullLetterBody.slice(0, 4800);
    } else if (rawMessage.length > 980) {
      payload.fullLetterBody = rawMessage.slice(0, 4800);
    }
    if (note.letterTitle) {
      payload.letterTitle = note.letterTitle.slice(0, 240);
    }

    await setDoc(docRef, payload);
  } catch {
    // Fallback handled locally
  }
}

/**
 * Add a teacher's reply / comment to a specific student note
 */
export async function addTeacherCommentToNoteInCloud(noteId: string, comment: string, teacherName: string) {
  try {
    const docRef = doc(db, 'notes', noteId);
    await updateDoc(docRef, {
      teacherComment: comment,
      teacherCommentAuthor: teacherName,
      teacherCommentTime: Date.now(),
    });
  } catch {
    // Fallback handled locally
  }
}

/**
 * Increment like on a note in Cloud Firestore
 */
export async function likeNoteInCloud(noteId: string) {
  try {
    const docRef = doc(db, 'notes', noteId);
    await updateDoc(docRef, {
      likes: increment(1),
    });
  } catch {
    // Fallback handled locally
  }
}

/**
 * Delete inappropriate note from Cloud Firestore (Admin)
 */
export async function deleteNoteFromCloud(noteId: string) {
  try {
    const docRef = doc(db, 'notes', noteId);
    await deleteDoc(docRef);
  } catch {
    // Fallback handled locally
  }
}

/**
 * Seed initial sample notes if collection is completely empty
 */
export async function seedInitialNotesIfEmpty(initialNotes: StudentNote[]) {
  try {
    const snapshot = await getDocs(query(collection(db, 'notes'), limit(1)));
    if (snapshot.empty) {
      for (const note of initialNotes) {
        await addNoteToCloud(note);
      }
    }
  } catch {
    // Ignore seed notice
  }
}

/**
 * Seed initial sample letters if collection is completely empty
 */
export async function seedInitialLettersIfEmpty(initialLetters: StudentLetter[] = INITIAL_STUDENT_LETTERS) {
  try {
    const snapshot = await getDocs(query(collection(db, 'letters'), limit(1)));
    if (snapshot.empty) {
      for (const letter of initialLetters) {
        await sendLetterToCloud(letter);
      }
    }
  } catch {
    // Ignore seed notice
  }
}

/**
 * Seed initial authorized teachers if collection is completely empty
 */
export async function seedInitialTeachersIfEmpty(initialTeachers: AuthorizedTeacher[] = INITIAL_AUTHORIZED_TEACHERS) {
  try {
    const snapshot = await getDocs(query(collection(db, 'teachers'), limit(1)));
    if (snapshot.empty) {
      for (const teacher of initialTeachers) {
        await saveTeacherToCloud(teacher);
      }
    }
  } catch {
    // Ignore seed notice
  }
}

/**
 * Subscribe to authorized teachers collection
 */
export function subscribeToAuthorizedTeachers(onTeachersUpdated: (teachers: AuthorizedTeacher[]) => void) {
  const teachersRef = collection(db, 'teachers');
  return onSnapshot(
    teachersRef,
    (snapshot) => {
      const teachers: AuthorizedTeacher[] = snapshot.docs.map((docSnap) => {
        const d = docSnap.data();
        return {
          id: docSnap.id,
          name: d.name || '',
          subject: d.subject || '',
          accessCode: d.accessCode || '',
          status: d.status || 'pending',
          requestedAt: d.requestedAt,
        };
      });
      onTeachersUpdated(teachers);
    },
    () => {
      // Fallback handled locally
    }
  );
}

/**
 * Add or update teacher authorization in Firestore
 */
export async function saveTeacherToCloud(teacher: AuthorizedTeacher) {
  try {
    const docRef = doc(db, 'teachers', teacher.id);
    await setDoc(docRef, teacher);
  } catch {
    // Fallback handled locally
  }
}

/**
 * Revoke teacher in Firestore
 */
export async function deleteTeacherFromCloud(teacherId: string) {
  try {
    const docRef = doc(db, 'teachers', teacherId);
    await deleteDoc(docRef);
  } catch {
    // Fallback handled locally
  }
}

/**
 * Remove invalid teachers, student handles, placeholders, or teachers with empty/dash subjects
 */
export async function cleanupInvalidTeachers() {
  try {
    const snapshot = await getDocs(collection(db, 'teachers'));
    for (const d of snapshot.docs) {
      const data = d.data();
      const rawName = (data.name || '').toLowerCase();
      const rawSubject = (data.subject || '').trim().toLowerCase();
      if (
        rawName.startsWith('@') ||
        rawName.includes('projectastra') ||
        rawName.includes('taynan') ||
        rawName.includes('unknown') ||
        !rawSubject ||
        rawSubject === '-' ||
        rawSubject === '(-)' ||
        rawSubject === 'unknown'
      ) {
        await deleteDoc(doc(db, 'teachers', d.id));
      }
    }
  } catch {
    // Ignore cleanup notice
  }
}

/**
 * Send a formal student letter to Cloud Firestore (sanitized without undefined fields)
 */
export async function sendLetterToCloud(letter: StudentLetter) {
  try {
    const docRef = doc(db, 'letters', letter.id);
    const existing = await getDoc(docRef);
    if (existing.exists()) return;
    const payload: Record<string, any> = {
      id: letter.id,
      recipientTeacherName: (letter.recipientTeacherName || 'Teacher').slice(0, 95),
      recipientSubject: (letter.recipientSubject || 'General').slice(0, 95),
      studentName: (letter.studentName || 'Student').slice(0, 78),
      grade: letter.grade || '',
      gradeLevel: letter.gradeLevel || '',
      templateType: letter.templateType || 'custom',
      title: (letter.title || 'Thank You Teacher').slice(0, 145),
      body: (letter.body || '').slice(0, 3450),
      createdAt: typeof letter.createdAt === 'number' ? letter.createdAt : Date.now(),
      isRead: !!letter.isRead,
      isBookmarked: !!letter.isBookmarked,
      pinPreviewToWall: !!letter.pinPreviewToWall,
      teacherReplyMessage: letter.teacherReplyMessage || '',
      teacherReplyAuthor: letter.teacherReplyAuthor || '',
      teacherReplyTime: letter.teacherReplyTime || 0,
      status: letter.status || 'approved',
      flaggedReason: letter.flaggedReason || '',
    };

    if (letter.attachedPhoto && typeof letter.attachedPhoto === 'string') {
      payload.attachedPhoto = letter.attachedPhoto;
    }

    await setDoc(docRef, payload);
  } catch {
    // Fallback handled locally
  }
}

/**
 * Subscribe to all letters or letters for a specific teacher
 */
export function subscribeToLetters(
  onLettersUpdated: (letters: StudentLetter[], removedIds?: string[]) => void,
  teacherName?: string
) {
  const lettersRef = collection(db, 'letters');
  const q = query(lettersRef, orderBy('createdAt', 'desc'), limit(150));

  return onSnapshot(
    q,
    (snapshot) => {
      const removedIds = snapshot
        .docChanges()
        .filter((change) => change.type === 'removed')
        .map((change) => change.doc.id);

      let letters: StudentLetter[] = snapshot.docs.map((docSnap) => {
        const d = docSnap.data();
        return {
          id: docSnap.id,
          recipientTeacherName: d.recipientTeacherName || '',
          recipientSubject: d.recipientSubject || '',
          studentName: d.studentName || 'Student',
          grade: d.grade || '',
          gradeLevel: d.gradeLevel || '',
          templateType: d.templateType || 'custom',
          title: d.title || 'Thank You Teacher',
          body: d.body || '',
          createdAt: d.createdAt || Date.now(),
          isRead: !!d.isRead,
          isBookmarked: !!d.isBookmarked,
          pinPreviewToWall: !!d.pinPreviewToWall,
          attachedPhoto: d.attachedPhoto || undefined,
          teacherReplyMessage: d.teacherReplyMessage || '',
          teacherReplyAuthor: d.teacherReplyAuthor || '',
          teacherReplyTime: d.teacherReplyTime || 0,
          status: d.status || 'approved',
          flaggedReason: d.flaggedReason || '',
        };
      });

      if (teacherName) {
        letters = letters.filter(
          (l) => matchesTeacherName(l.recipientTeacherName, teacherName) || !l.recipientTeacherName
        );
      }

      // If cloud is empty or still populating, trigger auto-seed in background
      if (snapshot.empty && INITIAL_STUDENT_LETTERS.length > 0) {
        seedInitialLettersIfEmpty(INITIAL_STUDENT_LETTERS);
      }

      onLettersUpdated(letters, removedIds);
    },
    () => {
      // Fallback handled locally
    }
  );
}

/**
 * Add a teacher's reply to a student letter
 */
export async function addTeacherReplyToLetterInCloud(letterId: string, reply: string, teacherName: string) {
  try {
    const docRef = doc(db, 'letters', letterId);
    await updateDoc(docRef, {
      teacherReplyMessage: reply,
      teacherReplyAuthor: teacherName,
      teacherReplyTime: Date.now(),
      isRead: true,
    });
  } catch {
    // Fallback handled locally
  }
}

/**
 * Mark a letter as read in Cloud Firestore
 */
export async function markLetterAsReadInCloud(letterId: string) {
  try {
    const docRef = doc(db, 'letters', letterId);
    await updateDoc(docRef, {
      isRead: true,
    });
  } catch {
    // Fallback handled locally
  }
}

/**
 * Toggle bookmark on a letter in Cloud Firestore
 */
export async function toggleLetterBookmarkInCloud(letterId: string, isBookmarked: boolean) {
  try {
    const docRef = doc(db, 'letters', letterId);
    await updateDoc(docRef, {
      isBookmarked,
    });
  } catch {
    // Fallback handled locally
  }
}

/**
 * Delete inappropriate letter from Cloud Firestore (Teacher/Admin)
 */
export async function deleteLetterFromCloud(letterId: string) {
  try {
    const docRef = doc(db, 'letters', letterId);
    await deleteDoc(docRef);
  } catch {
    // Fallback handled locally
  }
}

/**
 * Subscribe to authorized moderators collection
 */
export function subscribeToModerators(onModeratorsUpdated: (moderators: AuthorizedModerator[]) => void) {
  const modsRef = collection(db, 'moderators');
  return onSnapshot(
    modsRef,
    (snapshot) => {
      const mods: AuthorizedModerator[] = snapshot.docs.map((docSnap) => {
        const d = docSnap.data();
        return {
          id: docSnap.id,
          name: d.name || '',
          email: d.email || '',
          accessCode: d.accessCode || '',
          assignedBy: d.assignedBy || 'Head Administrator',
          createdAt: d.createdAt || Date.now(),
          status: d.status || 'active',
          notesReviewedCount: d.notesReviewedCount || 0,
        };
      });
      onModeratorsUpdated(mods);
    },
    () => {
      // Fallback handled locally
    }
  );
}

/**
 * Add or update moderator in Firestore (Only Head Admin can call)
 */
export async function saveModeratorToCloud(moderator: AuthorizedModerator) {
  try {
    const docRef = doc(db, 'moderators', moderator.id);
    await setDoc(docRef, moderator);
  } catch {
    // Fallback handled locally
  }
}

/**
 * Revoke/delete moderator from Firestore
 */
export async function deleteModeratorFromCloud(moderatorId: string) {
  try {
    const docRef = doc(db, 'moderators', moderatorId);
    await deleteDoc(docRef);
  } catch {
    // Fallback handled locally
  }
}

/**
 * Seed initial sample moderators if empty
 */
export async function seedInitialModeratorsIfEmpty(initialMods: AuthorizedModerator[]) {
  try {
    if (!initialMods || initialMods.length === 0) return;
    const snapshot = await getDocs(query(collection(db, 'moderators'), limit(1)));
    if (snapshot.empty) {
      for (const mod of initialMods) {
        await saveModeratorToCloud(mod);
      }
    }
  } catch {
    // Fallback handled locally
  }
}

/**
 * Clean up sample/placeholder moderators from cloud
 */
export async function cleanupInvalidModerators() {
  try {
    const snapshot = await getDocs(collection(db, 'moderators'));
    for (const d of snapshot.docs) {
      const data = d.data();
      const rawName = (data.name || '').toLowerCase();
      const rawEmail = (data.email || '').toLowerCase();
      if (
        rawName.includes('alvarez') ||
        rawName.includes('david') ||
        rawEmail.includes('alvarez') ||
        rawEmail.includes('david') ||
        d.id === 'mod-1' ||
        d.id === 'mod-2'
      ) {
        await deleteDoc(doc(db, 'moderators', d.id));
      }
    }
  } catch {
    // Fallback handled locally
  }
}

/**
 * Subscribe to admin settings for real-time password sync
 */
export function subscribeToAdminSettings(onSettings: (settings: { adminPassword?: string }) => void) {
  const settingRef = doc(db, 'admin_settings', 'auth');
  return onSnapshot(
    settingRef,
    (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        onSettings({ adminPassword: data.adminPassword });
      }
    },
    () => {
      // Fallback handled locally
    }
  );
}

/**
 * Update Admin Password in Firestore
 */
export async function saveAdminPasswordToCloud(newPassword: string) {
  try {
    const settingRef = doc(db, 'admin_settings', 'auth');
    await setDoc(settingRef, {
      adminPassword: newPassword,
      adminEmail: 'taynanjetraj@gmail.com',
      updatedAt: Date.now(),
    });
  } catch {
    // Fallback handled locally
  }
}

/**
 * Subscribe to real-time Maintenance Mode settings from Cloud Firestore
 */
export function subscribeToMaintenanceSettings(onUpdate: (settings: MaintenanceSettings) => void) {
  const maintRef = doc(db, 'admin_settings', 'maintenance');
  return onSnapshot(
    maintRef,
    (docSnap) => {
      if (docSnap.exists()) {
        const d = docSnap.data();
        onUpdate({
          enabled: !!d.enabled,
          message:
            d.message ||
            'We are currently performing scheduled database and real-time synchronization upgrades so every student note and formal letter is preserved.',
          estimatedReturn: d.estimatedReturn || 'Back online shortly',
          updatedAt: d.updatedAt || Date.now(),
          updatedBy: d.updatedBy || 'Administrator',
        });
      }
    },
    () => {
      // Fallback handled locally
    }
  );
}

/**
 * Save Maintenance Mode settings to Cloud Firestore
 */
export async function saveMaintenanceSettingsToCloud(settings: MaintenanceSettings) {
  try {
    const maintRef = doc(db, 'admin_settings', 'maintenance');
    await setDoc(maintRef, {
      enabled: !!settings.enabled,
      message: settings.message || '',
      estimatedReturn: settings.estimatedReturn || '',
      updatedAt: Date.now(),
      updatedBy: settings.updatedBy || 'Administrator',
    });
  } catch {
    // Fallback handled locally
  }
}

/**
 * Subscribe to real-time Celebratory Announcement settings from Cloud Firestore
 */
export function subscribeToAnnouncementSettings(onUpdate: (settings: AnnouncementSettings) => void) {
  const annRef = doc(db, 'admin_settings', 'announcement');
  return onSnapshot(
    annRef,
    (docSnap) => {
      if (docSnap.exists()) {
        const d = docSnap.data();
        const rawComments = Array.isArray(d.comments) ? d.comments : [];
        onUpdate({
          enabled: !!d.enabled,
          title: d.title || "Happy Teacher's Day to Our Beloved Educators! 🎉",
          message:
            d.message ||
            "Today and every day, we celebrate your unwavering patience, dedication, and heart in guiding every student. Thank you for making our school a second home!",
          senderName: d.senderName || 'School Administration & Student Council',
          theme: d.theme || 'gold',
          showPopupModal: d.showPopupModal !== undefined ? !!d.showPopupModal : true,
          triggerConfetti: d.triggerConfetti !== undefined ? !!d.triggerConfetti : true,
          updatedAt: typeof d.updatedAt === 'number' ? d.updatedAt : Date.now(),
          comments: rawComments.map((c: any) => ({
            id: String(c.id || `c-${Date.now()}`),
            authorName: String(c.authorName || 'Student'),
            authorRole: c.authorRole || 'student',
            message: String(c.message || ''),
            createdAt: typeof c.createdAt === 'number' ? c.createdAt : Date.now(),
          })),
        });
      }
    },
    () => {
      // Fallback handled locally
    }
  );
}

/**
 * Save Celebratory Announcement settings to Cloud Firestore
 */
export async function saveAnnouncementSettingsToCloud(settings: AnnouncementSettings) {
  try {
    const annRef = doc(db, 'admin_settings', 'announcement');
    const safeComments = Array.isArray(settings.comments)
      ? settings.comments.slice(0, 100).map((c) => ({
          id: String(c.id),
          authorName: String(c.authorName || 'Student').slice(0, 80),
          authorRole: c.authorRole || 'student',
          message: String(c.message || '').slice(0, 500),
          createdAt: typeof c.createdAt === 'number' ? c.createdAt : Date.now(),
        }))
      : [];
    await setDoc(annRef, {
      enabled: !!settings.enabled,
      title: (settings.title || '').slice(0, 180),
      message: (settings.message || '').slice(0, 2000),
      senderName: (settings.senderName || 'School Administration').slice(0, 120),
      theme: settings.theme || 'gold',
      showPopupModal: !!settings.showPopupModal,
      triggerConfetti: !!settings.triggerConfetti,
      updatedAt: settings.updatedAt || Date.now(),
      comments: safeComments,
    });
  } catch {
    // Fallback handled locally
  }
}

/**
 * Subscribe to real-time Tribute Comments (on Sticky Notes & Formal Letters)
 */
export function subscribeToTributeComments(onUpdate: (comments: TributeComment[]) => void) {
  const ref = doc(db, 'admin_settings', 'tribute_comments');
  return onSnapshot(
    ref,
    (docSnap) => {
      if (docSnap.exists()) {
        const d = docSnap.data();
        const raw = Array.isArray(d.items) ? d.items : [];
        onUpdate(
          raw.map((c: any) => ({
            id: String(c.id || `tc-${Date.now()}`),
            targetId: String(c.targetId || ''),
            targetType: c.targetType === 'letter' ? 'letter' : 'note',
            authorName: String(c.authorName || 'Student'),
            authorRole: c.authorRole || 'student',
            message: String(c.message || ''),
            createdAt: typeof c.createdAt === 'number' ? c.createdAt : Date.now(),
          }))
        );
      }
    },
    () => {
      // Fallback handled locally
    }
  );
}

/**
 * Save Tribute Comments (on Sticky Notes & Formal Letters) to Cloud Firestore
 */
export async function saveTributeCommentsToCloud(comments: TributeComment[]) {
  try {
    const ref = doc(db, 'admin_settings', 'tribute_comments');
    const safeItems = Array.isArray(comments)
      ? comments.slice(0, 300).map((c) => ({
          id: String(c.id),
          targetId: String(c.targetId || '').slice(0, 128),
          targetType: c.targetType === 'letter' ? 'letter' : 'note',
          authorName: String(c.authorName || 'Student').slice(0, 80),
          authorRole: c.authorRole || 'student',
          message: String(c.message || '').slice(0, 500),
          createdAt: typeof c.createdAt === 'number' ? c.createdAt : Date.now(),
        }))
      : [];
    await setDoc(ref, {
      items: safeItems,
      updatedAt: Date.now(),
    });
  } catch {
    // Fallback handled locally
  }
}

/**
 * Subscribe to Community Suggestions Box in Cloud Firestore
 */
export function subscribeToCommunitySuggestions(onUpdate: (suggestions: CommunitySuggestion[]) => void) {
  const ref = doc(db, 'admin_settings', 'suggestions');
  return onSnapshot(
    ref,
    (docSnap) => {
      if (docSnap.exists()) {
        const d = docSnap.data();
        const raw = Array.isArray(d.items) ? d.items : [];
        onUpdate(
          raw.map((s: any) => ({
            id: String(s.id || `sug-${Date.now()}`),
            authorName: String(s.authorName || 'Student'),
            authorRole: s.authorRole || 'student',
            category: String(s.category || 'Greeting Idea'),
            text: String(s.text || ''),
            createdAt: typeof s.createdAt === 'number' ? s.createdAt : Date.now(),
          }))
        );
      }
    },
    () => {
      // Fallback handled locally
    }
  );
}

/**
 * Save Community Suggestions Box to Cloud Firestore
 */
export async function saveCommunitySuggestionsToCloud(suggestions: CommunitySuggestion[]) {
  try {
    const ref = doc(db, 'admin_settings', 'suggestions');
    const safeItems = Array.isArray(suggestions)
      ? suggestions.slice(0, 150).map((s) => ({
          id: String(s.id),
          authorName: String(s.authorName || 'Student').slice(0, 80),
          authorRole: s.authorRole || 'student',
          category: String(s.category || 'Greeting Idea').slice(0, 60),
          text: String(s.text || '').slice(0, 500),
          createdAt: typeof s.createdAt === 'number' ? s.createdAt : Date.now(),
        }))
      : [];
    await setDoc(ref, {
      items: safeItems,
      updatedAt: Date.now(),
    });
  } catch {
    // Fallback handled locally
  }
}

/**
 * Subscribe to Classroom Photo Pinboard in real-time
 */
export function subscribeToPhotos(onPhotosUpdated: (photos: PhotoCard[]) => void) {
  const photosRef = collection(db, 'photos');
  const q = query(photosRef, limit(50));
  return onSnapshot(
    q,
    (snapshot) => {
      if (!snapshot.empty) {
        const photos: PhotoCard[] = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            src: data.src,
            alt: data.alt || 'Classroom memory',
            caption: data.caption || '',
            scale: typeof data.scale === 'number' ? data.scale : 1,
            rotation: typeof data.rotation === 'number' ? data.rotation : 0,
            createdAt: data.createdAt || 0,
          };
        });
        onPhotosUpdated(photos);
      }
    },
    () => {
      // Fallback handled locally
    }
  );
}

/**
 * Save or Add a Photo Card to Cloud Firestore
 */
export async function savePhotoToCloud(photo: PhotoCard) {
  try {
    const photoRef = doc(db, 'photos', photo.id);
    await setDoc(photoRef, {
      src: photo.src,
      alt: photo.alt || 'Classroom memory',
      caption: photo.caption || '',
      scale: photo.scale ?? 1,
      rotation: photo.rotation ?? 0,
      createdAt: photo.createdAt || Date.now(),
    });
  } catch {
    // Fallback handled locally
  }
}

/**
 * Delete a Photo Card from Cloud Firestore
 */
export async function deletePhotoFromCloud(photoId: string) {
  try {
    const photoRef = doc(db, 'photos', photoId);
    await deleteDoc(photoRef);
  } catch {
    // Fallback handled locally
  }
}

/**
 * Seed initial photo cards if empty
 */
export async function seedInitialPhotosIfEmpty(initialPhotos: PhotoCard[]) {
  try {
    const snapshot = await getDocs(query(collection(db, 'photos'), limit(1)));
    if (snapshot.empty && initialPhotos && initialPhotos.length > 0) {
      for (const photo of initialPhotos) {
        await savePhotoToCloud(photo);
      }
    }
  } catch {
    // Fallback handled locally
  }
}

/**
 * Subscribe to Admin/Moderator Official Music Queue & Broadcast State in Cloud Firestore
 */
export function subscribeToMusicBroadcast(onUpdate: (settings: MusicBroadcastSettings) => void) {
  const ref = doc(db, 'admin_settings', 'music_queue');
  return onSnapshot(
    ref,
    (docSnap) => {
      if (docSnap.exists()) {
        const d = docSnap.data();
        const rawQueue = Array.isArray(d.queue) ? d.queue : [];
        const sanitizedQueue: MusicTrack[] = rawQueue.map((t: any, idx: number) => ({
          id: String(t.id || `track-${idx}`),
          title: String(t.title || 'Teacher’s Day Track'),
          subtitle: String(t.subtitle || 'Soundtrack'),
          type: t.type || 'synth',
          presetId: t.presetId || undefined,
          url: t.url || undefined,
          embedUrl: t.embedUrl || undefined,
          youtubeId: t.youtubeId || undefined,
          spotifyKind: t.spotifyKind || undefined,
          spotifyId: t.spotifyId || undefined,
        }));
        onUpdate({
          queue: sanitizedQueue,
          currentQueueIndex: typeof d.currentQueueIndex === 'number' ? d.currentQueueIndex : 0,
          isPlaying: !!d.isPlaying,
          loopMode: d.loopMode === 'one' || d.loopMode === 'off' ? d.loopMode : 'queue',
          isShuffle: !!d.isShuffle,
          updatedAt: typeof d.updatedAt === 'number' ? d.updatedAt : Date.now(),
          updatedBy: d.updatedBy || 'Administrator',
        });
      }
    },
    () => {
      // Fallback handled locally
    }
  );
}

/**
 * Save Admin/Moderator Official Music Queue & Broadcast State to Cloud Firestore
 */
export async function saveMusicBroadcastToCloud(settings: MusicBroadcastSettings) {
  try {
    const ref = doc(db, 'admin_settings', 'music_queue');
    const safeQueue = Array.isArray(settings.queue)
      ? settings.queue.slice(0, 60).map((t) => {
          const item: Record<string, any> = {
            id: String(t.id),
            title: String(t.title || 'Track').slice(0, 100),
            subtitle: String(t.subtitle || 'Soundtrack').slice(0, 100),
            type: t.type || 'synth',
          };
          if (t.presetId) item.presetId = t.presetId;
          if (t.url) item.url = String(t.url).slice(0, 600);
          if (t.embedUrl) item.embedUrl = String(t.embedUrl).slice(0, 800);
          if (t.youtubeId) item.youtubeId = String(t.youtubeId).slice(0, 32);
          if (t.spotifyKind) item.spotifyKind = t.spotifyKind;
          if (t.spotifyId) item.spotifyId = String(t.spotifyId).slice(0, 64);
          return item;
        })
      : [];

    await setDoc(ref, {
      queue: safeQueue,
      currentQueueIndex: typeof settings.currentQueueIndex === 'number' ? settings.currentQueueIndex : 0,
      isPlaying: !!settings.isPlaying,
      loopMode: settings.loopMode || 'queue',
      isShuffle: !!settings.isShuffle,
      updatedAt: settings.updatedAt || Date.now(),
      updatedBy: settings.updatedBy || 'Administrator',
    });
  } catch {
    // Fallback handled locally
  }
}

