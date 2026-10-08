export type NoteColor = 'blush' | 'sky' | 'mint' | 'sunshine' | 'lilac' | 'coral';

export type UserRole = 'guest' | 'student' | 'teacher' | 'admin' | 'moderator';

export interface UserSession {
  role: UserRole;
  name: string;
  title?: string;
  subject?: string;
  email?: string;
  id?: string;
  avatar?: string;
  isSuperAdmin?: boolean;
}

export interface AuthorizedTeacher {
  id: string;
  name: string;
  subject: string;
  accessCode: string;
  status: 'approved' | 'pending';
  requestedAt?: string;
  email?: string;
}

export interface AuthorizedModerator {
  id: string;
  name: string;
  email: string;
  accessCode: string;
  assignedBy: string;
  createdAt: number | string;
  status: 'active' | 'suspended';
  notesReviewedCount?: number;
}

export interface StudentNote {
  id: string;
  subject: string;
  teacherName?: string;
  message: string;
  studentName: string;
  grade?: string;
  gradeLevel?: 'Grade 7-10' | 'SHS' | string;
  strandOrSubject?: string;
  color: NoteColor;
  isStarred?: boolean;
  likes?: number;
  createdAt?: number | string;
  isTeacherReply?: boolean;
  teacherComment?: string;
  teacherCommentAuthor?: string;
  teacherCommentTime?: number;
  status?: 'approved' | 'flagged' | 'blocked';
  flaggedReason?: string;
  letterId?: string;
  isFormalLetterPreview?: boolean;
  fullLetterBody?: string;
  letterTitle?: string;
}

export interface MaintenanceSettings {
  enabled: boolean;
  message: string;
  estimatedReturn: string;
  updatedAt: number;
  updatedBy?: string;
}

export type AnnouncementTheme = 'gold' | 'emerald' | 'rose' | 'parchment';

export interface AnnouncementComment {
  id: string;
  authorName: string;
  authorRole: UserRole;
  message: string;
  createdAt: number;
}

export interface AnnouncementSettings {
  enabled: boolean;
  title: string;
  message: string;
  senderName: string;
  theme: AnnouncementTheme;
  showPopupModal: boolean;
  triggerConfetti: boolean;
  updatedAt: number;
  comments?: AnnouncementComment[];
}

export interface TributeComment {
  id: string;
  targetId: string;
  targetType: 'note' | 'letter';
  authorName: string;
  authorRole: UserRole;
  message: string;
  createdAt: number;
}

export interface CommunitySuggestion {
  id: string;
  authorName: string;
  authorRole: UserRole;
  category: string;
  text: string;
  createdAt: number;
}

export interface PhotoCard {
  id: string;
  src: string;
  alt: string;
  caption?: string;
  scale: number;
  rotation: number;
  createdAt?: number;
}

export interface StudentLetter {
  id: string;
  recipientTeacherName: string;
  recipientSubject: string;
  studentName: string;
  grade?: string;
  gradeLevel?: 'Grade 7-10' | 'SHS' | string;
  templateType: 'mentorship' | 'subject' | 'patience' | 'character' | 'class' | 'creative' | 'adviser' | 'dedication' | 'custom';
  title: string;
  body: string;
  createdAt: number;
  isRead: boolean;
  isBookmarked?: boolean;
  pinPreviewToWall?: boolean;
  attachedPhoto?: string;
  teacherReplyMessage?: string;
  teacherReplyAuthor?: string;
  teacherReplyTime?: number;
  status?: 'approved' | 'flagged' | 'blocked';
  flaggedReason?: string;
}

export interface LetterTemplate {
  id: 'mentorship' | 'subject' | 'patience' | 'character' | 'class' | 'creative' | 'adviser' | 'dedication';
  title: string;
  subtitle: string;
  icon: string;
  defaultTitle: string;
  bodyTemplate: string;
}

export type MusicPlatformType = 'synth' | 'youtube' | 'spotify' | 'soundcloud' | 'custom_url';

export interface MusicTrack {
  id: string;
  title: string;
  subtitle: string;
  type: MusicPlatformType;
  presetId?: 'piano_memories' | 'acoustic_gratitude' | 'music_box_bell' | 'lofi_afternoon';
  url?: string;
  embedUrl?: string;
  youtubeId?: string;
  spotifyKind?: 'track' | 'album' | 'playlist' | 'episode';
  spotifyId?: string;
}

export interface MusicBroadcastSettings {
  queue: MusicTrack[];
  currentQueueIndex: number;
  isPlaying: boolean;
  loopMode: 'queue' | 'one' | 'off';
  isShuffle: boolean;
  updatedAt: number;
  updatedBy?: string;
}

