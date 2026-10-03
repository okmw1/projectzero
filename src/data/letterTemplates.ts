import { LetterTemplate } from '../types';

export const LETTER_TEMPLATES: LetterTemplate[] = [
  {
    id: 'mentorship',
    title: 'Mentorship & Guidance',
    subtitle: 'For teachers who shaped your character, values, and life path',
    icon: '🌟',
    defaultTitle: 'A Tribute to Your Guidance Beyond the Classroom',
    bodyTemplate: `Dear [Teacher's Name],

As Teacher's Day arrives, I wanted to take a moment to write you this letter not just as your student, but as someone whose perspective on life has been profoundly shaped by your presence.

Beyond our daily syllabus, what I cherish most is the wisdom and integrity you brought into our room. You always reminded us that character matters far more than grades, and that how we treat each other in difficult moments is the true measure of our learning.

Whenever I felt uncertain about the path ahead, your quiet encouragement gave me the grounded courage to move forward. Thank you for being more than an instructor—thank you for being a mentor whose lessons will continue to echo long after I graduate.

With deepest respect and gratitude,
[Your Name]`,
  },
  {
    id: 'subject',
    title: 'Subject Mastery & Passion',
    subtitle: 'For teachers who brought math, science, or language to vibrant life',
    icon: '🔬',
    defaultTitle: 'Thank You for Showing Us the Beauty in Learning',
    bodyTemplate: `Dear [Teacher's Name],

Before stepping into your [Subject] class, I used to see lessons as just another subject to study for an exam. You completely transformed how I see the world.

Your passion for teaching is contagious. You turn complicated concepts into thrilling discoveries, and you welcome every question with excitement. You taught us that curiosity is not something to be rushed, and that making mistakes is simply the first step of real discovery.

Thank you for your tireless energy, your infectious passion, and for making our classroom one of my favorite places to learn every single day.

With heartfelt admiration,
[Your Name]`,
  },
  {
    id: 'patience',
    title: 'Endless Patience',
    subtitle: 'For moments when learning felt hard and they refused to give up on you',
    icon: '🌱',
    defaultTitle: 'For Your Unwavering Patience and Belief in Me',
    bodyTemplate: `Dear [Teacher's Name],

I am writing this letter to express something I may not have said out loud during class: thank you for never giving up on me.

There were days when I struggled to keep up, when self-doubt made me want to shrink back and remain silent. You always noticed when I needed that gentle extra moment. Your patience, your kindness, and the way you broke down hard problems without ever making me feel less capable gave me confidence I didn't know I had.

You believed in my potential before I could see it in myself. That faith has meant the world to me.

Forever grateful for your kindness,
[Your Name]`,
  },
  {
    id: 'character',
    title: 'Life Lessons & Heart',
    subtitle: 'For the teacher who taught kindness, empathy, and courage',
    icon: '❤️',
    defaultTitle: 'The Lessons of Kindness and Courage You Gave Us',
    bodyTemplate: `Dear [Teacher's Name],

Some teachers teach with books, but you teach with your whole heart. On this special Teacher's Day, I want to thank you for every lesson that went far beyond the chalkboard.

You showed us how to listen to one another, how to stand up for what is right, and how to treat everyone with dignity. The quiet words of encouragement you gave us during tough days gave so many of us the strength to keep going.

Thank you for believing in our class, for noticing our quiet struggles, and for making our school feel like a second home.

With warm gratitude and respect,
[Your Name]`,
  },
  {
    id: 'class',
    title: 'From the Whole Class',
    subtitle: 'A collective letter of appreciation signed on behalf of all classmates',
    icon: '🤝',
    defaultTitle: 'A Heartfelt Thank You from All Your Students',
    bodyTemplate: `Dear [Teacher's Name],

On behalf of our entire class, we want to wish you the happiest Teacher's Day!

We know how much effort you pour into every single lesson, the extra hours you spend preparing materials, and the care you give to every student in the room. Even when our class was noisy or tired, your warm smile and dedication never wavered.

Thank you for making our school year unforgettable, inspiring, and full of laughter. You are truly one of the best teachers we could ever hope for.

With love and gratitude from all of us,
[Your Name] & Classmates`,
  },
  {
    id: 'creative',
    title: 'Arts, Sports & Expression',
    subtitle: 'For coaches, arts, music, and performance mentors who nurtured your talents',
    icon: '🎨',
    defaultTitle: 'To the Coach & Mentor Who Helped Me Find My Voice',
    bodyTemplate: `Dear [Teacher's Name],

Thank you for challenging me to step onto the stage, the court, and the canvas with boldness and dedication. Under your mentorship, I learned that talent is only the beginning—discipline, passion, and heart are what truly bring art and excellence to life.

You pushed us past our comfort zones while always making sure we felt supported and valued. Thank you for celebrating our progress, celebrating our individuality, and showing us what we are capable of creating.

With admiration and pride to be your student,
[Your Name]`,
  },
  {
    id: 'adviser',
    title: 'Homeroom & Second Home',
    subtitle: 'For the class adviser who looked out for everyone like family',
    icon: '🏡',
    defaultTitle: 'To Our Homeroom Adviser: The Heart of Our Section',
    bodyTemplate: `Dear [Teacher's Name],

Being our class adviser is not just about attendance sheets and announcements—it takes genuine love, endless patience, and a huge heart. You gave all of that to us every single day.

Whenever our section faced a challenge or needed someone in our corner, you were always there to listen, advocate for us, and guide us in the right direction. You turned a group of students into a real family.

Thank you for making our homeroom the safest, warmest place in the whole school.

Forever proud to be your advisory class,
[Your Name]`,
  },
  {
    id: 'dedication',
    title: 'Quiet Dedication',
    subtitle: 'For the early mornings, late nights, and sacrifices that often go unseen',
    icon: '☕',
    defaultTitle: 'Seeing and Celebrating Your Unspoken Dedication',
    bodyTemplate: `Dear [Teacher's Name],

We see the stacks of papers you check long after school hours. We see the carefully prepared slides, the thoughtful feedback written in the margins, and the warm smile you put on even when you are exhausted.

Teaching is often an unspoken sacrifice, but please know that none of your efforts go unnoticed. You show up for us day in and day out with unwavering commitment. Thank you for giving so much of yourself to help us build a brighter future.

With the highest appreciation,
[Your Name]`,
  },
];

// Quick suggestions for sticky notes (clickable inspiration chips)
export const NOTE_SUGGESTION_CHIPS = [
  'Thank you for making learning so inspiring and exciting every day! ✨',
  'Your patience when I was confused made all the difference to me. 💡',
  "You didn't just teach the syllabus, you taught us resilience and courage. 🌟",
  'Salamat po for staying after class and always believing in us! ❤️',
  'Best teacher ever! Thank you for your everyday kindness and smile. 😊',
  'Thank you for creating a room where asking questions is always welcome. 🙋',
  'Your lessons will stay with me for the rest of my life. Thank you! 📖',
  "Happy Teacher's Day! Thank you for inspiring us to reach higher. 🚀",
  'Maraming salamat po sa malasakit at walang sawang pasensya sa aming klase! 💐',
  'You made me love solving problems and never fear hard challenges! 📐',
  'Thank you for noticing when I was quiet and needed an encouraging word. 🤝',
  'You make even early morning classes something to look forward to! ☀️',
  "Kayo po ang aming inspirasyon at gabay sa araw-araw. Happy Teacher's Day! 🏆",
  'Thank you for believing in my potential before I could see it myself. 🌈',
  'Your classroom is our second home. Thank you for your warm heart! 🏡',
  'Thank you for turning complex lessons into unforgettable discoveries! 🔬',
];

// Rich sentence starters and building blocks for formal non-template letters
export const LETTER_PROMPT_SUGGESTIONS = {
  salutations: [
    'Dear Teacher [Name],',
    'To our dearest mentor [Name],',
    'Dearest [Name],',
    'To an exceptional educator, [Name]:',
    'To our beloved teacher [Name],',
  ],
  openings: [
    "I wanted to write this letter on Teacher's Day to express my sincere appreciation for everything you do.",
    'Throughout this school year, your classroom has been my favorite place to learn, discover, and grow.',
    'There are not enough words to capture how much your dedication has influenced my education and outlook on life.',
    "As we celebrate Teacher's Day, I wanted to take a moment to reflect on the difference you have made for me.",
  ],
  memories: [
    'One particular moment I will always treasure is when you took the extra time to help me understand...',
    'Your enthusiasm whenever you teach makes even the most difficult topics feel exciting and possible.',
    'I still remember the encouraging advice you shared with me when I was doubting my abilities.',
    'The story you told us during class about perseverance gave me the motivation to keep going.',
  ],
  impact: [
    'You taught me that making mistakes is just part of discovering something new and valuable.',
    'Your encouragement gave me the confidence to speak up in class and dream much bigger.',
    'Because of your belief in me, I found a true passion for learning that I will carry forward.',
    'You showed our whole class what true kindness, fairness, and leadership look like in practice.',
  ],
  closings: [
    "Thank you for being more than an instructor—thank you for being a true mentor. Happy Teacher's Day!",
    'Wishing you good health, lasting joy, and all the love you give so generously to your students.',
    'With deepest respect, highest admiration, and endless gratitude.',
    'Your forever grateful student,',
    'From all of us who are lucky enough to be in your classroom,',
  ],
};

// Website-wide Categorized Suggestion Bank by Subject & Theme
export interface SubjectSuggestionCategory {
  id: string;
  name: string;
  icon: string;
  tagline: string;
  prompts: {
    title: string;
    text: string;
    type: 'note' | 'letter';
  }[];
}

export const WEBSITE_SUGGESTIONS_BANK: SubjectSuggestionCategory[] = [
  {
    id: 'math',
    name: 'Mathematics',
    icon: '📐',
    tagline: 'Equations, problem-solving, and patience with numbers',
    prompts: [
      {
        title: 'Making Hard Problems Simple',
        text: 'Thank you for turning scary equations into exciting puzzles! Your patience with step-by-step solutions gave me real confidence.',
        type: 'note',
      },
      {
        title: 'Believing When Steps Were Tough',
        text: 'Before your class, math felt like an impossible wall. You showed me that every problem has a solution if we take it one step at a time.',
        type: 'letter',
      },
    ],
  },
  {
    id: 'science',
    name: 'Science & Discovery',
    icon: '🔬',
    tagline: 'Curiosity, experiments, and understanding the universe',
    prompts: [
      {
        title: 'Igniting Scientific Curiosity',
        text: 'Thank you for teaching us not just what happens in experiments, but WHY! You made the natural world come to life.',
        type: 'note',
      },
      {
        title: 'Encouraging Questions',
        text: 'Thank you for never brushing aside a question, no matter how unusual. Your enthusiasm for discovery is contagious!',
        type: 'letter',
      },
    ],
  },
  {
    id: 'english',
    name: 'English & Literature',
    icon: '📚',
    tagline: 'Stories, essays, eloquence, and finding our voice',
    prompts: [
      {
        title: 'Helping Us Find Our Voice',
        text: 'Thank you for reading our essays with so much care and showing us the power of honest, beautiful words.',
        type: 'note',
      },
      {
        title: 'Bringing Stories to Life',
        text: 'You taught us that literature is a mirror to the human heart. Thank you for fostering our imagination and critical thinking.',
        type: 'letter',
      },
    ],
  },
  {
    id: 'filipino',
    name: 'Filipino & Kultura',
    icon: '🇵🇭',
    tagline: 'Wika, pagkakakilanlan, at pagpapahalaga sa bayan',
    prompts: [
      {
        title: 'Taos-Pusong Pasasalamat',
        text: 'Maraming salamat po sa inyong walang sawang pagtuturo at pagpapalalim ng aming pagmamahal sa wikang Filipino at sa bayan! 🇵🇭',
        type: 'note',
      },
      {
        title: 'Guro at Gabay ng Bayan',
        text: 'Kayo po ay huwaran ng sipag at malasakit. Salamat po sa pagiging pangalawang magulang at tagahubog ng aming kinabukasan.',
        type: 'letter',
      },
    ],
  },
  {
    id: 'homeroom',
    name: 'Homeroom & Adviser',
    icon: '🏡',
    tagline: 'Second family, classroom harmony, and everyday care',
    prompts: [
      {
        title: 'Best Homeroom Adviser',
        text: "Thank you for making our classroom feel like a real family where everyone belongs! Happy Teacher's Day! ❤️",
        type: 'note',
      },
      {
        title: 'Unwavering Classroom Support',
        text: 'Whenever our section struggled, you stood by us with wisdom and patience. We are so lucky to have you as our adviser.',
        type: 'letter',
      },
    ],
  },
  {
    id: 'arts_pe',
    name: 'Arts, Music & Sports',
    icon: '🎨',
    tagline: 'Creativity, teamwork, resilience, and expression',
    prompts: [
      {
        title: 'Pushing Us to Shine',
        text: 'Thank you for seeing our talents and coaching us with both passion and heart! Best coach ever! 🏆',
        type: 'note',
      },
      {
        title: 'Confidence Beyond Limits',
        text: 'You taught us that discipline and practice beat doubt every single time. Thank you for inspiring us on and off the court!',
        type: 'letter',
      },
    ],
  },
];
