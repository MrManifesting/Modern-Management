import React from 'react';
import { Link } from 'wouter';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  Keyboard, 
  Headphones, 
  Mic, 
  Eye, 
  HandMetal,
  CornerDownRight,
  ChevronLeft,
  Accessibility,
  PanelLeftClose,
  MousePointerClick,
  VolumeX,
  Volume2,
  Smartphone
} from 'lucide-react';

const AccessibilityGuidePage = () => {
  return (
    <div className="container max-w-4xl mx-auto py-6 space-y-8">
      <div className="flex items-center space-x-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/settings">
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to Settings
          </Link>
        </Button>
      </div>

      <div>
        <div className="flex items-center space-x-3">
          <Accessibility className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Accessibility Guide</h1>
        </div>
        <p className="mt-2 text-muted-foreground">
          Learn how to use Gold-Standard-Inventory's accessibility features to enhance your experience
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Keyboard className="h-5 w-5 mr-2" />
            Keyboard Navigation
          </CardTitle>
          <CardDescription>
            Navigate the application using only your keyboard
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>
            Gold-Standard-Inventory is fully navigable using only your keyboard. This is especially useful for users with motor disabilities or those who prefer keyboard shortcuts.
          </p>

          <div className="bg-muted p-4 rounded-md">
            <h3 className="font-medium mb-2">Global Keyboard Shortcuts</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-2 gap-x-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <code className="px-2 py-1 bg-background rounded text-sm">Alt + D</code>
                  <CornerDownRight className="h-3 w-3 text-muted-foreground" />
                </div>
                <span className="text-sm">Dashboard</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <code className="px-2 py-1 bg-background rounded text-sm">Alt + I</code>
                  <CornerDownRight className="h-3 w-3 text-muted-foreground" />
                </div>
                <span className="text-sm">Inventory</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <code className="px-2 py-1 bg-background rounded text-sm">Alt + S</code>
                  <CornerDownRight className="h-3 w-3 text-muted-foreground" />
                </div>
                <span className="text-sm">Scanner</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <code className="px-2 py-1 bg-background rounded text-sm">Alt + R</code>
                  <CornerDownRight className="h-3 w-3 text-muted-foreground" />
                </div>
                <span className="text-sm">Reports</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <code className="px-2 py-1 bg-background rounded text-sm">Alt + /</code>
                  <CornerDownRight className="h-3 w-3 text-muted-foreground" />
                </div>
                <span className="text-sm">Global Search</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <code className="px-2 py-1 bg-background rounded text-sm">Alt + E</code>
                  <CornerDownRight className="h-3 w-3 text-muted-foreground" />
                </div>
                <span className="text-sm">Employees</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="font-medium">Form Navigation</h3>
            <p className="text-sm text-muted-foreground">
              You can navigate through form fields using <code className="px-1 py-0.5 bg-muted rounded text-xs">Tab</code> to move forward and <code className="px-1 py-0.5 bg-muted rounded text-xs">Shift + Tab</code> to move backward.
              Press <code className="px-1 py-0.5 bg-muted rounded text-xs">Enter</code> to submit forms or click buttons.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Headphones className="h-5 w-5 mr-2" />
            Screen Reader Support
          </CardTitle>
          <CardDescription>
            Use Gold-Standard-Inventory with screen readers and text-to-speech tools
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>
            Our application is designed to work seamlessly with screen readers like JAWS, NVDA, and VoiceOver. We follow WCAG 2.1 guidelines to ensure the best experience.
          </p>

          <div className="space-y-4">
            <div>
              <h3 className="font-medium">Image Descriptions</h3>
              <p className="text-sm text-muted-foreground mt-1">
                All images include proper alt text descriptions. In the Image Optimization tool, you can generate and customize alt text for your product images.
              </p>
            </div>

            <div>
              <h3 className="font-medium">Tables and Lists</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Data tables include proper headers and row descriptions for easier navigation with screen readers. Lists are properly marked up for structural navigation.
              </p>
            </div>

            <div>
              <h3 className="font-medium">Read Aloud Feature</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Use the "Read Details" button in inventory and sales reports to have information read aloud to you.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Mic className="h-5 w-5 mr-2" />
            Voice Commands and Dictation
          </CardTitle>
          <CardDescription>
            Control the application using your voice and dictate content
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>
            Gold-Standard-Inventory supports voice input for many fields, making it easier to enter information without typing.
          </p>

          <div className="space-y-4">
            <div>
              <h3 className="font-medium">Dictation</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Look for the microphone icon <Mic className="h-3 w-3 inline" /> in text areas to enable dictation. Currently available in:
              </p>
              <ul className="mt-2 list-disc pl-5 text-sm space-y-1">
                <li>Product descriptions</li>
                <li>Alt text generation</li>
                <li>Notes fields</li>
                <li>Search queries</li>
              </ul>
            </div>

            <div className="p-3 border rounded-md bg-yellow-50 dark:bg-yellow-950 text-sm">
              <p className="font-medium">Browser Requirements</p>
              <p className="mt-1">
                Voice recognition features require a modern browser with Web Speech API support (Chrome, Edge, or Safari recommended).
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Eye className="h-5 w-5 mr-2" />
            Visual Accessibility
          </CardTitle>
          <CardDescription>
            Options for users with visual impairments
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div>
              <h3 className="font-medium">Dark Mode</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Toggle between light and dark themes based on your preference. Dark mode can reduce eye strain and is helpful for users sensitive to bright lights.
              </p>
              <div className="mt-3 flex items-center space-x-4">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex items-center gap-2" 
                  onClick={() => document.documentElement.classList.remove('dark')}
                >
                  <div className="w-4 h-4 rounded-full bg-white border"></div>
                  <span>Light Mode</span>
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex items-center gap-2"
                  onClick={() => document.documentElement.classList.add('dark')}
                >
                  <div className="w-4 h-4 rounded-full bg-gray-900 border"></div>
                  <span>Dark Mode</span>
                </Button>
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="font-medium">High Contrast Mode</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Enable high contrast in the Settings page to increase color contrast for better readability.
              </p>
            </div>

            <Separator />

            <div>
              <h3 className="font-medium">Text Zoom</h3>
              <p className="text-sm text-muted-foreground mt-1">
                The application supports browser zoom functionality. Use <code className="px-1 py-0.5 bg-muted rounded text-xs">Ctrl +</code> and <code className="px-1 py-0.5 bg-muted rounded text-xs">Ctrl -</code> to adjust text size.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <HandMetal className="h-5 w-5 mr-2" />
            Motor Accessibility
          </CardTitle>
          <CardDescription>
            Features for users with motor disabilities
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div>
              <h3 className="font-medium">Large Click Targets</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Buttons and interactive elements have generous sizing to make them easier to click for users with motor difficulties.
              </p>
              <div className="flex items-center space-x-3 mt-2">
                <Button size="sm">Small</Button>
                <Button>Normal</Button>
                <Button size="lg">Large</Button>
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="font-medium">Sidebar Controls</h3>
              <p className="text-sm text-muted-foreground mt-1">
                The sidebar can be collapsed to provide more screen space and reduce scrolling requirements.
              </p>
              <div className="mt-2 flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <PanelLeftClose className="h-4 w-4" />
                  <span className="text-sm">Toggle Sidebar</span>
                </div>
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="font-medium">Mobile Optimization</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Gold-Standard-Inventory is fully responsive and works on mobile devices with touch interfaces.
              </p>
              <div className="mt-2 text-sm flex items-center">
                <Smartphone className="h-4 w-4 mr-2" />
                Tap gestures are supported throughout the application
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Volume2 className="h-5 w-5 mr-2" />
            Audio Accessibility
          </CardTitle>
          <CardDescription>
            Features for users with hearing impairments
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div>
              <h3 className="font-medium">Visual Alerts</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Important notifications use both color and icon indicators, not just sounds, to ensure users with hearing impairments don't miss updates.
              </p>
            </div>

            <Separator />

            <div>
              <h3 className="font-medium">No Audio-Only Content</h3>
              <p className="text-sm text-muted-foreground mt-1">
                All information is presented visually. There is no content that relies solely on audio cues or instructions.
              </p>
              <div className="mt-2 flex items-center space-x-2">
                <VolumeX className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">No essential audio-only content</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="bg-muted p-6 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">Feedback and Support</h2>
        <p className="mb-4">
          We're committed to making Gold-Standard-Inventory accessible to everyone. If you encounter any accessibility issues or have suggestions for improvement, please let us know.
        </p>
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
          <Button onClick={() => window.location.href = 'tel:458-226-1464'}>
            Contact Support
          </Button>
          <Button 
            variant="outline"
            onClick={() => window.location.href = 'mailto:creationsandautomations@gmail.com?subject=Gold-Standard-Inventory%20Feedback'}
          >
            Submit Feedback
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AccessibilityGuidePage;