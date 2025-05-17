
"use client";

import { useState, useEffect, useRef } from 'react';
import Head from 'next/head'; // Import Head for script tag
import Header from '@/components/Header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Button } from '@/components/ui/button';
import { AlertCircle, Info, Video, X } from 'lucide-react';
import Image from 'next/image';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"


// Simulation components
import GlaucomaSimulation from '@/components/simulations/GlaucomaSimulation';
import MacularDegenerationSimulation from '@/components/simulations/MacularDegenerationSimulation';
import CataractsSimulation from '@/components/simulations/CataractsSimulation';

// Hook for mouse position
import useMousePosition from '@/hooks/useMousePosition';

// Global type declaration for WebGazer
declare global {
  interface Window {
    webgazer?: any; 
  }
}


const CALIBRATION_POINTS_CONFIG = [
  { x: 0.2, y: 0.2, id: 'cp1' }, { x: 0.5, y: 0.2, id: 'cp2' }, { x: 0.8, y: 0.2, id: 'cp3' },
  { x: 0.2, y: 0.5, id: 'cp4' }, { x: 0.5, y: 0.5, id: 'cp5' }, { x: 0.8, y: 0.5, id: 'cp6' },
  { x: 0.2, y: 0.8, id: 'cp7' }, { x: 0.5, y: 0.8, id: 'cp8' }, { x: 0.8, y: 0.8, id: 'cp9' }
];
const TOTAL_CALIBRATION_CLICKS = CALIBRATION_POINTS_CONFIG.length;


const SIMULATIONS = {
  NONE: "none",
  GLAUCOMA: "glaucoma",
  MACULAR: "macular_degeneration",
  CATARACTS: "cataracts",
} as const;

type SimulationType = typeof SIMULATIONS[keyof typeof SIMULATIONS];

export default function VISARPage() {
  const [activeSimulation, setActiveSimulation] = useState<SimulationType>(SIMULATIONS.NONE);
  const [macularSeverity, setMacularSeverity] = useState(50); // 0-100
  const [cataractsIntensity, setCataractsIntensity] = useState(3); // blur radius in px
  const [useEyeTracking, setUseEyeTracking] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  
  const [gazePoint, setGazePoint] = useState<{ x: number; y: number } | null>(null);
  
  const [showCalibration, setShowCalibration] = useState(false);
  const [calibrationStatus, setCalibrationStatus] = useState<{ [key: string]: boolean }>({});
  const [calibrationClicksCount, setCalibrationClicksCount] = useState(0);

  
  const mousePosition = useMousePosition(); 
  const currentCursorPosition = useEyeTracking && gazePoint && hasCameraPermission && calibrationClicksCount >= TOTAL_CALIBRATION_CLICKS ? gazePoint : mousePosition;

  const webgazerInstance = useRef<any>(null);
  const [isWebGazerLoaded, setIsWebGazerLoaded] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    if (window.webgazer) {
      setIsWebGazerLoaded(true);
    }
  }, []);

  // Fullscreen API Toggle and Event Listener
  const toggleFullscreen = async (shouldBeFullscreen: boolean) => {
    if (shouldBeFullscreen) {
      if (imageContainerRef.current && imageContainerRef.current.requestFullscreen) {
        if (!document.fullscreenElement) {
          try {
            await imageContainerRef.current.requestFullscreen();
            // setIsFullscreen(true) will be handled by 'fullscreenchange' listener
          } catch (err) {
            console.error("Error attempting to enable full-screen mode:", err);
            setIsFullscreen(true); // Fallback to CSS-only fullscreen if API fails
          }
        } else {
           setIsFullscreen(true); // Already in browser fullscreen, ensure state is synced
        }
      } else {
        console.warn("Fullscreen API not supported or element not ready, using CSS fallback.");
        setIsFullscreen(true);
      }
    } else { 
      if (document.fullscreenElement) {
        try {
          await document.exitFullscreen();
          // setIsFullscreen(false) will be handled by 'fullscreenchange' listener
        } catch (err) {
          console.error("Error attempting to disable full-screen mode:", err);
          setIsFullscreen(false); 
        }
      } else {
         setIsFullscreen(false); 
      }
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
      if (!document.fullscreenElement && useEyeTracking) {
        // If user exits fullscreen manually (e.g. Esc) while eye tracking is on,
        // we might want to turn off eye tracking or reset its state.
        // For now, we just sync state. If eye tracking switch is on, it will try to re-enter.
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange); // Safari
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);    // Firefox
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);     // IE/Edge

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, [useEyeTracking]);


  const loadWebGazerScript = () => {
    return new Promise<void>((resolve, reject) => {
      if (window.webgazer) {
        setIsWebGazerLoaded(true);
        resolve();
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://webgazer.cs.brown.edu/webgazer.js';
      script.async = true;
      script.onload = () => {
        setIsWebGazerLoaded(true);
        resolve();
      };
      script.onerror = (error) => {
        console.error("Falhou to load WebGazer script:", error);
        setTimeout(() => {
        toast({ variant: 'destructive', title: 'Eye Tracking Error', description: 'Falhou to load WebGazer.js script.' });
        },0);
        reject(error);
      };
      document.head.appendChild(script);
    });
  };

  useEffect(() => {
    if (useEyeTracking && !isWebGazerLoaded && !window.webgazer) {
      loadWebGazerScript().catch(err => {
        setUseEyeTracking(false); 
        toggleFullscreen(false);
      });
    }
  }, [useEyeTracking, isWebGazerLoaded]);

  useEffect(() => {
    const manageWebGazerInstance = async () => {
      if (useEyeTracking && hasCameraPermission && isMounted && isWebGazerLoaded && window.webgazer) {
        if (!webgazerInstance.current) {
          if (!videoRef.current || videoRef.current.readyState < videoRef.current.HAVE_ENOUGH_DATA) {
            console.warn("Video stream not ready for WebGazer yet.");
            // Optionally, add a small delay and retry or a message to the user.
            // For now, we'll let it attempt and potentially fail, to be caught by the try-catch.
          }
          try {
            await window.webgazer.setRegression("ridge").begin();
            webgazerInstance.current = window.webgazer;
            
            webgazerInstance.current.showVideo(false); 
            webgazerInstance.current.showPredictionPoints(false); 
            webgazerInstance.current.showFaceOverlay(false);
            webgazerInstance.current.showFaceFeedbackBox(false);
            
            setCalibrationStatus({});
            setCalibrationClicksCount(0);
            setShowCalibration(true); // Start calibration process
            
            // Gaze listener will be set after calibration
            toast({
              title: 'Rastreamento Ocular Inicializado',
              description: 'Iniciando calibração. Por favor, clique nos pontos azuis.',
            });
          } catch (error) {
            console.error("Erro ao inicializar o WebGazer:", error);
            toast({
              variant: 'destructive',
              title: 'Erro no Rastreamento Ocular',
              description: `Não foi possível inicializar o WebGazer.js. Verifique o console. Causa: ${error instanceof Error ? error.message : String(error)}`
            });
            setUseEyeTracking(false);
            toggleFullscreen(false);
          }
        }
      } else if (!useEyeTracking && webgazerInstance.current) {
        try {
          await webgazerInstance.current.end();
          console.log("WebGazer.js ended by toggle.");
        } catch (e) { console.error("Error ending WebGazer:", e); }
        webgazerInstance.current = null;
        setGazePoint(null);
        setShowCalibration(false);
      }      
    };

    manageWebGazerInstance();
    
    return () => {
      if (webgazerInstance.current && typeof webgazerInstance.current.end === 'function') {
        try {
          webgazerInstance.current.end();
          webgazerInstance.current = null;
        } catch (e) {
          console.error("Error ending WebGazer:", e);
        }
      }
    
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
        videoRef.current.srcObject = null;
      }
    };
    
  }, [useEyeTracking, hasCameraPermission, isMounted, isWebGazerLoaded, toast]);


  const handleCalibrationClick = (pointId: string, normX: number, normY: number) => {
    if (!webgazerInstance.current || calibrationStatus[pointId]) return;

    const x = normX * window.innerWidth;
    const y = normY * window.innerHeight;
    webgazerInstance.current.recordScreenPosition(x, y, 'click');
    
    setCalibrationStatus(prev => ({ ...prev, [pointId]: true }));
    setCalibrationClicksCount(prev => {
        const newCount = prev + 1;
        if (newCount >= TOTAL_CALIBRATION_CLICKS) {
            setShowCalibration(false);
            toast({ title: 'Calibração concluída', description: 'WebGazer foi calibrado.' });
            // Start gaze listener *after* calibration
            webgazerInstance.current.setGazeListener((data: { x: number; y: number } | null, elapsedTime: number) => {
              if (data && webgazerInstance.current && !isNaN(data.x) && !isNaN(data.y)) {
                setGazePoint({ x: data.x, y: data.y });
              }
            }).begin(); // Ensure listener is active
        }
        return newCount;
    });
  };
  
  // Handle window resize during calibration
  useEffect(() => {
    const handleResize = () => {
      if (showCalibration && calibrationClicksCount < TOTAL_CALIBRATION_CLICKS) {
        setCalibrationStatus({});
        setCalibrationClicksCount(0);
        toast({ title: 'Janela Redimensionada', description: 'A calibração foi reiniciada.' });
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [showCalibration, calibrationClicksCount, toast]);


  const requestCameraPermission = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
       toast({ variant: 'destructive', title: 'Browser Incompatível', description: 'Seu navegador não suporta acesso à câmera.' });
       return false;
    }
    setIsRequestingPermission(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      setHasCameraPermission(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(err => console.warn("Video play interrupted or failed:", err));
      }
      toast({
        title: 'Camera Access Granted',
        description: 'O rastreamento ocular agora pode ser ativado. O vídeo da sua câmera é processado localmente.',
      });
      return true;
    } catch (error) {
      console.error('Erro ao acessar câmera:', error);
      setHasCameraPermission(false);
      // setUseEyeTracking(false); // Handled by toggle
      toast({
        variant: 'destructive',
        title: 'Acesso à Câmera Negado',
        description: 'Por favor, ative as permissões de câmera nas configurações do seu navegador para usar o rastreamento ocular.',
      });
      return false;
    } finally {
      setIsRequestingPermission(false);
    }
  };

  const handleEyeTrackingToggle = async (checked: boolean) => {
    if (!checked) {
      setUseEyeTracking(false);
      console.log("Eye tracking stopped by user.");
    
      // ✅ Safely stop the video stream to release the camera
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
        videoRef.current.srcObject = null;
      }
    
      // Optional: fully end WebGazer if needed
      if (webgazerInstance.current && typeof webgazerInstance.current.end === "function") {
        webgazerInstance.current.end();
        webgazerInstance.current = null;
      }
    }
    
    if (checked) {
      if (hasCameraPermission === null || hasCameraPermission === false) {
        const permissionGranted = await requestCameraPermission();
        if (permissionGranted) {
          setUseEyeTracking(true); // This will trigger the WebGazer setup useEffect
          await toggleFullscreen(true);
        } else {
          setUseEyeTracking(false); // Ensure switch is off if permission fails
          // No need to toggle fullscreen off, as it wasn't turned on
        }
      } else { 
        setUseEyeTracking(true);
        await toggleFullscreen(true);
        if (videoRef.current && !videoRef.current.srcObject && navigator.mediaDevices) {
           navigator.mediaDevices.getUserMedia({ video: true })
            .then(stream => {
              if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.play().catch(err => console.warn("Video play interrupted or failed:", err));
              }
            })
            .catch(err => {
              console.error("Error re-accessing camera: ", err);
              setHasCameraPermission(false); 
              setUseEyeTracking(false);
              toggleFullscreen(false);
              toast({ variant: "destructive", title: "Camera Error", description: "Could not re-initialize camera."});
            });
        }
      }
    } else { 
      setUseEyeTracking(false); // This will trigger WebGazer cleanup useEffect
      await toggleFullscreen(false);
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
        videoRef.current.srcObject = null; 
      }
    }
  };
  
  if (!isMounted) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
       {!isFullscreen && <Header />}
        <main className="flex-grow container mx-auto p-4 md:p-8 flex items-center justify-center">
          <div className="text-center">
            <svg className="mx-auto h-12 w-12 animate-spin text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="mt-4 text-lg text-foreground">Carregando ambiente de simulação...</p>
          </div>
        </main>
      </div>
    );
  }

  const renderSimulation = (content: React.ReactNode) => {
    switch (activeSimulation) {
      case SIMULATIONS.GLAUCOMA:
        return <GlaucomaSimulation cursorPosition={currentCursorPosition}>{content}</GlaucomaSimulation>;
      case SIMULATIONS.MACULAR:
        return <MacularDegenerationSimulation cursorPosition={currentCursorPosition} severity={macularSeverity / 100}>{content}</MacularDegenerationSimulation>;
      case SIMULATIONS.CATARACTS:
        return <CataractsSimulation intensity={cataractsIntensity}>{content}</CataractsSimulation>;
      default:
        return <div className="w-full h-full">{content}</div>;
    }
  };

  const simulationDescriptions: Record<SimulationType, string> = {
   [SIMULATIONS.NONE]: "Visão normal, sem prejuízos.",
[SIMULATIONS.GLAUCOMA]: "O glaucoma frequentemente causa perda da visão periférica, criando um efeito de 'visão em túnel'. A área central nítida se move com o seu olhar ou cursor.",
[SIMULATIONS.MACULAR]: "A Degeneração Macular afeta a visão central, causando borrões ou manchas escuras. A área embaçada se move com o seu olhar ou cursor.",
[SIMULATIONS.CATARACTS]: "A catarata causa um embaçamento ou turvação geral da visão, como olhar através de uma janela embaçada. A intensidade pode ser ajustada."
  };

  return (
    <div className="flex flex-col min-h-screen bg-secondary/30">
      <Head>
        {/* WebGazer.js script is loaded dynamically */}
      </Head>
      {!isFullscreen && <Header />}
      <main className={`flex-grow ${isFullscreen ? 'p-0 m-0 max-w-full w-screen h-screen overflow-hidden' : 'container mx-auto p-4 md:p-6 lg:p-8'}`}>
        <div className={`${isFullscreen ? 'h-full w-full' : 'grid lg:grid-cols-3 gap-6 lg:gap-8'}`}>
          
          {!isFullscreen && (
            <Card className="lg:col-span-1 shadow-xl rounded-lg overflow-hidden">
              <CardHeader className="bg-slate-50 dark:bg-slate-800/50 border-b">
                <CardTitle className="text-xl md:text-2xl">Controles</CardTitle>
                <CardDescription>Selecione uma condição e ajuste as configurações</CardDescription>
              </CardHeader>
              <CardContent className="p-4 md:p-6 space-y-6">
                <Tabs value={activeSimulation} onValueChange={(value) => setActiveSimulation(value as SimulationType)}>
                  <TabsList className="grid w-full grid-cols-2 gap-2 mb-1">
                    <TabsTrigger value={SIMULATIONS.NONE}>Normal</TabsTrigger>
                    <TabsTrigger value={SIMULATIONS.GLAUCOMA}>Glaucoma</TabsTrigger>
                  </TabsList>
                  <TabsList className="grid w-full grid-cols-2 gap-2">
                    <TabsTrigger value={SIMULATIONS.MACULAR}>Deg. Macular</TabsTrigger>
                    <TabsTrigger value={SIMULATIONS.CATARACTS}>Catarata</TabsTrigger>
                  </TabsList>
                </Tabs>

                <Alert variant="default" className="mt-2">
                  <Info className="h-5 w-5" />
                  <AlertTitle className="font-semibold">Sobre esta simulação:</AlertTitle>
                  <AlertDescription className="text-sm">
                    {simulationDescriptions[activeSimulation]}
                  </AlertDescription>
                </Alert>

                {activeSimulation === SIMULATIONS.MACULAR && (
                  <div className="space-y-3 pt-4 border-t">
                    <Label htmlFor="macular-severity" className="font-medium">Severidade: {macularSeverity}%</Label>
                    <Slider
                      id="macular-severity"
                      min={0}
                      max={100}
                      step={1}
                      value={[macularSeverity]}
                      onValueChange={(value) => setMacularSeverity(value[0])}
                      aria-label="Macular Degeneration Severity"
                    />
                  </div>
                )}

                {activeSimulation === SIMULATIONS.CATARACTS && (
                  <div className="space-y-3 pt-4 border-t">
                    <Label htmlFor="cataracts-intensity" className="font-medium">Intensidade do Desfoque: {cataractsIntensity.toFixed(1)}px</Label>
                    <Slider
                      id="cataracts-intensity"
                      min={0}
                      max={10}
                      step={0.1}
                      value={[cataractsIntensity]}
                      onValueChange={(value) => setCataractsIntensity(value[0])}
                      aria-label="Cataracts Intensity"
                    />
                  </div>
                )}
                
                <div className="space-y-3 pt-6 border-t">
                   <div className="flex items-center justify-between">
                     <Label htmlFor="eye-tracking-switch" className="text-base font-medium">Usar Rastreamento ocular</Label>
                     <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                        <Switch
                          id="eye-tracking-switch"
                          checked={useEyeTracking}
                          onCheckedChange={handleEyeTrackingToggle}
                          disabled={isRequestingPermission}
                          aria-label="Toggle Eye Tracking"
                          className="data-[state=checked]:bg-lime-500 border border-lime-600"
                        />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Usa a webcam via WebGazer.js para estimar o olhar.</p> 
                          <p>Requer permissão da câmera. Os dados são processados localmente.</p>
                          <p>Clique nos pontos da tela se aparecerem avisos de calibração.</p>
                        </TooltipContent>
                      </Tooltip>
                     </TooltipProvider>
                   </div>

                  <div className="space-y-2">
                    {/* Video element is crucial for WebGazer but can be hidden via CSS if preferred post-setup */}
                    <video ref={videoRef} className="w-full aspect-video rounded-md bg-muted border object-cover" autoPlay muted playsInline />
                    
                    {useEyeTracking && hasCameraPermission === false && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>O acesso à Câmera é necessário</AlertTitle>
                        <AlertDescription>
                          O rastreamento ocular precisa de permissão para usar a câmera. Por favor, permita o acesso. Se você negou a permissão, talvez seja necessário redefini-la nas configurações do navegador.
                        </AlertDescription>
                      </Alert>
                    )}

                    {useEyeTracking && hasCameraPermission && (
                      <Alert variant="default" className="bg-accent/10 border-accent/30">
                         <Video className="h-5 w-5 text-accent" />
                         <AlertTitle className="text-accent">Eye Tracking Active</AlertTitle>
                         <AlertDescription className="text-accent/80">
                           O WebGazer.js está tentando rastrear o seu olhar. A calibração pode ser necessária (clique nos avisos na tela, se aparecerem). O vídeo é processado localmente.
                         </AlertDescription>
                      </Alert>
                    )}
                   </div>
                </div>
              </CardContent>
              <CardFooter className="bg-slate-50 dark:bg-slate-800/50 border-t p-4">
                 <p className="text-xs text-muted-foreground">Mova o cursor ou use o rastreamento ocular experimental. As simulações afetam a imagem à direita.</p>
              </CardFooter>
            </Card>
          )}

          <div 
            ref={imageContainerRef}
            className={
              isFullscreen && document.fullscreenElement
              ? 'w-full h-full flex items-center justify-center bg-background' 
              : isFullscreen 
              ? 'fixed inset-0 z-[9998] bg-background flex items-center justify-center' 
              : 'lg:col-span-2 relative flex items-center justify-center bg-card dark:bg-card/80 rounded-xl shadow-xl overflow-hidden aspect-[16/10] min-h-[300px] md:min-h-[450px] lg:min-h-[500px] outline-dashed outline-2 outline-offset-4 outline-border/50'
            }
          >
            {renderSimulation(
              <Image
                src="https://picsum.photos/seed/empathyvision/1200/750"
                alt="Sample scene for vision simulation"
                width={1200}
                height={750}
                className="object-contain w-full h-full select-none pointer-events-none" 
                priority
                data-ai-hint="park scene"
                unoptimized 
              />
            )}
             
            {isFullscreen && showCalibration && calibrationClicksCount < TOTAL_CALIBRATION_CLICKS && (
              <>
                <div className="calibration-message">
                  Clique nos pontos azuis para calibrar: ({calibrationClicksCount}/{TOTAL_CALIBRATION_CLICKS})
                </div>
                {CALIBRATION_POINTS_CONFIG.map((point) => (
                  <button
                    key={point.id}
                    id={point.id}
                    style={{
                      left: `${point.x * 100}%`,
                      top: `${point.y * 100}%`,
                      transform: 'translate(-50%, -50%)',
                    }}
                    className={`calibration-point ${calibrationStatus[point.id] ? 'clicked' : ''}`}
                    onClick={() => handleCalibrationClick(point.id, point.x, point.y)}
                    aria-label={`Ponto de calibração ${point.id}`}
                    disabled={calibrationStatus[point.id]}
                  />
                ))}
              </>
            )}
            {useEyeTracking && gazePoint && calibrationClicksCount >= TOTAL_CALIBRATION_CLICKS && isFullscreen && (
              <div 
                style={{ 
                  position: 'absolute', 
                  left: `${gazePoint.x - 10}px`, 
                  top: `${gazePoint.y - 10}px`,
                  width: '20px',
                  height: '20px',
                  backgroundColor: 'rgba(255,0,0,0.5)',
                  borderRadius: '50%',
                  pointerEvents: 'none',
                  zIndex: 200, // Ensure gaze dot is above calibration message if they were ever to overlap
                  transition: 'left 0.05s linear, top 0.05s linear' // Smoother movement
                }}
                aria-hidden="true"
              />
            )}

            {isFullscreen && (
              <Button
                onClick={() => toggleFullscreen(false)}
                variant="outline"
                className="absolute top-4 left-4 z-[9999] bg-background/80 hover:bg-background"
              >
                <X className="mr-2 h-4 w-4" /> Sair da Tela Cheia
              </Button>
            )}

            {!isFullscreen && (
                <div className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                    Imagem: picsum.photos/seed/empathyvision
                </div>
            )}
          </div>
        </div>
        
        {!isFullscreen && (
          <footer className="text-center py-8 mt-8 lg:mt-12 text-muted-foreground">
            <p className="text-sm">&copy; {new Date().getFullYear()} VISAR - Vivência Interativa de Simulações sobre Alterações da Retina.</p>
            <p className="text-xs mt-2 max-w-2xl mx-auto">As simulações são ilustrativas e têm como objetivo fornecer uma compreensão conceitual; elas podem não representar com precisão condições médicas reais. O rastreamento ocular é um recurso experimental, requer acesso à webcam e processa os dados localmente no seu navegador por meio do WebGazer.js.</p>
            <p className="text-sm">Desenvolvido por:</p>
            <div className="mt-6 flex justify-center items-center space-x-4 md:space-x-8">
              <div className="relative h-16 w-32 md:h-20 md:w-60">
                <Image 
                  src="/images/uepa_logo2.png" 
                  alt="Universidade do Estado do Pará" 
                  layout="fill" 
                  objectFit="contain"
                  data-ai-hint="university logo"
                  unoptimized
                />
              </div>
              <div className="relative h-16 w-32 md:h-20 md:w-60">
                <Image 
                  src="/images/unifesspa_logo.png" 
                  alt="Universidade do Sul e Sudeste do Pará" 
                  layout="fill" 
                  objectFit="contain"
                  data-ai-hint="university logo"
                  unoptimized
                />
              </div>
              <div className="relative h-16 w-32 md:h-20 md:w-60">
                <Image 
                  src="/images/medialab_logo.png" 
                  alt="MediaLab/BR" 
                  layout="fill" 
                  objectFit="contain"
                  data-ai-hint="research group"
                  unoptimized
                />
              </div>
            </div>
          </footer>
        )}
      </main>
    </div>
  );
}
    

    

    

    