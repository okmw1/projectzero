import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  getFirestore,
  doc,
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
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { StudentNote, AuthorizedTeacher, StudentLetter, AuthorizedModerator, PhotoCard } from '../types';
import { matchesTeacherName } from '../utils/teacherMatcher';
import { INITIAL_STUDENT_LETTERS, INITIAL_AUTHORIZED_TEACHERS } from '../data/initialNotes';

export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

// Test connection on boot
export async function testFirestoreConnection() {
  try {
    await getDocFromServer(doc(db, 'notes', 'health-check'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firestore offline notice. Fallback cache active.');
    }
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
      };
    });

    const lastVisibleDoc = docs.length > 0 ? docs[docs.length - 1] : null;
    const hasMore = docs.length === batchSize;
    return { notes, lastVisibleDoc, hasMore };
  } catch (error) {
    console.error('Error fetching notes page:', error);
    return { notes: [], lastVisibleDoc: null, hasMore: false };
  }
}

/**
 * Subscribe to the newest live notes (optimized window for 10k-15k scale)
 */
export function subscribeToRecentNotes(onNotesUpdated: (notes: StudentNote[]) => void, batchLimit = 60) {
  const notesRef = collection(db, 'notes');
  const q = query(notesRef, orderBy('createdAt', 'desc'), limit(batchLimit));

  return onSnapshot(
    q,
    (snapshot) => {
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
          createdAt: data.createdAt || Date.now(),
          isTeacherReply: !!data.isTeacherReply,
          teacherComment: data.teacherComment || '',
          teacherCommentAuthor: data.teacherCommentAuthor || '',
          teacherCommentTime: data.teacherCommentTime || 0,
          status: data.status || 'approved',
          flaggedReason: data.flaggedReason || '',
          letterId: data.letterId || undefined,
          isFormalLetterPreview: !!data.isFormalLetterPreview,
        };
      });
      onNotesUpdated(notes);
    },
    (error) => {
      console.error('Realtime listener error:', error);
    }
  );
}

/**
 * Add a new student note to Cloud Firestore
 */
export async function addNoteToCloud(note: StudentNote) {
  try {
    const docRef = doc(db, 'notes', note.id);
    await setDoc(docRef, {
      id: note.id,
      studentName: note.studentName,
      grade: note.grade || '',
      gradeLevel: note.gradeLevel || '',
      strandOrSubject: note.strandOrSubject || '',
      teacherName: note.teacherName || '',
      subject: note.subject.toUpperCase(),
      message: note.message,
      color: note.color,
      likes: note.likes || 1,
      createdAt: note.createdAt || Date.now(),
      isTeacherReply: !!note.isTeacherReply,
      teacherComment: note.teacherComment || '',
      teacherCommentAuthor: note.teacherCommentAuthor || '',
      teacherCommentTime: note.teacherCommentTime || 0,
      status: note.status || 'approved',
      flaggedReason: note.flaggedReason || '',
      letterId: note.letterId || undefined,
      isFormalLetterPreview: !!note.isFormalLetterPreview,
    });
  } catch (error) {
    console.error('Error adding note to Firestore:', error);
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
  } catch (error) {
    console.error('Error adding teacher comment to note:', error);
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
  } catch (error) {
    console.error('Error incrementing likes:', error);
  }
}

/**
 * Delete inappropriate note from Cloud Firestore (Admin)
 */
export async function deleteNoteFromCloud(noteId: string) {
  try {
    const docRef = doc(db, 'notes', noteId);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Error deleting note from cloud:', error);
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
  } catch (e) {
    console.warn('Notice seeding initial notes:', e);
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
  } catch (e) {
    console.warn('Notice seeding initial letters:', e);
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
  } catch (e) {
    console.warn('Notice seeding initial teachers:', e);
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
    (err) => {
      console.warn('Notice loading teachers from cloud:', err);
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
  } catch (err) {
    console.error('Error saving teacher to cloud:', err);
  }
}

/**
 * Revoke teacher in Firestore
 */
export async function deleteTeacherFromCloud(teacherId: string) {
  try {
    const docRef = doc(db, 'teachers', teacherId);
    await deleteDoc(docRef);
  } catch (err) {
    console.error('Error removing teacher from cloud:', err);
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
  } catch (e) {
    console.warn('Teacher cleanup notice:', e);
  }
}

/**
 * Send a formal student letter to Cloud Firestore
 */
export async function sendLetterToCloud(letter: StudentLetter) {
  try {
    const docRef = doc(db, 'letters', letter.id);
    await setDoc(docRef, {
      ...letter,
      createdAt: letter.createdAt || Date.now(),
      isRead: !!letter.isRead,
      isBookmarked: !!letter.isBookmarked,
      status: letter.status || 'approved',
      flaggedReason: letter.flaggedReason || '',
    });
  } catch (err) {
    console.error('Error sending letter to cloud:', err);
  }
}

/**
 * Subscribe to all letters or letters for a specific teacher
 */
export function subscribeToLetters(onLettersUpdated: (letters: StudentLetter[]) => void, teacherName?: string) {
  const lettersRef = collection(db, 'letters');
  const q = query(lettersRef, orderBy('createdAt', 'desc'), limit(100));

  return onSnapshot(
    q,
    (snapshot) => {
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

      onLettersUpdated(letters);
    },
    (err) => {
      console.warn('Notice loading letters from cloud:', err);
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
  } catch (error) {
    console.error('Error adding teacher reply to letter:', error);
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
  } catch (err) {
    console.error('Error marking letter as read:', err);
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
  } catch (err) {
    console.error('Error toggling letter bookmark:', err);
  }
}

/**
 * Delete inappropriate letter from Cloud Firestore (Teacher/Admin)
 */
export async function deleteLetterFromCloud(letterId: string) {
  try {
    const docRef = doc(db, 'letters', letterId);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Error deleting letter from cloud:', error);
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
    (err) => {
      console.warn('Notice loading moderators from cloud:', err);
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
  } catch (err) {
    console.error('Error saving moderator to cloud:', err);
  }
}

/**
 * Revoke/delete moderator from Firestore
 */
export async function deleteModeratorFromCloud(moderatorId: string) {
  try {
    const docRef = doc(db, 'moderators', moderatorId);
    await deleteDoc(docRef);
  } catch (err) {
    console.error('Error removing moderator from cloud:', err);
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
  } catch (e) {
    console.warn('Notice seeding initial moderators:', e);
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
  } catch (e) {
    console.warn('Notice cleaning up invalid moderators:', e);
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
    (err) => {
      console.warn('Notice listening to admin settings:', err);
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
  } catch (err) {
    console.error('Error saving admin password to cloud:', err);
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
    (err) => {
      console.warn('Real-time photo subscription note:', err);
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
  } catch (err) {
    console.error('Error saving photo to cloud:', err);
  }
}

/**
 * Delete a Photo Card from Cloud Firestore
 */
export async function deletePhotoFromCloud(photoId: string) {
  try {
    const photoRef = doc(db, 'photos', photoId);
    await deleteDoc(photoRef);
  } catch (error) {
    console.error('Error deleting photo from cloud:', error);
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
  } catch (err) {
    console.warn('Notice seeding initial photos:', err);
  }
}
