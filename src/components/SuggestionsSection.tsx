import React, { useState } from 'react';
import { WEBSITE_SUGGESTIONS_BANK } from '../data/letterTemplates';
import { CommunitySuggestion, UserSession } from '../types';
import {
  Lightbulb,
  Copy,
  Sparkles,
  CheckCircle2,
  PenTool,
  Send,
  Trash2,
  MessageSquarePlus,
  AlertTriangle,
} from 'lucide-react';
import { playChime } from '../utils/audio';

interface SuggestionsSectionProps {
  onSelectPrompt?: (text: string, type: 'note' | 'letter', subjectName?: string) => void;
  communitySuggestions?: CommunitySuggestion[];
  onAddCommunitySuggestion?: (
    authorName: string,
    category: string,
    text: string
  ) => Promise<{ ok: boolean; error?: string }> | void;
  onDeleteCommunitySuggestion?: (suggestionId: string) => void;
  user?: UserSession | null;
}

const QUICK_SUGGESTION_EXAMPLES = [
  "Thank you for never giving up on us and always believing in our potential! 🌟",
  "Your lessons go beyond textbooks — you taught us kindness, resilience, and respect. 💐",
  "Happy Teacher's Day to the mentor who made every classroom day brighter! ✨",
];

export const SuggestionsSection: React.FC<SuggestionsSectionProps> = ({
  onSelectPrompt,
  communitySuggestions = [],
  onAddCommunitySuggestion,
  onDeleteCommunitySuggestion,
  user,
}) => {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('math');
  const [copiedIndex, setCopiedIndex] = useState<string | null>(null);

  // Suggestion Box Form State
  const [authorName, setAuthorName] = useState<string>(user?.name || '');
  const [suggestionCategory, setSuggestionCategory] = useState<string>('Note Prompt Idea');
  const [suggestionText, setSuggestionText] = useState<string>('');
  const [formError, setFormError] = useState<string>('');
  const [formSuccess, setFormSuccess] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  React.useEffect(() => {
    if (user?.name) setAuthorName(user.name);
  }, [user?.name]);

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

  const handleSubmitSuggestion = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    const finalAuthor = (user?.name || authorName || '').trim();
    const finalText = suggestionText.trim();

    if (!finalAuthor || finalAuthor.length < 2) {
      setFormError('Please enter your name or student nickname (at least 2 characters).');
      return;
    }
    if (!finalText || finalText.length < 5) {
      setFormError('Please write a thoughtful suggestion or greeting idea (at least 5 characters).');
      return;
    }
    if (!onAddCommunitySuggestion) return;

    setIsSubmitting(true);
    try {
      const res = await onAddCommunitySuggestion(finalAuthor, suggestionCategory, finalText);
      if (res && !res.ok) {
        setFormError(res.error || 'Suggestion blocked by community safety filter.');
      } else {
        setSuggestionText('');
        setFormSuccess(true);
        playChime();
        setTimeout(() => setFormSuccess(false), 4000);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const canModerate =
    user?.role === 'admin' || user?.role === 'moderator' || user?.role === 'teacher' || user?.isSuperAdmin;

  return (
    <section id="suggestions-section" className="relative w-full max-w-5xl mx-auto px-4 sm:px-6 mb-16 sm:mb-20 z-10">
      <div className="board-card border border-[#E8DFD1] p-6 sm:p-10 rounded-3xl bg-[#FFFDF9] shadow-sm space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3 pb-4 border-b border-[#EEDBCA]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#FFF5DB] border border-[#F2DEAA] text-[#B87A00] flex items-center justify-center shadow-2xs">
              <Lightbulb className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs uppercase tracking-[0.2em] font-bold text-[#CE5A46]">
                WRITING IDEAS, PHRASE SUGGESTIONS & SUGGESTION BOX
              </div>
              <h3 className="font-heading text-xl sm:text-2xl font-bold text-[#231F1D]">
                Not sure what to write? Browse or Share Suggestions
              </h3>
            </div>
          </div>
          <span className="text-xs font-medium text-[#7D6E5E] bg-[#F7F2E7] px-3 py-1.5 rounded-full border border-[#E6DAC8]">
            💡 Click any idea to insert it directly into your Note or Letter!
          </span>
        </div>

        {/* Subject Filter Pills */}
        <div>
          <div className="flex items-center flex-wrap gap-2 mb-5">
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

        {/* Community Suggestion Box & Live Shared Prompts */}
        <div className="pt-6 border-t-2 border-dashed border-[#E5D7C3] grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Submit to Suggestion Box */}
          <div className="lg:col-span-6 bg-[#FAF5EC] border border-[#E2D5C3] rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#1F453B] text-[#F7DE85] flex items-center justify-center">
                  <MessageSquarePlus className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#231F1D] font-heading">
                    Community Suggestion Box
                  </h4>
                  <p className="text-[11px] text-[#7A6C5D]">
                    Share a new greeting phrase, quote, or Teacher's Day suggestion!
                  </p>
                </div>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold">
                Live Synced
              </span>
            </div>

            {/* Quick Idea Starters */}
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-[#8C5D39] mb-1.5">
                Tap an example idea or write your own:
              </div>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_SUGGESTION_EXAMPLES.map((ex, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setSuggestionText(ex);
                      setFormError('');
                      playChime();
                    }}
                    className="px-2.5 py-1 rounded-lg bg-white hover:bg-[#F3EADB] border border-[#DECDB8] text-[11px] text-[#3E342B] text-left line-clamp-1 cursor-pointer transition-all"
                  >
                    {ex}
                  </button>
                ))}
              </div>
            </div>

            {formSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Your suggestion was added to the Community Suggestion Box!</span>
              </div>
            )}

            {formError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitSuggestion} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {!user?.name && (
                  <input
                    type="text"
                    value={authorName}
                    onChange={(e) => setAuthorName(e.target.value)}
                    placeholder="Your name / nickname *"
                    maxLength={50}
                    className="px-3 py-2 text-xs bg-white border border-[#DDD0BF] rounded-xl text-[#231F1D] focus:outline-none focus:ring-2 focus:ring-[#1F453B]/30"
                  />
                )}
                <select
                  value={suggestionCategory}
                  onChange={(e) => setSuggestionCategory(e.target.value)}
                  className="px-3 py-2 text-xs bg-white border border-[#DDD0BF] rounded-xl text-[#231F1D] font-semibold focus:outline-none focus:ring-2 focus:ring-[#1F453B]/30"
                >
                  <option value="Note Prompt Idea">📌 Sticky Note Phrase</option>
                  <option value="Formal Letter Line">💌 Formal Letter Line</option>
                  <option value="Comment Greeting">💬 Comment Greeting</option>
                  <option value="Event Suggestion">🎉 Teacher's Day Suggestion</option>
                </select>
              </div>

              <textarea
                rows={3}
                value={suggestionText}
                onChange={(e) => setSuggestionText(e.target.value)}
                placeholder="Write a heartfelt greeting phrase for classmates to use, or a suggestion for our Teacher's Day celebration..."
                maxLength={350}
                className="w-full p-3 text-xs bg-white border border-[#DDD0BF] rounded-xl text-[#231F1D] font-body-serif focus:outline-none focus:ring-2 focus:ring-[#1F453B]/30"
              />

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-[#1F453B] hover:bg-[#16332C] text-white text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer transition-all disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5 text-[#F7DE85]" />
                  <span>{isSubmitting ? 'Submitting...' : 'Submit Suggestion'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Right: Community-Submitted Suggestions Feed */}
          <div className="lg:col-span-6 bg-[#FAF7F0] border border-[#E2D5C3] rounded-2xl p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#CE5A46]" />
                  <h4 className="text-sm font-bold text-[#231F1D] font-heading">
                    Community Shared Phrases & Ideas ({communitySuggestions.length})
                  </h4>
                </div>
                <span className="text-[10px] font-mono text-[#7A6C5D]">
                  Click any phrase to use it!
                </span>
              </div>

              {communitySuggestions.length === 0 ? (
                <div className="py-10 px-4 text-center bg-white/80 rounded-2xl border border-[#E8DCC8] text-xs text-[#7A6C5D] italic">
                  No community suggestions submitted yet — share your favorite Teacher's Day greeting phrase on the left!
                </div>
              ) : (
                <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                  {communitySuggestions.map((item) => (
                    <div
                      key={item.id}
                      className="p-3.5 rounded-xl bg-white border border-[#E8DCC8] hover:border-[#1F453B]/40 transition-all shadow-2xs space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-bold text-[#231F1D]">{item.authorName}</span>
                          <span className="px-2 py-0.5 rounded bg-[#FAF5EC] border border-[#DECDB8] text-[10px] font-bold text-[#8C5D39]">
                            {item.category}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() =>
                              handleUsePrompt(
                                item.text,
                                item.category.includes('Letter') ? 'letter' : 'note',
                                activeCategory.name
                              )
                            }
                            className="px-2.5 py-1 rounded-lg bg-[#CE5A46] hover:bg-[#B74A37] text-white text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <PenTool className="w-2.5 h-2.5" />
                            <span>Use Phrase</span>
                          </button>
                          {canModerate && onDeleteCommunitySuggestion && (
                            <button
                              type="button"
                              onClick={() => onDeleteCommunitySuggestion(item.id)}
                              className="p-1 rounded-lg text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                              title="Delete suggestion"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-[#3E342B] font-body-serif italic leading-relaxed">
                        "{item.text}"
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
