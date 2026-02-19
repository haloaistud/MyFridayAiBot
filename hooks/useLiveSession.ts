import { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, LiveSession } from '@google/genai';
import { base64Decode, pcmToAudioBuffer, float32To16BitPCM, downsampleBuffer } from '../utils/audio';
import { ConnectionStatus, DebugLog } from '../types';
import { memoryService } from '../services/memory';
import { appTools } from '../utils/tools';

/**
 * ThursdayLogger implementation for comprehensive system tracking.
 */
class ThursdayLogger {
  private logCallback: (log: DebugLog) => void;
  constructor(callback: (log: DebugLog) => void) {
    this.logCallback = callback;
  }
  log(level: DebugLog['level'], module: string, message: string, data?: any) {
    const timestamp = new Date().toISOString();
    console.log(`[THURSDAY][${timestamp}][${module}] ${message}`, data || '');
    this.logCallback({
      id: Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
      level,
      module,
      message
    });
  }
}

export const useLiveSession = (isMicMuted: boolean) => {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  const [volumeLevels, setVolumeLevels] = useState({ user: 0, ai: 0 });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [transcript, setTranscript] = useState({ user: '', ai: '' });
  const [logs, setLogs] = useState<DebugLog[]>([]);

  const logger = useRef<ThursdayLogger | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const activeSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const activeSessionRef = useRef<LiveSession | null>(null);
  const isConnectedRef = useRef(false);
  
  const inputAnalyzerRef = useRef<AnalyserNode | null>(null);
  const outputAnalyzerRef = useRef<AnalyserNode | null>(null);
  const retryCountRef = useRef(0);
  const MAX_RETRIES = 3;

  // Initialize logger once
  if (!logger.current) {
    logger.current = new ThursdayLogger((log) => setLogs(prev => [log, ...prev].slice(0, 50)));
  }

  const isMutedRef = useRef(isMicMuted);
  useEffect(() => {
    isMutedRef.current = isMicMuted;
  }, [isMicMuted]);

  const cleanup = useCallback(() => {
    logger.current?.log('info', 'System', 'Dismantling neural link components...');
    isConnectedRef.current = false;
    activeSessionRef.current = null;

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    
    if (activeSourcesRef.current) {
      activeSourcesRef.current.forEach(src => {
        try { src.stop(); } catch (e) {}
      });
      activeSourcesRef.current.clear();
    }

    if (inputAudioContextRef.current && inputAudioContextRef.current.state !== 'closed') {
      inputAudioContextRef.current.close();
    }
    if (outputAudioContextRef.current && outputAudioContextRef.current.state !== 'closed') {
      outputAudioContextRef.current.close();
    }
    
    inputAudioContextRef.current = null;
    outputAudioContextRef.current = null;
    setIsAiSpeaking(false);
    setIsUserSpeaking(false);
    nextStartTimeRef.current = 0;
    setTranscript({ user: '', ai: '' });
  }, []);

  const connect = useCallback(async () => {
    const rawKey = process.env.API_KEY;
    const apiKey = rawKey ? rawKey.trim() : "";
    
    if (!apiKey) {
      const err = "Neural Key Missing. Verify environment credentials.";
      setErrorMsg(err);
      logger.current?.log('error', 'Auth', err);
      return;
    }

    try {
      cleanup();
      setStatus('initializing');
      logger.current?.log('info', 'Network', 'Synchronizing frequency with neural engine...');
      setErrorMsg(null);

      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

      if (inputCtx.state === 'suspended') await inputCtx.resume();
      if (outputCtx.state === 'suspended') await outputCtx.resume();

      inputAudioContextRef.current = inputCtx;
      outputAudioContextRef.current = outputCtx;
      
      const inAnalyzer = inputCtx.createAnalyser();
      inAnalyzer.fftSize = 256;
      inAnalyzer.smoothingTimeConstant = 0.4;
      inputAnalyzerRef.current = inAnalyzer;

      const outAnalyzer = outputCtx.createAnalyser();
      outAnalyzer.fftSize = 256;
      outputAnalyzerRef.current = outAnalyzer;
      
      const outputGain = outputCtx.createGain();
      outputGain.connect(outAnalyzer);
      outAnalyzer.connect(outputCtx.destination);

      logger.current?.log('info', 'Hardware', 'Requesting microphone interface access...');
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1
        } });
      } catch (e: any) {
        let msg = "Microphone access denied.";
        if (e.name === 'NotFoundError') msg = "No microphone hardware detected.";
        if (e.name === 'NotReadableError') msg = "Microphone is being used by another app.";
        setErrorMsg(msg);
        logger.current?.log('error', 'Hardware', msg, e);
        setStatus('error');
        return;
      }
      streamRef.current = stream;

      const ai = new GoogleGenAI({ apiKey });
      const memories = memoryService.getAllMemories();
      const memoriesText = memories.slice(0, 30).map(m => `- ${m.entity} ${m.relation} ${m.value}`).join('\n');

      const systemInstruction = `You are Thursday, an emotionally intelligent and high-fidelity AI agent.
Your conversational style is concise, empathetic, and human-like. 

CONVERSATIONAL PROTOCOL:
- You speak as a trusted friend and mentor.
- Avoid all robotic preambles ("As an AI...", "How can I help you?").
- Use short sentences for better vocal flow.
- Validate the user's emotions before providing guidance.

CURRENT USER CONTEXT:
${memoriesText || "Beginning of life continuity graph."}`;

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { 
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } 
          },
          systemInstruction,
          tools: [{ functionDeclarations: appTools }],
          inputAudioTranscription: {},
          outputAudioTranscription: {},
        },
        callbacks: {
          onopen: () => {
            logger.current?.log('info', 'Socket', 'Vocal neural bridge established.');
            setStatus('connected');
            isConnectedRef.current = true;
            retryCountRef.current = 0;
            
            const source = inputCtx.createMediaStreamSource(stream);
            sourceRef.current = source;
            
            const gainNode = inputCtx.createGain();
            gainNode.gain.value = 1.3;
            gainNodeRef.current = gainNode;
            
            const processor = inputCtx.createScriptProcessor(4096, 1, 1);
            processorRef.current = processor;

            let silenceFrames = 0;
            const SILENCE_THRESHOLD = 0.0028; 
            const HANGOVER_THRESHOLD = 15; // ~600ms hangover for natural breaks

            processor.onaudioprocess = (e) => {
              if (isMutedRef.current || !isConnectedRef.current || !activeSessionRef.current) return;
              
              const inputData = e.inputBuffer.getChannelData(0);
              let sum = 0;
              for (let i = 0; i < inputData.length; i++) {
                sum += inputData[i] * inputData[i];
              }
              const rms = Math.sqrt(sum / inputData.length);
              
              // Neural-tuned Voice Activity Detection
              if (rms < SILENCE_THRESHOLD) {
                silenceFrames++;
                if (silenceFrames > HANGOVER_THRESHOLD) {
                   if (isUserSpeaking) setIsUserSpeaking(false);
                   return; 
                }
              } else {
                silenceFrames = 0;
                if (!isUserSpeaking) setIsUserSpeaking(true);
              }

              const downsampled = downsampleBuffer(inputData, inputCtx.sampleRate, 16000);
              const pcmBlob = float32To16BitPCM(downsampled);
              
              try {
                activeSessionRef.current.sendRealtimeInput({ media: pcmBlob });
              } catch (err: any) {
                logger.current?.log('debug', 'Socket', 'Silent buffer drop during sync.');
              }
            };

            source.connect(gainNode);
            gainNode.connect(inAnalyzer);
            gainNode.connect(processor);
            processor.connect(inputCtx.destination);

            setTimeout(() => {
                if (activeSessionRef.current) {
                  activeSessionRef.current.sendRealtimeInput({ text: "Checking link stability... I'm listening." });
                }
            }, 600);
          },
          onmessage: async (msg: LiveServerMessage) => {
            if (msg.serverContent?.inputTranscription) {
              setTranscript(prev => ({ ...prev, user: msg.serverContent!.inputTranscription!.text }));
            }
            if (msg.serverContent?.outputTranscription) {
              setTranscript(prev => ({ ...prev, ai: prev.ai + msg.serverContent!.outputTranscription!.text }));
            }
            if (msg.serverContent?.turnComplete) {
              setTranscript({ user: '', ai: '' });
            }

            if (msg.toolCall) {
              for (const fc of msg.toolCall.functionCalls) {
                logger.current?.log('debug', 'Tool', `Neural call received: ${fc.name}`);
                let result = "Memory integrated.";
                if (fc.name === 'save_memory') {
                  const { entity, relation, value } = fc.args as any;
                  memoryService.addMemory(entity, relation, value);
                  result = `Memory update: ${entity} -> ${relation}`;
                }
                if (activeSessionRef.current) {
                   activeSessionRef.current.sendToolResponse({
                      functionResponses: { id: fc.id, name: fc.name, response: { result } }
                   });
                }
              }
            }

            const base64Audio = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio) {
              const ctx = outputAudioContextRef.current;
              if (!ctx) return;
              setIsAiSpeaking(true);
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
              
              try {
                const audioBuffer = pcmToAudioBuffer(base64Decode(base64Audio), ctx, 24000, 1);
                const sourceNode = ctx.createBufferSource();
                sourceNode.buffer = audioBuffer;
                sourceNode.connect(outputGain);
                
                sourceNode.addEventListener('ended', () => {
                  activeSourcesRef.current.delete(sourceNode);
                  if (activeSourcesRef.current.size === 0) setIsAiSpeaking(false);
                });
                
                sourceNode.start(nextStartTimeRef.current);
                nextStartTimeRef.current += audioBuffer.duration;
                activeSourcesRef.current.add(sourceNode);
              } catch (e: any) {
                logger.current?.log('error', 'Audio', 'Synthesis buffer overflow detected.');
              }
            }

            if (msg.serverContent?.interrupted) {
              activeSourcesRef.current.forEach(src => { try { src.stop(); } catch (e) {} });
              activeSourcesRef.current.clear();
              nextStartTimeRef.current = 0;
              setIsAiSpeaking(false);
              logger.current?.log('debug', 'System', 'Output interrupted by user.');
            }
          },
          onclose: (e) => {
            isConnectedRef.current = false;
            activeSessionRef.current = null;
            cleanup();
            setStatus('disconnected');
            logger.current?.log('info', 'Socket', 'Bridge closed normally.');
          },
          onerror: (err) => {
            isConnectedRef.current = false;
            activeSessionRef.current = null;
            logger.current?.log('error', 'Socket', 'Critical neural link jitter.', err);
            
            if (retryCountRef.current < MAX_RETRIES) {
              retryCountRef.current++;
              setStatus('reconnecting');
              setTimeout(() => connect(), 1500); 
            } else {
              setStatus('error');
              setErrorMsg("Neural synapse failed. Check network connection.");
              cleanup();
            }
          }
        }
      });

      sessionPromise.then(session => {
        activeSessionRef.current = session;
      });

    } catch (e: any) {
      logger.current?.log('error', 'System', `Initialization failure: ${e.message}`);
      setStatus('error');
      setErrorMsg(e.message || "Failed to initialize Thursday.");
      cleanup();
    }
  }, [cleanup]);

  const disconnect = useCallback(() => {
    cleanup();
    setStatus('disconnected');
    logger.current?.log('info', 'System', 'Link dismantled by user.');
  }, [cleanup]);

  useEffect(() => {
    let interval: number;
    if (status === 'connected') {
      interval = window.setInterval(() => {
        const activeAnalyzer = isAiSpeaking ? outputAnalyzerRef.current : inputAnalyzerRef.current;
        if (activeAnalyzer) {
          const dataArray = new Uint8Array(activeAnalyzer.frequencyBinCount);
          activeAnalyzer.getByteFrequencyData(dataArray);
          const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
          setVolumeLevels(prev => ({ ...prev, [isAiSpeaking ? 'ai' : 'user']: avg }));
        }
      }, 30);
    }
    return () => clearInterval(interval);
  }, [status, isAiSpeaking]);

  return { connect, disconnect, status, isAiSpeaking, isUserSpeaking, volumeLevels, errorMsg, transcript, inputAnalyzer: inputAnalyzerRef.current, outputAnalyzer: outputAnalyzerRef.current, logs };
};