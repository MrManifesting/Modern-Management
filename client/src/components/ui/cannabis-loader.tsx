import React from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface InventoryLoaderProps extends React.HTMLAttributes<HTMLDivElement> {
  text?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'boxes' | 'shipping';
  bounce?: boolean;
}

export function InventoryLoader({
  text = 'Loading...',
  size = 'md',
  variant = 'default',
  bounce = true,
  className,
  ...props
}: InventoryLoaderProps) {
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
          <DefaultInventoryIcon />
        )}
        {variant === 'boxes' && (
          <BoxesIcon />
        )}
        {variant === 'shipping' && (
          <ShippingIcon />
        )}
      </div>
      <div className="flex items-center text-gold font-medium">
        <span>{text}</span>
        <Loader2 className="ml-2 h-4 w-4 animate-spin" />
      </div>
    </div>
  );
}

function DefaultInventoryIcon() {
  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="h-full w-full"
    >
      {/* Main circle background */}
      <circle cx="60" cy="60" r="50" fill="#3B82F6" />
      
      {/* Box body */}
      <rect x="30" y="40" width="60" height="50" rx="2" fill="#60A5FA" />
      
      {/* Box lid */}
      <path
        d="M25 40 L60 25 L95 40 L60 55 Z"
        fill="#93C5FD"
      />
      
      {/* Box bottom details */}
      <rect x="35" y="70" width="50" height="5" fill="#2563EB" />
      <rect x="35" y="80" width="50" height="5" fill="#2563EB" />
      
      {/* Inventory items */}
      <rect x="40" y="50" width="10" height="10" rx="1" fill="#FFD700" className="animate-inventory-float" />
      <rect x="55" y="45" width="10" height="10" rx="1" fill="#FFD700" className="animate-inventory-float" style={{ animationDelay: '0.3s' }} />
      <rect x="70" y="50" width="10" height="10" rx="1" fill="#FFD700" className="animate-inventory-float" style={{ animationDelay: '0.6s' }} />
      
      {/* Gold accents */}
      <circle cx="40" cy="45" r="2" fill="#FFD700" className="animate-gold-shimmer" />
      <circle cx="80" cy="45" r="2" fill="#FFD700" className="animate-gold-shimmer" style={{ animationDelay: '0.5s' }} />
    </svg>
  );
}

function BoxesIcon() {
  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="h-full w-full"
    >
      {/* Main circle background */}
      <circle cx="60" cy="60" r="50" fill="#3B82F6" />
      
      {/* Stack of boxes */}
      <rect x="25" y="65" width="40" height="30" rx="2" fill="#60A5FA" />
      <rect x="35" y="45" width="40" height="30" rx="2" fill="#93C5FD" />
      <rect x="55" y="60" width="40" height="30" rx="2" fill="#2563EB" />
      
      {/* Box details */}
      <rect x="30" y="75" width="30" height="3" fill="#1D4ED8" />
      <rect x="30" y="82" width="20" height="3" fill="#1D4ED8" />
      
      <rect x="40" y="55" width="30" height="3" fill="#1D4ED8" />
      <rect x="40" y="62" width="20" height="3" fill="#1D4ED8" />
      
      <rect x="60" y="70" width="30" height="3" fill="#BFDBFE" />
      <rect x="60" y="77" width="20" height="3" fill="#BFDBFE" />
      
      {/* Gold "shimmer" accents */}
      <circle cx="60" cy="30" r="2" fill="#FFD700" className="animate-gold-shimmer" />
      <circle cx="45" cy="50" r="1.5" fill="#FFD700" className="animate-gold-shimmer" style={{ animationDelay: '0.5s' }} />
      <circle cx="75" cy="50" r="1.5" fill="#FFD700" className="animate-gold-shimmer" style={{ animationDelay: '1s' }} />
    </svg>
  );
}

function ShippingIcon() {
  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="h-full w-full"
    >
      {/* Main circle background */}
      <circle cx="60" cy="60" r="50" fill="#3B82F6" />
      
      {/* Truck body */}
      <rect x="15" y="65" width="60" height="25" rx="3" fill="#60A5FA" />
      
      {/* Truck cabin */}
      <rect x="75" y="70" width="25" height="20" rx="2" fill="#93C5FD" />
      <rect x="75" y="60" width="25" height="10" rx="2" fill="#93C5FD" />
      
      {/* Wheels */}
      <circle cx="30" cy="90" r="8" fill="#2563EB" />
      <circle cx="30" cy="90" r="4" fill="#1D4ED8" />
      <circle cx="80" cy="90" r="8" fill="#2563EB" />
      <circle cx="80" cy="90" r="4" fill="#1D4ED8" />
      
      {/* Windows */}
      <rect x="80" y="65" width="15" height="8" rx="1" fill="#BFDBFE" />
      
      {/* Truck details */}
      <rect x="20" y="75" width="50" height="3" fill="#2563EB" />
      <rect x="25" y="60" width="10" height="5" fill="#2563EB" />
      
      {/* Shipping box on truck */}
      <rect x="30" y="50" width="25" height="15" rx="1" fill="#FFD700" className="animate-inventory-float" />
      <rect x="35" y="55" width="15" height="2" fill="#F59E0B" />
      <rect x="35" y="60" width="10" height="2" fill="#F59E0B" />
      
      {/* Gold accents */}
      <circle cx="45" cy="40" r="2" fill="#FFD700" className="animate-gold-shimmer" />
      <circle cx="65" cy="50" r="1.5" fill="#FFD700" className="animate-gold-shimmer" style={{ animationDelay: '0.5s' }} />
      <circle cx="90" cy="55" r="1.5" fill="#FFD700" className="animate-gold-shimmer" style={{ animationDelay: '1s' }} />
    </svg>
  );
}

export function LoadingPage({ 
  variant = 'default',
  message = 'Loading...'
}: {
  variant?: 'default' | 'boxes' | 'shipping';
  message?: string;
}) {
  return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-black/95">
      <InventoryLoader 
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
  variant?: 'default' | 'boxes' | 'shipping';
}) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
      <InventoryLoader 
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