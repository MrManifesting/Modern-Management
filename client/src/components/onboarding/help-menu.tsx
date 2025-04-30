import React from 'react';
import { HelpCircle, BookOpen, LifeBuoy, PlayCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useOnboarding } from '@/hooks/use-onboarding';

interface HelpMenuProps {
  className?: string;
}

export const HelpMenu: React.FC<HelpMenuProps> = ({ className }) => {
  const { restartTour } = useOnboarding();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className={`help-menu ${className || ''}`}>
          <HelpCircle className="h-5 w-5" />
          <span className="sr-only">Help Menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Help & Resources</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={restartTour} className="restart-tour-button">
          <PlayCircle className="mr-2 h-4 w-4" />
          <span>Start Guided Tour</span>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <BookOpen className="mr-2 h-4 w-4" />
          <span>Documentation</span>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <LifeBuoy className="mr-2 h-4 w-4" />
          <span>Contact Support</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default HelpMenu;