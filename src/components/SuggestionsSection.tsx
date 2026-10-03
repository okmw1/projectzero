import React, { useState } from 'react';
import { WEBSITE_SUGGESTIONS_BANK } from '../data/letterTemplates';
import { Lightbulb, Copy, Sparkles, CheckCircle2, PenTool } from 'lucide-react';
import { playChime } from '../utils/audio';

interface SuggestionsSectionProps {
  onSelectPrompt?: (text: string, type: 'note' | 'letter', subjectName?: string) => void;
}

export const SuggestionsSection: React.FC<SuggestionsSectionProps> = ({ onSelectPrompt }) => {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('math');
  const [copiedIndex, setCopiedIndex] = useState<string | null>(null);

  const activeCategory =
    WEBSITE_SUGGESTIONS_BANK.find((c) => c.id === selectedCategoryId) ||
    WEBSITE_SUGGESTIONS_BANK[0];

  const handleCopy = (text: string, key: string) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
    setCopiedIndex(key);
    playChime();
    setTimeout(() => setCopiedIndex(null), 2500);
  };

  const handleUsePrompt = (text: string, type: 'note' | 'letter', subjectName: string) => {
    playChime();
    if (onSelectPrompt) {
      onSelectPrompt(text, type, subjectName);
    } else {
      window.dispatchEvent(
        new CustomEvent('insert-gratitude-prompt', {
          detail: { text, type, subject: subjectName },
        })
      );
      const el = document.getElementById('write-section');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <section id="suggestions-section" className="relative w-full max-w-5xl mx-auto px-4 sm:px-6 mb-16 sm:mb-20 z-10">
      <div className="board-card border border-[#E8DFD1] p-6 sm:p-10 rounded-3xl bg-[#FFFDF9] shadow-sm">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3 mb-6 pb-4 border-b border-[#EEDBCA]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#FFF5DB] border border-[#F2DEAA] text-[#B87A00] flex items-center justify-center shadow-2xs">
              <Lightbulb className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs uppercase tracking-[0.2em] font-bold text-[#CE5A46]">
                WRITING IDEAS & INSPIRATION
              </div>
              <h3 className="font-heading text-xl sm:text-2xl font-bold text-[#231F1D]">
                Not sure what to write? Browse Suggestions
              </h3>
            </div>
          </div>
          <span className="text-xs font-medium text-[#7D6E5E] bg-[#F7F2E7] px-3 py-1.5 rounded-full border border-[#E6DAC8]">
            💡 Click any idea to insert it directly into your tribute!
          </span>
        </div>

        {/* Subject Filter Pills */}
        <div className="flex items-center flex-wrap gap-2 mb-6">
          {WEBSITE_SUGGESTIONS_BANK.map((cat) => {
            const isSelected = selectedCategoryId === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategoryId(cat.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-[#1F453B] text-white shadow-xs scale-102'
                    : 'bg-[#FAF6EE] text-[#55493D] border border-[#E2D5C3] hover:bg-white'
                }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.name}</span>
              </button>
            );
          })}
        </div>

        {/* Tagline */}
        <div className="mb-4 text-xs font-medium text-[#8A7A6A] italic flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-[#D97706]" />
          <span>{activeCategory.tagline}</span>
        </div>

        {/* Prompts Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {activeCategory.prompts.map((prompt, idx) => {
            const key = `${activeCategory.id}-${idx}`;
            const isCopied = copiedIndex === key;
            return (
              <div
                key={idx}
                className="bg-[#FAF7F0] border border-[#E5D7C3] rounded-2xl p-4 sm:p-5 flex flex-col justify-between hover:border-[#1F453B]/40 hover:shadow-sm transition-all"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-[#2D251F]">
                      {prompt.title}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-white border border-[#DDD0BF] text-[10px] font-bold text-[#6B5C4D] uppercase font-mono">
                      {prompt.type === 'note' ? '📌 Sticky Note' : '💌 Long Letter'}
                    </span>
                  </div>
                  <p className="font-body-serif text-xs sm:text-sm text-[#4A3D30] leading-relaxed italic bg-white p-3 rounded-xl border border-[#E9DFCF] mb-4">
                    "{prompt.text}"
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-black/5">
                  <button
                    type="button"
                    onClick={() => handleCopy(prompt.text, key)}
                    className="px-2.5 py-1.5 rounded-lg bg-white border border-[#DDD0BF] hover:bg-[#F2ECE1] text-[11px] font-bold text-[#55493D] transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    {isCopied ? (
                      <>
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span className="text-emerald-700">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3 text-[#7A6C5D]" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleUsePrompt(prompt.text, prompt.type, activeCategory.name)}
                    className="px-3.5 py-1.5 rounded-lg bg-[#CE5A46] hover:bg-[#B74A37] text-white text-[11px] font-bold transition-all shadow-2xs hover:scale-102 active:scale-98 cursor-pointer flex items-center gap-1"
                  >
                    <PenTool className="w-3 h-3" />
                    <span>Use in {prompt.type === 'note' ? 'Note' : 'Letter'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
