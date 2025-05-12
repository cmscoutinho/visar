"use client";

import { useState, useEffect } from 'react';

export default function useMousePosition() {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    // Set initial position to center if needed, or wait for first mouse move
    // For now, default 0,0 is fine, will update on first move.
  }, []);


  useEffect(() => {
    if (!isMounted) return;

    const handleMouseMove = (event: MouseEvent) => {
      setPosition({ x: event.clientX, y: event.clientY });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [isMounted]);

  if (!isMounted) {
    // Return a default or null position until mounted to avoid hydration mismatch
    // if this hook is used to compute initial styles on server (which it shouldn't for this case)
    return { x: 0, y: 0 }; 
  }

  return position;
}
