import React, { useState, useEffect } from 'react';
import { useLiveSession } from './hooks/useLiveSession';
import FrequencyOrb from './components/FrequencyOrb';
import ChatInterface from './components/ChatInterface';
import MemoryPanel from './components/MemoryPanel';
import Onboarding from './components/Onboarding';
import { 
  Mic, MicOff, Heart, Play, Square, Loader2, MessageSquare, 
  Database, Sparkles, Sun, Moon, Activity,
  CloudRain, Terminal
} from 'lucide-react';

const App: React.FC = () => {
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isMemoryOpen, setIsMemoryOpen] = useState(false);
  const [isDebugOpen, setIsDebugOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(true);

  const { 
    connect, disconnect, status, isAiSpeaking, isUserSpeaking, volumeLevels, errorMsg, transcript,
    inputAnalyzer, outputAnalyzer, logs 
  } = useLiveSession(isMicMuted);

  useEffect(() => {
    const seen = localStorage.getItem('thursday_onboarding_seen');
    if (seen) setShowOnboarding(false);
  }, []);

  const completeOnboarding = () => {
    localStorage.setItem('thursday_onboarding_seen', 'true');
    setShowOnboarding(false);
  };

  if (showOnboarding) {
    return <Onboarding onComplete={completeOnboarding} />;
  }

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col font-sans overflow-hidden selection:bg-indigo-500/30">
      
      {/* Thursday Header */}
      <header className="p-6 flex justify-between items-center z-20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-400 via-violet-600 to-rose-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Heart className="text-white" size={20} fill="currentColor" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-[0.2em] text-white">THURSDAY</h1>
            <p className="text-[9px] text-stone-500 tracking-[0.3em] font-mono uppercase">Neural Companion v2.0</p>
          </div>
        </div>
        
        <div className="hidden md:flex items-center gap-6 bg-stone-900/40 backdrop-blur-md px-5 py-2.5 rounded-2xl border border-stone-800/50 shadow-inner">
           <div className="flex gap-4">
              <ServiceIcon icon={<Sun size={16} />} title="Morning Check-in" active={status === 'connected'} />
              <ServiceIcon icon={<CloudRain size={16} />} title="Venting Mode" active={status === 'connected'} />
              <ServiceIcon icon={<Moon size={16} />} title="Reflection Mode" active={status === 'connected'} />
              <ServiceIcon icon={<Sparkles size={16} />} title="Growth Coaching" active={status === 'connected'} />
           </div>
           <div className="w-px h-5 bg-stone-800" />
           <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${
                status === 'connected' ? 'bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)] animate-pulse' : 
                status === 'reconnecting' ? 'bg-amber-500 animate-pulse' :
                status === 'error' ? 'bg-rose-500' : 'bg-stone-700'
              }`} />
              <span className={`text-[10px] font-mono tracking-widest ${
                status === 'connected' ? 'text-indigo-400' : 
                status === 'reconnecting' ? 'text-amber-400' :
                status === 'error' ? 'text-rose-400' : 'text-stone-500'
              }`}>
                {status.toUpperCase()}
              </span>
           </div>
        </div>
      </header>

      {/* Sanctuary Surface */}
      <main className="flex-1 flex flex-col items-center justify-center relative px-4">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
           <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[120px] animate-pulse" />
           <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-rose-600/5 rounded-full blur-[120px] animate-pulse" style={{animationDelay: '1.5s'}} />
        </div>

        {errorMsg && (
          <div className="absolute top-10 bg-rose-500/10 border border-rose-500/20 text-rose-300 px-6 py-3 rounded-2xl flex items-center gap-3 text-sm z-30 backdrop-blur-xl animate-in fade-in slide-in-from-top-4 shadow-2xl">
            <Activity size={18} className="text-rose-500" />
            <div className="font-mono text-xs uppercase tracking-tight">{errorMsg}</div>
          </div>
        )}

        {/* Neural Presence */}
        <div className="z-10 flex flex-col items-center transition-all duration-1000" style={{ 
          opacity: isChatOpen || isMemoryOpen || isDebugOpen ? 0.2 : 1, 
          transform: `scale(${isChatOpen || isMemoryOpen || isDebugOpen ? 0.8 : 1}) translateY(${isChatOpen || isMemoryOpen || isDebugOpen ? '-20px' : '0'})` 
        }}>
          <FrequencyOrb 
            isActive={status === 'connected' || status === 'reconnecting'} 
            isSpeaking={isAiSpeaking} 
            isUserSpeaking={isUserSpeaking}
            volume={isAiSpeaking ? volumeLevels.ai : volumeLevels.user}
            analyzer={isAiSpeaking ? outputAnalyzer : inputAnalyzer}
          />
          
          <div className="text-center mt-12 h-36 max-w-xl flex flex-col items-center justify-center space-y-5">
            {status === 'connected' || status === 'reconnecting' ? (
              <>
                 <div className="space-y-1">
                    <h2 className="text-4xl font-light tracking-tight text-white transition-all">
                      {status === 'reconnecting' ? "Synapse Stabilizing..." : isAiSpeaking ? "Thursday is with you..." : isUserSpeaking ? "Hearing you..." : "I'm listening..."}
                    </h2>
                    <p className="text-indigo-500/50 font-mono text-[9px] tracking-[0.3em] uppercase italic">
                      {status === 'reconnecting' ? "Neural Link Jitter" : "Safe Space Established"}
                    </p>
                 </div>
                 
                 <div className="bg-stone-900/40 border border-stone-800/50 backdrop-blur-md px-6 py-3 rounded-2xl max-w-md min-h-[60px] flex items-center justify-center animate-in fade-in zoom-in-95 duration-500 shadow-xl">
                    {transcript.ai ? (
                      <p className="text-indigo-200 text-sm italic font-medium leading-relaxed text-center">"{transcript.ai}"</p>
                    ) : transcript.user ? (
                      <p className="text-stone-400 text-sm leading-relaxed text-center">"{transcript.user}"</p>
                    ) : (
                      <div className="flex items-center gap-3">
                         <div className="flex gap-1">
                            <span className="w-1 h-1 bg-stone-700 rounded-full animate-bounce" />
                            <span className="w-1 h-1 bg-stone-700 rounded-full animate-bounce" style={{animationDelay: '0.2s'}} />
                            <span className="w-1 h-1 bg-stone-700 rounded-full animate-bounce" style={{animationDelay: '0.4s'}} />
                         </div>
                         <p className="text-stone-600 text-[10px] font-mono uppercase tracking-[0.2em]">Feeling your presence</p>
                      </div>
                    )}
                 </div>

                 {isMicMuted && (
                   <div className="px-3 py-1 bg-rose-500/10 border border-rose-500/20 rounded-full flex items-center gap-2 animate-pulse">
                     <MicOff size={10} className="text-rose-400" />
                     <span className="text-rose-400 font-mono text-[8px] tracking-widest uppercase">Privacy Mode Active</span>
                   </div>
                 )}
              </>
            ) : status === 'connecting' || status === 'initializing' ? (
              <div className="space-y-6">
                 <h2 className="text-2xl font-light text-stone-400 tracking-[0.2em] animate-pulse italic uppercase">Syncing Frequency...</h2>
                 <div className="w-64 h-1 bg-stone-900 rounded-full overflow-hidden mx-auto shadow-inner">
                    <div className="w-full h-full bg-gradient-to-r from-indigo-500 via-violet-500 to-rose-600 animate-[progress_2s_linear_infinite]" />
                 </div>
              </div>
            ) : (
              <div className="group cursor-pointer flex flex-col items-center" onClick={connect}>
                <div className="w-20 h-20 rounded-full bg-stone-900/50 border border-stone-800 flex items-center justify-center group-hover:border-indigo-500/50 group-hover:bg-indigo-500/5 transition-all duration-500 mb-6">
                   <Play size={24} fill="white" className="text-white ml-1 group-hover:scale-110 transition-transform" />
                </div>
                <h2 className="text-3xl font-extralight text-stone-600 group-hover:text-indigo-400 transition-all tracking-[0.5em] uppercase">Begin Session</h2>
              </div>
            )}
          </div>
        </div>

        <MemoryPanel isOpen={isMemoryOpen} onClose={() => setIsMemoryOpen(false)} />
        <ChatInterface isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />

        {isDebugOpen && (
          <div className="fixed inset-y-0 left-0 w-full md:w-[450px] bg-stone-950/98 backdrop-blur-3xl border-r border-stone-800 shadow-2xl z-50 flex flex-col transition-transform duration-500 ease-in-out">
            <div className="p-5 border-b border-stone-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Terminal className="text-amber-400" size={18} />
                <h2 className="text-stone-100 font-mono text-sm tracking-tight uppercase">Debugging Protocol</h2>
              </div>
              <button onClick={() => setIsDebugOpen(false)} className="text-stone-500 hover:text-white p-2">
                <XBtn size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 font-mono text-[11px] space-y-2 custom-scrollbar">
              {logs.map(log => (
                <div key={log.id} className="flex gap-3">
                  <span className="text-stone-600">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                  <span className={`font-bold ${log.level === 'error' ? 'text-rose-500' : 'text-indigo-400'}`}>{log.level.toUpperCase()}</span>
                  <span className="text-stone-300 flex-1">{log.message}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Interface Surface */}
      <footer className="p-10 flex justify-center z-20">
        <div className="bg-stone-900/70 backdrop-blur-3xl border border-stone-800/40 rounded-[3rem] px-10 py-6 flex items-center gap-10 shadow-2xl">
          <ControlBtn active={isMemoryOpen} onClick={() => setIsMemoryOpen(!isMemoryOpen)} icon={<Database size={24} />} title="History" />
          <ControlBtn active={isMicMuted} onClick={() => setIsMicMuted(!isMicMuted)} icon={isMicMuted ? <MicOff size={24} /> : <Mic size={24} />} title="Mute" disabled={status !== 'connected'} />
          
          <div className="relative">
            {status === 'disconnected' || status === 'error' ? (
               <button onClick={connect} className="w-28 h-28 bg-gradient-to-tr from-indigo-500 to-rose-600 rounded-[2.5rem] flex items-center justify-center transition-all"><Play size={36} fill="white" className="text-white" /></button>
            ) : status === 'connecting' || status === 'initializing' || status === 'reconnecting' ? (
              <div className="w-28 h-28 bg-stone-800/80 rounded-[2.5rem] flex items-center justify-center border border-stone-700 animate-pulse"><Loader2 size={40} className="text-indigo-400 animate-spin" /></div>
            ) : (
              <button onClick={disconnect} className="w-28 h-28 bg-stone-800/50 border-2 border-rose-500/20 rounded-[2.5rem] flex items-center justify-center transition-all"><Square size={32} fill="currentColor" className="text-rose-400" /></button>
            )}
          </div>

          <ControlBtn active={isChatOpen} onClick={() => setIsChatOpen(!isChatOpen)} icon={<MessageSquare size={24} />} title="Chat" />
          <ControlBtn active={isDebugOpen} onClick={() => setIsDebugOpen(!isDebugOpen)} icon={<Terminal size={24} />} title="Debug" />
        </div>
      </footer>
    </div>
  );
};

const XBtn = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
);

const ServiceIcon = ({ icon, title, active }: { icon: React.ReactNode, title: string, active: boolean }) => (
  <div className={`transition-all duration-700 ${active ? 'text-indigo-400 opacity-100 scale-110' : 'text-stone-700 opacity-30'}`} title={title}>{icon}</div>
);

const ControlBtn = ({ active, onClick, icon, title, disabled = false }: any) => (
  <button className={`p-6 rounded-[2rem] transition-all ${disabled ? 'opacity-20' : 'hover:scale-110'} ${active ? 'bg-indigo-500/20 text-indigo-400' : 'bg-stone-800/40 text-stone-500'}`} onClick={onClick} disabled={disabled} title={title}>{icon}</button>
);

export default App;