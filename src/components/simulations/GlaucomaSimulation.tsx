"use client";
import type { FC, ReactNode } from 'react';
import { useRef, useState, useEffect } from 'react';

interface GlaucomaSimulationProps {
  children: ReactNode;
  cursorPosition: { x: number; y: number } | null;
}

const GlaucomaSimulation: FC<GlaucomaSimulationProps> = ({ children, cursorPosition }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [overlayStyle, setOverlayStyle] = useState<React.CSSProperties>({});

  useEffect(() => {
    let xPercent = 50;
    let yPercent = 50;

    if (cursorPosition && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        xPercent = Math.max(0, Math.min(100, ((cursorPosition.x - rect.left) / rect.width) * 100));
        yPercent = Math.max(0, Math.min(100, ((cursorPosition.y - rect.top) / rect.height) * 100));
      }
    }
    
    // This overlay is black. The mask makes parts of it transparent.
    // Mask: transparent in center (clear vision), black at edges (obscured).
    // This creates a "tunnel vision" effect.
    setOverlayStyle({
      position: 'absolute',
      inset: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.97)', // The color of the obscured periphery
      WebkitMaskImage: `radial-gradient(circle at ${xPercent}% ${yPercent}%, transparent 0%, transparent 15%, black 22%)`,
      maskImage: `radial-gradient(circle at ${xPercent}% ${yPercent}%, transparent 0%, transparent 15%, black 22%)`,
      pointerEvents: 'none', // Allow interaction with content underneath
    });

  }, [cursorPosition]);

  return (
    <div ref={containerRef} className="relative w-full h-full">
      {children}
      <div style={overlayStyle} aria-hidden="true" />
    </div>
  );
};
export default GlaucomaSimulation;
