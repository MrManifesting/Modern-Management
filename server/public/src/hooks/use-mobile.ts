import { useState, useEffect } from 'react';

/**
 * A hook that returns true if the current viewport is considered mobile
 * @param breakpoint The max width in pixels to consider as a mobile device (default: 768px)
 */
export function useIsMobile(breakpoint = 768): boolean {
  const [isMobile, setIsMobile] = useState<boolean>(
    typeof window !== 'undefined' ? window.innerWidth < breakpoint : false
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const checkMobile = () => {
      setIsMobile(window.innerWidth < breakpoint);
    };

    // Set on mount and add listener
    checkMobile();
    window.addEventListener('resize', checkMobile);

    // Remove listener on cleanup
    return () => window.removeEventListener('resize', checkMobile);
  }, [breakpoint]);

  return isMobile;
}