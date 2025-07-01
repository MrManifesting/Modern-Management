import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX,
  Settings,
  AlertCircle,
  CheckCircle,
  Loader2
} from 'lucide-react';

interface VoiceSearchProps {
  onSearchResults?: (query: string, results: any[]) => void;
  onError?: (error: string) => void;
  className?: string;
}

export const VoiceSearch: React.FC<VoiceSearchProps> = ({
  onSearchResults,
  onError,
  className = ""
}) => {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [confidence, setConfidence] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isSpeechEnabled, setIsSpeechEnabled] = useState(true);
  const [lastCommand, setLastCommand] = useState("");
  
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);

  useEffect(() => {
    synthRef.current = window.speechSynthesis;
    
    // Check for speech recognition support
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setError('Speech recognition not supported in this browser');
      onError?.('Speech recognition not supported in this browser');
    }
    
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [onError]);

  const speak = (text: string) => {
    if (!isSpeechEnabled || !synthRef.current) return;
    
    // Cancel any ongoing speech
    synthRef.current.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.volume = 0.8;
    
    synthRef.current.speak(utterance);
  };

  const startListening = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setError('Speech recognition not available');
      return;
    }

    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    
    recognitionRef.current.continuous = false;
    recognitionRef.current.interimResults = true;
    recognitionRef.current.lang = 'en-US';
    recognitionRef.current.maxAlternatives = 1;

    recognitionRef.current.onstart = () => {
      setIsListening(true);
      setError(null);
      setTranscript("");
      speak("Listening for your command");
    };

    recognitionRef.current.onresult = (event: any) => {
      let finalTranscript = '';
      let interimTranscript = '';
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript = result[0].transcript;
          setConfidence(result[0].confidence);
        } else {
          interimTranscript = result[0].transcript;
        }
      }
      
      setTranscript(finalTranscript || interimTranscript);
      
      if (finalTranscript) {
        setLastCommand(finalTranscript);
        processVoiceCommand(finalTranscript);
      }
    };

    recognitionRef.current.onerror = (event: any) => {
      let errorMessage = 'Voice recognition error';
      
      switch (event.error) {
        case 'network':
          errorMessage = 'Network error occurred';
          break;
        case 'audio-capture':
          errorMessage = 'No microphone found';
          break;
        case 'not-allowed':
          errorMessage = 'Microphone permission denied';
          break;
        case 'no-speech':
          errorMessage = 'No speech detected';
          break;
        default:
          errorMessage = `Recognition error: ${event.error}`;
      }
      
      setError(errorMessage);
      setIsListening(false);
      onError?.(errorMessage);
      speak("Voice command failed. Please try again.");
    };

    recognitionRef.current.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current.start();
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  };

  const processVoiceCommand = async (command: string) => {
    setIsProcessing(true);
    
    try {
      // Basic command processing for inventory management
      const lowerCommand = command.toLowerCase();
      
      if (lowerCommand.includes('search') || lowerCommand.includes('find')) {
        const searchTerms = extractSearchTerms(lowerCommand);
        speak(`Searching for ${searchTerms}`);
        onSearchResults?.(searchTerms, []);
        
      } else if (lowerCommand.includes('filter')) {
        const filterType = extractFilterType(lowerCommand);
        speak(`Applying ${filterType} filter`);
        
      } else if (lowerCommand.includes('show') || lowerCommand.includes('display')) {
        const category = extractCategory(lowerCommand);
        speak(`Showing ${category} products`);
        
      } else if (lowerCommand.includes('help')) {
        speak("Available commands: search for products, filter by category, show inventory, or say help for assistance");
        
      } else {
        // Treat as general search
        speak(`Searching for ${command}`);
        onSearchResults?.(command, []);
      }
      
    } catch (err) {
      setError('Failed to process voice command');
      speak("Command processing failed");
    } finally {
      setIsProcessing(false);
    }
  };

  const extractSearchTerms = (command: string): string => {
    const keywords = ['search for', 'find', 'look for', 'show me'];
    for (const keyword of keywords) {
      const index = command.indexOf(keyword);
      if (index !== -1) {
        return command.substring(index + keyword.length).trim();
      }
    }
    return command.replace(/search|find|look|show/gi, '').trim();
  };

  const extractFilterType = (command: string): string => {
    if (command.includes('top shelf')) return 'top shelf';
    if (command.includes('bulk')) return 'bulk';
    if (command.includes('indica')) return 'indica';
    if (command.includes('sativa')) return 'sativa';
    if (command.includes('hybrid')) return 'hybrid';
    return 'category';
  };

  const extractCategory = (command: string): string => {
    if (command.includes('inventory')) return 'inventory';
    if (command.includes('products')) return 'products';
    if (command.includes('flowers')) return 'flowers';
    return 'all';
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  return (
    <Card className={`shadow-lg border-gold/20 ${className}`}>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center justify-between">
          <span className="gold-gradient-text">Voice Search</span>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsSpeechEnabled(!isSpeechEnabled)}
              className="touch-manipulation"
            >
              {isSpeechEnabled ? (
                <Volume2 className="h-4 w-4" />
              ) : (
                <VolumeX className="h-4 w-4" />
              )}
            </Button>
            <Badge variant="secondary" className="text-xs">
              Beta
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Voice control button */}
        <div className="flex flex-col items-center space-y-4">
          <Button
            onClick={toggleListening}
            disabled={isProcessing}
            className={`w-20 h-20 rounded-full touch-manipulation transition-all duration-200 ${
              isListening 
                ? 'bg-red-500 hover:bg-red-600 animate-pulse' 
                : 'bg-gold hover:bg-gold/90'
            } text-white`}
          >
            {isProcessing ? (
              <Loader2 className="h-8 w-8 animate-spin" />
            ) : isListening ? (
              <Mic className="h-8 w-8" />
            ) : (
              <MicOff className="h-8 w-8" />
            )}
          </Button>
          
          <div className="text-center">
            <p className="text-sm font-medium">
              {isListening ? "Listening..." : isProcessing ? "Processing..." : "Tap to speak"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Say "search for [product]" or "help" for commands
            </p>
          </div>
        </div>

        {/* Transcript display */}
        {transcript && (
          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-sm font-medium mb-1">You said:</p>
            <p className="text-sm">{transcript}</p>
            {confidence > 0 && (
              <div className="flex items-center gap-2 mt-2">
                <div className="text-xs text-muted-foreground">
                  Confidence: {Math.round(confidence * 100)}%
                </div>
                {confidence > 0.8 ? (
                  <CheckCircle className="h-3 w-3 text-green-500" />
                ) : (
                  <AlertCircle className="h-3 w-3 text-yellow-500" />
                )}
              </div>
            )}
          </div>
        )}

        {/* Error display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* Recent command */}
        {lastCommand && !isListening && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <p className="text-sm font-medium text-green-800 mb-1">Last command:</p>
            <p className="text-sm text-green-700">{lastCommand}</p>
          </div>
        )}

        {/* Command examples */}
        <div className="space-y-2">
          <p className="text-sm font-medium">Example commands:</p>
          <div className="grid grid-cols-1 gap-2 text-xs">
            <div className="bg-muted/30 rounded px-2 py-1">"Search for Blueberry Muffin"</div>
            <div className="bg-muted/30 rounded px-2 py-1">"Filter by top shelf"</div>
            <div className="bg-muted/30 rounded px-2 py-1">"Show indica products"</div>
            <div className="bg-muted/30 rounded px-2 py-1">"Find bulk products"</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default VoiceSearch;