import { useState, useEffect, useCallback } from 'react';

export interface VoiceAccessibilitySettings {
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

export function useVoiceAccessibility() {
  const [settings, setSettings] = useState<VoiceAccessibilitySettings>(defaultSettings);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load settings from localStorage
  useEffect(() => {
    const savedSettings = localStorage.getItem('voiceAccessibilitySettings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings({ ...defaultSettings, ...parsed });
      } catch (error) {
        console.error('Failed to parse voice accessibility settings:', error);
      }
    }
    setIsLoaded(true);
  }, []);

  // Save settings to localStorage
  const updateSettings = useCallback((newSettings: Partial<VoiceAccessibilitySettings>) => {
    setSettings(prev => {
      const updated = { ...prev, ...newSettings };
      localStorage.setItem('voiceAccessibilitySettings', JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Speech synthesis with accessibility settings
  const speak = useCallback((text: string, priority: 'low' | 'medium' | 'high' = 'medium') => {
    if (!settings.voiceFeedbackEnabled || !('speechSynthesis' in window)) {
      return;
    }

    // Cancel existing speech if high priority
    if (priority === 'high') {
      speechSynthesis.cancel();
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = settings.speechRate / 100;
    utterance.pitch = settings.speechPitch / 100;
    utterance.volume = settings.speechVolume / 100;
    utterance.lang = settings.language;

    speechSynthesis.speak(utterance);
  }, [settings]);

  // Play confirmation sound
  const playConfirmationSound = useCallback(() => {
    if (!settings.confirmationSounds) return;

    // Create a simple confirmation beep
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.1);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
  }, [settings.confirmationSounds]);

  // Get speech recognition configuration
  const getSpeechRecognitionConfig = useCallback(() => {
    return {
      lang: settings.language,
      continuous: settings.continuousListening,
      interimResults: true,
      maxAlternatives: 1
    };
  }, [settings.language, settings.continuousListening]);

  // Error feedback based on level setting
  const provideErrorFeedback = useCallback((error: string, context?: string) => {
    let message = '';
    
    switch (settings.errorFeedbackLevel) {
      case 'minimal':
        message = 'Command not recognized';
        break;
      case 'standard':
        message = `${error}. Please try again.`;
        break;
      case 'detailed':
        message = `${error}${context ? ` Context: ${context}` : ''}. You can say commands like "add new item" or "count inventory".`;
        break;
    }

    speak(message, 'medium');
  }, [settings.errorFeedbackLevel, speak]);

  // Apply accessibility styling
  const getAccessibilityClasses = useCallback(() => {
    const classes: string[] = [];
    
    if (settings.highContrastMode) {
      classes.push('voice-high-contrast');
    }
    
    if (settings.largeText) {
      classes.push('voice-large-text');
    }
    
    if (settings.visualFeedback) {
      classes.push('voice-visual-feedback');
    }
    
    return classes.join(' ');
  }, [settings.highContrastMode, settings.largeText, settings.visualFeedback]);

  // Keyboard shortcuts handler
  const handleKeyboardShortcut = useCallback((event: KeyboardEvent) => {
    if (!settings.keyboardShortcuts) return;

    // Voice activation shortcuts
    if (event.ctrlKey && event.shiftKey) {
      switch (event.key) {
        case 'V':
          event.preventDefault();
          // Trigger voice command activation
          window.dispatchEvent(new CustomEvent('activateVoiceCommand'));
          break;
        case 'S':
          event.preventDefault();
          // Stop voice recognition
          window.dispatchEvent(new CustomEvent('stopVoiceCommand'));
          break;
        case 'H':
          event.preventDefault();
          // Show voice help
          window.dispatchEvent(new CustomEvent('showVoiceHelp'));
          break;
      }
    }
  }, [settings.keyboardShortcuts]);

  // Setup keyboard event listeners
  useEffect(() => {
    if (settings.keyboardShortcuts) {
      document.addEventListener('keydown', handleKeyboardShortcut);
      return () => document.removeEventListener('keydown', handleKeyboardShortcut);
    }
  }, [settings.keyboardShortcuts, handleKeyboardShortcut]);

  // Apply accessibility CSS
  useEffect(() => {
    const body = document.body;
    const classes = getAccessibilityClasses().split(' ').filter(Boolean);
    
    // Remove existing voice accessibility classes
    body.classList.remove('voice-high-contrast', 'voice-large-text', 'voice-visual-feedback');
    
    // Add current classes
    if (classes.length > 0) {
      body.classList.add(...classes);
    }
  }, [getAccessibilityClasses]);

  return {
    settings: { ...settings, updateSettings },
    updateSettings,
    isLoaded,
    speak,
    playConfirmationSound,
    getSpeechRecognitionConfig,
    provideErrorFeedback,
    getAccessibilityClasses
  };
}