import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, Send, Trash2 } from "lucide-react";

// Type for Telegram photos
type TelegramPhoto = {
  id: number;
  fileId: string;
  filePath: string;
  caption?: string;
  associatedItemId?: number;
  timestamp: string;
  createdAt: string;
};

// Props for the TelegramPhotos component
interface TelegramPhotosProps {
  itemId?: number;
  onSelectPhoto?: (photoUrl: string) => void;
}

export default function TelegramPhotos({ itemId, onSelectPhoto }: TelegramPhotosProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Check if Telegram integration is available
  const { data: telegramStatus, isLoading: isStatusLoading } = useQuery({
    queryKey: ['/api/telegram/status'],
    retry: false,
  });

  // Fetch unassigned Telegram photos
  const { 
    data: photos = [], 
    isLoading: isPhotosLoading,
    refetch: refetchPhotos
  } = useQuery<TelegramPhoto[]>({
    queryKey: ['/api/telegram/photos'],
    enabled: !!telegramStatus?.configured,
  });
  
  // Filter photos that are not yet assigned to any item
  const unassignedPhotos = photos.filter(photo => !photo.associatedItemId);

  // Assign photo to the current item
  const assignPhotoMutation = useMutation({
    mutationFn: async ({ photoId, itemId }: { photoId: number, itemId: number }) => {
      await apiRequest("POST", "/api/telegram/photos/assign", { photoId, itemId });
      return { photoId, itemId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/telegram/photos'] });
      queryClient.invalidateQueries({ queryKey: ['/api/items', itemId] });
      toast({
        title: "Success",
        description: "Photo successfully assigned to the item.",
      });
      setIsDialogOpen(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to assign photo. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Delete a Telegram photo
  const deletePhotoMutation = useMutation({
    mutationFn: async (photoId: number) => {
      await apiRequest("DELETE", `/api/telegram/photos/${photoId}`);
      return photoId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/telegram/photos'] });
      toast({
        title: "Success",
        description: "Photo successfully deleted.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete photo. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Handle photo assignment
  const handleAssignPhoto = (photo: TelegramPhoto) => {
    if (itemId) {
      assignPhotoMutation.mutate({ photoId: photo.id, itemId });
    } else if (onSelectPhoto) {
      onSelectPhoto(photo.filePath);
      setIsDialogOpen(false);
    }
  };

  // Handle photo deletion
  const handleDeletePhoto = (photoId: number) => {
    deletePhotoMutation.mutate(photoId);
  };

  // Content showing inside the dialog
  const dialogContent = (
    <>
      {isStatusLoading || isPhotosLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : !telegramStatus?.configured ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground mb-4">
            Telegram integration is not configured. Ask your administrator to set up the Telegram bot.
          </p>
        </div>
      ) : unassignedPhotos.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground mb-4">
            No photos available from Telegram. Send photos to your Telegram bot to see them here.
          </p>
          <Button 
            variant="outline" 
            onClick={() => {
              window.open('https://t.me/share/url?url=' + encodeURIComponent(window.location.href), '_blank');
            }}
          >
            <Send className="h-4 w-4 mr-2" />
            Open Telegram
          </Button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-4 max-h-[400px] overflow-y-auto p-2">
            {unassignedPhotos.map((photo) => (
              <Card key={photo.id} className="overflow-hidden">
                <div className="relative h-32 bg-muted">
                  <img
                    src={photo.filePath}
                    alt={photo.caption || 'Telegram photo'}
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute top-2 right-2 flex space-x-1">
                    <Button
                      variant="destructive"
                      size="icon"
                      className="h-7 w-7 rounded-full"
                      onClick={() => handleDeletePhoto(photo.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <CardContent className="p-3">
                  {photo.caption && (
                    <p className="text-xs text-muted-foreground truncate mb-2">
                      {photo.caption}
                    </p>
                  )}
                  <Button 
                    variant="default" 
                    size="sm"
                    className="w-full"
                    onClick={() => handleAssignPhoto(photo)}
                  >
                    {itemId ? 'Add to Item' : 'Select'}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
          <DialogFooter className="mt-4">
            <Button 
              variant="outline" 
              onClick={() => {
                window.open('https://t.me/share/url?url=' + encodeURIComponent(window.location.href), '_blank');
                toast({
                  title: "Telegram opened",
                  description: "Send photos to your bot and they'll appear here.",
                });
              }}
            >
              <Send className="h-4 w-4 mr-2" />
              Send More Photos
            </Button>
            <Button onClick={() => refetchPhotos()}>
              Refresh Photos
            </Button>
          </DialogFooter>
        </>
      )}
    </>
  );

  // If used as a button with dialog
  if (!itemId || !onSelectPhoto) {
    return (
      <>
        <Button 
          variant="outline" 
          size="sm" 
          className="gap-1.5"
          onClick={() => setIsDialogOpen(true)}
        >
          <svg 
            className="h-4 w-4" 
            viewBox="0 0 24 24" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
          >
            <path 
              d="M12 20.5C16.6944 20.5 20.5 16.6944 20.5 12C20.5 7.30558 16.6944 3.5 12 3.5C7.30558 3.5 3.5 7.30558 3.5 12C3.5 16.6944 7.30558 20.5 12 20.5Z" 
              fill="#039BE5"
            />
            <path 
              d="M8.22501 14.775L8.80001 11.65L13.4 7.65C13.6 7.475 13.825 7.575 13.675 7.8L12.175 11.65H15.775C16.2 11.65 16.25 11.9 15.925 12.2L8.95001 18.125C8.70001 18.35 8.50001 18.2 8.57501 17.875L9.57501 14.775H8.22501Z" 
              fill="white"
            />
          </svg>
          From Telegram
        </Button>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Telegram Photos</DialogTitle>
              <DialogDescription>
                Select photos from your Telegram bot to add to this item.
              </DialogDescription>
            </DialogHeader>
            {dialogContent}
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // If used inline within a form or another component
  return (
    <div className="mt-4">
      <h4 className="text-sm font-medium mb-2">Telegram Photos</h4>
      {dialogContent}
    </div>
  );
}