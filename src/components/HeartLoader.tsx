'use client';

import React, { useState, useEffect, useId } from 'react';

interface HeartLoaderProps {
  texts: string[];
  fullScreen?: boolean;
}

export default function HeartLoader({ texts, fullScreen = true }: HeartLoaderProps) {
  const [textIndex, setTextIndex] = useState(0);
  const rawId = useId();
  const id = rawId.replace(/:/g, '');

  useEffect(() => {
    const interval = setInterval(() => {
      setTextIndex(prev => (prev + 1) % texts.length);
    }, 1500);
    return () => clearInterval(interval);
  }, [texts.length]);

  const css = `
    @keyframes hlHeartPulse {
      0%, 100% { transform: scale(1); }
      15% { transform: scale(1.18); }
      30% { transform: scale(1); }
      45% { transform: scale(1.12); }
      60% { transform: scale(1); }
    }
    @keyframes hlOrbit0 { 0% { transform: translate(-50%,-50%) rotate(0deg) translateX(60px) rotate(0deg); opacity:0.5; } 50% { opacity:0.9; } 100% { transform: translate(-50%,-50%) rotate(360deg) translateX(60px) rotate(-360deg); opacity:0.5; } }
    @keyframes hlOrbit1 { 0% { transform: translate(-50%,-50%) rotate(51deg) translateX(64px) rotate(-51deg); opacity:0.5; } 50% { opacity:0.9; } 100% { transform: translate(-50%,-50%) rotate(411deg) translateX(64px) rotate(-411deg); opacity:0.5; } }
    @keyframes hlOrbit2 { 0% { transform: translate(-50%,-50%) rotate(103deg) translateX(58px) rotate(-103deg); opacity:0.5; } 50% { opacity:0.9; } 100% { transform: translate(-50%,-50%) rotate(463deg) translateX(58px) rotate(-463deg); opacity:0.5; } }
    @keyframes hlOrbit3 { 0% { transform: translate(-50%,-50%) rotate(154deg) translateX(66px) rotate(-154deg); opacity:0.5; } 50% { opacity:0.9; } 100% { transform: translate(-50%,-50%) rotate(514deg) translateX(66px) rotate(-514deg); opacity:0.5; } }
    @keyframes hlOrbit4 { 0% { transform: translate(-50%,-50%) rotate(206deg) translateX(60px) rotate(-206deg); opacity:0.5; } 50% { opacity:0.9; } 100% { transform: translate(-50%,-50%) rotate(566deg) translateX(60px) rotate(-566deg); opacity:0.5; } }
    @keyframes hlOrbit5 { 0% { transform: translate(-50%,-50%) rotate(257deg) translateX(62px) rotate(-257deg); opacity:0.5; } 50% { opacity:0.9; } 100% { transform: translate(-50%,-50%) rotate(617deg) translateX(62px) rotate(-617deg); opacity:0.5; } }
    @keyframes hlOrbit6 { 0% { transform: translate(-50%,-50%) rotate(309deg) translateX(58px) rotate(-309deg); opacity:0.5; } 50% { opacity:0.9; } 100% { transform: translate(-50%,-50%) rotate(669deg) translateX(58px) rotate(-669deg); opacity:0.5; } }
    @keyframes hlTextFade {
      0%, 100% { opacity: 0; transform: translateY(4px); }
      15%, 85% { opacity: 1; transform: translateY(0); }
    }
    .hl-${id}-heart { animation: hlHeartPulse 1.6s ease-in-out infinite; }
    .hl-${id}-op:nth-child(1) { animation: hlOrbit0 3.5s linear infinite both; }
    .hl-${id}-op:nth-child(2) { animation: hlOrbit1 4.0s linear infinite both; }
    .hl-${id}-op:nth-child(3) { animation: hlOrbit2 3.2s linear infinite both; }
    .hl-${id}-op:nth-child(4) { animation: hlOrbit3 3.8s linear infinite both; }
    .hl-${id}-op:nth-child(5) { animation: hlOrbit4 4.2s linear infinite both; }
    .hl-${id}-op:nth-child(6) { animation: hlOrbit5 3.6s linear infinite both; }
    .hl-${id}-op:nth-child(7) { animation: hlOrbit6 3.4s linear infinite both; }
    .hl-${id}-text { animation: hlTextFade 1.5s ease-in-out infinite; }
  `;

  const content = (
    <div className="flex flex-col items-center">
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <div className="relative w-40 h-40 flex items-center justify-center">
        {['×', '÷', '+', '−', '=', '%', '√'].map((op, i) => (
          <span
            key={op}
            className={`hl-${id}-op absolute text-xl font-bold`}
            style={{
              color: '#672DB7',
              opacity: 0.6,
              animationDelay: `${i * 0.3}s`,
              top: '50%',
              left: '50%',
            }}
          >
            {op}
          </span>
        ))}
        <svg
          className={`hl-${id}-heart relative z-10`}
          width="72"
          height="72"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id={`hlGrad-${id}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#A855F7" />
              <stop offset="50%" stopColor="#7C3AED" />
              <stop offset="100%" stopColor="#672DB7" />
            </linearGradient>
          </defs>
          <path
            d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
            fill={`url(#hlGrad-${id})`}
          />
        </svg>
      </div>
      <p className={`hl-${id}-text mt-6 text-lg font-semibold text-gray-700`}>
        {texts[textIndex]}
      </p>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        {content}
      </div>
    );
  }

  return (
    <div className="flex justify-center items-center py-20">
      {content}
    </div>
  );
}
