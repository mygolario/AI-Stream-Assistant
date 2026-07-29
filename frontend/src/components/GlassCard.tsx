import React from 'react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  glow?: boolean;
}

export const GlassCard: React.FC<GlassCardProps> = ({ children, className = '', glow = false }) => {
  return (
    <div className={`glass-card rounded-xl p-5 ${glow ? 'glow-border' : ''} ${className}`}>
      {children}
    </div>
  );
};
