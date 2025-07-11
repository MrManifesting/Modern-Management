import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Play, Download, Search, Film, Image, FileVideo } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface VideoSource {
  url: string;
  format: string;
  mimeType: string;
  width?: number;
  height?: number;
}

interface VideoFile {
  id: string;
  filename: string;
  duration?: number;
  sources: VideoSource[];
  originalSource: {
    url: string;
    format: string;
    mimeType: string;
  };
}

interface MediaImage {
  id: string;
  alt: string;
  createdAt: string;
  fileStatus: string;
  image: {
    url: string;
    width: number;
    height: number;
  };
}

export function MediaGallery() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVideo, setSelectedVideo] = useState<VideoFile | null>(null);
  const [selectedTab, setSelectedTab] = useState('videos');

  const { data: videosData, isLoading: videosLoading } = useQuery({
    queryKey: ['/api/shopify/media/videos'],
    enabled: selectedTab === 'videos'
  });

  const { data: allMediaData, isLoading: allMediaLoading } = useQuery({
    queryKey: ['/api/shopify/media/all'],
    enabled: selectedTab === 'all'
  });

  const formatDuration = (seconds?: number) => {
    if (!seconds) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'N/A';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  const getHighestQualitySource = (sources: VideoSource[]) => {
    return sources.find(s => s.width === 1080 || s.height === 1080) || 
           sources.find(s => s.format === 'mp4') || 
           sources[0];
  };

  const filteredVideos = videosData?.videos?.filter((video: VideoFile) =>
    video.filename.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const filteredImages = allMediaData?.media?.images?.files?.filter((image: MediaImage) =>
    image.alt?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Shopify Media Gallery</h1>
        <p className="text-muted-foreground">Browse and manage your store's media files</p>
      </div>

      <div className="mb-6 relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder="Search media files..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="mb-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="videos" className="flex items-center gap-2">
            <Film className="h-4 w-4" />
            Videos
          </TabsTrigger>
          <TabsTrigger value="images" className="flex items-center gap-2">
            <Image className="h-4 w-4" />
            Images
          </TabsTrigger>
          <TabsTrigger value="all" className="flex items-center gap-2">
            <FileVideo className="h-4 w-4" />
            All Media
          </TabsTrigger>
        </TabsList>

        <TabsContent value="videos" className="mt-6">
          {videosLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <Card key={i}>
                  <Skeleton className="h-48 w-full" />
                  <CardHeader>
                    <Skeleton className="h-4 w-3/4" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-4 w-1/2" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredVideos.map((video: VideoFile) => (
                <Card key={video.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="relative aspect-video bg-muted">
                    <video
                      src={getHighestQualitySource(video.sources)?.url}
                      className="w-full h-full object-cover"
                      poster=""
                      preload="metadata"
                    />
                    <Button
                      size="icon"
                      variant="secondary"
                      className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
                      onClick={() => setSelectedVideo(video)}
                    >
                      <Play className="h-4 w-4" />
                    </Button>
                  </div>
                  <CardHeader>
                    <CardTitle className="text-base truncate">{video.filename}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between items-center mb-2">
                      <Badge variant="secondary">{formatDuration(video.duration)}</Badge>
                      <Badge variant="outline">{video.sources.length} formats</Badge>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedVideo(video)}
                      >
                        View Details
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        asChild
                      >
                        <a
                          href={video.originalSource.url}
                          download={video.filename}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Download className="h-4 w-4 mr-1" />
                          Download
                        </a>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
          {!videosLoading && filteredVideos.length === 0 && (
            <div className="text-center py-12">
              <Film className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No videos found</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="images" className="mt-6">
          {allMediaLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => (
                <Card key={i}>
                  <Skeleton className="h-48 w-full" />
                  <CardHeader>
                    <Skeleton className="h-4 w-3/4" />
                  </CardHeader>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredImages.map((image: MediaImage) => (
                <Card key={image.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="relative aspect-square bg-muted">
                    <img
                      src={image.image.url}
                      alt={image.alt}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                  <CardHeader>
                    <CardTitle className="text-sm truncate">{image.alt || 'Untitled'}</CardTitle>
                    <p className="text-xs text-muted-foreground">
                      {image.image.width} × {image.image.height}px
                    </p>
                  </CardHeader>
                  <CardContent>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full"
                      asChild
                    >
                      <a
                        href={image.image.url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        View Full Size
                      </a>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
          {!allMediaLoading && filteredImages.length === 0 && (
            <div className="text-center py-12">
              <Image className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No images found</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="all" className="mt-6">
          {allMediaLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-6 w-1/4" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-20 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Media Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <Film className="h-8 w-8 mx-auto mb-2 text-primary" />
                      <p className="text-2xl font-bold">{allMediaData?.media?.videos?.count || 0}</p>
                      <p className="text-sm text-muted-foreground">Videos</p>
                    </div>
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <Image className="h-8 w-8 mx-auto mb-2 text-primary" />
                      <p className="text-2xl font-bold">{allMediaData?.media?.images?.count || 0}</p>
                      <p className="text-sm text-muted-foreground">Images</p>
                    </div>
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <FileVideo className="h-8 w-8 mx-auto mb-2 text-primary" />
                      <p className="text-2xl font-bold">{allMediaData?.totalCount || 0}</p>
                      <p className="text-sm text-muted-foreground">Total Files</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {allMediaData?.media?.videos?.count > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Videos</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {allMediaData.media.videos.files.slice(0, 5).map((video: VideoFile) => (
                        <div key={video.id} className="flex items-center justify-between p-2 hover:bg-muted rounded">
                          <div className="flex items-center gap-2">
                            <Film className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{video.filename}</span>
                          </div>
                          <Badge variant="outline">{formatDuration(video.duration)}</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Video Player Dialog */}
      <Dialog open={!!selectedVideo} onOpenChange={() => setSelectedVideo(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{selectedVideo?.filename}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <video
              src={selectedVideo ? getHighestQualitySource(selectedVideo.sources)?.url : ''}
              controls
              className="w-full rounded-lg"
              autoPlay
            />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium mb-1">Duration</p>
                <p className="text-sm text-muted-foreground">
                  {formatDuration(selectedVideo?.duration)}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium mb-1">Available Formats</p>
                <div className="flex flex-wrap gap-1">
                  {selectedVideo?.sources.map((source, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      {source.width || source.height}p {source.format}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium mb-2">Download Options</p>
              <div className="flex flex-wrap gap-2">
                {selectedVideo?.sources.map((source, i) => (
                  <Button
                    key={i}
                    size="sm"
                    variant="outline"
                    asChild
                  >
                    <a
                      href={source.url}
                      download={selectedVideo.filename}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Download className="h-4 w-4 mr-1" />
                      {source.width || source.height}p {source.format}
                    </a>
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}