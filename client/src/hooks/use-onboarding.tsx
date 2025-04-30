import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';

// Define the type for tour steps
export interface OnboardingStep {
  target: string;
  content: React.ReactNode;
  title?: string;
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'center' | 'auto';
  disableBeacon?: boolean;
  spotlightClicks?: boolean;
  hideFooter?: boolean;
  hideCloseButton?: boolean;
  isFixed?: boolean;
}

// Function to determine if this is the user's first visit
const isFirstVisit = (): boolean => {
  return localStorage.getItem('hasCompletedOnboarding') !== 'true';
};

// Default tour steps
const defaultSteps: OnboardingStep[] = [
  {
    target: 'body',
    content: 'Welcome to the Gold Standard CBD Inventory Management System! Let me show you around.',
    placement: 'center',
    disableBeacon: true,
    hideCloseButton: true,
  },
  {
    target: '.dashboard-summary',
    content: 'This is your dashboard, showing a summary of your inventory, sales, and analytics.',
    placement: 'bottom',
  },
  {
    target: '.sidebar-nav',
    content: 'Use this navigation menu to access different parts of the application.',
    placement: 'right',
  },
  {
    target: '.inventory-link',
    content: 'Click here to manage your inventory items.',
    placement: 'right',
    spotlightClicks: true,
  },
  {
    target: '.shopify-link',
    content: 'Connect with Shopify to synchronize your inventory across platforms.',
    placement: 'right',
  },
  {
    target: '.settings-link',
    content: 'Customize your application settings here.',
    placement: 'right',
  },
  {
    target: '.theme-toggle',
    content: 'Toggle between light and dark themes based on your preference.',
    placement: 'bottom',
  },
  {
    target: 'body',
    content: 'That concludes our tour. You can always restart the tour from the help menu if needed. Enjoy using the application!',
    placement: 'center',
    disableBeacon: true,
  }
];

// Hook for managing onboarding tour
export const useOnboarding = (customSteps?: OnboardingStep[]) => {
  const [location] = useLocation();
  const [steps, setSteps] = useState<OnboardingStep[]>(customSteps || defaultSteps);
  const [run, setRun] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [isFirstTime, setIsFirstTime] = useState(false);

  // Check if first visit and initialize tour
  useEffect(() => {
    const firstVisit = isFirstVisit();
    setIsFirstTime(firstVisit);
    
    // Start tour automatically if it's the first visit and we're on the homepage
    if (firstVisit && location === '/') {
      setTimeout(() => {
        setRun(true);
      }, 1000); // Slight delay to ensure UI is loaded
    }
  }, [location]);

  // Mark onboarding as completed
  const completeOnboarding = () => {
    localStorage.setItem('hasCompletedOnboarding', 'true');
    setIsFirstTime(false);
  };

  // Restart the tour
  const restartTour = () => {
    setStepIndex(0);
    setRun(true);
  };

  // Handle tour callbacks
  const handleJoyrideCallback = (data: any) => {
    const { action, index, status, type } = data;

    if (type === 'step:after' && index === steps.length - 1) {
      // Complete onboarding after the last step
      completeOnboarding();
    }

    // Update step index as user progresses
    if (type === 'step:after') {
      setStepIndex(index + 1);
    }

    // Handle tour completion or skipping
    if (['finished', 'skipped'].includes(status)) {
      completeOnboarding();
      setRun(false);
    }
  };

  return {
    steps,
    setSteps,
    run,
    setRun,
    stepIndex,
    setStepIndex,
    isFirstTime,
    restartTour,
    handleJoyrideCallback,
  };
};