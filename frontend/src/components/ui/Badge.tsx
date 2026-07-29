import React from 'react';

type BadgeVariant = 'default' | 'blue' | 'amber' | 'emerald' | 'rose';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
  dot?: boolean;
  pulse?: boolean;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-surface-2 text-text-secondary border-border',
  blue: 'bg-accent-blue-muted text-accent-blue border-accent-blue/20',
  amber: 'bg-accent-amber-muted text-accent-amber border-accent-amber/20',
  emerald: 'bg-accent-emerald-muted text-accent-emerald border-accent-emerald/20',
  rose: 'bg-accent-rose-muted text-accent-rose border-accent-rose/20',
};

const dotColors: Record<BadgeVariant, string> = {
  default: 'bg-text-tertiary',
  blue: 'bg-accent-blue',
  amber: 'bg-accent-amber',
  emerald: 'bg-accent-emerald',
  rose: 'bg-accent-rose',
};

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  className = '',
  dot = false,
  pulse = false,
}) => {
  return (
    <span
      className={`
        inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium border
        ${variantStyles[variant]} ${className}
      `}
    >
      {dot && (
        <span className={`w-1.5 h-1.5 rounded-full ${dotColors[variant]} ${pulse ? 'animate-pulse-slow' : ''}`} />
      )}
      {children}
    </span>
  );
};
