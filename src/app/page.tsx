
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

  const videoRef = useRef<HTMLVideoElement>(null);
  const { toast } = useToast();
  
  const [gazePoint, setGazePoint] = useState<{ x: number; y: number } | null>(null);
  
  const mousePosition = useMousePosition(); 
  const currentCursorPosition = useEyeTracking && gazePoint && hasCameraPermission ? gazePoint : mousePosition;

  const webgazerInstance = useRef<any>(null);
  const [isWebGazerLoaded, setIsWebGazerLoaded] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    // Check if WebGazer is already loaded (e.g. from a previous session or fast refresh)
    if (window.webgazer) {
      setIsWebGazerLoaded(true);
    }
  }, []);

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
        toast({ variant: 'destructive', title: 'Eye Tracking Error', description: 'Falhou to load WebGazer.js script.' });
        reject(error);
      };
      document.head.appendChild(script);
    });
  };

  // Effect to load WebGazer script when eye tracking is enabled
  useEffect(() => {
    if (useEyeTracking && !isWebGazerLoaded && !window.webgazer) {
      loadWebGazerScript().catch(err => {
        setUseEyeTracking(false); // Disable toggle if script fails to load
      });
    }
  }, [useEyeTracking, isWebGazerLoaded]);

  // Effect to initialize and manage WebGazer instance
  useEffect(() => {
    const manageWebGazerInstance = async () => {
      if (useEyeTracking && hasCameraPermission && isMounted && isWebGazerLoaded && window.webgazer) {
        if (!webgazerInstance.current) {
          try {
            // Configure WebGazer before starting
            window.webgazer.setVideoElement(videoRef.current);
            window.webgazer.showVideo(false); 
            window.webgazer.showFaceOverlay(false);
            window.webgazer.showFaceFeedbackBox(false);
            window.webgazer.showPredictionPoints(true); // Show gaze prediction dot

            webgazerInstance.current = window.webgazer;
            
            await webgazerInstance.current.setGazeListener((data: { x: number; y: number } | null, elapsedTime: number) => {
              if (data && webgazerInstance.current && !webgazerInstance.current.isPaused()) {
                setGazePoint({ x: data.x, y: data.y });
              }
            }).begin();

            toast({
              title: 'Rastreamento Ocular Inicializado',
              description: 'O WebGazer.js está ativo. Por favor, olhe para vários pontos na tela e clique para calibrar. O ponto vermelho mostra a previsão do olhar.',
            });
            } catch (error) {
              console.error("Erro ao inicializar o WebGazer:", error);
              toast({
                variant: 'destructive',
                title: 'Erro no Rastreamento Ocular',
                description: 'Não foi possível inicializar o WebGazer.js.'
              });
              setUseEyeTracking(false); // Desativa se falhar
            }
            
            } else if (webgazerInstance.current.isPaused()) {
              try {
                await webgazerInstance.current.resume();
                toast({
                  title: 'Rastreamento Ocular Retomado',
                  description: 'O WebGazer.js foi retomado.'
                });
              } catch (error) {
                console.error("Erro ao retomar o WebGazer:", error);
                toast({
                  variant: 'destructive',
                  title: 'Erro no Rastreamento Ocular',
                  description: 'Não foi possível retomar o WebGazer.js.'
                });
              }
            }
            
            } else {
              // Condições não atendidas (ex: rastreamento desligado ou sem permissão)
              if (webgazerInstance.current && !webgazerInstance.current.isPaused()) {
                try {
                  await webgazerInstance.current.pause();
                  console.log("WebGazer.js pausado.");
                  // toast({ title: 'Rastreamento Ocular Pausado', description: 'O WebGazer.js foi pausado.' }); // Pode ser incômodo
                } catch (error) {
                  console.error("Erro ao pausar o WebGazer:", error);
                }
        }
        if (gazePoint !== null) setGazePoint(null);
      }
    };

    manageWebGazerInstance();

    // Cleanup on component unmount
    return () => {
      if (webgazerInstance.current) {
        const wg = webgazerInstance.current;
        if (wg && typeof wg.end === 'function') {
          try {
            wg.end(); 
            console.log("WebGazer.js ended on component unmount.");
          } catch (e) { console.error("Error ending WebGazer on unmount:", e); }
        }
        webgazerInstance.current = null;
      }
    };
  }, [useEyeTracking, hasCameraPermission, isMounted, isWebGazerLoaded]);


  const requestCameraPermission = async () => {
    setIsRequestingPermission(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      setHasCameraPermission(true);
      // setUseEyeTracking(true); // Let the switch handler do this
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      toast({
        title: 'Camera Access Granted',
        description: 'O rastreamento ocular agora pode ser ativado. O vídeo da sua câmera é processado localmente.',
      });
      return true; // Indicate success
    } catch (error) {
      console.error('Erro ao acessar câmera:', error);
      setHasCameraPermission(false);
      setUseEyeTracking(false); 
      toast({
        variant: 'destructive',
        title: 'Acesso à Câmera Negado',
description: 'Por favor, ative as permissões de câmera nas configurações do seu navegador para usar o rastreamento ocular.',
      });
      return false; // Indicate failure
    } finally {
      setIsRequestingPermission(true);
    }
  };

  const handleEyeTrackingToggle = async (checked: boolean) => {
    if (checked) {
      if (hasCameraPermission === null || hasCameraPermission === false) {
        const permissionGranted = await requestCameraPermission();
        if (permissionGranted) {
          setUseEyeTracking(true);
        } else {
          // requestCameraPermission handles toast for denial, switch remains off
          setUseEyeTracking(false); 
        }
      } else { // Already have permission
        setUseEyeTracking(true);
         // Ensure video stream is active if it was stopped
        if (videoRef.current && !videoRef.current.srcObject && navigator.mediaDevices) {
           navigator.mediaDevices.getUserMedia({ video: true })
            .then(stream => {
              if (videoRef.current) videoRef.current.srcObject = stream;
            })
            .catch(err => {
              console.error("Error re-accessing camera: ", err);
              setHasCameraPermission(false); 
              setUseEyeTracking(false);
              toast({ variant: "destructive", title: "Camera Error", description: "Could not re-initialize camera."});
            });
        }
      }
    } else { // Switch turned off
      setUseEyeTracking(false);
      console.log("Eye tracking stopped by user.");
      if (videoRef.current && videoRef.current.srcObject) {
        // WebGazer pause should handle not needing the stream, but stopping it is safer for privacy when explicitly turned off
        // const stream = videoRef.current.srcObject as MediaStream;
        // stream.getTracks().forEach(track => track.stop());
        // videoRef.current.srcObject = null; 
        // Let WebGazer manage the stream via pause/end. If we stop tracks, resume might fail.
      }
    }
  };
  
  if (!isMounted) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <Header />
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
        {/* WebGazer.js script is loaded dynamically by loadWebGazerScript function */}
      </Head>
      <Header />
      <main className="flex-grow container mx-auto p-4 md:p-6 lg:p-8">
        <div className="grid lg:grid-cols-3 gap-6 lg:gap-8">
          
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
                  <video ref={videoRef} className="w-full aspect-video rounded-md bg-muted border object-cover" autoPlay muted playsInline />
                  
                  {/* Alert for when eye tracking is on but permission denied */}
                  {useEyeTracking && hasCameraPermission === false && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>O acesso à Câmera é necessário</AlertTitle>
                      <AlertDescription>
                        O rastreamento ocular precisa de permissão para usar a câmera. Por favor, permita o acesso. Se você negou a permissão, talvez seja necessário redefini-la nas configurações do navegador.
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Alert for when eye tracking is active */}
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

          <div className="lg:col-span-2 relative flex items-center justify-center bg-card dark:bg-card/80 rounded-xl shadow-xl overflow-hidden aspect-[16/10] min-h-[300px] md:min-h-[450px] lg:min-h-[500px] outline-dashed outline-2 outline-offset-4 outline-border/50">
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
             <div className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                Imagem: picsum.photos/seed/empathyvision
            </div>
          </div>
        </div>
        
        <footer className="text-center py-8 mt-8 lg:mt-12 text-muted-foreground">
          <p className="text-sm">&copy; {new Date().getFullYear()} VISAR - Vivência Interativa de Simulações sobre Alterações da Retina.</p>
          <p className="text-sm">Desenvolvido por Claudio Coutinho. Universidade do Estado do Pará (UEPA)</p>
          <p className="text-xs mt-2 max-w-2xl mx-auto">As simulações são ilustrativas e têm como objetivo fornecer uma compreensão conceitual; elas podem não representar com precisão condições médicas reais. O rastreamento ocular é um recurso experimental, requer acesso à webcam e processa os dados localmente no seu navegador por meio do WebGazer.js.</p>
        </footer>
      </main>
    </div>
  );
}

    