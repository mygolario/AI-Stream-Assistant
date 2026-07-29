import React from 'react';
import { Search } from 'lucide-react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  variant?: 'default' | 'search';
  label?: string;
  hint?: string;
  mono?: boolean;
  error?: string;
  icon?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({
  variant = 'default',
  label,
  hint,
  mono = false,
  error,
  icon,
  className = '',
  ...props
}) => {
  const isSearch = variant === 'search';

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-xs font-medium text-text-secondary">{label}</label>
      )}
      <div className="relative">
        {(isSearch || icon) && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary">
            {icon || <Search className="w-4 h-4" />}
          </div>
        )}
        <input
          className={`
            w-full bg-surface-1 border border-border rounded-md text-sm text-text-primary
            placeholder:text-text-tertiary
            hover:border-border-hover
            focus:border-accent-blue focus:ring-1 focus:ring-accent-blue outline-none
            transition-colors duration-150
            ${(isSearch || icon) ? 'pl-9 pr-3' : 'px-3'}
            py-2
            ${mono ? 'font-mono text-xs' : ''}
            ${error ? 'border-accent-rose focus:border-accent-rose focus:ring-accent-rose' : ''}
            ${className}
          `}
          {...props}
        />
      </div>
      {hint && !error && (
        <p className="text-xs text-text-tertiary">{hint}</p>
      )}
      {error && (
        <p className="text-xs text-accent-rose">{error}</p>
      )}
    </div>
  );
};
