"use client";
import type { FC, ReactNode } from 'react';
import { useRef, useEffect, useState } from 'react';

interface MacularDegenerationSimulationProps {
  children: ReactNode;
  cursorPosition: { x: number; y: number } | null;
  severity: number; // 0 to 1 (0 = no blur, 1 = max blur)
}

const MacularDegenerationSimulation: FC<MacularDegenerationSimulationProps> = ({ children, cursorPosition, severity }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [overlayStyle, setOverlayStyle] = useState<React.CSSProperties>({});

  // Severity affects blur intensity and the size of the central affected zone.
  // Ensure a minimum blur if active, and scale up to a max (e.g., 12px).
  const blurIntensity = Math.max(0.1, severity * 12); 
  // Radius of the central affected zone (e.g., 10% to 25% of the view, based on severity).
  const affectedZoneRadius = 10 + (severity * 15); 
  // Define the softness of the transition edge from blurred to clear.
  const blurTransitionWidth = 5; // Percentage points for the gradient transition

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
    
    setOverlayStyle({
      position: 'absolute',
      inset: 0,
      // Apply blur, desaturation (grayscale), and reduced contrast to simulate clouded central vision.
      backdropFilter: `blur(${blurIntensity}px) grayscale(0.4) saturate(0.6) contrast(0.85)`,
      WebkitBackdropFilter: `blur(${blurIntensity}px) grayscale(0.4) saturate(0.6) contrast(0.85)`,
      // Mask:
      // The center of the mask is opaque ('black'), causing the backdropFilter to be applied there.
      // The periphery of the mask is 'transparent', revealing the original clear content underneath.
      // This creates a blurred/grayish central spot with clear surrounding vision.
      maskImage: `radial-gradient(ellipse at ${xPercent}% ${yPercent}%, black 0%, black ${affectedZoneRadius}%, transparent ${affectedZoneRadius + blurTransitionWidth}%)`,
      WebkitMaskImage: `radial-gradient(ellipse at ${xPercent}% ${yPercent}%, black 0%, black ${affectedZoneRadius}%, transparent ${affectedZoneRadius + blurTransitionWidth}%)`,
      pointerEvents: 'none', // Allow interaction with content underneath
      // Smooth transitions for severity changes or cursor/gaze movement.
      // Note: backdrop-filter transition support varies across browsers.
      transition: 'all 0.1s linear', 
    });

  }, [cursorPosition, severity, blurIntensity, affectedZoneRadius, blurTransitionWidth]);

  return (
    <div ref={containerRef} className="relative w-full h-full">
      {/* Original content */}
      {children} 
      {/* Overlay that applies the visual impairment effect */}
      <div style={overlayStyle} aria-hidden="true" />
    </div>
  );
};
export default MacularDegenerationSimulation;
