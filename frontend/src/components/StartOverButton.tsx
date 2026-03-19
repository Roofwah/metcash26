import React from 'react';
import './StartOverButton.css';

interface StartOverButtonProps {
  onStartOver: () => void;
}

const StartOverButton: React.FC<StartOverButtonProps> = ({ onStartOver }) => {
  const handleClick = () => {
    onStartOver();
  };

  return (
    <button 
      className="start-over-button" 
      onClick={handleClick}
    >
      ↶
    </button>
  );
};

export default StartOverButton;
