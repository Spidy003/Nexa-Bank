import React, { createContext, useContext, useState, ReactNode } from 'react';

type AssistantStatus = "idle" | "listening" | "speaking" | "processing";
type SceneStage = "home" | "options";

interface AssistantContextType {
  status: AssistantStatus;
  setStatus: (status: AssistantStatus) => void;
  stage: SceneStage;
  setStage: (stage: SceneStage) => void;
  showBalanceGraph: boolean;
  setShowBalanceGraph: (show: boolean) => void;
  balanceData: any;
  setBalanceData: (data: any) => void;
  hideOverlays: boolean;
  setHideOverlays: (hide: boolean) => void;
  triggerOffer: boolean;
  setTriggerOffer: (trigger: boolean) => void;
}

const AssistantContext = createContext<AssistantContextType | undefined>(undefined);

export const AssistantProvider = ({ children }: { children: ReactNode }) => {
  const [status, setStatus] = useState<AssistantStatus>("idle");
  const [stage, setStage] = useState<SceneStage>("home");
  const [showBalanceGraph, setShowBalanceGraph] = useState(false);
  const [hideOverlays, setHideOverlays] = useState(false);
  const [triggerOffer, setTriggerOffer] = useState(false);
  const [balanceData, setBalanceData] = useState({
    balance: 24500.75,
    history: [
      { month: 'Jul', value: 21000 },
      { month: 'Aug', value: 22500 },
      { month: 'Sep', value: 19800 },
      { month: 'Oct', value: 23400 },
      { month: 'Nov', value: 24500.75 },
      { month: 'Dec', value: 26200 },
    ]
  });

  return (
    <AssistantContext.Provider value={{ 
      status, setStatus, 
      stage, setStage, 
      showBalanceGraph, setShowBalanceGraph,
      balanceData, setBalanceData,
      hideOverlays, setHideOverlays,
      triggerOffer, setTriggerOffer
    }}>
      {children}
    </AssistantContext.Provider>
  );
};

export const useAssistant = () => {
  const context = useContext(AssistantContext);
  if (!context) {
    throw new Error('useAssistant must be used within an AssistantProvider');
  }
  return context;
};
