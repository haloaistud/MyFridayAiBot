import React, { useState } from 'react';
import { Heart, Sparkles, Shield, ChevronRight, Mic, Loader2 } from 'lucide-react';

interface OnboardingProps {
  onComplete: () => void;
}

const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestPermission = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      setPermissionGranted(true);
    } catch (e) {
      setError("Microphone access denied. Thursday needs to hear you to help you.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-stone-950 flex items-center justify-center p-6 overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-rose-600/10 rounded-full blur-[120px] animate-pulse" />
      </div>

      <div className="max-w-xl w-full space-y-8 z-10 text-center">
        <div className="space-y-4">
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-400 via-violet-600 to-rose-600 flex items-center justify-center shadow-2xl shadow-indigo-500/40">
              <Heart className="text-white" size={32} fill="currentColor" />
            </div>
          </div>
          <h1 className="text-4xl font-bold tracking-tighter text-white uppercase tracking-[0.2em]">THURSDAY</h1>
          <p className="text-stone-400 font-mono text-sm tracking-widest uppercase">Your Personal Emotional Companion</p>
        </div>

        <div className="grid grid-cols-1 gap-4 text-left">
          <Feature 
            icon={<Heart className="text-indigo-400" size={20} fill="currentColor" />} 
            title="Therapeutic Listening" 
            desc="A non-judgmental safe space to unpack your thoughts, stress, and emotions." 
          />
          <Feature 
            icon={<Sparkles className="text-rose-400" size={20} />} 
            title="Motivation & Growth" 
            desc="Gentle coaching to help you build resilience, confidence, and discipline." 
          />
        </div>

        {error && (
            <div className="bg-rose-500/10 border border-rose-500/20 text-rose-300 p-3 rounded-lg text-sm">
                {error}
            </div>
        )}

        <div className="space-y-3 pt-4">
            {!permissionGranted ? (
                <button 
                  onClick={requestPermission}
                  disabled={isLoading}
                  className="w-full py-4 bg-stone-800 text-stone-200 font-medium rounded-2xl flex items-center justify-center gap-2 hover:bg-stone-700 transition-all border border-stone-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Mic size={18} />}
                  {isLoading ? "Requesting Access..." : "Grant Microphone Access"}
                </button>
            ) : (
                <button 
                  onClick={onComplete}
                  className="group relative w-full py-4 bg-white text-stone-950 font-bold rounded-2xl flex items-center justify-center gap-2 hover:bg-stone-50 transition-all active:scale-95 shadow-xl animate-in fade-in slide-in-from-bottom-2"
                >
                  STEP INTO SANCTUARY
                  <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </button>
            )}
            <p className="text-[10px] text-stone-600 uppercase tracking-widest">
                {permissionGranted ? "Access Granted. Ready to Sync." : "Required for vocal neural link"}
            </p>
        </div>
      </div>
    </div>
  );
};

const Feature = ({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) => (
  <div className="flex gap-4 p-4 rounded-3xl bg-stone-900/50 border border-stone-800/50 backdrop-blur-sm">
    <div className="mt-1">{icon}</div>
    <div className="space-y-1.5">
      <h3 className="text-stone-100 font-semibold">{title}</h3>
      <p className="text-stone-500 text-sm leading-relaxed">{desc}</p>
    </div>
  </div>
);

export default Onboarding;