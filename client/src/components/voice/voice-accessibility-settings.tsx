import React, { useState, useEffect } from 'react';
import { 
  Volume2, 
  VolumeX, 
  Mic, 
  Settings, 
  Languages, 
  Zap,
  Timer,
  Headphones,
  Eye,
  Ear
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';

interface VoiceAccessibilitySettings {
  // Voice Recognition Settings
  language: string;
  sensitivity: number;
  noiseReduction: boolean;
  continuousListening: boolean;
  
  // Speech Feedback Settings
  voiceFeedbackEnabled: boolean;
  speechRate: number;
  speechPitch: number;
  speechVolume: number;
  confirmationSounds: boolean;
  
  // Accessibility Features
  visualFeedback: boolean;
  highContrastMode: boolean;
  largeText: boolean;
  keyboardShortcuts: boolean;
  screenReaderSupport: boolean;
  
  // Timeout and Interaction Settings
  commandTimeout: number;
  retryAttempts: number;
  errorFeedbackLevel: 'minimal' | 'standard' | 'detailed';
  
  // Advanced Features
  contextualHelp: boolean;
  adaptiveLearning: boolean;
  customCommands: boolean;
}

const defaultSettings: VoiceAccessibilitySettings = {
  language: 'en-US',
  sensitivity: 75,
  noiseReduction: true,
  continuousListening: false,
  voiceFeedbackEnabled: true,
  speechRate: 90,
  speechPitch: 100,
  speechVolume: 80,
  confirmationSounds: true,
  visualFeedback: true,
  highContrastMode: false,
  largeText: false,
  keyboardShortcuts: true,
  screenReaderSupport: false,
  commandTimeout: 5000,
  retryAttempts: 3,
  errorFeedbackLevel: 'standard',
  contextualHelp: true,
  adaptiveLearning: false,
  customCommands: false
};

export function VoiceAccessibilitySettings() {
  const [settings, setSettings] = useState<VoiceAccessibilitySettings>(defaultSettings);
  const [testingVoice, setTestingVoice] = useState(false);
  const { toast } = useToast();

  // Load settings from localStorage on component mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('voiceAccessibilitySettings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings({ ...defaultSettings, ...parsed });
      } catch (error) {
        console.error('Failed to parse voice settings:', error);
      }
    }
  }, []);

  // Save settings to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('voiceAccessibilitySettings', JSON.stringify(settings));
  }, [settings]);

  const updateSetting = <K extends keyof VoiceAccessibilitySettings>(
    key: K,
    value: VoiceAccessibilitySettings[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const testVoiceFeedback = () => {
    if (!settings.voiceFeedbackEnabled || !('speechSynthesis' in window)) {
      toast({
        title: "Voice feedback unavailable",
        description: "Speech synthesis is not supported or disabled",
        variant: "destructive"
      });
      return;
    }

    setTestingVoice(true);
    
    const utterance = new SpeechSynthesisUtterance(
      "Voice feedback test. This is how system responses will sound with your current settings."
    );
    
    utterance.rate = settings.speechRate / 100;
    utterance.pitch = settings.speechPitch / 100;
    utterance.volume = settings.speechVolume / 100;
    
    utterance.onend = () => setTestingVoice(false);
    utterance.onerror = () => {
      setTestingVoice(false);
      toast({
        title: "Voice test failed",
        description: "Unable to test voice feedback",
        variant: "destructive"
      });
    };
    
    speechSynthesis.speak(utterance);
  };

  const resetToDefaults = () => {
    setSettings(defaultSettings);
    toast({
      title: "Settings reset",
      description: "All voice accessibility settings have been reset to defaults"
    });
  };

  const exportSettings = () => {
    const dataStr = JSON.stringify(settings, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'voice-accessibility-settings.json';
    link.click();
    URL.revokeObjectURL(url);
    
    toast({
      title: "Settings exported",
      description: "Voice accessibility settings have been downloaded"
    });
  };

  const importSettings = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target?.result as string);
        setSettings({ ...defaultSettings, ...imported });
        toast({
          title: "Settings imported",
          description: "Voice accessibility settings have been applied"
        });
      } catch (error) {
        toast({
          title: "Import failed",
          description: "Invalid settings file format",
          variant: "destructive"
        });
      }
    };
    reader.readAsText(file);
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Voice Interaction Accessibility Settings
            </CardTitle>
            <CardDescription>
              Customize voice recognition and feedback for optimal accessibility
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={resetToDefaults}>
              Reset Defaults
            </Button>
            <Button variant="outline" size="sm" onClick={exportSettings}>
              Export
            </Button>
            <Button variant="outline" size="sm" asChild>
              <label>
                Import
                <input
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={importSettings}
                />
              </label>
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <Tabs defaultValue="recognition" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="recognition">Recognition</TabsTrigger>
            <TabsTrigger value="feedback">Feedback</TabsTrigger>
            <TabsTrigger value="accessibility">Accessibility</TabsTrigger>
            <TabsTrigger value="advanced">Advanced</TabsTrigger>
          </TabsList>

          {/* Voice Recognition Settings */}
          <TabsContent value="recognition" className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Mic className="h-4 w-4" />
                <h3 className="text-lg font-semibold">Voice Recognition</h3>
              </div>
              
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="language">Recognition Language</Label>
                  <Select value={settings.language} onValueChange={(value) => updateSetting('language', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en-US">English (US)</SelectItem>
                      <SelectItem value="en-GB">English (UK)</SelectItem>
                      <SelectItem value="es-ES">Spanish (Spain)</SelectItem>
                      <SelectItem value="es-MX">Spanish (Mexico)</SelectItem>
                      <SelectItem value="fr-FR">French</SelectItem>
                      <SelectItem value="de-DE">German</SelectItem>
                      <SelectItem value="it-IT">Italian</SelectItem>
                      <SelectItem value="pt-BR">Portuguese (Brazil)</SelectItem>
                      <SelectItem value="zh-CN">Chinese (Simplified)</SelectItem>
                      <SelectItem value="ja-JP">Japanese</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Microphone Sensitivity: {settings.sensitivity}%</Label>
                  <Slider
                    value={[settings.sensitivity]}
                    onValueChange={([value]) => updateSetting('sensitivity', value)}
                    max={100}
                    min={0}
                    step={5}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Low (background noise resistant)</span>
                    <span>High (more responsive)</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Noise Reduction</Label>
                    <p className="text-sm text-muted-foreground">
                      Filter background noise for clearer recognition
                    </p>
                  </div>
                  <Switch
                    checked={settings.noiseReduction}
                    onCheckedChange={(checked) => updateSetting('noiseReduction', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Continuous Listening</Label>
                    <p className="text-sm text-muted-foreground">
                      Keep listening for commands without manual activation
                    </p>
                  </div>
                  <Switch
                    checked={settings.continuousListening}
                    onCheckedChange={(checked) => updateSetting('continuousListening', checked)}
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Speech Feedback Settings */}
          <TabsContent value="feedback" className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Volume2 className="h-4 w-4" />
                <h3 className="text-lg font-semibold">Speech Feedback</h3>
              </div>

              <div className="grid gap-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Voice Feedback</Label>
                    <p className="text-sm text-muted-foreground">
                      Enable spoken responses and confirmations
                    </p>
                  </div>
                  <Switch
                    checked={settings.voiceFeedbackEnabled}
                    onCheckedChange={(checked) => updateSetting('voiceFeedbackEnabled', checked)}
                  />
                </div>

                {settings.voiceFeedbackEnabled && (
                  <>
                    <div className="space-y-2">
                      <Label>Speech Rate: {settings.speechRate}%</Label>
                      <Slider
                        value={[settings.speechRate]}
                        onValueChange={([value]) => updateSetting('speechRate', value)}
                        max={200}
                        min={50}
                        step={10}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Slow</span>
                        <span>Fast</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Speech Pitch: {settings.speechPitch}%</Label>
                      <Slider
                        value={[settings.speechPitch]}
                        onValueChange={([value]) => updateSetting('speechPitch', value)}
                        max={200}
                        min={50}
                        step={10}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Low</span>
                        <span>High</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Speech Volume: {settings.speechVolume}%</Label>
                      <Slider
                        value={[settings.speechVolume]}
                        onValueChange={([value]) => updateSetting('speechVolume', value)}
                        max={100}
                        min={0}
                        step={5}
                        className="w-full"
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={testVoiceFeedback}
                        disabled={testingVoice}
                        className="flex-1"
                      >
                        {testingVoice ? (
                          <>
                            <Volume2 className="h-4 w-4 mr-2 animate-pulse" />
                            Testing...
                          </>
                        ) : (
                          <>
                            <Volume2 className="h-4 w-4 mr-2" />
                            Test Voice
                          </>
                        )}
                      </Button>
                    </div>
                  </>
                )}

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Confirmation Sounds</Label>
                    <p className="text-sm text-muted-foreground">
                      Play audio cues for successful command recognition
                    </p>
                  </div>
                  <Switch
                    checked={settings.confirmationSounds}
                    onCheckedChange={(checked) => updateSetting('confirmationSounds', checked)}
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Accessibility Features */}
          <TabsContent value="accessibility" className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4" />
                <h3 className="text-lg font-semibold">Accessibility Features</h3>
              </div>

              <div className="grid gap-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Visual Feedback</Label>
                    <p className="text-sm text-muted-foreground">
                      Show visual indicators for voice recognition status
                    </p>
                  </div>
                  <Switch
                    checked={settings.visualFeedback}
                    onCheckedChange={(checked) => updateSetting('visualFeedback', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>High Contrast Mode</Label>
                    <p className="text-sm text-muted-foreground">
                      Enhanced contrast for voice interface elements
                    </p>
                  </div>
                  <Switch
                    checked={settings.highContrastMode}
                    onCheckedChange={(checked) => updateSetting('highContrastMode', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Large Text</Label>
                    <p className="text-sm text-muted-foreground">
                      Increase text size for voice command displays
                    </p>
                  </div>
                  <Switch
                    checked={settings.largeText}
                    onCheckedChange={(checked) => updateSetting('largeText', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Keyboard Shortcuts</Label>
                    <p className="text-sm text-muted-foreground">
                      Enable keyboard alternatives for voice commands
                    </p>
                  </div>
                  <Switch
                    checked={settings.keyboardShortcuts}
                    onCheckedChange={(checked) => updateSetting('keyboardShortcuts', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Screen Reader Support</Label>
                    <p className="text-sm text-muted-foreground">
                      Enhanced compatibility with screen reading software
                    </p>
                  </div>
                  <Switch
                    checked={settings.screenReaderSupport}
                    onCheckedChange={(checked) => updateSetting('screenReaderSupport', checked)}
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Advanced Settings */}
          <TabsContent value="advanced" className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4" />
                <h3 className="text-lg font-semibold">Advanced Settings</h3>
              </div>

              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label>Command Timeout: {settings.commandTimeout / 1000}s</Label>
                  <Slider
                    value={[settings.commandTimeout]}
                    onValueChange={([value]) => updateSetting('commandTimeout', value)}
                    max={10000}
                    min={2000}
                    step={500}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">
                    How long to wait for speech input before timing out
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Retry Attempts: {settings.retryAttempts}</Label>
                  <Slider
                    value={[settings.retryAttempts]}
                    onValueChange={([value]) => updateSetting('retryAttempts', value)}
                    max={5}
                    min={1}
                    step={1}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">
                    Number of times to retry failed voice commands
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="errorLevel">Error Feedback Level</Label>
                  <Select 
                    value={settings.errorFeedbackLevel} 
                    onValueChange={(value: 'minimal' | 'standard' | 'detailed') => 
                      updateSetting('errorFeedbackLevel', value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="minimal">Minimal - Basic error messages</SelectItem>
                      <SelectItem value="standard">Standard - Helpful error context</SelectItem>
                      <SelectItem value="detailed">Detailed - Full diagnostic information</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Contextual Help</Label>
                    <p className="text-sm text-muted-foreground">
                      Provide context-aware command suggestions
                    </p>
                  </div>
                  <Switch
                    checked={settings.contextualHelp}
                    onCheckedChange={(checked) => updateSetting('contextualHelp', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Adaptive Learning</Label>
                    <p className="text-sm text-muted-foreground">
                      Learn from usage patterns to improve recognition
                    </p>
                  </div>
                  <Switch
                    checked={settings.adaptiveLearning}
                    onCheckedChange={(checked) => updateSetting('adaptiveLearning', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Custom Commands</Label>
                    <p className="text-sm text-muted-foreground">
                      Allow creation of personalized voice commands
                    </p>
                  </div>
                  <Switch
                    checked={settings.customCommands}
                    onCheckedChange={(checked) => updateSetting('customCommands', checked)}
                  />
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="mt-6 p-4 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Headphones className="h-4 w-4" />
            <span className="font-medium">Current Configuration</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
            <Badge variant="outline">
              {settings.language}
            </Badge>
            <Badge variant="outline">
              Sensitivity: {settings.sensitivity}%
            </Badge>
            <Badge variant="outline">
              {settings.voiceFeedbackEnabled ? 'Voice On' : 'Voice Off'}
            </Badge>
            <Badge variant="outline">
              {settings.continuousListening ? 'Continuous' : 'Manual'}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}