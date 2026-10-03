import React from 'react';
import { Sparkles, Heart, Star, BookOpen, GraduationCap, Award, Compass, Sun } from 'lucide-react';

export const BackgroundDoodles: React.FC = () => {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0 select-none opacity-40">
      {/* Top Left Floating Elements */}
      <div className="absolute -top-6 -left-6 w-32 h-32 rounded-full bg-[#FCE588]/40 blur-2xl animate-gentle-float" />
      <div className="absolute top-12 left-[8%] text-[#CE5A46]/30 rotate-12 animate-gentle-float">
        <Heart className="w-8 h-8 fill-current" />
      </div>
      <div className="absolute top-28 left-[18%] text-[#1F453B]/20 -rotate-12">
        <BookOpen className="w-9 h-9" />
      </div>
      <div className="absolute top-48 left-[4%] text-[#D97706]/30 rotate-45">
        <Sparkles className="w-6 h-6" />
      </div>

      {/* Top Right Floating Elements */}
      <div className="absolute top-8 right-[10%] text-[#2563EB]/25 rotate-[-8deg] animate-gentle-float" style={{ animationDelay: '1s' }}>
        <GraduationCap className="w-10 h-10" />
      </div>
      <div className="absolute top-24 right-[4%] text-[#D97706]/35 rotate-12">
        <Star className="w-7 h-7 fill-current" />
      </div>
      <div className="absolute top-52 right-[14%] text-[#16A34A]/25 -rotate-6">
        <Award className="w-8 h-8" />
      </div>

      {/* Mid Left Elements */}
      <div className="absolute top-[45%] left-[2%] text-[#7C3AED]/20 rotate-12">
        <Compass className="w-9 h-9" />
      </div>
      <div className="absolute top-[55%] left-[9%] text-[#CE5A46]/25 -rotate-12 animate-gentle-float" style={{ animationDelay: '2s' }}>
        <Heart className="w-6 h-6 fill-current" />
      </div>

      {/* Mid Right Elements */}
      <div className="absolute top-[40%] right-[3%] text-[#D97706]/25 rotate-6">
        <Sun className="w-10 h-10" />
      </div>
      <div className="absolute top-[60%] right-[8%] text-[#1F453B]/20 rotate-[-15deg] animate-gentle-float" style={{ animationDelay: '1.5s' }}>
        <Sparkles className="w-7 h-7" />
      </div>

      {/* Bottom Area Elements */}
      <div className="absolute bottom-20 left-[12%] text-[#2563EB]/20 rotate-6">
        <Star className="w-8 h-8 fill-current" />
      </div>
      <div className="absolute bottom-16 right-[12%] text-[#CE5A46]/30 rotate-12 animate-gentle-float">
        <Heart className="w-8 h-8 fill-current" />
      </div>
    </div>
  );
};
