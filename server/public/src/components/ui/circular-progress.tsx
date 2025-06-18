import React from 'react';
import { cn } from "@/lib/utils";

interface CircularProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: number;
  strokeWidth?: number;
  percentage?: number;
  showPercentage?: boolean;
  color?: string;
}

export const CircularProgress = React.forwardRef<HTMLDivElement, CircularProgressProps>(
  ({ 
    className, 
    size = 24, 
    strokeWidth = 3, 
    percentage, 
    showPercentage = false, 
    color = "currentColor",
    ...props 
  }, ref) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = percentage ? circumference - (percentage / 100) * circumference : 0;
    
    return (
      <div
        ref={ref}
        className={cn("relative inline-flex items-center justify-center", className)}
        style={{ width: size, height: size }}
        {...props}
      >
        {percentage !== undefined ? (
          <React.Fragment>
            {/* Background circle */}
            <svg className="absolute inset-0" width={size} height={size}>
              <circle
                className="text-gray-700"
                cx={size / 2}
                cy={size / 2}
                r={radius}
                strokeWidth={strokeWidth}
                fill="none"
                stroke="currentColor"
                opacity={0.2}
              />
            </svg>
            
            {/* Progress circle */}
            <svg className="absolute inset-0 -rotate-90" width={size} height={size}>
              <circle
                className={cn("transition-all duration-300 ease-in-out")}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                strokeWidth={strokeWidth}
                fill="none"
                stroke={color}
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                strokeLinecap="round"
              />
            </svg>
            
            {/* Percentage text */}
            {showPercentage && (
              <span 
                className="text-xs font-semibold absolute" 
                style={{ fontSize: size / 3.5 }}
              >
                {percentage}%
              </span>
            )}
          </React.Fragment>
        ) : (
          // Spinner animation (indeterminate)
          <svg 
            className="animate-spin" 
            style={{ 
              width: size, 
              height: size 
            }} 
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth={strokeWidth}
              fill="none"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
      </div>
    );
  }
);

CircularProgress.displayName = "CircularProgress";