import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { queryClient } from '@/lib/queryClient';
import { apiRequest } from '@/lib/queryClient';
import { Loader2, ImageIcon, FileIcon, Film, Trash2, Edit, Link2, RefreshCw } from 'lucide-react';

// Define types for our media files
interface MediaFile {
  name: string;
  url: string;
  type: 'image' | 'video' | 'document';
  size: number;
  createdAt: Date;
  dimensions?: { width: number; height: number };
  thumbnail?: string;
  isOptimized?: boolean;
}

// Define types for Telegram bot status
interface TelegramStatus {
  initialized: boolean;
  username?: string;
  botName?: string;
}

const MediaManager: React.FC = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<string>('all');
  const [telegramToken, setTelegramToken] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<MediaFile | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showDeleteDialog, setShowDeleteDialog] = useState<boolean>(false);
  const [showRenameDialog, setShowRenameDialog] = useState<boolean>(false);
  const [newFileName, setNewFileName] = useState<string>('');
  const [linkToItemId, setLinkToItemId] = useState<string>('');
  const [showLinkDialog, setShowLinkDialog] = useState<boolean>(false);

  // Fetch media files
  const { data: mediaFiles = [], isLoading: isLoadingMedia, refetch: refetchMedia } = useQuery({
    queryKey: ['/api/media/files', activeTab],
    queryFn: async () => {
      const response = await fetch(`/api/media/files?type=${activeTab}`);
      if (!response.ok) throw new Error('Failed to fetch media files');
      return response.json();
    }
  });

  // Fetch Telegram status
  const { data: telegramStatus, isLoading: isLoadingStatus, refetch: refetchStatus } = useQuery({
    queryKey: ['/api/telegram/status'],
    queryFn: async () => {
      const response = await fetch('/api/telegram/status');
      if (!response.ok) throw new Error('Failed to fetch Telegram status');
      return response.json();
    }
  });

  // Initialize Telegram bot
  const initializeTelegramMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('/api/telegram/initialize', {
        method: 'POST',
        body: JSON.stringify({ token: telegramToken }),
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to initialize Telegram bot');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Telegram bot initialized',
        description: 'You can now send media files to the bot',
        variant: 'success'
      });
      refetchStatus();
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to initialize Telegram bot',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  // Delete media file
  const deleteMediaMutation = useMutation({
    mutationFn: async (fileName: string) => {
      const response = await apiRequest('/api/media/delete', {
        method: 'POST',
        body: JSON.stringify({ fileName }),
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete media file');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Media file deleted',
        variant: 'success'
      });
      setShowDeleteDialog(false);
      refetchMedia();
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to delete media file',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  // Rename media file
  const renameMediaMutation = useMutation({
    mutationFn: async ({ oldFileName, newFileName }: { oldFileName: string, newFileName: string }) => {
      const response = await apiRequest('/api/media/rename', {
        method: 'POST',
        body: JSON.stringify({ oldFileName, newFileName }),
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to rename media file');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Media file renamed',
        variant: 'success'
      });
      setShowRenameDialog(false);
      refetchMedia();
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to rename media file',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  // Link media to item
  const linkMediaMutation = useMutation({
    mutationFn: async ({ itemId, fileName }: { itemId: number, fileName: string }) => {
      const response = await apiRequest('/api/media/link-to-item', {
        method: 'POST',
        body: JSON.stringify({ itemId, fileName }),
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to link media to item');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Media linked to item',
        variant: 'success'
      });
      setShowLinkDialog(false);
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to link media to item',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  // Filter media files based on search query
  const filteredMediaFiles = mediaFiles.filter((file: MediaFile) => 
    file.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handle tab change
  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };

  // Format file size for display
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' bytes';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / 1048576).toFixed(1) + ' MB';
  };

  // Handle Telegram bot initialization
  const handleInitializeBot = () => {
    if (!telegramToken.trim()) {
      toast({
        title: 'Token required',
        description: 'Please enter a valid Telegram bot token',
        variant: 'destructive'
      });
      return;
    }
    initializeTelegramMutation.mutate();
  };

  // Handle file selection
  const handleSelectFile = (file: MediaFile) => {
    setSelectedFile(file);
  };

  // Handle file deletion
  const handleDeleteFile = () => {
    if (selectedFile) {
      deleteMediaMutation.mutate(selectedFile.name);
    }
  };

  // Handle file rename
  const handleRenameFile = () => {
    if (selectedFile && newFileName) {
      renameMediaMutation.mutate({
        oldFileName: selectedFile.name,
        newFileName: newFileName
      });
    }
  };

  // Handle link to item
  const handleLinkToItem = () => {
    if (selectedFile && linkToItemId) {
      const itemId = parseInt(linkToItemId);
      if (isNaN(itemId)) {
        toast({
          title: 'Invalid item ID',
          description: 'Please enter a valid numeric item ID',
          variant: 'destructive'
        });
        return;
      }
      linkMediaMutation.mutate({
        itemId,
        fileName: selectedFile.name
      });
    }
  };

  // Render file icon based on type
  const renderFileIcon = (type: string) => {
    switch (type) {
      case 'image':
        return <ImageIcon className="h-5 w-5 text-gold" />;
      case 'video':
        return <Film className="h-5 w-5 text-green-500" />;
      default:
        return <FileIcon className="h-5 w-5 text-blue-500" />;
    }
  };

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold text-gold mb-6">Media Manager</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Telegram Bot Status */}
        <Card className="md:col-span-1 border-gold/30 bg-black/60">
          <CardHeader>
            <CardTitle className="text-gold">Telegram Integration</CardTitle>
            <CardDescription>Connect your Telegram bot to upload media</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingStatus ? (
              <div className="flex items-center justify-center p-4">
                <Loader2 className="h-6 w-6 animate-spin text-gold" />
              </div>
            ) : telegramStatus?.initialized ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-green-950 text-green-400 border-green-500">
                    Connected
                  </Badge>
                </div>
                <p className="text-sm text-gray-300">Bot: {telegramStatus.botName || 'Unknown'}</p>
                <p className="text-sm text-gray-300">Username: {telegramStatus.username || 'Unknown'}</p>
                <div className="mt-4 p-3 bg-black/40 rounded-md border border-gold/20">
                  <p className="text-xs text-gray-300">
                    Send photos, videos, or documents to your Telegram bot to upload them to your media library.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-red-950 text-red-400 border-red-500">
                    Not Connected
                  </Badge>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="token" className="text-gold">Bot Token</Label>
                  <Input
                    id="token"
                    type="password"
                    placeholder="Enter your Telegram bot token"
                    value={telegramToken}
                    onChange={(e) => setTelegramToken(e.target.value)}
                    className="bg-black/40 border-gold/30"
                  />
                  <p className="text-xs text-gray-400">
                    Create a bot with <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer" className="text-gold underline">@BotFather</a> and get a token.
                  </p>
                </div>
                <Button 
                  onClick={handleInitializeBot} 
                  disabled={initializeTelegramMutation.isPending} 
                  className="w-full bg-gold hover:bg-gold/80 text-black"
                >
                  {initializeTelegramMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    'Connect Telegram Bot'
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Media Library */}
        <Card className="md:col-span-2 border-gold/30 bg-black/60">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-gold">Media Library</CardTitle>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => refetchMedia()}
                className="border-gold/50 text-gold hover:bg-gold/20"
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Refresh
              </Button>
            </div>
            <CardDescription>Manage your uploaded media files</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center">
                <Input
                  placeholder="Search files..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-black/40 border-gold/30"
                />
              </div>
              
              <Tabs defaultValue="all" value={activeTab} onValueChange={handleTabChange}>
                <TabsList className="bg-black/60 border border-gold/20">
                  <TabsTrigger value="all" className="data-[state=active]:bg-gold data-[state=active]:text-black">All Files</TabsTrigger>
                  <TabsTrigger value="image" className="data-[state=active]:bg-gold data-[state=active]:text-black">Images</TabsTrigger>
                  <TabsTrigger value="video" className="data-[state=active]:bg-gold data-[state=active]:text-black">Videos</TabsTrigger>
                  <TabsTrigger value="document" className="data-[state=active]:bg-gold data-[state=active]:text-black">Documents</TabsTrigger>
                </TabsList>
                
                <TabsContent value="all" className="mt-4">
                  {renderMediaFiles()}
                </TabsContent>
                <TabsContent value="image" className="mt-4">
                  {renderMediaFiles()}
                </TabsContent>
                <TabsContent value="video" className="mt-4">
                  {renderMediaFiles()}
                </TabsContent>
                <TabsContent value="document" className="mt-4">
                  {renderMediaFiles()}
                </TabsContent>
              </Tabs>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* File Preview */}
      {selectedFile && (
        <Card className="mt-6 border-gold/30 bg-black/60">
          <CardHeader>
            <CardTitle className="text-gold">File Preview</CardTitle>
            <CardDescription>{selectedFile.name}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex flex-col items-center justify-center">
                {selectedFile.type === 'image' ? (
                  <div className="border border-gold/30 rounded-lg overflow-hidden">
                    <img 
                      src={selectedFile.url} 
                      alt={selectedFile.name} 
                      className="max-h-64 object-contain"
                    />
                  </div>
                ) : selectedFile.type === 'video' ? (
                  <div className="border border-gold/30 rounded-lg overflow-hidden">
                    <video 
                      src={selectedFile.url} 
                      controls 
                      className="max-h-64"
                    />
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center p-8 border border-gold/30 rounded-lg">
                    <FileIcon className="h-16 w-16 text-gold mb-2" />
                    <span className="text-sm text-gray-300">Document Preview Not Available</span>
                  </div>
                )}
              </div>
              
              <div>
                <h3 className="text-lg font-medium text-gold mb-4">File Information</h3>
                <dl className="space-y-2">
                  <div className="grid grid-cols-3 gap-2">
                    <dt className="text-gray-400">Name:</dt>
                    <dd className="text-white col-span-2">{selectedFile.name}</dd>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <dt className="text-gray-400">Type:</dt>
                    <dd className="text-white col-span-2 capitalize">{selectedFile.type}</dd>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <dt className="text-gray-400">Size:</dt>
                    <dd className="text-white col-span-2">{formatFileSize(selectedFile.size)}</dd>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <dt className="text-gray-400">Uploaded:</dt>
                    <dd className="text-white col-span-2">
                      {new Date(selectedFile.createdAt).toLocaleString()}
                    </dd>
                  </div>
                  {selectedFile.dimensions && (
                    <div className="grid grid-cols-3 gap-2">
                      <dt className="text-gray-400">Dimensions:</dt>
                      <dd className="text-white col-span-2">
                        {selectedFile.dimensions.width} × {selectedFile.dimensions.height}
                      </dd>
                    </div>
                  )}
                  {selectedFile.isOptimized !== undefined && (
                    <div className="grid grid-cols-3 gap-2">
                      <dt className="text-gray-400">Optimized:</dt>
                      <dd className="text-white col-span-2">
                        {selectedFile.isOptimized ? 'Yes' : 'No'}
                      </dd>
                    </div>
                  )}
                </dl>
                
                <Separator className="my-4 bg-gold/30" />
                
                <div className="flex flex-wrap gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setNewFileName(selectedFile.name);
                      setShowRenameDialog(true);
                    }}
                    className="border-gold/50 text-gold hover:bg-gold/20"
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Rename
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowLinkDialog(true)}
                    className="border-gold/50 text-gold hover:bg-gold/20"
                  >
                    <Link2 className="h-4 w-4 mr-1" />
                    Link to Item
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowDeleteDialog(true)}
                    className="border-red-500/50 text-red-500 hover:bg-red-950/20"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Delete Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="bg-black border-gold/30">
          <DialogHeader>
            <DialogTitle className="text-gold">Confirm Deletion</DialogTitle>
          </DialogHeader>
          <p className="text-white">
            Are you sure you want to delete <span className="font-semibold text-gold">{selectedFile?.name}</span>?
            This action cannot be undone.
          </p>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowDeleteDialog(false)}
              className="border-gold/50 text-white"
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteFile}
              disabled={deleteMediaMutation.isPending}
            >
              {deleteMediaMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Rename Dialog */}
      <Dialog open={showRenameDialog} onOpenChange={setShowRenameDialog}>
        <DialogContent className="bg-black border-gold/30">
          <DialogHeader>
            <DialogTitle className="text-gold">Rename File</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newFileName" className="text-white">New File Name</Label>
              <Input
                id="newFileName"
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                className="bg-black/60 border-gold/30"
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowRenameDialog(false)}
              className="border-gold/50 text-white"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleRenameFile}
              disabled={renameMediaMutation.isPending || !newFileName}
              className="bg-gold hover:bg-gold/80 text-black"
            >
              {renameMediaMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Renaming...
                </>
              ) : (
                'Rename'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Link to Item Dialog */}
      <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
        <DialogContent className="bg-black border-gold/30">
          <DialogHeader>
            <DialogTitle className="text-gold">Link to Inventory Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="itemId" className="text-white">Item ID</Label>
              <Input
                id="itemId"
                type="number"
                value={linkToItemId}
                onChange={(e) => setLinkToItemId(e.target.value)}
                className="bg-black/60 border-gold/30"
                placeholder="Enter item ID number"
              />
              <p className="text-xs text-gray-400">
                Enter the numeric ID of the inventory item you want to link this media to.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowLinkDialog(false)}
              className="border-gold/50 text-white"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleLinkToItem}
              disabled={linkMediaMutation.isPending || !linkToItemId}
              className="bg-gold hover:bg-gold/80 text-black"
            >
              {linkMediaMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Linking...
                </>
              ) : (
                'Link Media'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );

  // Helper function to render media files
  function renderMediaFiles() {
    if (isLoadingMedia) {
      return (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-gold" />
        </div>
      );
    }

    if (filteredMediaFiles.length === 0) {
      return (
        <div className="text-center p-8 border border-dashed border-gold/30 rounded-lg">
          <p className="text-gray-400">
            {searchQuery ? 'No files match your search' : 'No files found'}
          </p>
          {activeTab !== 'all' && (
            <p className="text-sm text-gray-500 mt-1">
              Try switching to "All Files" or uploading new content via Telegram
            </p>
          )}
        </div>
      );
    }

    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredMediaFiles.map((file: MediaFile) => (
          <div
            key={file.name}
            className={`
              border rounded-lg overflow-hidden bg-black/40 cursor-pointer transition-all
              ${selectedFile?.name === file.name 
                ? 'border-gold shadow-[0_0_10px_rgba(218,165,32,0.3)]' 
                : 'border-gray-700 hover:border-gold/50'}
            `}
            onClick={() => handleSelectFile(file)}
          >
            <div className="aspect-square relative">
              {file.type === 'image' ? (
                <img 
                  src={file.url} 
                  alt={file.name} 
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    // Fallback if image fails to load
                    e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMjEgMTlWNUMyMSAzLjg5NTQzIDIwLjEwNDYgMyAxOSAzSDVDMy44OTU0MyAzIDMgMy44OTU0MyAzIDVWMTlDMyAyMC4xMDQ2IDMuODk1NDMgMjEgNSAyMUgxOUMyMC4xMDQ2IDIxIDIxIDIwLjEwNDYgMjEgMTlaIiBzdHJva2U9IiM4ODgiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+PHBhdGggZD0iTTMgMTYuNTg1OUw4LjI4OTMyIDEyLjA0MzFDOC42NzY1MiAxMS43MTE2IDkuMjQ2ODggMTEuNzM0NyA5LjYwNjQ1IDEyLjA5NDNMMTMgMTUuNVYxNS41QzEzLjM3NDkgMTUuODc0OSAxMy45ODUyIDE1Ljg3OTYgMTQuMzY1MiAxNS41MTA3TDE1LjIyMjMgMTQuNjc5N0MxNS42MTU2IDE0LjMwMiAxNi4yNDc2IDE0LjMxNjIgMTYuNjI0IDE0LjcxM0wyMSAxOS41IiBzdHJva2U9IiM4ODgiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+PHBhdGggZD0iTTguNSA5QzkuMzI4NDMgOSAxMCA4LjMyODQzIDEwIDcuNUMxMCA2LjY3MTU3IDkuMzI4NDMgNiA4LjUgNkM3LjY3MTU3IDYgNyA2LjY3MTU3IDcgNy41QzcgOC4zMjg0MyA3LjY3MTU3IDkgOC41IDlaIiBmaWxsPSIjODg4Ii8+PC9zdmc+'
                  }}
                />
              ) : file.type === 'video' ? (
                <div className="w-full h-full flex items-center justify-center bg-black">
                  <Film className="h-12 w-12 text-green-500 opacity-70" />
                </div>
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-black">
                  <FileIcon className="h-12 w-12 text-blue-500 opacity-70" />
                </div>
              )}
              
              {file.isOptimized && (
                <Badge 
                  className="absolute top-2 right-2 bg-green-950 text-green-400 border-green-500"
                  variant="outline"
                >
                  Optimized
                </Badge>
              )}
            </div>
            
            <div className="p-2">
              <div className="flex items-center gap-1">
                {renderFileIcon(file.type)}
                <span className="text-xs text-gray-300 truncate">
                  {file.name.length > 18 ? `${file.name.substring(0, 15)}...` : file.name}
                </span>
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {formatFileSize(file.size)}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }
};

export default MediaManager;