export interface SubjectOption {
  id: string;
  name: string;
  category: 'JHS' | 'SHS';
  icon: string;
  tagline?: string;
}

export const JHS_GRADE_LEVELS = [
  'Grade 7',
  'Grade 8',
  'Grade 9',
  'Grade 10',
];

export const SHS_GRADE_LEVELS = [
  'Senior High School (SHS)',
];

export const JHS_SUBJECTS: SubjectOption[] = [
  { id: 'Mathematics', name: 'Mathematics', category: 'JHS', icon: '📐', tagline: 'Math, Algebra, Geometry & Statistics' },
  { id: 'Science', name: 'Science', category: 'JHS', icon: '🔬', tagline: 'Biology, Chemistry, Physics & Earth Science' },
  { id: 'Filipino', name: 'Filipino', category: 'JHS', icon: '🇵🇭', tagline: 'Wika, Panitikan at Kulturang Pilipino' },
  { id: 'Araling Panlipunan', name: 'Araling Panlipunan', category: 'JHS', icon: '🌏', tagline: 'Kasaysayan, Ekonomiks at Sibika' },
  { id: 'MAPEH', name: 'MAPEH', category: 'JHS', icon: '🎨', tagline: 'Music, Arts, Physical Education & Health' },
  { id: 'TLE', name: 'TLE', category: 'JHS', icon: '🛠️', tagline: 'Technology & Livelihood Education' },
  { id: 'Values Education', name: 'Values Education', category: 'JHS', icon: '🌱', tagline: 'Edukasyon sa Pagpapakatao (EsP)' },
  { id: 'Others', name: 'Others', category: 'JHS', icon: '✨', tagline: 'Other Subjects & Homeroom' },
];

export const SHS_STRANDS: SubjectOption[] = [
  { id: 'HUMSS', name: 'HUMSS', category: 'SHS', icon: '⚖️', tagline: 'Humanities & Social Sciences' },
  { id: 'STEM', name: 'STEM', category: 'SHS', icon: '🧪', tagline: 'Science, Technology, Engineering & Math' },
  { id: 'ABM', name: 'ABM', category: 'SHS', icon: '📊', tagline: 'Accountancy, Business & Management' },
  { id: 'TechPro', name: 'TechPro', category: 'SHS', icon: '💻', tagline: 'Technical-Vocational & ICT Track' },
  { id: 'Sports', name: 'Sports', category: 'SHS', icon: '🏅', tagline: 'Sports Track & Athletic Coaching' },
  { id: 'Arts', name: 'Arts', category: 'SHS', icon: '🎭', tagline: 'Arts & Design Track' },
  { id: 'Others', name: 'Others', category: 'SHS', icon: '🎓', tagline: 'General Academics & Other Electives' },
];

export const ALL_CURRICULUM_OPTIONS = [...JHS_SUBJECTS, ...SHS_STRANDS];
