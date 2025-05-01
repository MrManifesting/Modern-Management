import React from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface CannabisMascotLoaderProps extends React.HTMLAttributes<HTMLDivElement> {
  text?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'leaf' | 'bud';
  bounce?: boolean;
}

export function CannabisMascotLoader({
  text = 'Loading...',
  size = 'md',
  variant = 'default',
  bounce = true,
  className,
  ...props
}: CannabisMascotLoaderProps) {
  const sizeClasses = {
    sm: 'h-24 w-24',
    md: 'h-32 w-32',
    lg: 'h-48 w-48',
  };

  return (
    <div 
      className={cn(
        'flex flex-col items-center justify-center text-center',
        className
      )} 
      {...props}
    >
      <div 
        className={cn(
          'mb-4 relative',
          sizeClasses[size],
          bounce && 'animate-cannabis-bounce'
        )}
      >
        {variant === 'default' && (
          <DefaultMascot />
        )}
        {variant === 'leaf' && (
          <LeafMascot />
        )}
        {variant === 'bud' && (
          <BudMascot />
        )}
      </div>
      <div className="flex items-center text-gold font-medium">
        <span>{text}</span>
        <Loader2 className="ml-2 h-4 w-4 animate-spin" />
      </div>
    </div>
  );
}

function DefaultMascot() {
  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="h-full w-full"
    >
      {/* Body */}
      <circle cx="60" cy="60" r="50" fill="#4F7942" />
      
      {/* Face */}
      <circle cx="60" cy="60" r="35" fill="#65A765" />
      
      {/* Eyes */}
      <circle cx="45" cy="50" r="5" fill="#FFF" />
      <circle cx="75" cy="50" r="5" fill="#FFF" />
      <circle cx="45" cy="50" r="2" fill="#000" />
      <circle cx="75" cy="50" r="2" fill="#000" />
      
      {/* Smile */}
      <path
        d="M45 70 Q60 85 75 70"
        stroke="#FFF"
        strokeWidth="3"
        strokeLinecap="round"
      />
      
      {/* Cannabis Leaves */}
      <path
        d="M60 10 C50 25 40 15 35 5 C45 15 55 15 60 10 Z"
        fill="#4F7942"
        className="animate-cannabis-pulse"
      />
      <path
        d="M100 40 C80 45 80 30 85 15 C85 30 95 40 100 40 Z"
        fill="#4F7942"
        className="animate-cannabis-pulse"
        style={{ animationDelay: '0.2s' }}
      />
      <path
        d="M20 40 C40 45 40 30 35 15 C35 30 25 40 20 40 Z"
        fill="#4F7942"
        className="animate-cannabis-pulse"
        style={{ animationDelay: '0.4s' }}
      />
      <path
        d="M90 90 C75 80 85 70 100 70 C85 75 80 85 90 90 Z"
        fill="#4F7942"
        className="animate-cannabis-pulse"
        style={{ animationDelay: '0.6s' }}
      />
      <path
        d="M30 90 C45 80 35 70 20 70 C35 75 40 85 30 90 Z"
        fill="#4F7942"
        className="animate-cannabis-pulse"
        style={{ animationDelay: '0.8s' }}
      />
      
      {/* Gold "glint" accent */}
      <circle cx="40" cy="45" r="2" fill="#FFD700" className="animate-gold-shimmer" />
    </svg>
  );
}

function LeafMascot() {
  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="h-full w-full"
    >
      {/* Main leaf */}
      <path
        d="M60 10 C80 30 90 70 60 110 C30 70 40 30 60 10 Z"
        fill="#4F7942"
      />
      
      {/* Leaf veins */}
      <path
        d="M60 10 L60 110"
        stroke="#65A765"
        strokeWidth="2"
      />
      <path
        d="M60 40 C50 50 45 70 50 90"
        stroke="#65A765"
        strokeWidth="2"
      />
      <path
        d="M60 40 C70 50 75 70 70 90"
        stroke="#65A765"
        strokeWidth="2"
      />
      
      {/* Face */}
      <circle cx="50" cy="60" r="5" fill="#FFF" />
      <circle cx="70" cy="60" r="5" fill="#FFF" />
      <circle cx="50" cy="60" r="2" fill="#000" />
      <circle cx="70" cy="60" r="2" fill="#000" />
      
      {/* Smile */}
      <path
        d="M50 75 Q60 85 70 75"
        stroke="#FFF"
        strokeWidth="2"
        strokeLinecap="round"
      />
      
      {/* Gold "shimmer" accents */}
      <circle cx="60" cy="30" r="2" fill="#FFD700" className="animate-gold-shimmer" />
      <circle cx="45" cy="50" r="1.5" fill="#FFD700" className="animate-gold-shimmer" style={{ animationDelay: '0.5s' }} />
      <circle cx="75" cy="50" r="1.5" fill="#FFD700" className="animate-gold-shimmer" style={{ animationDelay: '1s' }} />
    </svg>
  );
}

function BudMascot() {
  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="h-full w-full"
    >
      {/* Bud base */}
      <ellipse cx="60" cy="60" rx="35" ry="40" fill="#65A765" />
      
      {/* Bud petals/layers */}
      <path
        d="M60 20 C75 35 75 85 60 100 C45 85 45 35 60 20 Z"
        fill="#4F7942"
      />
      <path
        d="M30 50 C50 45 70 75 90 70 C70 75 50 45 30 50 Z"
        fill="#4F7942"
        className="animate-cannabis-pulse"
      />
      <path
        d="M30 70 C50 75 70 45 90 50 C70 45 50 75 30 70 Z"
        fill="#4F7942"
        className="animate-cannabis-pulse"
        style={{ animationDelay: '0.5s' }}
      />
      
      {/* Face */}
      <circle cx="48" cy="55" r="5" fill="#FFF" />
      <circle cx="72" cy="55" r="5" fill="#FFF" />
      <circle cx="48" cy="55" r="2" fill="#000" />
      <circle cx="72" cy="55" r="2" fill="#000" />
      
      {/* Smile */}
      <path
        d="M48 70 Q60 80 72 70"
        stroke="#FFF"
        strokeWidth="3"
        strokeLinecap="round"
      />
      
      {/* Orange hairs (pistils) */}
      <path
        d="M45 30 C40 25 35 28 30 25"
        stroke="#FFA500"
        strokeWidth="1.5"
        className="animate-cannabis-float"
      />
      <path
        d="M75 30 C80 25 85 28 90 25"
        stroke="#FFA500"
        strokeWidth="1.5"
        className="animate-cannabis-float"
        style={{ animationDelay: '0.2s' }}
      />
      <path
        d="M85 60 C90 55 95 58 98 55"
        stroke="#FFA500"
        strokeWidth="1.5"
        className="animate-cannabis-float"
        style={{ animationDelay: '0.4s' }}
      />
      <path
        d="M35 60 C30 55 25 58 22 55"
        stroke="#FFA500"
        strokeWidth="1.5"
        className="animate-cannabis-float"
        style={{ animationDelay: '0.6s' }}
      />
      
      {/* Gold "trichomes" accents */}
      <circle cx="40" cy="40" r="1" fill="#FFD700" className="animate-gold-shimmer" />
      <circle cx="80" cy="40" r="1" fill="#FFD700" className="animate-gold-shimmer" style={{ animationDelay: '0.3s' }} />
      <circle cx="50" cy="80" r="1" fill="#FFD700" className="animate-gold-shimmer" style={{ animationDelay: '0.6s' }} />
      <circle cx="70" cy="80" r="1" fill="#FFD700" className="animate-gold-shimmer" style={{ animationDelay: '0.9s' }} />
      <circle cx="60" cy="30" r="1" fill="#FFD700" className="animate-gold-shimmer" style={{ animationDelay: '1.2s' }} />
    </svg>
  );
}

export function LoadingPage({ 
  variant = 'default',
  message = 'Loading...'
}: {
  variant?: 'default' | 'leaf' | 'bud';
  message?: string;
}) {
  return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-black/95">
      <CannabisMascotLoader 
        size="lg" 
        text={message} 
        variant={variant}
        className="max-w-md mx-auto"
      />
    </div>
  );
}

export function LoadingOverlay({
  message = 'Loading...',
  variant = 'default'
}: {
  message?: string;
  variant?: 'default' | 'leaf' | 'bud';
}) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
      <CannabisMascotLoader 
        text={message} 
        variant={variant}
        className="bg-black/80 p-8 rounded-lg shadow-xl border border-gold/20" 
      />
    </div>
  );
}

export function LoadingSpinner({
  size = 'sm',
  className,
  ...props
}: {
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
} & React.HTMLAttributes<HTMLDivElement>) {
  const sizeClasses = {
    xs: 'h-4 w-4',
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-10 w-10',
  };

  return (
    <div 
      className={cn(
        'flex items-center justify-center',
        className
      )}
      {...props}
    >
      <svg
        className={cn(
          'animate-spin text-gold',
          sizeClasses[size]
        )}
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
    </div>
  );
}