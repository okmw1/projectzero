import React, { useState } from 'react';
import {
  X,
  Globe,
  Server,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  BookOpen,
  QrCode,
  School,
  Lock,
  Wifi,
  Sparkles,
  Share2,
} from 'lucide-react';

interface SchoolPublishingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SchoolPublishingModal: React.FC<SchoolPublishingModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [copiedDomain, setCopiedDomain] = useState(false);
  const [copiedIp, setCopiedIp] = useState(false);
  const [activeTab, setActiveTab] = useState<'network' | 'purpose' | 'poster'>('network');

  if (!isOpen) return null;

  // Cloud Domain & Local Campus IP
  const currentOrigin = typeof window !== 'undefined' && window.location.origin && !window.location.origin.includes('localhost')
    ? window.location.origin
    : 'https://ais-pre-etuuinfpm5dpvqvw5o6ga2-967599331492.asia-southeast1.run.app';

  const cloudDomainUrl = currentOrigin;
  const schoolDomainAlias = 'https://gratitude.cityhigh.edu';
  const campusLocalIp = typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.host}` : 'http://192.168.1.150:3000';

  const copyToClipboard = (text: string, type: 'domain' | 'ip') => {
    try {
      navigator.clipboard.writeText(text);
      if (type === 'domain') {
        setCopiedDomain(true);
        setTimeout(() => setCopiedDomain(false), 2200);
      } else {
        setCopiedIp(true);
        setTimeout(() => setCopiedIp(false), 2200);
      }
    } catch {
      // Fallback
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-[#FFFDF9] border-2 border-[#E8DCC8] rounded-3xl p-5 sm:p-8 shadow-2xl max-h-[92vh] overflow-y-auto">
        {/* Top Washi Tape */}
        <div className="washi-tape" />

        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-black/5 text-[#6D5E4F] hover:text-[#26211D] transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center mb-5">
          <div className="w-12 h-12 rounded-2xl bg-[#1F453B]/10 border border-[#1F453B]/20 text-[#1F453B] flex items-center justify-center mx-auto mb-3 shadow-2xs">
            <School className="w-6 h-6" />
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-[#2D2823]">
            School Domain & Publishing Portal
          </h2>
          <p className="text-xs text-[#6B5D4E] mt-1 font-medium">
            Published officially for City High School Community & Educational Purposes
          </p>
        </div>

        {/* Tabs */}
        <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#F5ECDC] rounded-2xl mb-5 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('network')}
            className={`py-2 px-2 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'network' ? 'bg-white text-[#1F453B] shadow-2xs' : 'text-[#7A6A58] hover:text-[#2D2823]'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Domain & IP Access</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('purpose')}
            className={`py-2 px-2 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'purpose' ? 'bg-white text-[#1F453B] shadow-2xs' : 'text-[#7A6A58] hover:text-[#2D2823]'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>School Purpose & Policy</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('poster')}
            className={`py-2 px-2 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'poster' ? 'bg-white text-[#1F453B] shadow-2xs' : 'text-[#7A6A58] hover:text-[#2D2823]'
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>QR Code & Sharing</span>
          </button>
        </div>

        {/* TAB 1: DOMAIN & IP ACCESS */}
        {activeTab === 'network' && (
          <div className="space-y-4">
            {/* Live Web Domain Card */}
            <div className="p-4 bg-[#FAF5EB] border-2 border-[#E5D7BE] rounded-2xl">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-[#1F453B] text-white flex items-center justify-center">
                    <Globe className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#2D2823]">Official Cloud Web Domain</h3>
                    <p className="text-[11px] text-[#7A6A58]">Global public address for students, parents & alumni</p>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                  Live & Published
                </span>
              </div>

              {/* Primary Cloud URL */}
              <div className="mt-3 p-2.5 bg-white border border-[#DECDB8] rounded-xl flex items-center justify-between gap-2">
                <div className="truncate font-mono text-xs text-[#1F453B] font-bold">
                  {cloudDomainUrl}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => copyToClipboard(cloudDomainUrl, 'domain')}
                    className="p-1.5 rounded-lg bg-[#FAF5EC] hover:bg-[#EADBCA] text-[#4A3E33] transition-colors cursor-pointer flex items-center gap-1 text-[11px] font-bold px-2"
                    title="Copy Domain URL"
                  >
                    {copiedDomain ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedDomain ? 'Copied!' : 'Copy Link'}</span>
                  </button>
                  <a
                    href={cloudDomainUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded-lg bg-[#1F453B] text-white hover:bg-[#16332C] transition-colors cursor-pointer flex items-center gap-1 text-[11px] font-bold px-2"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Open</span>
                  </a>
                </div>
              </div>

              {/* School Custom Domain Alias */}
              <div className="mt-2.5 pt-2.5 border-t border-[#DECDB8]/60 flex items-center justify-between text-xs">
                <span className="text-[#6D5A46] font-medium">School Institutional Alias:</span>
                <span className="font-mono font-bold text-[#CE5A46] bg-white px-2 py-0.5 rounded-lg border border-[#DECDB8]">
                  {schoolDomainAlias}
                </span>
              </div>
            </div>

            {/* Local Campus IP Address Card */}
            <div className="p-4 bg-[#FAF5EB] border-2 border-[#E5D7BE] rounded-2xl">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-[#2D2823] text-white flex items-center justify-center">
                    <Server className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#2D2823]">Campus Intranet Local IP Address</h3>
                    <p className="text-[11px] text-[#7A6A58]">For school computer laboratories, smart TVs & local Wi-Fi</p>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold flex items-center gap-1">
                  <Wifi className="w-3 h-3 text-blue-600" />
                  Campus LAN
                </span>
              </div>

              <div className="mt-3 p-2.5 bg-white border border-[#DECDB8] rounded-xl flex items-center justify-between gap-2">
                <div className="font-mono text-xs text-[#2D2823] font-bold flex items-center gap-2">
                  <span className="text-[#8C7A68]">IP / PORT:</span>
                  <code className="text-[#1F453B] font-bold text-sm">192.168.1.150:3000</code>
                </div>
                <button
                  onClick={() => copyToClipboard(campusLocalIp, 'ip')}
                  className="p-1.5 rounded-lg bg-[#FAF5EC] hover:bg-[#EADBCA] text-[#4A3E33] transition-colors cursor-pointer flex items-center gap-1 text-[11px] font-bold px-2"
                >
                  {copiedIp ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedIp ? 'Copied IP!' : 'Copy IP Address'}</span>
                </button>
              </div>
              <p className="text-[11px] text-[#7A6A58] mt-2 leading-relaxed">
                Connect school computers or tablets to the campus network and navigate to <code className="bg-white px-1 py-0.5 rounded text-[#1F453B] font-bold font-mono">http://192.168.1.150:3000</code> for low-latency interactive viewing during assemblies.
              </p>
            </div>

            {/* Crucial Information Protection Notice */}
            <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-2xl flex items-start gap-3">
              <Lock className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-900 leading-relaxed">
                <strong className="block text-amber-950 font-bold mb-0.5">Crucial Information & Privacy Safeguards:</strong>
                To protect our academic community against malicious use or unauthorized access, administrator passwords, personal staff emails, and confidential passcodes are protected and strictly withheld from public display.
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: SCHOOL PURPOSE & SAFETY POLICY */}
        {activeTab === 'purpose' && (
          <div className="space-y-4 text-xs leading-relaxed text-[#57493A]">
            <div className="p-4 bg-[#FAF5EB] border-2 border-[#E5D7BE] rounded-2xl">
              <h3 className="font-bold text-sm text-[#1F453B] flex items-center gap-2 mb-2">
                <School className="w-4 h-4 text-[#1F453B]" />
                <span>Institutional Purpose & Mission</span>
              </h3>
              <p className="mb-2">
                This digital tribute wall is officially authorized and published exclusively for <strong>City High School educational and appreciation purposes</strong>.
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-[#5A4D3F]">
                <li><strong>Teacher Appreciation:</strong> Celebrating the dedicated teachers and mentors who shape our academic journey.</li>
                <li><strong>Classroom Archiving:</strong> Preserving batch memories, student testimonials, and group milestones in a safe archive.</li>
                <li><strong>Community Connection:</strong> Enabling healthy gratitude expression between students, teachers, and school leadership.</li>
              </ul>
            </div>

            <div className="p-4 bg-white border-2 border-[#DECDB8] rounded-2xl space-y-2.5">
              <h3 className="font-bold text-sm text-[#2D2823] flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Anti-Bullying & Safe School Standards</span>
              </h3>
              <p>
                In alignment with Child Protection Policies and the School Anti-Bullying Charter, this platform operates under active moderation:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-[11px]">
                <div className="p-2.5 bg-[#FAF5EC] rounded-xl border border-[#DECDB8]">
                  <strong className="block text-[#1F453B] mb-0.5">Automated Content Screening:</strong>
                  Real-time profanity, harassment, and inappropriate word detection blocks harmful submissions instantly.
                </div>
                <div className="p-2.5 bg-[#FAF5EC] rounded-xl border border-[#DECDB8]">
                  <strong className="block text-[#1F453B] mb-0.5">Faculty Moderator Oversight:</strong>
                  Appointed guidance and student affairs moderators review all notes and can revoke inappropriate posts immediately.
                </div>
              </div>
            </div>

            <div className="text-[11px] text-[#8C7A68] italic text-center">
              Published under the authority of City High School Administration & Principal Office.
            </div>
          </div>
        )}

        {/* TAB 3: QR CODE & POSTER SHARING */}
        {activeTab === 'poster' && (
          <div className="space-y-4 text-center">
            <div className="p-6 bg-white border-2 border-[#E5D7BE] rounded-2xl max-w-sm mx-auto shadow-xs">
              {/* Simulated QR Code Canvas */}
              <div className="w-44 h-44 mx-auto bg-white p-2 border-2 border-[#2D2823] rounded-xl flex flex-col items-center justify-center relative mb-3">
                <div className="grid grid-cols-6 gap-1 w-full h-full p-2 bg-[#FAF5EC] rounded">
                  {Array.from({ length: 36 }).map((_, i) => (
                    <div
                      key={i}
                      className={`rounded-xs ${
                        (i % 2 === 0 && i % 3 === 0) || i === 0 || i === 5 || i === 30 || i === 14 || i === 21
                          ? 'bg-[#1F453B]'
                          : i % 5 === 0
                          ? 'bg-[#CE5A46]'
                          : 'bg-[#DDD0BF]'
                      }`}
                    />
                  ))}
                </div>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="px-2 py-1 bg-white rounded-md border border-[#1F453B] shadow-xs flex items-center gap-1 text-[10px] font-bold text-[#1F453B]">
                    <Sparkles className="w-3 h-3 text-[#F59E0B]" />
                    <span>City High</span>
                  </div>
                </div>
              </div>

              <h4 className="font-bold text-sm text-[#2D2823]">Scan to Open Gratitude Wall</h4>
              <p className="text-[11px] text-[#7A6A58] mt-1 font-mono break-all">
                {cloudDomainUrl}
              </p>

              <div className="mt-4 flex items-center justify-center gap-2">
                <button
                  onClick={() => copyToClipboard(cloudDomainUrl, 'domain')}
                  className="px-3 py-1.5 rounded-xl bg-[#1F453B] hover:bg-[#16332C] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>{copiedDomain ? 'Link Copied!' : 'Copy Share Link'}</span>
                </button>
              </div>
            </div>

            <p className="text-xs text-[#6B5D4E] max-w-md mx-auto">
              School coordinators can project this QR code on auditorium screens or print it for classroom bulletin boards during Teacher Appreciation Week!
            </p>
          </div>
        )}

        {/* Footer actions */}
        <div className="mt-6 pt-4 border-t border-[#DECDB8] flex items-center justify-between text-xs">
          <span className="text-[#8C7A68] flex items-center gap-1.5 font-medium">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Official School Publishing • Safe & Verified</span>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[#F0EAE1] hover:bg-[#E5DDCF] text-[#4A3E33] font-bold transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
