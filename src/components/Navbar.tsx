import React from 'react';
import { UserSession } from '../types';
import {
  GraduationCap,
  ShieldCheck,
  LogOut,
  Sparkles,
  LayoutDashboard,
} from 'lucide-react';

interface NavbarProps {
  onScrollTo: (sectionId: string) => void;
  user: UserSession | null;
  onOpenTeacherLogin: () => void;
  onOpenAdminDashboard?: () => void;
  onOpenTeacherDashboard?: () => void;
  onOpenIntro?: () => void;
  onLogout: () => void;
  realtimeConnected?: boolean;
  onlineCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  onScrollTo,
  user,
  onOpenTeacherLogin,
  onOpenAdminDashboard,
  onOpenTeacherDashboard,
  onOpenIntro,
  onLogout,
  realtimeConnected = true,
  onlineCount = 1,
}) => {
  return (
    <header className="w-full py-4 sm:py-5 px-4 sm:px-12 flex justify-between items-center relative z-20 no-print gap-3">
      {/* Left Brand / Role Status */}
      <div className="flex items-center gap-2 flex-wrap">
        {user ? (
          <div className="flex items-center gap-2">
            {user.role === 'teacher' ? (
              <>
                <button
                  onClick={onOpenIntro}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-[#1F453B] text-white border border-[#2C5F51] hover:bg-[#16332C] shadow-2xs transition-all cursor-pointer"
                >
                  <GraduationCap className="w-4 h-4 text-[#F7DE85]" />
                  <span>{user.name}</span>
                  <span className="hidden sm:inline opacity-85">🧑‍🏫 Teacher</span>
                  <Sparkles className="w-3 h-3 text-[#F7DE85] ml-0.5" />
                </button>
                {onOpenTeacherDashboard && (
                  <button
                    onClick={onOpenTeacherDashboard}
                    className="hidden md:flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-[#FAF5EB] hover:bg-[#F2ECE1] text-[#1F453B] border border-[#DECDB8] shadow-2xs transition-all cursor-pointer"
                    title="Open Teacher Interactive Dashboard"
                  >
                    <LayoutDashboard className="w-3.5 h-3.5 text-[#1F453B]" />
                    <span>Dashboard (Gr. 7 - SHS)</span>
                  </button>
                )}
              </>
            ) : user.role === 'moderator' ? (
              <button
                onClick={onOpenAdminDashboard}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-[#1F453B] text-white border border-[#2C5F51] hover:bg-[#16332C] shadow-2xs transition-all cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4 text-[#7CE0B3]" />
                <span>{user.name} (Mod)</span>
              </button>
            ) : (
              <button
                onClick={onOpenAdminDashboard}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-[#1F453B] text-white border border-[#3E342B] hover:bg-[#16332C] shadow-2xs transition-all cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4 text-[#F7DE85]" />
                <span>Admin Dashboard</span>
              </button>
            )}
            <button
              onClick={onLogout}
              title="Sign Out"
              className="p-1.5 rounded-lg hover:bg-black/5 text-[#6D5E4F] hover:text-[#26211D] transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          /* Public Header shows Teacher Login */
          <button
            onClick={onOpenTeacherLogin}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/95 hover:bg-white text-xs font-bold text-[#4A3E33] border border-[#DECDB8] shadow-2xs hover:border-[#CE5A46] transition-all cursor-pointer"
          >
            <GraduationCap className="w-3.5 h-3.5 text-[#CE5A46]" />
            <span>Teacher Login</span>
          </button>
        )}

        {/* Live Realtime Status Indicator Badge */}
        <div
          className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50/90 border border-emerald-200 text-emerald-800 text-[11px] font-bold shadow-2xs select-none transition-all"
          title={`Realtime synchronization active • ${onlineCount > 1 ? `${onlineCount} students & teachers connected live` : 'Live campus sync'}`}
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span className="tracking-wide">
            {onlineCount > 1 ? `${onlineCount} live now` : 'Live Realtime'}
          </span>
        </div>
      </div>

      {/* Right Navigation */}
      <nav className="flex items-center gap-4 sm:gap-6 text-xs sm:text-sm font-semibold text-[#2F2924]">
        <button
          onClick={() => onScrollTo('letter-section')}
          className="hover:text-[#CE5A46] transition-colors cursor-pointer hidden md:inline"
        >
          Our Letter
        </button>
        <button
          onClick={() => onScrollTo('wall-section')}
          className="hover:text-[#CE5A46] transition-colors cursor-pointer"
        >
          Gratitude Wall
        </button>
        <button
          onClick={() => onScrollTo('suggestions-section')}
          className="hover:text-[#CE5A46] transition-colors cursor-pointer hidden sm:inline"
        >
          Writing Ideas
        </button>
        <button
          onClick={() => onScrollTo('write-section')}
          className="hover:text-[#CE5A46] transition-colors cursor-pointer font-bold text-[#CE5A46]"
        >
          Write Note
        </button>
      </nav>
    </header>
  );
};
