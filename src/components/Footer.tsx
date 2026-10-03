import React from 'react';
import { Heart, Paperclip } from 'lucide-react';

interface FooterProps {
  onOpenAdminLogin: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onOpenAdminLogin }) => {
  return (
    <footer className="w-full mt-16 py-10 px-4 sm:px-8 border-t border-[#EADBCA] bg-[#FAF5EB]/90 text-[#5C5044] relative z-10 no-print">
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-left">
        <div className="flex items-center justify-center sm:justify-start gap-2 font-bold text-sm sm:text-base text-[#3D332A]">
          <span>Made with</span>
          <Heart className="w-4 h-4 text-[#CE5A46] fill-[#CE5A46] animate-pulse" />
          <span>by grateful students for the teachers who shaped our lives.</span>
        </div>

        <div className="flex items-center gap-4 text-xs font-bold text-[#6D5E4F]">
          <a
            href="#letter-section"
            className="hover:text-[#CE5A46] transition-colors"
          >
            Our Letter
          </a>
          <span>•</span>
          <a
            href="#wall-section"
            className="hover:text-[#CE5A46] transition-colors"
          >
            Gratitude Wall
          </a>
          <span>•</span>
          <a
            href="#write-section"
            className="hover:text-[#CE5A46] transition-colors"
          >
            Send Letter
          </a>
          <span>•</span>
          {/* Subtle Paperclip button for Admin Portal */}
          <button
            onClick={onOpenAdminLogin}
            title="School Coordinator Portal"
            className="p-1.5 rounded-lg hover:bg-black/5 text-[#A08E7D] hover:text-[#2D2823] transition-colors cursor-pointer"
          >
            <Paperclip className="w-4 h-4" />
          </button>
        </div>
      </div>
    </footer>
  );
};
