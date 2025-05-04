import React from 'react';
import { cn } from '@/lib/utils';

interface CircularProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: number;
  strokeWidth?: number;
  color?: string;
  secondaryColor?: string;
}

export function CircularProgress({
  size = 24,
  strokeWidth = 2,
  className,
  color = "currentColor",
  secondaryColor = "transparent",
  ...props
}: CircularProgressProps) {
  return (
    <div
      className={cn("animate-spin", className)}
      role="status"
      aria-label="Loading"
      style={{ 
        width: size, 
        height: size,
      }}
      {...props}
    >
      <svg 
        viewBox="0 0 24 24" 
        style={{ width: '100%', height: '100%' }}
      >
        <circle
          cx="12"
          cy="12"
          r="10"
          stroke={secondaryColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <circle
          cx="12"
          cy="12"
          r="10"
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray="62.83"
          strokeDashoffset="12.57"
          transform="rotate(-90 12 12)"
        />
      </svg>
      <span className="sr-only">Loading...</span>
    </div>
  );
}