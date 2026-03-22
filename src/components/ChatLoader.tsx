import React from 'react';

const ChatLoader: React.FC = () => {
  return (
    <div className="chat-loader-container">
      <div className="chat-loader-bubble">
        {/* Pulsing Energy Ring */}
        <div className="loader-energy-ring" />
        
        {/* Header Status */}
        <div className="loader-status-text">
          <span className="animate-pulse">●</span>
          AURA PROCESSING
        </div>
        
        {/* Insane Pulsing Dots */}
        <div className="dots-container">
          <div className="dot" />
          <div className="dot" />
          <div className="dot" />
        </div>
        
        {/* Subtle scanning line is handled by CSS ::after on .chat-loader-bubble */}
      </div>
    </div>
  );
};

export default ChatLoader;
