import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Loader2 } from 'lucide-react';

interface QrCodeGeneratorProps {
  affiliateId: number;
  onGenerate?: (qrCode: any) => void;
}

export function QrCodeGenerator({ affiliateId, onGenerate }: QrCodeGeneratorProps) {
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [generating, setGenerating] = useState<boolean>(false);
  const [qrCodeData, setQrCodeData] = useState<any>(null);
  const { toast } = useToast();

  const generateQrCode = async () => {
    if (!title.trim()) {
      toast({
        title: "Title Required",
        description: "Please enter a title for this QR code",
        variant: "destructive"
      });
      return;
    }
    
    try {
      setGenerating(true);
      
      const response = await apiRequest('POST', `/api/affiliates/${affiliateId}/qrcodes`, {
        title,
        description: description || `QR code for affiliate tracking`,
        type: 'affiliate'
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setQrCodeData(data.data);
          
          toast({
            title: "QR Code Generated",
            description: "QR code has been successfully generated!",
          });
          
          if (onGenerate) {
            onGenerate(data.data);
          }
          
          // Reset fields
          setTitle('');
          setDescription('');
        } else {
          throw new Error(data.message || "Failed to generate QR code");
        }
      } else {
        throw new Error(`Error: ${response.status}`);
      }
    } catch (error) {
      toast({
        title: "Generation Failed",
        description: error.message || "An error occurred while generating the QR code",
        variant: "destructive"
      });
    } finally {
      setGenerating(false);
    }
  };

  const downloadQrCode = () => {
    if (!qrCodeData?.imageUrl) return;
    
    // Create a download link for the QR code image
    const link = document.createElement('a');
    link.href = qrCodeData.imageUrl;
    link.download = `qrcode-${qrCodeData.id}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Generate QR Code</CardTitle>
        <CardDescription>
          Create a unique QR code for tracking affiliate referrals
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            placeholder="Summer Promotion 2025"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={generating}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="description">Description (Optional)</Label>
          <Textarea
            id="description"
            placeholder="QR code for business cards and digital marketing"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={generating}
          />
        </div>
        
        {qrCodeData && (
          <div className="mt-4 flex flex-col items-center space-y-3">
            <h3 className="text-sm font-medium">Your QR Code</h3>
            <div className="border-2 border-gray-200 rounded-lg p-2 bg-white">
              <img 
                src={qrCodeData.imageUrl} 
                alt="QR Code" 
                className="w-48 h-48"
              />
            </div>
            <div className="text-xs text-center text-gray-500">
              Code: {qrCodeData.code}
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={downloadQrCode} 
              className="mt-2"
            >
              Download
            </Button>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-end">
        <Button 
          onClick={generateQrCode} 
          disabled={generating || !title.trim()}
        >
          {generating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            'Generate QR Code'
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}