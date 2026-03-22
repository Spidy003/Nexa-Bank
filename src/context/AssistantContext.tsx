import React, { createContext, useContext, useState, ReactNode } from 'react';

type AssistantStatus = "idle" | "listening" | "speaking" | "processing";
type SceneStage = "home" | "options";

interface AssistantContextType {
  status: AssistantStatus;
  setStatus: (status: AssistantStatus) => void;
  stage: SceneStage;
  setStage: (stage: SceneStage) => void;
}

const AssistantContext = createContext<AssistantContextType | undefined>(undefined);

export const AssistantProvider = ({ children }: { children: ReactNode }) => {
  const [status, setStatus] = useState<AssistantStatus>("idle");
  const [stage, setStage] = useState<SceneStage>("home");

  return (
    <AssistantContext.Provider value={{ status, setStatus, stage, setStage }}>
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
