import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { 
  Form, 
  FormControl, 
  FormDescription, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Loader2, RefreshCw, AlertCircle, CheckCircle2, Copy, ExternalLink } from 'lucide-react';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';
import { 
  Badge 
} from '@/components/ui/badge';
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

// Define schema for Telegram token
const telegramTokenSchema = z.object({
  token: z.string().min(20, "Bot token is too short").refine(
    (val) => val.includes(':'), 
    "Bot token should be in the format 'BOT_ID:BOT_TOKEN'"
  )
});

// Media file type
interface MediaFile {
  name: string;
  url: string;
  type: 'image' | 'video' | 'document' | 'unknown';
}

const MediaManagerPage: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('connect');
  
  // Form for Telegram bot connection
  const form = useForm<z.infer<typeof telegramTokenSchema>>({
    resolver: zodResolver(telegramTokenSchema),
    defaultValues: {
      token: '',
    },
  });
  
  // Query to check Telegram bot status
  const botStatusQuery = useQuery({
    queryKey: ['/api/telegram/status'],
    refetchInterval: 60000, // Refetch every minute
  });
  
  // Query to get media files
  const mediaFilesQuery = useQuery({
    queryKey: ['/api/media/files'],
    enabled: botStatusQuery.data?.initialized === true,
  });
  
  // Mutation to initialize Telegram bot
  const initBotMutation = useMutation({
    mutationFn: (data: z.infer<typeof telegramTokenSchema>) => {
      return apiRequest('/api/telegram/initialize', {
        method: 'POST',
        body: JSON.stringify(data),
        headers: {
          'Content-Type': 'application/json',
        },
      });
    },
    onSuccess: () => {
      toast({
        title: "Bot Connected Successfully",
        description: "Your Telegram bot is now ready to receive media",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/telegram/status'] });
      setActiveTab('media');
    },
    onError: (error) => {
      toast({
        title: "Connection Failed",
        description: `Failed to connect Telegram bot: ${error}`,
        variant: "destructive",
      });
    },
  });
  
  // Handle form submission
  const onSubmit = (data: z.infer<typeof telegramTokenSchema>) => {
    initBotMutation.mutate(data);
  };
  
  // Copy file URL to clipboard
  const copyToClipboard = (url: string) => {
    navigator.clipboard.writeText(window.location.origin + url)
      .then(() => {
        toast({
          title: "URL Copied",
          description: "Media URL copied to clipboard",
        });
      })
      .catch((err) => {
        toast({
          title: "Copy Failed",
          description: `Failed to copy URL: ${err}`,
          variant: "destructive",
        });
      });
  };
  
  // Render media gallery
  const renderMediaGallery = () => {
    if (mediaFilesQuery.isLoading) {
      return (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      );
    }
    
    if (mediaFilesQuery.isError) {
      return (
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <AlertCircle className="h-10 w-10 text-destructive mb-4" />
          <h3 className="text-lg font-semibold">Failed to load media files</h3>
          <p className="text-muted-foreground mt-2">
            There was a problem retrieving your media. Please try again.
          </p>
          <Button 
            variant="outline" 
            onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/media/files'] })}
            className="mt-4"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
      );
    }
    
    const files = mediaFilesQuery.data?.files || [];
    
    if (files.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <div className="rounded-full bg-muted p-3 mb-4">
            <AlertCircle className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold">No media files yet</h3>
          <p className="text-muted-foreground mt-2 max-w-md">
            Send photos, videos, or documents to your Telegram bot to see them here.
            They'll automatically appear in this gallery.
          </p>
        </div>
      );
    }
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {files.map((file: MediaFile) => (
          <Card key={file.name} className="overflow-hidden">
            <div className="relative">
              {file.type === 'image' && (
                <img 
                  src={file.url} 
                  alt={file.name} 
                  className="aspect-video w-full object-cover" 
                />
              )}
              {file.type === 'video' && (
                <video 
                  src={file.url} 
                  controls 
                  className="aspect-video w-full" 
                />
              )}
              {(file.type === 'document' || file.type === 'unknown') && (
                <div className="aspect-video w-full bg-muted flex items-center justify-center">
                  <div className="text-center">
                    <div className="rounded-full bg-background/90 p-2 inline-block">
                      <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        className="h-8 w-8 text-muted-foreground" 
                        fill="none" 
                        viewBox="0 0 24 24" 
                        stroke="currentColor"
                      >
                        <path 
                          strokeLinecap="round" 
                          strokeLinejoin="round" 
                          strokeWidth={1.5} 
                          d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" 
                        />
                      </svg>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {file.name}
                    </p>
                  </div>
                </div>
              )}
              <Badge 
                className={cn(
                  "absolute top-2 right-2", 
                  file.type === 'image' ? "bg-green-500" : 
                  file.type === 'video' ? "bg-blue-500" : 
                  "bg-yellow-500"
                )}
              >
                {file.type.toUpperCase()}
              </Badge>
            </div>
            <CardContent className="p-3">
              <div className="flex justify-between items-center">
                <p className="text-sm font-medium truncate" title={file.name}>
                  {file.name}
                </p>
                <div className="flex space-x-1">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          onClick={() => copyToClipboard(file.url)}
                        >
                          <Copy className="h-4 w-4" />
                          <span className="sr-only">Copy URL</span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Copy URL</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          size="icon" 
                          variant="ghost"
                          onClick={() => window.open(file.url, '_blank')}
                        >
                          <ExternalLink className="h-4 w-4" />
                          <span className="sr-only">Open file</span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Open in new tab</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };
  
  // Render bot status section
  const renderBotStatus = () => {
    if (botStatusQuery.isLoading) {
      return (
        <div className="flex items-center space-x-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Checking bot status...</span>
        </div>
      );
    }
    
    const isInitialized = botStatusQuery.data?.initialized === true;
    
    return (
      <div className="flex items-center space-x-2">
        {isInitialized ? (
          <>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <span className="font-medium">
              Bot Connected: @{botStatusQuery.data?.botInfo?.username}
            </span>
          </>
        ) : (
          <>
            <AlertCircle className="h-4 w-4 text-amber-500" />
            <span className="text-muted-foreground">
              No Telegram bot connected
            </span>
          </>
        )}
      </div>
    );
  };
  
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight gold-gradient-text">Media Manager</h1>
        <p className="text-muted-foreground">
          Connect a Telegram bot to easily upload and manage media for your products
        </p>
      </div>
      
      <Card>
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <CardTitle>Telegram Media Integration</CardTitle>
            {renderBotStatus()}
          </div>
          <CardDescription>
            Upload product photos and videos through Telegram for easy media management
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="connect">Connect Bot</TabsTrigger>
              <TabsTrigger 
                value="media" 
                disabled={botStatusQuery.data?.initialized !== true}
              >
                Media Gallery
              </TabsTrigger>
              <TabsTrigger value="help">Usage Guide</TabsTrigger>
            </TabsList>
            
            <TabsContent value="connect">
              <div className="space-y-4">
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <FormField
                      control={form.control}
                      name="token"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Telegram Bot Token</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="123456789:ABCDefGhIJKlmNoPQRsTUVwxyZ" 
                              {...field} 
                              type="password"
                            />
                          </FormControl>
                          <FormDescription>
                            Get this token from BotFather on Telegram
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <Button 
                      type="submit" 
                      className="w-full sm:w-auto"
                      disabled={initBotMutation.isPending}
                    >
                      {initBotMutation.isPending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Connect Telegram Bot
                    </Button>
                  </form>
                </Form>
                
                <div className="rounded-md bg-muted p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <AlertCircle className="h-5 w-5 text-amber-400" aria-hidden="true" />
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium">Instructions</h3>
                      <div className="mt-2 text-sm text-muted-foreground">
                        <ol className="list-decimal pl-5 space-y-1">
                          <li>Visit <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">@BotFather</a> on Telegram</li>
                          <li>Create a new bot with the command /newbot</li>
                          <li>Follow the instructions to get your bot token</li>
                          <li>Copy and paste the token above to connect your bot</li>
                        </ol>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="media" className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Media Files</h3>
                <Button 
                  variant="outline" 
                  onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/media/files'] })}
                  disabled={mediaFilesQuery.isLoading}
                >
                  {mediaFilesQuery.isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Refresh
                </Button>
              </div>
              
              {renderMediaGallery()}
            </TabsContent>
            
            <TabsContent value="help">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-2">How to Use Your Media Bot</h3>
                  <p className="text-muted-foreground mb-4">
                    Once your bot is connected, you can easily upload product images and videos directly from Telegram.
                  </p>
                  
                  <div className="bg-muted rounded-lg p-4 space-y-4">
                    <div className="space-y-2">
                      <h4 className="font-medium">Step 1: Open your bot</h4>
                      <p className="text-sm text-muted-foreground">
                        Find your bot on Telegram using the username @your_bot_name
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <h4 className="font-medium">Step 2: Send media files</h4>
                      <p className="text-sm text-muted-foreground">
                        Send photos, videos, or documents to your bot. They will be automatically saved.
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <h4 className="font-medium">Step 3: Use in your products</h4>
                      <p className="text-sm text-muted-foreground">
                        All media files will appear in the Media Gallery tab. You can copy the URL to use in product listings.
                      </p>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium mb-2">Supported File Types</h3>
                  <ul className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <li className="bg-muted rounded-lg p-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <Badge className="bg-green-500">Images</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        JPEG, PNG images for product photos
                      </p>
                    </li>
                    <li className="bg-muted rounded-lg p-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <Badge className="bg-blue-500">Videos</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        MP4 videos for product demonstrations
                      </p>
                    </li>
                    <li className="bg-muted rounded-lg p-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <Badge className="bg-yellow-500">Documents</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        PDF files for certificates of analysis (COAs)
                      </p>
                    </li>
                  </ul>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default MediaManagerPage;