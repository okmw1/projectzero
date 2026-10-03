import React from 'react';
import { Heart, Sparkles, Award } from 'lucide-react';

export const ClassLetterSection: React.FC = () => {
  return (
    <section id="letter-section" className="px-4 sm:px-6 lg:px-8 py-10 max-w-4xl mx-auto">
      <div className="relative bg-[#FFFDF9] border-2 border-[#E8DCC8] rounded-3xl p-6 sm:p-10 md:p-12 shadow-md">
        {/* Top Washi Tape */}
        <div className="washi-tape" />

        {/* Section Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#FAF5EB] border border-[#DECDB8] text-xs font-bold text-[#8C4334] mb-3">
            <Heart className="w-3.5 h-3.5 fill-current" />
            <span>AN OPEN LETTER FROM THE STUDENTS OF CITY HIGH</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-[#2D2823]">
            To Our Teachers, Respected Principal, & The Whole School Family
          </h2>
        </div>

        {/* Letter Body */}
        <div className="space-y-4 text-sm sm:text-base text-[#4A4036] font-medium leading-relaxed">
          <p>
            <span className="text-lg font-bold text-[#2D2823]">
              Dear Beloved Teachers, Respected Principal, & Wonderful City High Staff,
            </span>
          </p>
          <p>
            Every single morning, as we step through the gates of City High, we are embraced by a community that works tirelessly behind the scenes and at the front of every classroom to help us grow, learn, and shine.
          </p>
          <p>
            <strong className="text-[#1F453B]">To Our Dedicated Teachers:</strong> You bring far more than textbooks and curriculum into our lives. You bring endless patience, infectious passion, and unwavering belief in our potential. You notice when we are quiet or struggling before we even raise a hand, you celebrate our small victories, and you remind us that curiosity and character matter far more than just high marks.
          </p>
          <p>
            <strong className="text-[#1F453B]">To Our Esteemed Principal & Administrators:</strong> Thank you for your inspiring leadership, steady guidance, and constant vision. You ensure City High remains a safe, welcoming, and vibrant environment where every student has the tools and encouragement to pursue their dreams.
          </p>
          <p>
            <strong className="text-[#1F453B]">To Our Essential School Staff:</strong> Our guidance counselors, librarians, administrative personnel, canteen staff, security guards, and maintenance team—you are the everyday superheroes of City High. From keeping our campus spotless and safe, to greeting us with warm smiles and lending a helping hand whenever we need it, you make our school feel like a true second home.
          </p>
          <p>
            This gratitude wall, our memories, and our personal letters are a heartfelt tribute to each and every one of you. We are endlessly proud and grateful to be City High students.
          </p>
          <p className="pt-2 font-bold text-[#2D2823]">
            Happy Teachers & Educators Day to the entire City High family! 💐✨
          </p>
        </div>

        {/* Bottom Sign-off and Wax Stamp */}
        <div className="mt-8 pt-6 border-t border-[#EADECC] flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-center sm:text-left">
            <p className="text-xs uppercase tracking-wider font-bold text-[#8C7A68]">With infinite gratitude & love,</p>
            <p className="text-base sm:text-lg font-black text-[#1F453B]">The Entire Students of City High</p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-[#FFF3F0] border border-[#FCD2C9] text-xs font-bold text-[#CE5A46] shadow-2xs">
            <Award className="w-4 h-4" />
            <span>City High Teacher's Day Keepsake</span>
            <Sparkles className="w-3.5 h-3.5 text-[#F59E0B]" />
          </div>
        </div>
      </div>
    </section>
  );
};
