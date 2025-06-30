import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Download, Package, ExternalLink, FileText, Image, Video, Zap } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface MediaPackPreview {
  success: boolean;
  mediaPack: {
    productInfo: {
      name: string;
      strain: string;
      sku: string;
      price: number;
      quantity: number;
      thcaPercentage: number | null;
      category: string;
      weight: string;
      status: string;
    };
    downloadLinks: {
      productImages: Array<{
        url: string;
        filename: string;
        description: string;
      }>;
      coa: string;
      marketingKit: string;
      productMedia: string;
      socialKit: string;
      highResPhotos: string;
      compliance: string;
    };
    shopifyInfo: {
      productUrl: string;
      adminUrl: string | null;
    };
    zipPackage: {
      downloadUrl: string;
      estimatedSize: string;
      contents: string[];
    };
    generated: string;
    validUntil: string;
  };
  quickDownload: string;
}

export default function MediaPackDemo() {
  const [selectedItemId, setSelectedItemId] = useState<string>("1396");
  
  // Fetch available items for demo
  const { data: items } = useQuery({
    queryKey: ['/api/items'],
    select: (data: any[]) => data?.slice(0, 20) || [] // Get first 20 items for demo
  });

  // Fetch media pack preview
  const { data: mediaPackData, isLoading, refetch } = useQuery<MediaPackPreview>({
    queryKey: [`/api/items/${selectedItemId}/download-media-pack`],
    enabled: !!selectedItemId
  });

  const handleDownloadMediaPack = () => {
    if (selectedItemId) {
      window.open(`/api/items/${selectedItemId}/media-pack.zip`, '_blank');
    }
  };

  const handleGenerateNewPack = () => {
    refetch();
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-2">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">
              <span className="bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">
                One-Click Media Pack Download
              </span>
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Download complete media packages for any product instantly
            </p>
          </div>
        </div>
      </div>

      {/* Item Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Select Product
          </CardTitle>
          <CardDescription>
            Choose a product to generate its media pack
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Enter Item ID (e.g., 1396)"
              value={selectedItemId}
              onChange={(e) => setSelectedItemId(e.target.value)}
              className="flex-1"
            />
            <Button onClick={handleGenerateNewPack} disabled={isLoading}>
              {isLoading ? "Loading..." : "Preview"}
            </Button>
          </div>
          
          {/* Quick selection from available items */}
          {items && items.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Quick Select:</p>
              <div className="flex flex-wrap gap-2">
                {items.slice(0, 10).map((item: any) => (
                  <Button
                    key={item.id}
                    variant={selectedItemId === item.id.toString() ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedItemId(item.id.toString())}
                    className="text-xs"
                  >
                    {item.name?.substring(0, 20)}...
                  </Button>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Media Pack Preview */}
      {mediaPackData?.success && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Product Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Product Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div>
                  <h3 className="text-xl font-bold text-green-600">
                    {mediaPackData.mediaPack.productInfo.strain}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {mediaPackData.mediaPack.productInfo.name}
                  </p>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">SKU:</span> {mediaPackData.mediaPack.productInfo.sku || 'N/A'}
                  </div>
                  <div>
                    <span className="font-medium">Price:</span> ${mediaPackData.mediaPack.productInfo.price || 'Contact'}
                  </div>
                  <div>
                    <span className="font-medium">Stock:</span> {mediaPackData.mediaPack.productInfo.quantity} units
                  </div>
                  <div>
                    <span className="font-medium">Weight:</span> {mediaPackData.mediaPack.productInfo.weight}
                  </div>
                  <div>
                    <span className="font-medium">THCa:</span> {mediaPackData.mediaPack.productInfo.thcaPercentage || 'N/A'}%
                  </div>
                  <div>
                    <span className="font-medium">Status:</span> 
                    <Badge variant="outline" className="ml-1">
                      {mediaPackData.mediaPack.productInfo.status}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Download Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5" />
                Media Pack Download
              </CardTitle>
              <CardDescription>
                Size: {mediaPackData.mediaPack.zipPackage.estimatedSize}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                onClick={handleDownloadMediaPack}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                size="lg"
              >
                <Download className="w-5 h-5 mr-2" />
                Download Complete Media Pack
              </Button>
              
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(mediaPackData.mediaPack.downloadLinks.coa, '_blank')}
                >
                  <FileText className="w-4 h-4 mr-1" />
                  COA
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(mediaPackData.mediaPack.shopifyInfo.productUrl, '_blank')}
                >
                  <ExternalLink className="w-4 h-4 mr-1" />
                  Order
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(mediaPackData.mediaPack.downloadLinks.marketingKit, '_blank')}
                >
                  <Image className="w-4 h-4 mr-1" />
                  Marketing
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(mediaPackData.mediaPack.downloadLinks.socialKit, '_blank')}
                >
                  <Video className="w-4 h-4 mr-1" />
                  Social Kit
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Package Contents */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Package Contents
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {mediaPackData.mediaPack.zipPackage.contents.map((content, index) => (
                  <div key={index} className="flex items-center gap-2 p-3 border rounded-lg">
                    <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs">{index + 1}</span>
                    </div>
                    <span className="text-sm">{content}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Product Images Preview */}
          {mediaPackData.mediaPack.downloadLinks.productImages.length > 0 && (
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Image className="h-5 w-5" />
                  Product Images ({mediaPackData.mediaPack.downloadLinks.productImages.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {mediaPackData.mediaPack.downloadLinks.productImages.map((image, index) => (
                    <div key={index} className="space-y-2">
                      <img 
                        src={image.url} 
                        alt={image.description}
                        className="w-full h-24 object-cover rounded-lg border"
                      />
                      <p className="text-xs text-muted-foreground">{image.filename}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Features */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Key Features
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full mx-auto flex items-center justify-center">
                <Download className="w-6 h-6 text-white" />
              </div>
              <h4 className="font-semibold">One-Click Download</h4>
              <p className="text-sm text-muted-foreground">
                Download complete media packages instantly with a single click
              </p>
            </div>
            
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-blue-500 rounded-full mx-auto flex items-center justify-center">
                <Package className="w-6 h-6 text-white" />
              </div>
              <h4 className="font-semibold">Complete Package</h4>
              <p className="text-sm text-muted-foreground">
                Includes photos, COA, marketing materials, and compliance documents
              </p>
            </div>
            
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-red-500 rounded-full mx-auto flex items-center justify-center">
                <ExternalLink className="w-6 h-6 text-white" />
              </div>
              <h4 className="font-semibold">Direct Links</h4>
              <p className="text-sm text-muted-foreground">
                Quick access to COA certificates, ordering, and media libraries
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}