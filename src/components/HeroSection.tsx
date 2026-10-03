import React from 'react';
import { Sparkles, Heart, PenLine, MessageSquareHeart } from 'lucide-react';

interface HeroSectionProps {
  onWriteClick: () => void;
  onlineCount?: number;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onWriteClick, onlineCount = 1 }) => {
  return (
    <section className="relative px-4 sm:px-6 lg:px-8 pt-6 pb-12 text-center max-w-4xl mx-auto">
      {/* Playful Floating Badge */}
      <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/80 border border-[#E5D7BE] text-xs sm:text-sm font-bold text-[#1F453B] shadow-2xs mb-6 backdrop-blur-xs">
        <Sparkles className="w-4 h-4 text-[#E68A00]" />
        <span>A Special Keepsake for World Teachers' Day</span>
        <span className="w-1.5 h-1.5 rounded-full bg-[#CE5A46]" />
        <span className="text-[#CE5A46]">From Your Students</span>
      </div>

      {/* Main Headline */}
      <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-[#2D2823] tracking-tight leading-[1.15] mb-5">
        For the teachers who help us <span className="text-[#CE5A46] inline-flex items-center gap-1.5">shine <Sparkles className="w-7 h-7 sm:w-10 sm:h-10 text-[#F59E0B] inline animate-gentle-float" /></span>
      </h1>

      {/* Subtitle */}
      <p className="text-base sm:text-lg text-[#5A4F43] max-w-2xl mx-auto mb-8 font-medium leading-relaxed">
        A cheerful keepsake and collaborative gratitude wall. Photos, memories, heartfelt letters, and appreciation pinned together in one happy place.
      </p>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
        <button
          onClick={onWriteClick}
          className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-[#CE5A46] hover:bg-[#B84E3C] text-white font-bold text-sm sm:text-base shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer"
        >
          <PenLine className="w-5 h-5" />
          <span>Write a Note or Letter</span>
        </button>
        <a
          href="#wall-section"
          className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-white hover:bg-[#FAF6EE] text-[#2D2823] border-2 border-[#DECDB8] font-bold text-sm sm:text-base shadow-2xs hover:border-[#CE5A46] transition-all cursor-pointer"
        >
          <MessageSquareHeart className="w-5 h-5 text-[#CE5A46]" />
          <span>Explore Gratitude Wall</span>
        </a>
      </div>

      {/* Floating Mini Highlight Pills */}
      <div className="mt-10 flex flex-wrap items-center justify-center gap-2.5 text-xs font-bold text-[#635748]">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50/90 border border-emerald-200 text-emerald-800 shadow-2xs font-bold text-xs">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span>{onlineCount > 1 ? `${onlineCount} Students & Teachers Celebrating Live` : 'Live Realtime Wall Active'}</span>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/70 border border-[#EADECC]">
          <Heart className="w-3.5 h-3.5 text-[#CE5A46] fill-[#CE5A46]" />
          <span>Interactive Student Tributes</span>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/70 border border-[#EADECC]">
          <span>💌 Formal Teacher Mailbox</span>
        </div>
      </div>
    </section>
  );
};
