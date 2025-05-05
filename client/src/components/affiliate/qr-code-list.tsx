import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { EyeIcon, DownloadIcon, TrashIcon } from 'lucide-react';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose
} from '@/components/ui/dialog';
import { formatDistanceToNow } from 'date-fns';

interface QrCode {
  id: number;
  code: string;
  title: string;
  description: string;
  imageUrl: string;
  url: string;
  scanCount: number;
  conversionCount: number;
  createdAt: string;
  lastScannedAt: string | null;
}

interface QrCodeListProps {
  affiliateId: number;
  qrCodes: QrCode[];
  onDelete?: (id: number) => void;
  onRefresh?: () => void;
}

export function QrCodeList({ affiliateId, qrCodes, onDelete, onRefresh }: QrCodeListProps) {
  const { toast } = useToast();
  const [selectedQrCode, setSelectedQrCode] = useState<QrCode | null>(null);
  const [isDeleting, setIsDeleting] = useState<number | null>(null);

  const handleDelete = async (id: number) => {
    try {
      setIsDeleting(id);
      const response = await apiRequest('DELETE', `/api/qrcodes/${id}`);
      
      if (response.ok) {
        toast({
          title: "QR Code Deleted",
          description: "The QR code has been successfully deleted"
        });
        
        if (onDelete) {
          onDelete(id);
        }
        
        if (onRefresh) {
          onRefresh();
        }
      } else {
        const error = await response.json();
        throw new Error(error.message || "Failed to delete QR code");
      }
    } catch (error) {
      toast({
        title: "Delete Failed",
        description: error.message || "An error occurred while deleting the QR code",
        variant: "destructive"
      });
    } finally {
      setIsDeleting(null);
    }
  };

  const downloadQrCode = (qrCode: QrCode) => {
    if (!qrCode.imageUrl) return;
    
    // Create a download link for the QR code image
    const link = document.createElement('a');
    link.href = qrCode.imageUrl;
    link.download = `qrcode-${qrCode.id}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!qrCodes || qrCodes.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>QR Codes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center p-4 text-gray-500">
            No QR codes have been generated yet.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>QR Codes</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Code</TableHead>
              <TableHead className="text-center">Scans</TableHead>
              <TableHead className="text-center">Conversions</TableHead>
              <TableHead className="text-center">Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {qrCodes.map((qrCode) => (
              <TableRow key={qrCode.id}>
                <TableCell className="font-medium">{qrCode.title}</TableCell>
                <TableCell className="font-mono text-xs">{qrCode.code}</TableCell>
                <TableCell className="text-center">{qrCode.scanCount}</TableCell>
                <TableCell className="text-center">{qrCode.conversionCount}</TableCell>
                <TableCell className="text-center text-sm">
                  {formatDistanceToNow(new Date(qrCode.createdAt), { addSuffix: true })}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setSelectedQrCode(qrCode)}
                        >
                          <EyeIcon className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>{qrCode.title}</DialogTitle>
                          <DialogDescription>
                            {qrCode.description || "QR code for affiliate tracking"}
                          </DialogDescription>
                        </DialogHeader>
                        <div className="flex flex-col items-center mt-4">
                          <div className="border-2 border-gray-200 rounded-lg p-2 bg-white">
                            <img 
                              src={qrCode.imageUrl} 
                              alt="QR Code" 
                              className="w-48 h-48"
                            />
                          </div>
                          <div className="text-xs text-center mt-2 text-gray-500">
                            Code: {qrCode.code}
                          </div>
                          <div className="text-xs text-center mt-1 text-gray-500">
                            URL: {qrCode.url}
                          </div>
                          <div className="mt-4 text-sm flex gap-8">
                            <div>
                              <strong>Scans:</strong> {qrCode.scanCount}
                            </div>
                            <div>
                              <strong>Conversions:</strong> {qrCode.conversionCount}
                            </div>
                          </div>
                          {qrCode.lastScannedAt && (
                            <div className="text-xs text-center mt-2 text-gray-500">
                              Last scanned: {formatDistanceToNow(new Date(qrCode.lastScannedAt), { addSuffix: true })}
                            </div>
                          )}
                          <div className="mt-4">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => downloadQrCode(qrCode)}
                            >
                              <DownloadIcon className="h-4 w-4 mr-2" />
                              Download
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => downloadQrCode(qrCode)}
                    >
                      <DownloadIcon className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(qrCode.id)}
                      disabled={isDeleting === qrCode.id}
                    >
                      <TrashIcon className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}