import React from 'react';
import { cn } from '@/lib/utils';

interface CircularProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: number;
  thickness?: number;
  color?: string;
}

export function CircularProgress({
  size = 24,
  thickness = 3.6,
  color,
  className,
  ...props
}: CircularProgressProps) {
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = 0.75 * circumference;

  return (
    <div
      className={cn(
        'inline-flex items-center justify-center animate-spin',
        className
      )}
      role="progressbar"
      style={{ width: size, height: size }}
      {...props}
    >
      <svg
        className="animate-spin"
        viewBox={`${size / 2} ${size / 2} ${size} ${size}`}
        style={{ width: size, height: size }}
      >
        <circle
          className={color || 'text-primary'}
          cx={size}
          cy={size}
          r={radius}
          fill="none"
          strokeWidth={thickness}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          style={{ color: 'currentColor' }}
        />
      </svg>
    </div>
  );
}