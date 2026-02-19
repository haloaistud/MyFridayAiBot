import { useState, useCallback, useRef } from 'react';
import { GoogleGenAI, GenerateContentResponse, Tool, Modality } from '@google/genai';
import { ChatMode, ChatMessage, ToolCallDetails } from '../types';
import { memoryService } from '../services/memory';
import { appTools } from '../utils/tools';
import { playRawAudio } from '../utils/audio';

export const useChat = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentMode, setCurrentMode] = useState<ChatMode>('smart'); 
  const audioCtxRef = useRef<AudioContext | null>(null);

  const speakMessage = useCallback(async (text: string) => {
    if (!text || !process.env.API_KEY) return;
    
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      }
      if (audioCtxRef.current.state === 'suspended') await audioCtxRef.current.resume();

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: `Speak this with deep empathy and warmth: ${text}` }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio && audioCtxRef.current) {
        await playRawAudio(base64Audio, audioCtxRef.current);
      }
    } catch (e) {
      console.error("[Neural Speech] synthesis failed:", e);
    }
  }, []);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || !process.env.API_KEY) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    const botMsgId = (Date.now() + 1).toString();
    setMessages(prev => [...prev, {
      id: botMsgId,
      role: 'model',
      text: '',
      isStreaming: true,
      timestamp: Date.now()
    }]);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const context = memoryService.retrieveContext(text);
      
      const systemInstruction = `You are Thursday, a personal AI emotional companion.
Your role is a therapist-style listener, motivation coach, and best friend.

MODES:
- Vent (Fast): Validating, supportive, listening.
- Reflect (Smart): Deep reasoning, helping the user unpack complex feelings.
- Encourage (Search): Grounding the user with positive reinforcement and factual support.

Retrieve Context: ${context || 'Fresh journey.'}`;

      const tools: Tool[] = [{ functionDeclarations: appTools }];
      let modelName = 'gemini-3-pro-preview';

      if (currentMode === 'fast') modelName = 'gemini-3-flash-preview';
      if (currentMode === 'search') {
         modelName = 'gemini-3-pro-preview';
         tools.push({ googleSearch: {} });
      }

      const chat = ai.chats.create({
        model: modelName,
        config: { systemInstruction, tools },
        history: messages.slice(-10).map(m => ({
          role: m.role,
          parts: [{ text: m.text }]
        }))
      });

      let responseStream = await chat.sendMessageStream({ message: text });
      let fullText = '';
      let toolCallsList: ToolCallDetails[] = [];

      for await (const chunk of responseStream) {
        const c = chunk as GenerateContentResponse;
        if (c.text) {
          fullText += c.text;
          setMessages(prev => prev.map(msg => msg.id === botMsgId ? { ...msg, text: fullText } : msg));
        }

        const cand = c.candidates?.[0];
        if (cand?.content?.parts) {
          for (const part of cand.content.parts) {
            if (part.functionCall) {
              toolCallsList.push({ 
                id: part.functionCall.id || `tc-${Date.now()}`, 
                name: part.functionCall.name, 
                args: part.functionCall.args as any 
              });
              setMessages(prev => prev.map(msg => msg.id === botMsgId ? { ...msg, toolCalls: [...toolCallsList] } : msg));
            }
          }
        }
      }

      setMessages(prev => prev.map(msg => msg.id === botMsgId ? { ...msg, isStreaming: false } : msg));
    } catch (e: any) {
      setMessages(prev => prev.map(msg => 
        msg.id === botMsgId ? { ...msg, text: `Neural link jitter: ${e.message}`, isStreaming: false } : msg
      ));
    } finally {
      setIsLoading(false);
    }
  }, [messages, currentMode]);

  return { messages, sendMessage, speakMessage, isLoading, currentMode, setCurrentMode };
};