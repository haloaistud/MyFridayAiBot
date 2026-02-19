import React, { useEffect, useRef } from 'react';

interface FrequencyOrbProps {
  isActive: boolean;
  isSpeaking: boolean;
  isUserSpeaking: boolean;
  volume: number;
  analyzer: AnalyserNode | null;
}

const FrequencyOrb: React.FC<FrequencyOrbProps> = ({ isActive, isSpeaking, isUserSpeaking, volume, analyzer }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particleContainerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>(0);
  const smoothedVolume = useRef(0);

  // Emotional mapping logic
  const getEmotionalClass = () => {
    if (isSpeaking) return 'calm';
    if (isUserSpeaking) return 'alert';
    if (isActive) return 'happy';
    return '';
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      const w = canvas.width;
      const h = canvas.height;
      const cx = w / 2;
      const cy = h / 2;
      
      smoothedVolume.current += (volume - smoothedVolume.current) * 0.08;
      const baseR = isActive ? 85 + (smoothedVolume.current / 2.5) : 70;

      ctx.clearRect(0, 0, w, h);

      if (isActive && analyzer) {
        const bufferLength = analyzer.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyzer.getByteFrequencyData(dataArray);

        // Backdrop Ambient Glow
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, baseR + 40, 0, Math.PI * 2);
        const outerGrad = ctx.createRadialGradient(cx, cy, baseR - 40, cx, cy, baseR + 100);
        outerGrad.addColorStop(0, isSpeaking ? 'rgba(99, 102, 241, 0.15)' : 'rgba(139, 92, 246, 0.1)');
        outerGrad.addColorStop(1, 'rgba(12, 10, 9, 0)');
        ctx.fillStyle = outerGrad;
        ctx.fill();
        ctx.restore();

        // User Pulse Ring
        if (isUserSpeaking) {
          ctx.beginPath();
          ctx.arc(cx, cy, baseR + 15, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(165, 180, 252, 0.3)';
          ctx.lineWidth = 1;
          ctx.stroke();
        }

        // Organic Frequency Wave
        ctx.beginPath();
        for (let i = 0; i < bufferLength; i++) {
          const angle = (i / bufferLength) * Math.PI * 2;
          const amp = dataArray[i];
          const r = baseR + (amp * (isSpeaking ? 0.8 : 0.35));
          const x = cx + Math.cos(angle) * r;
          const y = cy + Math.sin(angle) * r;

          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.strokeStyle = isSpeaking ? '#818cf8' : '#6366f1';
        ctx.lineWidth = 4;
        ctx.stroke();

        // Inner Core Glow
        const innerGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, baseR - 5);
        innerGrad.addColorStop(0, isSpeaking ? 'rgba(129, 140, 248, 0.6)' : 'rgba(255, 255, 255, 0.2)');
        innerGrad.addColorStop(1, 'rgba(12, 10, 9, 0)');
        ctx.fillStyle = innerGrad;
        ctx.fill();

      } else {
        const time = Date.now() / 1200;
        const breath = Math.sin(time) * 12;
        ctx.beginPath();
        ctx.arc(cx, cy, baseR + breath, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(165, 180, 252, 0.05)';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      animationRef.current = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animationRef.current);
  }, [isActive, isSpeaking, isUserSpeaking, volume, analyzer]);

  // Create thinking particles
  useEffect(() => {
    if ((isSpeaking || isUserSpeaking) && particleContainerRef.current) {
       const container = particleContainerRef.current;
       const p = document.createElement('div');
       p.className = 'particle';
       p.style.left = `${Math.random() * 100}%`;
       p.style.bottom = '20%';
       p.style.animationDelay = `${Math.random() * 2}s`;
       container.appendChild(p);
       setTimeout(() => p.remove(), 4000);
    }
  }, [isSpeaking, isUserSpeaking]);

  return (
    <div className={`relative w-96 h-96 flex items-center justify-center core-node ${getEmotionalClass()}`}>
      <div ref={particleContainerRef} className="neural-particles" />
      <canvas ref={canvasRef} width={384} height={384} className="transition-all duration-1000 pointer-events-none drop-shadow-[0_0_40px_rgba(99,102,241,0.15)]" />
      {isActive && (isSpeaking || isUserSpeaking) && (
        <div className={`absolute w-72 h-72 border border-indigo-500/10 rounded-full animate-[ping_3s_ease-out_infinite] pointer-events-none ${isUserSpeaking ? 'opacity-100' : 'opacity-40'}`} />
      )}
    </div>
  );
};

export default FrequencyOrb;