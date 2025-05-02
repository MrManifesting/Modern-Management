import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { X, Play } from 'lucide-react';
import { useOnboarding } from '@/hooks/use-onboarding';

interface WelcomeBannerProps {
  className?: string;
  title?: string;
  description?: string;
}

export const WelcomeBanner: React.FC<WelcomeBannerProps> = ({
  className,
  title = 'Welcome to Gold Standard Investment Group Inventory Management',
  description = 'Get started by taking a quick tour of the key features.',
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const { isFirstTime, restartTour } = useOnboarding();

  useEffect(() => {
    // Only show banner for first-time users
    if (isFirstTime) {
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 2000); // Show after a delay to not overwhelm the user immediately
      
      return () => clearTimeout(timer);
    }
  }, [isFirstTime]);

  const handleClose = () => {
    setIsVisible(false);
  };

  const handleStartTour = () => {
    restartTour();
    setIsVisible(false);
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className={`fixed bottom-4 right-4 z-50 max-w-md ${className || ''}`}>
      <Card className="border-gold bg-gradient-to-br from-black to-zinc-900 text-white shadow-lg">
        <CardContent className="p-4">
          <div className="flex justify-between items-start">
            <h3 className="text-xl font-semibold text-gold">{title}</h3>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleClose} 
              className="h-8 w-8 text-white opacity-70 hover:opacity-100"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </Button>
          </div>
          
          <p className="mt-2 text-zinc-300">{description}</p>
          
          <div className="mt-4 flex justify-end">
            <Button 
              onClick={handleStartTour}
              className="bg-gold hover:bg-gold/90 text-black"
            >
              <Play className="mr-2 h-4 w-4" />
              Start Tour
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default WelcomeBanner;