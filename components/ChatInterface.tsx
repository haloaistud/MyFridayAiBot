import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Send, X, Heart, Wind, Sparkles, Bot, User, Volume2, Mic, MicOff, Loader2 } from 'lucide-react';
import { useChat } from '../hooks/useChat';

interface ChatInterfaceProps {
  isOpen: boolean;
  onClose: () => void;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ isOpen, onClose }) => {
  const { messages, sendMessage, speakMessage, isLoading, currentMode, setCurrentMode } = useChat();
  const [inputValue, setInputValue] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<any>(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Neural Auto-Vocalize Protocol
  useEffect(() => {
    const lastMsg = messages[messages.length - 1];
    if (lastMsg && lastMsg.role === 'model' && !lastMsg.isStreaming && autoSpeak) {
      speakMessage(lastMsg.text);
    }
  }, [messages, autoSpeak, speakMessage]);

  const handleSend = useCallback(() => {
    const text = inputValue.trim();
    if (text) {
      sendMessage(text);
      setInputValue('');
    }
  }, [inputValue, sendMessage]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      setIsListening(false);
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // Silently catch already-stopped instances
      }
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    }
  }, []);

  // Neural Speech Recognition refined for conversational flow
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        // Reset 1.5s silence timer on every speech detection
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        
        let finalSegment = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalSegment += event.results[i][0].transcript;
          }
        }

        if (finalSegment) {
          setInputValue(prev => prev + finalSegment);
        }

        // 1500ms SILENCE_THRESHOLD dispatch logic as requested
        const SILENCE_THRESHOLD = 1500; 
        silenceTimerRef.current = setTimeout(() => {
          if (isListening) {
             handleSend();
             stopListening();
          }
        }, SILENCE_THRESHOLD);
      };

      recognition.onerror = (e: any) => {
        console.warn("[Neural Stt] Error caught:", e.error);
        if (e.error === 'network') {
          // Retry logic could go here if critical
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
    
    // Explicit cleanup
    return () => {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {}
      }
    };
  }, [isListening, handleSend, stopListening]);

  const startListening = () => {
    if (recognitionRef.current) {
      setInputValue('');
      setIsListening(true);
      try {
        recognitionRef.current.start();
      } catch (e) {
        setIsListening(false);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-full md:w-[450px] bg-stone-900/95 backdrop-blur-2xl border-l border-stone-800 shadow-2xl z-50 flex flex-col transition-transform duration-500 ease-in-out">
      
      {/* Header */}
      <div className="p-5 border-b border-stone-800 flex items-center justify-between bg-stone-900/50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
             <Heart className="text-indigo-400" size={16} fill="currentColor" />
          </div>
          <div>
             <h2 className="text-stone-100 font-medium tracking-tight">Vocal Sanctuary</h2>
             <p className="text-[9px] text-stone-500 font-mono uppercase tracking-widest">Neural Recognition v2.4</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
           <button 
             onClick={() => setAutoSpeak(!autoSpeak)} 
             className={`p-2 rounded-lg transition-all ${autoSpeak ? 'text-indigo-400 bg-indigo-500/10 ring-1 ring-indigo-500/20' : 'text-stone-600 hover:text-stone-400'}`}
             title="Auto-Vocalize Replies"
           >
             <Volume2 size={16} />
           </button>
           <button onClick={onClose} className="text-stone-500 hover:text-white transition-colors p-2 hover:bg-stone-800 rounded-full">
             <X size={20} />
           </button>
        </div>
      </div>

      {/* Mode Selector */}
      <div className="p-2 grid grid-cols-3 gap-1 bg-stone-950/30">
        <ModeButton 
          active={currentMode === 'smart'} 
          onClick={() => setCurrentMode('smart')}
          icon={<Heart size={16} />}
          label="Reflect"
          desc="Therapeutic"
        />
        <ModeButton 
          active={currentMode === 'fast'} 
          onClick={() => setCurrentMode('fast')}
          icon={<Wind size={16} />}
          label="Vent"
          desc="Immediate"
        />
        <ModeButton 
          active={currentMode === 'search'} 
          onClick={() => setCurrentMode('search')}
          icon={<Sparkles size={16} />}
          label="Encourage"
          desc="Grounded"
        />
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'model' && (
              <div className="w-8 h-8 rounded-full bg-indigo-900/30 flex items-center justify-center flex-shrink-0 mt-1 border border-indigo-500/20 shadow-sm shadow-indigo-500/10">
                <Bot size={14} className="text-indigo-400" />
              </div>
            )}
            
            <div className={`max-w-[85%] space-y-2`}>
              {msg.text && (
                <div 
                  className={`p-4 rounded-2xl text-sm leading-relaxed shadow-sm relative group/msg transition-all ${
                    msg.role === 'user' 
                      ? 'bg-indigo-600 text-white rounded-tr-sm shadow-indigo-900/20' 
                      : 'bg-stone-800/80 text-stone-200 rounded-tl-sm border border-stone-700/50'
                  }`}
                >
                  <div className="whitespace-pre-wrap">{msg.text}</div>
                  {msg.role === 'model' && !msg.isStreaming && (
                    <button 
                      onClick={() => speakMessage(msg.text)}
                      className="absolute -right-10 top-2 p-2 text-stone-600 hover:text-indigo-400 opacity-0 group-hover/msg:opacity-100 transition-all bg-stone-900/90 rounded-lg border border-stone-800 shadow-xl"
                    >
                      <Volume2 size={14} />
                    </button>
                  )}
                </div>
              )}
            </div>

            {msg.role === 'user' && (
              <div className="w-8 h-8 rounded-full bg-stone-800 flex items-center justify-center flex-shrink-0 mt-1 border border-stone-700">
                <User size={14} className="text-stone-400" />
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Stage */}
      <div className="p-5 bg-stone-900 border-t border-stone-800">
        <div className="flex gap-2">
          <button 
            onClick={isListening ? stopListening : startListening}
            className={`p-3.5 rounded-2xl transition-all border flex items-center justify-center min-w-[56px] ${
              isListening 
                ? 'bg-rose-500/20 border-rose-500 text-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.3)]' 
                : 'bg-stone-950 border-stone-700 text-stone-500 hover:text-indigo-400 hover:border-indigo-500/50'
            }`}
          >
            {isListening ? <Loader2 size={20} className="animate-spin" /> : <Mic size={20} />}
          </button>
          
          <div className="relative flex-1">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isListening ? "Listening... (Pause to send)" : "Speak to Thursday..."}
              className={`w-full bg-stone-950 border text-stone-200 rounded-2xl pl-4 pr-12 py-3.5 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-all placeholder:text-stone-700 text-sm ${
                isListening ? 'border-indigo-500/50 italic' : 'border-stone-700'
              }`}
              disabled={isLoading}
            />
            <button 
              onClick={handleSend}
              disabled={!inputValue.trim() || isLoading}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-indigo-600 rounded-xl text-white hover:bg-indigo-500 disabled:opacity-20 transition-all shadow-lg active:scale-95"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const ModeButton = ({ active, onClick, icon, label, desc }: any) => (
  <button
    onClick={onClick}
    className={`flex flex-col items-center justify-center p-3 rounded-xl transition-all duration-300 border ${
      active 
        ? 'bg-indigo-500/10 border-indigo-500/50 text-indigo-400' 
        : 'bg-transparent border-transparent text-stone-600 hover:bg-stone-800/50 hover:text-stone-300'
    }`}
  >
    <div className="mb-1.5">{icon}</div>
    <span className="text-xs font-semibold">{label}</span>
    <span className="text-[9px] opacity-60 italic">{desc}</span>
  </button>
);

export default ChatInterface;