import React, { useState, useEffect } from 'react';
import { useAssistant } from '@/context/AssistantContext';
import { Sparkles, X, ArrowRight, Gift, TrendingUp, CreditCard, Landmark } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Offer {
  id: string;
  title: string;
  description: string;
  cta: string;
  icon: React.ReactNode;
  category: string;
}

const ALL_OFFERS: Offer[] = [
  {
    id: 'fd-premium',
    title: 'Fixed Deposit Premium',
    description: 'Secure your future with 7.8% interest rates. Limited time offer!',
    cta: 'Invest Now',
    icon: <Landmark className="w-5 h-5 text-amber-400" />,
    category: 'Investment'
  },
  {
    id: 'cashback-card',
    title: 'Nex-Titanium Card',
    description: 'Get flat 5% cashback on all online spends. No annual fee.',
    cta: 'Apply Now',
    icon: <CreditCard className="w-5 h-5 text-emerald-400" />,
    category: 'Credit Card'
  },
  {
    id: 'sip-smart',
    title: 'Smart SIP',
    description: 'Start building wealth with just ₹500/month. Tax-saving benefits.',
    cta: 'Start SIP',
    icon: <TrendingUp className="w-5 h-5 text-cyan-400" />,
    category: 'Mutual Fund'
  },
  {
    id: 'personal-loan-instant',
    title: 'Instant Personal Loan',
    description: 'Pre-approved loan up to ₹10 Lakhs with minimum documentation.',
    cta: 'Check Offer',
    icon: <Gift className="w-5 h-5 text-purple-400" />,
    category: 'Loan'
  }
];

const SmartOfferOverlay = () => {
  const { currentIntent, triggerOffer, setTriggerOffer, hideOverlays, setHideOverlays } = useAssistant();
  const [currentOffer, setCurrentOffer] = useState<Offer | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [shownIds, setShownIds] = useState<Set<string>>(new Set());

  const triggerRandomOffer = () => {
    const available = ALL_OFFERS.filter(o => !shownIds.has(o.id));
    if (available.length === 0) {
      // Reset if all shown to allow rotation if manually triggered? 
      // Or just return. Spec says "each offer shown only once".
      return;
    }

    const offer = available[Math.floor(Math.random() * available.length)];
    setCurrentOffer(offer);
    setIsVisible(true);
    setShownIds(prev => new Set(prev).add(offer.id));

    // Auto-dismiss after 10 seconds
    // Auto-dismiss after 15 seconds (slightly longer to ensure they read it)
    setTimeout(() => setIsVisible(false), 15000);
  };

  // ⏲️ Timer Logic: 60s initial, then every 3 minutes
  useEffect(() => {
    // Initial 60s delay
    const initialTimer = setTimeout(() => {
      triggerRandomOffer();
    }, 60000);

    // 3 minute interval (180,000 ms)
    const intervalTimer = setInterval(() => {
      triggerRandomOffer();
    }, 180000);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(intervalTimer);
    };
  }, []); // Only run once on mount

  // 🎙️ Listen for manual triggers from AI
  useEffect(() => {
    if (triggerOffer) {
      triggerRandomOffer();
      setTriggerOffer(false);
    }
  }, [triggerOffer]);

  // 🔇 Listen for hide commands
  useEffect(() => {
    if (hideOverlays) {
      setIsVisible(false);
      setHideOverlays(false);
    }
  }, [hideOverlays]);

  if (!currentOffer || !isVisible) return null;

  return (
    <div className="fixed bottom-12 right-12 w-full max-w-sm px-6 pointer-events-auto animate-in fade-in slide-in-from-right-12 duration-700 z-[9999]">
      <div className="bg-black/80 backdrop-blur-3xl border border-white/20 rounded-3xl p-6 shadow-[0_20px_60px_rgba(0,0,0,0.8)] relative overflow-hidden group">
        {/* Animated Background Glow */}
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-cyan-500/20 blur-[40px] rounded-full animate-pulse" />
        
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-white/10 border border-white/10 shadow-inner">
              {currentOffer.icon}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-cyan-400" />
                <span className="text-[10px] uppercase tracking-widest text-cyan-400 font-black">AI Special Offer</span>
              </div>
              <h4 className="text-white font-bold text-lg">{currentOffer.title}</h4>
            </div>
          </div>
          <button 
            onClick={() => setIsVisible(false)} 
            className="p-1 px-2 rounded-lg bg-white/5 text-white/40 hover:text-white hover:bg-white/10 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-slate-200 text-sm mb-6 leading-relaxed font-medium">
          {currentOffer.description}
        </p>

        <button className="w-full py-3.5 bg-gradient-to-r from-cyan-400 to-blue-500 text-white rounded-2xl font-black flex items-center justify-center gap-2 hover:shadow-[0_0_20px_rgba(34,211,238,0.4)] transition-all group/btn active:scale-95">
          <span>{currentOffer.cta}</span>
          <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1.5 transition-transform" />
        </button>
      </div>
    </div>
  );
};

export default SmartOfferOverlay;
