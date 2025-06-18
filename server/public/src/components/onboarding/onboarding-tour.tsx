import React from 'react';
import Joyride, { CallBackProps, STATUS } from 'react-joyride';
import { OnboardingStep, useOnboarding } from '@/hooks/use-onboarding';

interface OnboardingTourProps {
  steps?: OnboardingStep[];
  onComplete?: () => void;
  runAutomatically?: boolean;
}

export const OnboardingTour: React.FC<OnboardingTourProps> = ({
  steps,
  onComplete,
  runAutomatically = true,
}) => {
  const {
    steps: tourSteps,
    run,
    setRun,
    stepIndex,
    handleJoyrideCallback,
    isFirstTime,
  } = useOnboarding(steps);
  
  // Ensure the tour starts when specified by props
  React.useEffect(() => {
    if (runAutomatically && isFirstTime) {
      setRun(true);
    }
  }, [runAutomatically, isFirstTime, setRun]);
  
  // Custom callback handler that also calls the provided onComplete
  const handleCallback = (data: CallBackProps) => {
    handleJoyrideCallback(data);
    
    // When tour is finished or skipped, call the onComplete callback
    if ((data.status === STATUS.FINISHED || data.status === STATUS.SKIPPED) && onComplete) {
      onComplete();
    }
  };
  
  return (
    <Joyride
      callback={handleCallback}
      continuous
      hideCloseButton={false}
      run={run}
      scrollToFirstStep
      showProgress
      showSkipButton
      stepIndex={stepIndex}
      steps={tourSteps}
      styles={{
        options: {
          primaryColor: '#D4AF37', // Gold color for primary elements
          backgroundColor: '#1f1f1f', // Dark background
          textColor: '#f5f5f5', // Light text for better contrast
          arrowColor: '#D4AF37',
          zIndex: 10000,
        },
        spotlight: {
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
        },
        tooltipContainer: {
          textAlign: 'left',
          padding: '15px',
          borderRadius: '8px',
        },
        buttonNext: {
          backgroundColor: '#D4AF37',
          color: '#000000',
          fontSize: '14px',
          borderRadius: '4px',
          padding: '8px 15px',
        },
        buttonBack: {
          color: '#D4AF37',
          marginRight: '10px',
        },
        buttonSkip: {
          color: '#f5f5f5',
          opacity: 0.7,
        },
      }}
      locale={{
        back: 'Back',
        close: 'Close',
        last: 'Finish',
        next: 'Next',
        open: 'Open',
        skip: 'Skip Tour',
      }}
    />
  );
};

export default OnboardingTour;