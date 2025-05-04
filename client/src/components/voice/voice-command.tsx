import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Mic, 
  MicOff, 
  Play, 
  Square, 
  Loader, 
  AlertCircle,
  Printer,
  Package,
  ArrowRightLeft,
  Search,
  ChevronDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Switch } from '@/components/ui/switch';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';
import { apiRequest } from '@/lib/queryClient';

// Define the types of commands we support
type CommandType = 'add' | 'print' | 'transfer' | 'search' | 'navigate';

interface Command {
  type: CommandType;
  keywords: string[];
  description: string;
  examples: string[];
  action: (transcript: string, args: string) => void;
  extractArgs: (transcript: string) => string;
}

// Type definition for Web Speech API
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export function VoiceCommand() {
  const [isListening, setIsListening] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [transcript, setTranscript] = useState<string>('');
  const [lastExecutedCommand, setLastExecutedCommand] = useState<string | null>(null);
  const [activeTrigger, setActiveTrigger] = useState<string | null>(null);
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  // Check browser support
  const isBrowserSupported = useCallback(() => {
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  }, []);

  // Initialize speech recognition
  useEffect(() => {
    if (isBrowserSupported()) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      
      // Create a new instance if it doesn't exist
      if (!recognitionRef.current) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false; // Changed to false for more reliable command detection
        recognitionRef.current.interimResults = false; // Changed to false to get only final results
        recognitionRef.current.lang = 'en-US';
        
        console.log("Speech recognition initialized");
      }
      
      // Set up event handlers
      recognitionRef.current.onresult = (event: any) => {
        console.log("Speech recognition result received", event);
        const last = event.results.length - 1;
        const result = event.results[last][0].transcript;
        console.log("Transcript:", result);
        setTranscript(result);
        
        // Process the transcript right away if we have a final result
        if (event.results[last].isFinal) {
          setTimeout(() => {
            processTranscript();
          }, 100);
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        setError(event.error);
        setIsListening(false);
        
        toast({
          title: "Speech Recognition Error",
          description: `Error: ${event.error}. Please try again.`,
          variant: "destructive"
        });
      };

      recognitionRef.current.onend = () => {
        console.log("Speech recognition ended, isListening:", isListening);
        if (isListening) {
          // Only try to restart if we're supposed to be listening
          try {
            setTimeout(() => {
              if (isListening && recognitionRef.current) {
                recognitionRef.current.start();
                console.log("Restarted speech recognition");
              }
            }, 200);
          } catch (err) {
            console.error("Failed to restart speech recognition", err);
          }
        }
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  // Handle browser support issues
  if (!isBrowserSupported()) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Browser not supported</AlertTitle>
        <AlertDescription>
          Your browser doesn't support speech recognition. Try using Chrome or Edge.
        </AlertDescription>
      </Alert>
    );
  }

  if (error === 'not-allowed') {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Microphone access denied</AlertTitle>
        <AlertDescription>
          Please allow microphone access in your browser settings to use voice commands.
        </AlertDescription>
      </Alert>
    );
  }

  // Utility function to extract arguments more reliably
  const extractArgsAfterKeyword = (transcript: string, keywords: string[]): string => {
    const lowerTranscript = transcript.toLowerCase();
    
    // Find the first matching keyword
    let matchedKeyword = '';
    let keywordIndex = -1;
    
    for (const keyword of keywords) {
      const index = lowerTranscript.indexOf(keyword.toLowerCase());
      if (index !== -1 && (keywordIndex === -1 || index < keywordIndex)) {
        keywordIndex = index;
        matchedKeyword = keyword;
      }
    }
    
    if (keywordIndex !== -1) {
      // Get everything after the keyword
      return transcript.substring(keywordIndex + matchedKeyword.length).trim();
    }
    
    return '';
  };

  // Sound effect for command acknowledgment
  const playAcknowledgmentSound = () => {
    const audio = new Audio('/sounds/command-acknowledged.mp3');
    try {
      audio.volume = 0.5;
      audio.play().catch(err => {
        console.error('Error playing sound:', err);
      });
    } catch (err) {
      console.error('Error with audio playback:', err);
    }
  };

  // Define our commands
  const commands: Command[] = [
    {
      type: 'add',
      keywords: ['add new item', 'create item', 'add inventory', 'add item', 'new item'],
      description: 'Add a new inventory item',
      examples: ['add new item blue dream flower', 'create item gorilla glue 4 top shelf'],
      extractArgs: (transcript) => {
        return extractArgsAfterKeyword(transcript, [
          'add new item', 'create item', 'add inventory', 'add item', 'new item'
        ]);
      },
      action: (transcript, args) => {
        // Play sound for feedback
        playAcknowledgmentSound();
        
        // Display toast message
        toast({
          title: "Adding new item",
          description: `Creating item: ${args}`,
        });

        // Trigger opening the add item modal with name pre-filled
        // We need to use a custom event to trigger the modal from anywhere in the app
        const addItemEvent = new CustomEvent('openAddItemModal', { 
          detail: { itemName: args } 
        });
        window.dispatchEvent(addItemEvent);
      }
    },
    {
      type: 'print',
      keywords: ['print barcode', 'print label'],
      description: 'Print a barcode or label for an item',
      examples: ['print barcode for item 12', 'print label blue dream'],
      extractArgs: (transcript) => {
        let args = extractArgsAfterKeyword(transcript, [
          'print barcode', 'print label'
        ]);
        
        // Remove "for" or "for item" if present
        return args.replace(/^for(\s+item)?\s+/i, '').trim();
      },
      action: (transcript, args) => {
        // If args is a number, assume it's an item ID
        if (!isNaN(Number(args))) {
          const itemId = Number(args);
          toast({
            title: "Printing barcode",
            description: `Printing barcode for item ID ${itemId}`,
          });
          window.open(`/api/items/${itemId}/codes`, '_blank');
        } else {
          // Otherwise, search for the item by name
          toast({
            title: "Searching for item",
            description: `Looking for "${args}" to print label`,
          });
          navigate(`/items?search=${encodeURIComponent(args)}`);
        }
      }
    },
    {
      type: 'transfer',
      keywords: ['transfer', 'move to breakdown', 'breakdown'],
      description: 'Transfer bulk items to breakdown',
      examples: ['transfer 1 pound of blue dream to breakdown', 'breakdown 1 pound of gorilla glue 4'],
      extractArgs: (transcript) => {
        return extractArgsAfterKeyword(transcript, [
          'transfer', 'move to breakdown', 'breakdown'
        ]);
      },
      action: (transcript, args) => {
        // Parse the strain name from the command
        let amount = '1 pound';
        let strain = '';
        
        // Look for the amount pattern (like "1 pound")
        const amountMatch = args.match(/([\d.]+)\s*(pound|pounds|lb|lbs|gram|grams|g|ounce|ounces|oz)/i);
        if (amountMatch) {
          amount = `${amountMatch[1]} ${amountMatch[2]}`;
          // Remove the amount from the args to get the strain
          strain = args.replace(amountMatch[0], '').replace(/of|to breakdown/gi, '').trim();
        } else {
          // If no amount pattern found, assume the rest is the strain
          strain = args.replace(/of|to breakdown/gi, '').trim();
        }

        toast({
          title: "Transferring to breakdown",
          description: `Moving ${amount} of ${strain} to breakdown`,
        });
        
        navigate('/bulk-breakdown?strain=' + encodeURIComponent(strain) + '&amount=' + encodeURIComponent(amount));
      }
    },
    {
      type: 'search',
      keywords: ['search for', 'find item', 'locate'],
      description: 'Search for items in inventory',
      examples: ['search for blue dream', 'find item gorilla glue', 'locate top shelf items'],
      extractArgs: (transcript) => {
        return extractArgsAfterKeyword(transcript, [
          'search for', 'find item', 'locate'
        ]);
      },
      action: (transcript, args) => {
        toast({
          title: "Searching inventory",
          description: `Looking for "${args}"`,
        });
        navigate(`/items?search=${encodeURIComponent(args)}`);
      }
    },
    {
      type: 'navigate',
      keywords: ['go to', 'open', 'navigate to', 'navigate'],
      description: 'Navigate to different pages',
      examples: ['go to dashboard', 'open inventory', 'navigate to bulk breakdown'],
      extractArgs: (transcript) => {
        return extractArgsAfterKeyword(transcript, [
          'go to', 'open', 'navigate to', 'navigate'
        ]);
      },
      action: (transcript, args) => {
        // Play sound for feedback
        playAcknowledgmentSound();
        
        // Map common spoken page names to URLs
        const pageMap: Record<string, string> = {
          // Dashboard
          'dashboard': '/',
          'home': '/',
          'main': '/',
          
          // Inventory
          'inventory': '/inventory',
          'items': '/inventory',
          'products': '/inventory',
          'inventory pro': '/inventory',
          'specialty products': '/inventory/specialty-products',
          'package inventory': '/inventory/package',
          'thca flower': '/inventory/thca-flower',
          'thca': '/inventory/thca-flower',
          'flower': '/inventory/thca-flower',
          
          // Bulk breakdown
          'bulk breakdown': '/bulk-breakdown',
          'breakdown': '/bulk-breakdown',
          'bulk': '/bulk-breakdown',
          
          // Employees
          'employees': '/employees',
          'staff': '/employees',
          'team': '/employees',
          
          // Sales and reporting
          'sales': '/sales',
          'shopify reports': '/shopify-reports',
          'reports': '/shopify-reports',
          'shopify': '/shopify-sync',
          'shopify sync': '/shopify-sync',
          'sync': '/shopify-sync',
          
          // Analytics
          'analytics': '/analytics',
          'forecast': '/forecast',
          'forecasting': '/forecast',
          'predictions': '/forecast',
          
          // Media and images
          'media': '/media-manager',
          'photos': '/media-manager',
          'images': '/media-manager',
          'media manager': '/media-manager',
          'image optimization': '/image-optimization',
          'optimize images': '/image-optimization',
          
          // Scanner
          'scanner': '/scanner',
          'scan': '/scanner',
          'barcode': '/scanner',
          
          // Settings and admin
          'settings': '/settings',
          'preferences': '/settings',
          'database cleanup': '/database-cleanup',
          'cleanup': '/database-cleanup',
          'accessibility': '/accessibility'
        };

        // Find the best match
        const normalizedInput = args.toLowerCase().trim();
        const matchedPage = Object.keys(pageMap).find(key => 
          normalizedInput.includes(key) || key.includes(normalizedInput)
        );

        if (matchedPage) {
          toast({
            title: "Navigating",
            description: `Going to ${matchedPage}`,
          });
          navigate(pageMap[matchedPage]);
        } else {
          toast({
            title: "Navigation failed",
            description: `Could not find a page matching "${args}"`,
            variant: "destructive"
          });
        }
      }
    }
  ];

  // Check if the transcript matches any command
  const processTranscript = useCallback(() => {
    if (!transcript || processing) return;
    
    setProcessing(true);
    
    // Check each command for a match
    for (const command of commands) {
      // Check if the transcript starts with any of the command keywords
      const matchedKeyword = command.keywords.find(keyword => 
        transcript.toLowerCase().includes(keyword.toLowerCase())
      );
      
      if (matchedKeyword) {
        const args = command.extractArgs(transcript);
        
        // Execute the command even if args is empty - sometimes we just need the trigger
        // Execute the command after a short delay to allow the UI to update
        setTimeout(() => {
          console.log(`Executing voice command: ${matchedKeyword} with args: ${args || 'none'}`);
          setLastExecutedCommand(transcript);
          setActiveTrigger(matchedKeyword);
          setTranscript('');
          command.action(transcript, args || '');
          setProcessing(false);
          setIsListening(false);
          if (recognitionRef.current) {
            recognitionRef.current.stop();
          }
        }, 500);
        return;
      }
    }
    
    setProcessing(false);
  }, [transcript, processing, commands, navigate]);

  // Process transcript when we have a full transcript to analyze
  useEffect(() => {
    if (!isListening && transcript && !processing) {
      processTranscript();
    }
  }, [isListening, transcript, processing, processTranscript, navigate]);

  // Reset transcript
  const resetTranscript = useCallback(() => {
    setTranscript('');
  }, []);

  // Toggle continuous listening mode
  const [continuousMode, setContinuousMode] = useState<boolean>(false);
  
  // Start/stop listening
  const toggleListening = () => {
    if (isListening) {
      console.log("Stopping speech recognition");
      setIsListening(false); // Set state first to prevent auto-restart
      
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
          console.log("Speech recognition stopped");
        } catch (err) {
          console.error('Failed to stop speech recognition', err);
        }
      }
    } else {
      console.log("Starting speech recognition");
      // Reset state
      setTranscript('');
      setLastExecutedCommand(null);
      setActiveTrigger(null);
      setError(null);
      
      // Recreate recognition instance if needed
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!recognitionRef.current) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true; // Enable continuous recognition
        recognitionRef.current.interimResults = true; // Show interim results
        recognitionRef.current.lang = 'en-US';
        
        // Reattach event handlers
        recognitionRef.current.onresult = (event: any) => {
          console.log("Speech recognition result received", event);
          const last = event.results.length - 1;
          const result = event.results[last][0].transcript;
          console.log("Transcript:", result);
          setTranscript(result);
          
          if (event.results[last].isFinal) {
            setTimeout(() => {
              processTranscript();
              
              // In continuous mode, don't stop listening after command execution
              if (continuousMode) {
                setIsListening(true);
                setTranscript('');
                setTimeout(() => {
                  if (recognitionRef.current) {
                    try {
                      recognitionRef.current.start();
                    } catch (err) {
                      console.error("Failed to restart in continuous mode", err);
                    }
                  }
                }, 1000);
              }
            }, 100);
          }
        };
        
        recognitionRef.current.onerror = (event: any) => {
          console.error('Speech recognition error', event.error);
          setError(event.error);
          
          // Only completely turn off listening for fatal errors
          if (event.error !== 'no-speech') {
            setIsListening(false);
          } else if (continuousMode) {
            // In continuous mode, try to restart on non-fatal errors
            setTimeout(() => {
              if (isListening && recognitionRef.current) {
                try {
                  recognitionRef.current.start();
                } catch (err) {
                  console.error("Failed to recover from error", err);
                  setIsListening(false);
                }
              }
            }, 1000);
          }
        };
        
        recognitionRef.current.onend = () => {
          console.log("Speech recognition ended");
          // If we're still supposed to be listening, restart
          if (isListening && continuousMode) {
            try {
              setTimeout(() => {
                if (isListening && recognitionRef.current) {
                  recognitionRef.current.start();
                  console.log("Speech recognition restarted (continuous mode)");
                }
              }, 500);
            } catch (err) {
              console.error("Failed to restart speech recognition", err);
            }
          }
        };
      }
      
      try {
        recognitionRef.current.start();
        setIsListening(true);
        console.log("Speech recognition started successfully");
        
        toast({
          title: "Voice Commands Activated",
          description: continuousMode ? 
            "Continuous listening mode: I'll keep listening for commands" : 
            "Say a command like 'add new item' or 'print barcode'",
        });
      } catch (err) {
        console.error('Failed to start speech recognition', err);
        toast({
          title: "Error",
          description: "Could not start speech recognition. Please ensure microphone access is allowed.",
          variant: "destructive"
        });
      }
    }
  };

  return (
    <Card className="w-full max-w-md shadow-lg border border-gold-500/20 bg-gradient-to-br from-background to-muted/30">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Mic className="h-5 w-5 text-gold-500" />
              Voice Assistant
            </CardTitle>
            <CardDescription>
              Control the inventory system with your voice
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {/* Continuous mode toggle */}
            <div className="flex items-center space-x-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-muted-foreground">Continuous</span>
                      <Switch
                        checked={continuousMode}
                        onCheckedChange={setContinuousMode}
                        size="sm"
                        className="data-[state=checked]:bg-gold-500"
                      />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    {continuousMode 
                      ? "Continuous mode: will keep listening after commands" 
                      : "Standard mode: stops after each command"}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            
            {/* Mic toggle button */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant={isListening ? "destructive" : "outline"} 
                    size="sm"
                    onClick={toggleListening}
                    className={isListening ? "animate-pulse" : ""}
                  >
                    {isListening ? (
                      <><MicOff className="h-4 w-4 mr-1" /> Stop</>
                    ) : (
                      <><Mic className="h-4 w-4 mr-1" /> Start</>
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {isListening ? "Stop listening" : "Start listening for commands"}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pb-2">
        {/* Listening status with minimalist UI */}
        {isListening && (
          <div className="relative mb-2 border rounded-md p-2 bg-card/50">
            <div className="absolute right-2 top-2">
              {processing ? (
                <Loader className="h-3 w-3 animate-spin text-gold-500" />
              ) : isListening ? (
                <div className="flex items-center space-x-1">
                  <div className="w-1 h-3 bg-red-500 rounded-full animate-pulse"></div>
                  <div className="w-1 h-4 bg-red-500 rounded-full animate-pulse delay-75"></div>
                  <div className="w-1 h-2 bg-red-500 rounded-full animate-pulse delay-150"></div>
                </div>
              ) : null}
            </div>
            <p className="text-sm font-mono min-h-[1.5rem] text-muted-foreground">
              {transcript ? `"${transcript}"` : "Listening..."}
            </p>
          </div>
        )}
        
        {/* Last executed command - show only when not listening */}
        {!isListening && lastExecutedCommand && (
          <div className="mb-2">
            <div className="flex items-center justify-between mb-1">
              <Badge variant="outline" className="bg-gold-500/10">Last command</Badge>
              {activeTrigger && (
                <Badge className="bg-gold-500 text-background">{activeTrigger}</Badge>
              )}
            </div>
            <div className="border rounded-md p-2 bg-card/50">
              <p className="text-xs font-mono text-muted-foreground">{lastExecutedCommand}</p>
            </div>
          </div>
        )}
        
        {/* Quick reference for available commands */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-medium">Try saying:</h4>
            {/* Collapsible commands */}
            <Collapsible>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="p-0 h-6">
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="grid grid-cols-2 gap-1 mt-1">
                  <div className="flex items-center gap-1 p-1 rounded-md border bg-card/50">
                    <Package className="h-3 w-3 text-gold-500" />
                    <span className="text-xs">Add new item</span>
                  </div>
                  <div className="flex items-center gap-1 p-1 rounded-md border bg-card/50">
                    <Printer className="h-3 w-3 text-gold-500" />
                    <span className="text-xs">Print label</span>
                  </div>
                  <div className="flex items-center gap-1 p-1 rounded-md border bg-card/50">
                    <ArrowRightLeft className="h-3 w-3 text-gold-500" />
                    <span className="text-xs">Transfer</span>
                  </div>
                  <div className="flex items-center gap-1 p-1 rounded-md border bg-card/50">
                    <Search className="h-3 w-3 text-gold-500" />
                    <span className="text-xs">Search items</span>
                  </div>
                  <div className="flex items-center gap-1 p-1 rounded-md border bg-card/50">
                    <Play className="h-3 w-3 text-gold-500" />
                    <span className="text-xs">Navigate to...</span>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
          
          {/* Command examples */}
          <div className="text-xs text-muted-foreground space-y-1">
            <p>"Add new item Blue Dream flower"</p>
            <p>"Navigate to inventory"</p>
            <p>"Print barcode for item 123"</p>
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="pt-0 text-xs text-muted-foreground flex items-center justify-between">
        <span>
          {isListening ? 
            (continuousMode ? "Continuous listening active" : "Listening for one command") : 
            "Click Start to begin"
          }
        </span>
        {error && (
          <Badge variant="destructive" className="text-xs">{error}</Badge>
        )}
      </CardFooter>
    </Card>
  );
}