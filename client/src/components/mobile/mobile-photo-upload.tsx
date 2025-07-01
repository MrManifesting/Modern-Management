import { useState, useRef, useCallback } from "react";
import { Camera, Upload, X, Check, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface MobilePhotoUploadProps {
  onImageUrl: (url: string) => void;
  onMultipleUrls?: (urls: string[]) => void;
  maxPhotos?: number;
  className?: string;
}

export default function MobilePhotoUpload({ 
  onImageUrl, 
  onMultipleUrls, 
  maxPhotos = 5,
  className = "" 
}: MobilePhotoUploadProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [previewImages, setPreviewImages] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileUpload = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const newImageUrls: string[] = [];
    const newPreviews: string[] = [];

    try {
      for (let i = 0; i < Math.min(files.length, maxPhotos); i++) {
        const file = files[i];
        
        // Create preview
        const previewUrl = URL.createObjectURL(file);
        newPreviews.push(previewUrl);

        // Upload to server
        const formData = new FormData();
        formData.append('photo', file);
        formData.append('source', 'mobile_camera');
        formData.append('timestamp', Date.now().toString());

        try {
          const response = await apiRequest('POST', '/api/media/upload-photo', formData, true);
          const result = await response.json();
          
          if (result.success && result.imageUrl) {
            newImageUrls.push(result.imageUrl);
            
            // If Telegram integration is available, also send to media chat
            if (result.telegramSent) {
              toast({
                title: "Photo uploaded",
                description: "Photo uploaded and sent to Telegram media chat"
              });
            }
          } else {
            throw new Error(result.message || 'Upload failed');
          }
        } catch (uploadError) {
          console.error('Photo upload error:', uploadError);
          toast({
            title: "Upload failed", 
            description: `Failed to upload photo ${i + 1}`,
            variant: "destructive"
          });
        }
      }

      if (newImageUrls.length > 0) {
        setUploadedImages(prev => [...prev, ...newImageUrls]);
        setPreviewImages(prev => [...prev, ...newPreviews]);
        
        // Return first URL immediately for single photo mode
        if (newImageUrls.length === 1) {
          onImageUrl(newImageUrls[0]);
        }
        
        // Return all URLs for multiple photo mode
        if (onMultipleUrls && newImageUrls.length > 1) {
          onMultipleUrls(newImageUrls);
        }

        toast({
          title: "Upload successful",
          description: `${newImageUrls.length} photo${newImageUrls.length > 1 ? 's' : ''} uploaded successfully`
        });
      }
    } catch (error) {
      console.error('Upload process error:', error);
      toast({
        title: "Upload error",
        description: "Failed to process photos",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  }, [maxPhotos, onImageUrl, onMultipleUrls, toast]);

  const openCamera = () => {
    if (cameraInputRef.current) {
      cameraInputRef.current.click();
    }
  };

  const openGallery = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const removeImage = (index: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
    setPreviewImages(prev => {
      const newPreviews = prev.filter((_, i) => i !== index);
      // Clean up object URLs
      if (prev[index]) {
        URL.revokeObjectURL(prev[index]);
      }
      return newPreviews;
    });
  };

  const confirmSelection = () => {
    if (uploadedImages.length > 0) {
      if (onMultipleUrls) {
        onMultipleUrls(uploadedImages);
      } else {
        onImageUrl(uploadedImages[0]);
      }
    }
    setIsOpen(false);
  };

  // Check if device supports camera
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => setIsOpen(true)}
        className={`${className} flex items-center gap-2`}
        disabled={isUploading}
      >
        <Camera className="w-4 h-4" />
        {isUploading ? "Uploading..." : "Add Photos"}
      </Button>

      {/* Hidden file inputs */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple={maxPhotos > 1}
        onChange={(e) => handleFileUpload(e.target.files)}
        className="hidden"
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple={maxPhotos > 1}
        onChange={(e) => handleFileUpload(e.target.files)}
        className="hidden"
      />

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md w-[95vw] p-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Camera className="w-5 h-5" />
              Add Photos
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Action buttons */}
            <div className="grid grid-cols-2 gap-3">
              {isMobile && (
                <Button
                  onClick={openCamera}
                  disabled={isUploading || uploadedImages.length >= maxPhotos}
                  className="flex items-center gap-2 h-12"
                >
                  <Camera className="w-5 h-5" />
                  Take Photo
                </Button>
              )}
              <Button
                onClick={openGallery}
                variant="outline"
                disabled={isUploading || uploadedImages.length >= maxPhotos}
                className={`flex items-center gap-2 h-12 ${!isMobile ? 'col-span-2' : ''}`}
              >
                <Upload className="w-5 h-5" />
                Choose from Gallery
              </Button>
            </div>

            {/* Preview grid */}
            {previewImages.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  {uploadedImages.length} of {maxPhotos} photos selected
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {previewImages.map((preview, index) => (
                    <div key={index} className="relative aspect-square">
                      <img
                        src={preview}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-full object-cover rounded-lg border"
                      />
                      <button
                        onClick={() => removeImage(index)}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-sm hover:bg-red-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                      {uploadedImages[index] && (
                        <div className="absolute bottom-1 right-1 w-5 h-5 bg-green-500 text-white rounded-full flex items-center justify-center">
                          <Check className="w-3 h-3" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Upload progress */}
            {isUploading && (
              <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
                <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                <span className="text-sm text-blue-700">Uploading photos...</span>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setIsOpen(false)}
                disabled={isUploading}
              >
                Cancel
              </Button>
              {uploadedImages.length > 0 && (
                <Button
                  onClick={confirmSelection}
                  disabled={isUploading}
                  className="flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  Use {uploadedImages.length} Photo{uploadedImages.length > 1 ? 's' : ''}
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}