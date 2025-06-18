import React, { useState, useRef } from 'react';
import { Upload, X, Camera, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface ImageUploadProps {
  itemId: number;
  currentImages?: string[];
  onImageUpload?: (newImages: string[]) => void;
  maxImages?: number;
}

export default function ImageUpload({ 
  itemId, 
  currentImages = [], 
  onImageUpload, 
  maxImages = 10 
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [previewImages, setPreviewImages] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    // Check if adding these files would exceed the limit
    const totalImages = currentImages.length + files.length;
    if (totalImages > maxImages) {
      toast({
        title: "Too many images",
        description: `Maximum ${maxImages} images allowed. You currently have ${currentImages.length}.`,
        variant: "destructive"
      });
      return;
    }

    setUploading(true);

    try {
      // Create form data for upload
      const formData = new FormData();
      Array.from(files).forEach(file => {
        formData.append('images', file);
      });

      // Upload images to server
      const response = await fetch(`/api/items/${itemId}/upload-images`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const result = await response.json();
      
      if (result.success) {
        toast({
          title: "Upload successful",
          description: `${result.imageUrls.length} image(s) uploaded successfully`
        });

        // Call callback with new images
        if (onImageUpload) {
          onImageUpload(result.imageUrls);
        }

        // Clear file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } else {
        throw new Error(result.message || 'Upload failed');
      }
    } catch (error) {
      console.error('Image upload error:', error);
      toast({
        title: "Upload failed",
        description: "Failed to upload images. Please try again.",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const openFileDialog = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const removeImage = async (imageUrl: string) => {
    try {
      // Remove image from item
      const updatedImages = currentImages.filter(img => img !== imageUrl);
      
      // Update item via API
      await apiRequest(`/api/items/${itemId}`, {
        method: 'PATCH',
        body: JSON.stringify({ images: updatedImages }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (onImageUpload) {
        onImageUpload(updatedImages);
      }

      toast({
        title: "Image removed",
        description: "Image removed successfully"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to remove image",
        variant: "destructive"
      });
    }
  };

  const canAddMore = currentImages.length < maxImages;

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      {canAddMore && (
        <Card className="border-dashed border-2 border-gray-300 hover:border-gray-400 transition-colors">
          <CardContent className="p-6">
            <div className="text-center">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              
              <div className="mx-auto w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mb-3">
                <ImageIcon className="w-6 h-6 text-gray-400" />
              </div>
              
              <h3 className="text-sm font-medium text-gray-900 mb-1">
                Upload product images
              </h3>
              <p className="text-xs text-gray-500 mb-4">
                PNG, JPG, GIF up to 10MB each
              </p>
              
              <div className="flex gap-2 justify-center">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={openFileDialog}
                  disabled={uploading}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {uploading ? 'Uploading...' : 'Choose Files'}
                </Button>
              </div>
              
              <p className="text-xs text-gray-400 mt-2">
                {currentImages.length}/{maxImages} images
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Image Grid */}
      {currentImages.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {currentImages.map((imageUrl, index) => (
            <div key={index} className="relative group">
              <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                <img
                  src={imageUrl}
                  alt={`Product image ${index + 1}`}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="absolute top-2 right-2 w-6 h-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => removeImage(imageUrl)}
              >
                <X className="w-3 h-3" />
              </Button>
              {index === 0 && (
                <div className="absolute bottom-2 left-2">
                  <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded">
                    Primary
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}