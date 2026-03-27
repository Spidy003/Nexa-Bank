import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAssistant } from '@/context/AssistantContext';
import { ChevronLeft, Info, Share2, Sparkles, TrendingUp, ArrowRight } from 'lucide-react';

import SmartOfferOverlay from '@/components/SmartOfferOverlay';

const Showcase = () => {
  const navigate = useNavigate();
  const { setShowBalanceGraph, hideOverlays, setHideOverlays } = useAssistant();
  const [showAdvisory, setShowAdvisory] = React.useState(true);

  useEffect(() => {
    // Force the 3D graph to show when this page is active
    setShowBalanceGraph(true);
    
    // Clean up when leaving the page
    return () => setShowBalanceGraph(false);
  }, [setShowBalanceGraph]);

  // 🔇 Listen for hide commands from AI
  useEffect(() => {
    if (hideOverlays) {
      setShowAdvisory(false);
      // Reset the global flag so it can be re-triggered
      setHideOverlays(false);
    }
  }, [hideOverlays]);

  return (
    <div className="relative min-h-screen w-full overflow-hidden pointer-events-none">
      {/* 🌌 Cinematic Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/40" />

      {/* 🔝 Top Header */}
      <header className="absolute top-0 left-0 w-full p-8 flex justify-between items-start pointer-events-auto">
        <button 
          onClick={() => navigate('/')}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/20 transition-all group"
        >
          <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          <span className="font-medium">Back to Banking</span>
        </button>

        <div className="flex gap-4">
          <button className="p-3 rounded-full bg-white/5 backdrop-blur-sm border border-white/10 text-white/70 hover:text-white transition-all">
            <Info className="w-5 h-5" />
          </button>
          <button className="p-3 rounded-full bg-white/5 backdrop-blur-sm border border-white/10 text-white/70 hover:text-white transition-all">
            <Share2 className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* 💫 Ambient Accents */}
      <div className="absolute top-[20%] right-[-5%] w-[500px] h-[500px] bg-cyan-500/10 blur-[150px] rounded-full" />
      <div className="absolute bottom-[10%] left-[-5%] w-[400px] h-[400px] bg-blue-600/10 blur-[120px] rounded-full" />

      {/* 💡 AI Smart Recommendation & Offer Stack */}
      <div className="absolute bottom-12 right-12 w-full max-w-xl px-6 flex flex-col items-end gap-6 pointer-events-none">
        {/* Proactive Advisory Card */}
        {showAdvisory && (
          <div className="bg-black/40 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-8 shadow-[0_20px_50px_rgba(0,229,255,0.15)] flex items-center gap-8 relative overflow-hidden group pointer-events-auto animate-in fade-in slide-in-from-right-8 duration-700 delay-500 fill-mode-both">
            {/* Decorative glow */}
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-cyan-500/20 blur-[60px] rounded-full group-hover:bg-cyan-500/30 transition-colors duration-700" />
            
            <div className="relative flex-shrink-0">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-500 p-[1px]">
                <div className="w-full h-full rounded-2xl bg-black/40 backdrop-blur-sm flex items-center justify-center">
                  <Sparkles className="w-8 h-8 text-cyan-400 animate-pulse" />
                </div>
              </div>
            </div>

            <div className="relative flex-grow">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-cyan-400" />
                <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-cyan-400/80">AI Financial Advisory</span>
              </div>
              <h3 className="text-xl font-bold text-white mb-2 leading-tight">Maximize Your Savings</h3>
              <p className="text-slate-300 text-sm leading-relaxed max-w-md">
                You have nice saving! Since you save approx ₹12,500 every month, we advice you to do **Fixed Deposit** of around ₹10,000 for high returns.
              </p>
            </div>

            <button 
              onClick={() => navigate('/?intent=fixed_deposit')}
              className="relative flex-shrink-0 group/btn"
            >
              <div className="absolute inset-0 bg-cyan-400 blur-lg opacity-20 group-hover/btn:opacity-40 transition-opacity" />
              <div className="relative px-8 py-4 bg-white text-black font-bold rounded-2xl flex items-center gap-2 hover:bg-cyan-50 transition-colors">
                <span>Do FD</span>
                <ArrowRight className="w-5 h-5 group-hover/btn:translate-x-1 transition-transform" />
              </div>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Showcase;
