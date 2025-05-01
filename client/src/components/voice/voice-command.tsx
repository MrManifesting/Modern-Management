import React, { useState, useEffect, useCallback } from 'react';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import { 
  Mic, 
  MicOff, 
  Play, 
  Square, 
  Loader, 
  AlertCircle,
  Printer,
  Package,
  ArrowRightLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'wouter';
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

export function VoiceCommand() {
  const [isListening, setIsListening] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [lastExecutedCommand, setLastExecutedCommand] = useState<string | null>(null);
  const [activeTrigger, setActiveTrigger] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition,
    isMicrophoneAvailable
  } = useSpeechRecognition();

  // Handle browser support and microphone access issues
  if (!browserSupportsSpeechRecognition) {
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

  if (!isMicrophoneAvailable) {
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

  // Define our commands
  const commands: Command[] = [
    {
      type: 'add',
      keywords: ['add new item', 'create item', 'add inventory'],
      description: 'Add a new inventory item',
      examples: ['add new item blue dream flower', 'create item gorilla glue 4 top shelf'],
      extractArgs: (transcript) => {
        const match = transcript.match(/add new item|create item|add inventory(.*)/i);
        return match && match[1] ? match[1].trim() : '';
      },
      action: (transcript, args) => {
        toast({
          title: "Adding new item",
          description: `Creating item: ${args}`,
        });
        navigate('/items/new?name=' + encodeURIComponent(args));
      }
    },
    {
      type: 'print',
      keywords: ['print barcode', 'print label'],
      description: 'Print a barcode or label for an item',
      examples: ['print barcode for item 12', 'print label blue dream'],
      extractArgs: (transcript) => {
        const match = transcript.match(/print (barcode|label)(?:s)?(?: for)?(?: item)?(.*)/i);
        return match && match[2] ? match[2].trim() : '';
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
        const match = transcript.match(/transfer|move to breakdown|breakdown(.*)/i);
        return match && match[1] ? match[1].trim() : '';
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
        const match = transcript.match(/search for|find item|locate(.*)/i);
        return match && match[1] ? match[1].trim() : '';
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
      keywords: ['go to', 'open', 'navigate to'],
      description: 'Navigate to different pages',
      examples: ['go to dashboard', 'open inventory', 'navigate to bulk breakdown'],
      extractArgs: (transcript) => {
        const match = transcript.match(/go to|open|navigate to(.*)/i);
        return match && match[1] ? match[1].trim() : '';
      },
      action: (transcript, args) => {
        // Map common spoken page names to URLs
        const pageMap: Record<string, string> = {
          'dashboard': '/',
          'home': '/',
          'inventory': '/items',
          'items': '/items',
          'products': '/items',
          'bulk breakdown': '/bulk-breakdown',
          'breakdown': '/bulk-breakdown',
          'employees': '/employees',
          'staff': '/employees',
          'sales': '/sales',
          'reports': '/shopify-reports',
          'shopify reports': '/shopify-reports',
          'analytics': '/analytics',
          'forecast': '/forecast',
          'forecasting': '/forecast',
          'predictions': '/forecast',
          'media': '/media',
          'photos': '/media',
          'images': '/media'
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
        
        if (args) {
          // Execute the command after a short delay to allow the UI to update
          setTimeout(() => {
            setLastExecutedCommand(transcript);
            setActiveTrigger(matchedKeyword);
            resetTranscript();
            command.action(transcript, args);
            setProcessing(false);
            setIsListening(false);
            SpeechRecognition.stopListening();
          }, 500);
          return;
        }
      }
    }
    
    setProcessing(false);
  }, [transcript, processing, commands, resetTranscript]);

  // Process transcript when stopped listening
  useEffect(() => {
    if (!listening && transcript && !processing) {
      processTranscript();
    }
  }, [listening, transcript, processing, processTranscript]);

  // Start/stop listening
  const toggleListening = () => {
    if (listening) {
      SpeechRecognition.stopListening();
      setIsListening(false);
    } else {
      resetTranscript();
      SpeechRecognition.startListening({ continuous: true });
      setIsListening(true);
      setLastExecutedCommand(null);
      setActiveTrigger(null);
    }
  };

  return (
    <Card className="w-full max-w-md shadow-lg border border-gold-500/20 bg-gradient-to-br from-background to-muted/30">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Mic className="h-5 w-5 text-gold-500" />
              Voice Commands
            </CardTitle>
            <CardDescription>
              Use voice to control the app
            </CardDescription>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant={listening ? "destructive" : "outline"} 
                  size="sm"
                  onClick={toggleListening}
                  className={listening ? "animate-pulse" : ""}
                >
                  {listening ? (
                    <><MicOff className="h-4 w-4 mr-2" /> Stop</>
                  ) : (
                    <><Mic className="h-4 w-4 mr-2" /> Start</>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {listening ? "Stop listening" : "Start listening for commands"}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>
      
      <CardContent className="pb-3">
        {listening && (
          <div className="relative mb-3 border rounded-md p-3 bg-card/50">
            <div className="absolute right-2 top-2">
              {processing ? (
                <Loader className="h-4 w-4 animate-spin text-gold-500" />
              ) : listening ? (
                <div className="flex items-center space-x-1">
                  <div className="w-1 h-3 bg-red-500 rounded-full animate-pulse"></div>
                  <div className="w-1 h-4 bg-red-500 rounded-full animate-pulse delay-75"></div>
                  <div className="w-1 h-2 bg-red-500 rounded-full animate-pulse delay-150"></div>
                </div>
              ) : null}
            </div>
            <p className="text-sm font-mono min-h-[2.5rem]">
              {transcript || "Listening..."}
            </p>
          </div>
        )}
        
        {!listening && lastExecutedCommand && (
          <div className="mb-3">
            <Badge variant="outline" className="mb-1 bg-gold-500/10">Last command</Badge>
            <div className="border rounded-md p-3 bg-card/50">
              <p className="text-sm font-mono">{lastExecutedCommand}</p>
              {activeTrigger && (
                <Badge className="mt-2 bg-gold-500 text-background">{activeTrigger}</Badge>
              )}
            </div>
          </div>
        )}
        
        <div className="space-y-3">
          <div>
            <h4 className="text-sm font-medium mb-2">Available commands:</h4>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center gap-2 p-2 rounded-md border bg-card/50">
                <Package className="h-4 w-4 text-gold-500" />
                <span className="text-xs">Add item</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-md border bg-card/50">
                <Printer className="h-4 w-4 text-gold-500" />
                <span className="text-xs">Print label</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-md border bg-card/50">
                <ArrowRightLeft className="h-4 w-4 text-gold-500" />
                <span className="text-xs">Transfer</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-md border bg-card/50">
                <Play className="h-4 w-4 text-gold-500" />
                <span className="text-xs">Navigate</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="text-xs text-muted-foreground">
        {listening ? 
          "Speak a command clearly..." : 
          "Click Start to use voice commands"
        }
      </CardFooter>
    </Card>
  );
}