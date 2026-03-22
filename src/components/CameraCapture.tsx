import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Camera, RefreshCw, Check, X, Maximize, User } from 'lucide-react';

interface CameraCaptureProps {
  type: 'aadhaar' | 'portrait';
  onCapture: (base64: string) => void;
  onCancel: () => void;
  voiceTrigger?: boolean; // If parent hears "click", toggle this
}

const CameraCapture: React.FC<CameraCaptureProps> = ({ type, onCapture, onCancel, voiceTrigger }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isCaptured, setIsCaptured] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isFlash, setIsFlash] = useState(false);

  // Start Camera
  const startCamera = async () => {
    setError(null);
    try {
      // First try with ideal settings
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err: any) {
      console.warn("Retrying with simple constraints...", err);
      try {
        // Fallback to absolute bare minimum
        const fallbackStream = await navigator.mediaDevices.getUserMedia({ video: true });
        setStream(fallbackStream);
        if (videoRef.current) {
          videoRef.current.srcObject = fallbackStream;
        }
      } catch (finalErr: any) {
        if (finalErr.name === 'NotAllowedError') {
          setError("Permission denied. Please click the camera icon in your browser address bar to allow access.");
        } else if (finalErr.name === 'NotFoundError' || finalErr.name === 'DevicesNotFoundError') {
          setError("No camera found. Please ensure your webcam is connected.");
        } else {
          setError("Could not access camera. Please check your system settings.");
        }
        console.error(finalErr);
      }
    }
  };

  useEffect(() => {
    startCamera();
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Listen for voice trigger "Click"
  useEffect(() => {
    if (voiceTrigger && !isCaptured) {
      capturePhoto();
    }
  }, [voiceTrigger]);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (context) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const base64 = canvas.toDataURL('image/jpeg', 0.85);
      setCapturedImage(base64);
      setIsCaptured(true);
      
      // Flash animation
      setIsFlash(true);
      setTimeout(() => setIsFlash(false), 150);

      // Auto-save after delay: "say click then the photo will get click and save it"
      setTimeout(() => {
          onCapture(base64);
      }, 1200);
    }
  }, [onCapture]);

  return (
    <div className="relative w-full max-w-2xl mx-auto overflow-hidden rounded-3xl border border-white/10 bg-slate-900/80 backdrop-blur-xl shadow-2xl animate-fade-in-up">
      {/* Header Info */}
      <div className="absolute top-0 left-0 right-0 z-20 p-4 bg-gradient-to-b from-black/60 to-transparent flex justify-between items-start">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center border border-cyan-500/30">
            {type === 'aadhaar' ? <Maximize className="text-cyan-400 w-5 h-5" /> : <User className="text-cyan-400 w-5 h-5" />}
          </div>
          <div>
            <h3 className="text-white font-bold text-sm tracking-tight uppercase">
              {type === 'aadhaar' ? 'Aadhaar Card Verification' : 'Customer Identity Photo'}
            </h3>
            <p className="text-cyan-400/80 text-[10px] font-mono uppercase tracking-[0.2em] animate-pulse">
              SECURE BIOMETRIC CHANNEL ACTIVE
            </p>
          </div>
        </div>
        <button 
          onClick={onCancel}
          className="p-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
        >
          <X className="text-white/60 w-5 h-5" />
        </button>
      </div>

      {/* Main Viewfinder */}
      <div className="relative aspect-video bg-black flex items-center justify-center">
        {error ? (
          <div className="text-center p-8 bg-black/40 backdrop-blur-md rounded-2xl border border-red-500/30 m-4">
             <X className="w-12 h-12 text-red-500 mx-auto mb-4" />
             <p className="text-white font-medium mb-6">{error}</p>
             <button 
               onClick={startCamera}
               className="px-6 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 rounded-xl text-red-100 transition-all"
             >
               Retry Access
             </button>
          </div>
        ) : (
          <div className="relative w-full h-full">
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted 
              className={`w-full h-full object-cover transition-opacity duration-500 ${isCaptured ? 'hidden' : 'opacity-100'}`}
            />
            
            {capturedImage && (
              <img 
                src={capturedImage} 
                alt="Captured" 
                className="w-full h-full object-cover"
              />
            )}

            {/* Viewfinder Overlays (Static Frame) */}
            {!isCaptured && (
              <div className="absolute inset-0 pointer-events-none z-10">
                {/* Aadhaar Rectangle Frame */}
                {type === 'aadhaar' && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-[80%] h-[60%] border-2 border-dashed border-cyan-400/40 rounded-xl shadow-[0_0_50px_rgba(0,229,255,0.15)] relative">
                       {/* Corner Markings */}
                       <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-cyan-400 rounded-tl-sm"></div>
                       <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-cyan-400 rounded-tr-sm"></div>
                       <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-cyan-400 rounded-bl-sm"></div>
                       <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-cyan-400 rounded-br-sm"></div>
                       <div className="absolute inset-0 flex items-center justify-center opacity-30">
                          <p className="text-cyan-400 text-xs font-mono tracking-widest uppercase">Align Aadhaar Card Within Frame</p>
                       </div>
                    </div>
                  </div>
                )}

                {/* Portrait Oval Frame */}
                {type === 'portrait' && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-[180px] h-[240px] border-2 border-dashed border-cyan-400/40 rounded-full shadow-[0_0_50px_rgba(0,229,255,0.15)] relative">
                       <div className="absolute inset-0 flex items-center justify-center opacity-30 text-center px-4">
                          <p className="text-cyan-400 text-xs font-mono tracking-widest uppercase">Position Face<br/>In Oval</p>
                       </div>
                    </div>
                  </div>
                )}

                {/* Cyber Scanline */}
                <div className="absolute top-0 left-0 w-full h-1 bg-cyan-400/30 shadow-[0_0_15px_rgba(0,229,255,0.5)] animate-scan-y"></div>
              </div>
            )}
            
            {/* Flash Effect */}
            {isFlash && <div className="absolute inset-0 bg-white z-50 animate-flash"></div>}
          </div>
        )}
      </div>

      {/* Footer Controls */}
      <div className="p-6 bg-slate-950/80 backdrop-blur-md border-t border-white/5 flex flex-col items-center gap-4">
        {!isCaptured ? (
          <>
            <p className="text-slate-400 text-xs font-medium uppercase tracking-widest">
              Say <span className="text-cyan-400 font-bold border-b border-cyan-400/30 px-1">"CLICK"</span> to capture photo
            </p>
            <button 
              onClick={capturePhoto}
              disabled={!!error}
              className="group relative flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-tr from-cyan-600 to-cyan-400 p-1 shadow-lg shadow-cyan-500/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100"
            >
              <div className="w-full h-full rounded-full border-2 border-white/40 flex items-center justify-center bg-transparent group-hover:bg-white/10 transition-colors">
                 <Camera className="text-white w-6 h-6" />
              </div>
            </button>
          </>
        ) : (
          <div className="w-full flex flex-col items-center gap-2 text-cyan-400 animate-pulse py-2">
             <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-cyan-500 shadow-[0_0_10px_rgba(0,229,255,0.8)]" />
                <span className="font-mono text-sm font-bold uppercase tracking-[0.3em]">Processing Secure Upload...</span>
             </div>
             <p className="text-[10px] opacity-60 font-mono">ENCRYPTING & FRAGMENTING DATA</p>
          </div>
        )}
      </div>

      <canvas ref={canvasRef} className="hidden" />

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes scan-y {
          0% { top: 0; }
          100% { top: 100%; }
        }
        .animate-scan-y {
          animation: scan-y 3s linear infinite;
        }
        @keyframes flash {
          0% { opacity: 0; }
          10% { opacity: 1; }
          100% { opacity: 0; }
        }
        .animate-flash {
          animation: flash 0.3s ease-out forwards;
        }
      `}} />
    </div>
  );
};

export default CameraCapture;
