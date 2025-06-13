import React, { useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Camera, Upload, Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface CameraDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CameraDialog({ open, onOpenChange }: CameraDialogProps) {
  const { toast } = useToast();
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } // Use back camera if available
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCapturing(true);
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      toast({
        title: 'Camera Access Error',
        description: 'Unable to access camera. Please check permissions.',
        variant: 'destructive',
      });
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setIsCapturing(false);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      if (context) {
        context.drawImage(video, 0, 0);
        const imageDataUrl = canvas.toDataURL('image/jpeg', 0.8);
        setCapturedImage(imageDataUrl);
        stopCamera();
      }
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setCapturedImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const sendToTelegram = async () => {
    if (!capturedImage) return;
    
    setIsUploading(true);
    try {
      // Convert data URL to blob
      const response = await fetch(capturedImage);
      const blob = await response.blob();
      
      // Create form data
      const formData = new FormData();
      formData.append('image', blob, 'product-photo.jpg');
      
      // Send to backend which will forward to Telegram
      const result = await apiRequest('/api/telegram/send-photo', {
        method: 'POST',
        body: formData,
      });
      
      if (result.success) {
        toast({
          title: 'Photo Sent',
          description: 'Photo sent to Telegram chat successfully. Image URL will be returned via bot.',
        });
        
        // Reset state
        setCapturedImage(null);
        onOpenChange(false);
      }
    } catch (error) {
      console.error('Error sending photo:', error);
      toast({
        title: 'Upload Failed',
        description: 'Failed to send photo to Telegram. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const resetCapture = () => {
    setCapturedImage(null);
    stopCamera();
  };

  const handleClose = () => {
    stopCamera();
    setCapturedImage(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Product Photo Capture</DialogTitle>
          <DialogDescription>
            Take a photo or upload an image to send to Telegram
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {!capturedImage ? (
            <>
              {isCapturing ? (
                <div className="relative">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full rounded-lg"
                  />
                  <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
                    <Button
                      onClick={capturePhoto}
                      size="lg"
                      className="rounded-full bg-white text-black hover:bg-gray-100"
                    >
                      <Camera className="h-6 w-6" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-4 py-8">
                  <div className="flex gap-3">
                    <Button onClick={startCamera} className="flex items-center gap-2">
                      <Camera className="h-4 w-4" />
                      Take Photo
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-2"
                    >
                      <Upload className="h-4 w-4" />
                      Upload Image
                    </Button>
                  </div>
                  
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>
              )}
            </>
          ) : (
            <div className="space-y-4">
              <img
                src={capturedImage}
                alt="Captured product"
                className="w-full rounded-lg"
              />
              
              <div className="flex gap-2">
                <Button
                  onClick={sendToTelegram}
                  disabled={isUploading}
                  className="flex-1"
                >
                  <Send className="h-4 w-4 mr-2" />
                  {isUploading ? 'Sending...' : 'Send to Telegram'}
                </Button>
                
                <Button
                  variant="outline"
                  onClick={resetCapture}
                  disabled={isUploading}
                >
                  Retake
                </Button>
              </div>
            </div>
          )}
        </div>
        
        <canvas ref={canvasRef} className="hidden" />
        
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}