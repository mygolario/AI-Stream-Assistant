import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  iconColor?: 'blue' | 'amber' | 'emerald' | 'rose';
  trend?: { value: string; direction: 'up' | 'down' };
  subtitle?: string;
  animate?: boolean;
}

const iconBgMap = {
  blue: 'bg-accent-blue-muted text-accent-blue',
  amber: 'bg-accent-amber-muted text-accent-amber',
  emerald: 'bg-accent-emerald-muted text-accent-emerald',
  rose: 'bg-accent-rose-muted text-accent-rose',
};

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  icon,
  iconColor = 'blue',
  trend,
  subtitle,
  animate = true,
}) => {
  const [displayValue, setDisplayValue] = useState(animate ? '0' : String(value));
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (!animate || hasAnimated.current) {
      setDisplayValue(String(value));
      return;
    }

    hasAnimated.current = true;
    const strVal = String(value);

    // If value is numeric-ish, animate count-up
    const numericMatch = strVal.match(/^[\$]?([\d,]+\.?\d*)/);
    if (numericMatch) {
      const prefix = strVal.startsWith('$') ? '$' : '';
      const suffix = strVal.replace(/^[\$]?[\d,]+\.?\d*/, '');
      const cleanNum = parseFloat(numericMatch[1].replace(/,/g, ''));
      const hasDecimals = numericMatch[1].includes('.');
      const decimalPlaces = hasDecimals ? (numericMatch[1].split('.')[1]?.length || 0) : 0;
      const useCommas = numericMatch[1].includes(',');

      const duration = 800;
      const startTime = Date.now();

      const step = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
        const current = cleanNum * eased;

        let formatted = hasDecimals ? current.toFixed(decimalPlaces) : Math.round(current).toString();

        if (useCommas) {
          const parts = formatted.split('.');
          parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
          formatted = parts.join('.');
        }

        setDisplayValue(`${prefix}${formatted}${suffix}`);

        if (progress < 1) {
          requestAnimationFrame(step);
        }
      };

      requestAnimationFrame(step);
    } else {
      setDisplayValue(strVal);
    }
  }, [value, animate]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="card p-4 flex items-start gap-4"
    >
      <div className={`p-2.5 rounded-lg flex-shrink-0 ${iconBgMap[iconColor]}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-text-secondary mb-1">{label}</p>
        <p className="font-mono text-xl font-semibold text-text-primary tracking-tight">
          {displayValue}
        </p>
        {trend && (
          <p className={`text-xs mt-1 flex items-center gap-1 ${
            trend.direction === 'up' ? 'text-accent-emerald' : 'text-accent-rose'
          }`}>
            <span>{trend.direction === 'up' ? '↑' : '↓'}</span>
            <span>{trend.value}</span>
          </p>
        )}
        {subtitle && !trend && (
          <p className="text-xs text-text-tertiary mt-1">{subtitle}</p>
        )}
      </div>
    </motion.div>
  );
};
