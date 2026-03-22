import React from 'react';
import AssistantExperience from './assistant3d/AssistantExperience';

interface Assistant3DProps {
  status: "idle" | "listening" | "speaking" | "processing";
}

const Assistant3D = ({ status }: Assistant3DProps) => {
  // Map the application's AI status to the 3D model's specific animation stages
  const getAnimationState = (currentStatus: string) => {
    switch (currentStatus) {
      case "speaking":
        return "talking";
      case "listening":
        return "listening";
      case "processing":
        return "thinking";
      default:
        return "idle";
    }
  };

  const state = getAnimationState(status);

  return (
    <div 
      style={{ 
        position: "fixed", 
        bottom: "0px", 
        left: "0px", 
        width: "350px", 
        height: "350px", 
        zIndex: 100,
        pointerEvents: "none"
      }}
    >
      <AssistantExperience state={state} />
    </div>
  );
};

export default Assistant3D;
