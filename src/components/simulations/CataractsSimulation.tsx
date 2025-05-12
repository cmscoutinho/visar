"use client";
import type { FC, ReactNode } from 'react';

interface CataractsSimulationProps {
  children: ReactNode;
  intensity: number; // blur radius in px, e.g., 0 to 10
}

const CataractsSimulation: FC<CataractsSimulationProps> = ({ children, intensity }) => {
  const style: React.CSSProperties = {
    filter: `blur(${intensity}px) contrast(0.85) saturate(0.75)`, // Cataracts also reduce contrast and color vibrancy
    WebkitFilter: `blur(${intensity}px) contrast(0.85) saturate(0.75)`,
    width: '100%',
    height: '100%',
    overflow: 'hidden', 
    transition: 'filter 0.3s ease-out', // Smooth transition for intensity changes
  };

  return (
    <div style={style} className="relative w-full h-full">
      {children}
    </div>
  );
};

export default CataractsSimulation;
