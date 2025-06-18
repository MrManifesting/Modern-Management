import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, ImageIcon, CheckCircle, XCircle } from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

type TelegramPhoto = {
  id: number;
  fileId: string;
  filePath: string;
  caption?: string;
  associatedItemId?: number;
  timestamp: string;
  createdAt: string;
};

interface TelegramPhotosProps {
  itemId?: number;
  onSelectPhoto?: (photoUrl: string) => void;
}

export default function TelegramPhotos({ itemId, onSelectPhoto }: TelegramPhotosProps) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<TelegramPhoto | null>(null);

  // Check if Telegram bot is configured
  const { data: telegramStatus, isLoading: isStatusLoading } = useQuery({
    queryKey: ['/api/telegram/status'],
    retry: false,
  });

  // Fetch telegram photos
  const {
    data: photos = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['/api/telegram/photos'],
    enabled: isOpen, // Only fetch when dialog is open
    refetchOnWindowFocus: false,
  });

  const handleSelectPhoto = (photo: TelegramPhoto) => {
    setSelectedPhoto(photo);
    
    if (onSelectPhoto) {
      onSelectPhoto(photo.filePath);
    }
    
    // If we have an item ID, assign the photo to this item
    if (itemId) {
      assignPhotoToItem(photo.id, itemId);
    }
    
    setIsOpen(false);
  };

  const assignPhotoToItem = async (photoId: number, itemId: number) => {
    try {
      await fetch('/api/telegram/photos/assign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ photoId, itemId }),
      });
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/telegram/photos'] });
      
      toast({
        title: "Photo assigned",
        description: "The photo has been assigned to this item",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not assign photo to item",
      });
    }
  };

  // If Telegram is not configured, show setup instructions
  if (!isStatusLoading && telegramStatus && !telegramStatus.configured) {
    return (
      <Card className="border-dashed border-2 border-gray-300 bg-gray-50">
        <CardContent className="p-6 text-center">
          <div className="flex flex-col items-center justify-center">
            <ImageIcon className="h-12 w-12 text-gray-400 mb-2" />
            <h3 className="text-lg font-medium">Telegram Integration Not Configured</h3>
            <p className="text-sm text-gray-500 mt-1">
              Ask your administrator to set up the Telegram bot integration to use this feature.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" className="w-full justify-start">
            <ImageIcon className="h-4 w-4 mr-2" />
            Select from Telegram Photos
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[725px]">
          <DialogHeader>
            <DialogTitle>Telegram Photos</DialogTitle>
            <DialogDescription>
              Select a photo from your Telegram messages or send a new photo to your bot.
            </DialogDescription>
          </DialogHeader>
          
          {isLoading ? (
            <div className="flex justify-center items-center h-40">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="text-center text-destructive p-4">
              Error loading photos. Please try again.
            </div>
          ) : photos.length === 0 ? (
            <div className="text-center p-4">
              <p className="mb-2">No photos found</p>
              <p className="text-sm text-gray-500">
                {telegramStatus && telegramStatus.configured ? 
                  "Send some photos to your Telegram bot to see them here." :
                  "Telegram integration not properly configured."}
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[400px] pr-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {photos.map((photo) => (
                  <div 
                    key={photo.id} 
                    className={`relative cursor-pointer rounded-md overflow-hidden border-2 hover:border-primary transition-all ${
                      photo.associatedItemId ? 'border-gray-300' : 'border-transparent'
                    }`}
                    onClick={() => handleSelectPhoto(photo)}
                  >
                    <img 
                      src={photo.filePath} 
                      alt={photo.caption || "Telegram photo"} 
                      className="object-cover w-full h-40"
                    />
                    
                    {photo.associatedItemId && (
                      <div className="absolute top-2 right-2 bg-black bg-opacity-50 rounded-full p-1">
                        {photo.associatedItemId === itemId ? (
                          <CheckCircle className="h-5 w-5 text-green-400" />
                        ) : (
                          <XCircle className="h-5 w-5 text-yellow-400" />
                        )}
                      </div>
                    )}
                    
                    {photo.caption && (
                      <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 p-2">
                        <p className="text-white text-xs truncate">{photo.caption}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
      
      {selectedPhoto && (
        <div className="mt-2 relative h-32 border rounded-md overflow-hidden">
          <img 
            src={selectedPhoto.filePath} 
            alt={selectedPhoto.caption || "Selected photo"} 
            className="object-cover w-full h-full"
          />
        </div>
      )}
    </div>
  );
}