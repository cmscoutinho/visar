"use client";

// (imports stay unchanged)

import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import Header from '@/components/Header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Button } from '@/components/ui/button';
import { AlertCircle, Info, Video } from 'lucide-react';
import Image from 'next/image';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

import GlaucomaSimulation from '@/components/simulations/GlaucomaSimulation';
import MacularDegenerationSimulation from '@/components/simulations/MacularDegenerationSimulation';
import CataractsSimulation from '@/components/simulations/CataractsSimulation';

import useMousePosition from '@/hooks/useMousePosition';

declare global {
  interface Window {
    webgazer?: any; 
  }
}

const SIMULATIONS = {
  NONE: "none",
  GLAUCOMA: "glaucoma",
  MACULAR: "macular_degeneration",
  CATARACTS: "cataracts",
} as const;

type SimulationType = typeof SIMULATIONS[keyof typeof SIMULATIONS];

export default function VISARPage() {
  const [activeSimulation, setActiveSimulation] = useState<SimulationType>(SIMULATIONS.NONE);
  const [macularSeverity, setMacularSeverity] = useState(50);
  const [cataractsIntensity, setCataractsIntensity] = useState(3);
  const [useEyeTracking, setUseEyeTracking] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { toast } = useToast();
  const [gazePoint, setGazePoint] = useState<{ x: number; y: number } | null>(null);
  const mousePosition = useMousePosition();
  const currentCursorPosition = useEyeTracking && gazePoint && hasCameraPermission ? gazePoint : mousePosition;
  const webgazerInstance = useRef<any>(null);
  const [isWebGazerLoaded, setIsWebGazerLoaded] = useState(false);
  const [calibrationPoints, setCalibrationPoints] = useState<{ x: number; y: number }[]>([]);
  const [clicks, setClicks] = useState(0);

  useEffect(() => {
    setIsMounted(true);
    if (window.webgazer) setIsWebGazerLoaded(true);
  }, []);

  useEffect(() => {
    if (useEyeTracking && !isWebGazerLoaded && !window.webgazer) {
      loadWebGazerScript().catch(() => setUseEyeTracking(false));
    }
  }, [useEyeTracking, isWebGazerLoaded]);

  useEffect(() => {
    const manageWebGazerInstance = async () => {
      if (useEyeTracking && hasCameraPermission && isMounted && isWebGazerLoaded && window.webgazer) {
        if (!webgazerInstance.current) {
          try {
            window.webgazer.setVideoElement(videoRef.current);
            window.webgazer.showVideo(false);
            window.webgazer.showFaceOverlay(false);
            window.webgazer.showFaceFeedbackBox(false);
            window.webgazer.showPredictionPoints(false);
            window.saveDataAcrossSessions = false;

            webgazerInstance.current = window.webgazer;

            await webgazerInstance.current.setGazeListener((data: { x: number; y: number } | null) => {
              if (data && !isNaN(data.x) && !isNaN(data.y)) {
                setGazePoint({ x: data.x, y: data.y });
              }
            }).begin();

            setCalibrationPoints(generateCalibrationPoints());
            toast({ title: 'Calibração iniciada', description: 'Clique em todos os pontos azuis para calibrar o rastreamento ocular.' });
          } catch (error) {
            console.error("Erro ao inicializar WebGazer:", error);
            toast({ variant: 'destructive', title: 'Erro WebGazer', description: 'Falha na inicialização.' });
            setUseEyeTracking(false);
          }
        } else if (webgazerInstance.current.isPaused()) {
          await webgazerInstance.current.resume();
        }
      } else if (webgazerInstance.current && !webgazerInstance.current.isPaused()) {
        await webgazerInstance.current.pause();
        setGazePoint(null);
      }
    };

    manageWebGazerInstance();
    return () => {
      if (webgazerInstance.current) {
        try { webgazerInstance.current.end(); } catch (e) { }
        webgazerInstance.current = null;
      }
    };
  }, [useEyeTracking, hasCameraPermission, isMounted, isWebGazerLoaded]);

  const generateCalibrationPoints = () => {
    return [
      [0.1, 0.1], [0.5, 0.1], [0.9, 0.1],
      [0.1, 0.5], [0.5, 0.5], [0.9, 0.5],
      [0.1, 0.9], [0.5, 0.9], [0.9, 0.9]
    ].map(([x, y]) => ({ x: x * window.innerWidth, y: y * window.innerHeight }));
  };

  const handleCalibrationClick = (index: number) => {
    const point = calibrationPoints[index];
    if (!point) return;
    window.webgazer.recordScreenPosition(point.x, point.y, 'click');
    setClicks(prev => prev + 1);
  };

  const renderCalibrationDots = () => {
    if (!useEyeTracking || !hasCameraPermission || clicks >= 9) return null;
    return calibrationPoints.map((p, i) => (
      <div
        key={i}
        onClick={() => handleCalibrationClick(i)}
        style={{
          position: 'absolute',
          left: `${p.x - 12.5}px`,
          top: `${p.y - 12.5}px`,
          width: '25px',
          height: '25px',
          backgroundColor: 'blue',
          borderRadius: '50%',
          border: '2px solid white',
          zIndex: 1000,
          cursor: 'pointer',
          opacity: 0.8,
        }}
      ></div>
    ));
  };

  return (
    <>
      {/* existing UI structure stays unchanged */}
      {renderCalibrationDots()}
    </>
  );
}
