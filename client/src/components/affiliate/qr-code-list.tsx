import { useState } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from '@/components/ui/alert-dialog';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from '@/components/ui/dialog';
import { Loader2, QrCode, ExternalLink, Trash, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface QrCode {
  id: number;
  code: string;
  name: string;
  description: string;
  type: string;
  imageUrl: string;
  scans: number;
  conversions: number;
  conversionRate: number;
  earnings: number;
  createdAt: string;
}

interface QrCodeListProps {
  affiliateId: number;
  qrCodes: QrCode[];
  onRefresh: () => void;
}

export function QrCodeList({ affiliateId, qrCodes, onRefresh }: QrCodeListProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedQrCode, setSelectedQrCode] = useState<QrCode | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const { toast } = useToast();

  const handleDelete = async (qrCodeId: number) => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/qrcodes/${qrCodeId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete QR code');
      }

      toast({
        title: 'QR Code Deleted',
        description: 'The QR code has been deleted successfully',
      });
      
      // Close the dialog and refresh the list
      setDeleteDialogOpen(false);
      onRefresh();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const openDeleteDialog = (qrCode: QrCode) => {
    setSelectedQrCode(qrCode);
    setDeleteDialogOpen(true);
  };

  const openViewDialog = (qrCode: QrCode) => {
    setSelectedQrCode(qrCode);
    setViewDialogOpen(true);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied',
      description: 'Link copied to clipboard',
    });
  };

  const getQrCodeUrl = (code: string) => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/qr/${code}`;
  };

  const getDemoUrl = (code: string) => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/affiliate/qr-demo?code=${code}`;
  };

  if (qrCodes.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Your QR Codes</CardTitle>
          <CardDescription>
            You haven't created any QR codes yet
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6 text-center">
          <QrCode className="h-16 w-16 mx-auto mb-4 text-gray-300" />
          <p className="mb-4">
            Create your first QR code to start earning commissions on sales
          </p>
          <Button onClick={() => window.location.hash = '#generate'}>
            Create Your First QR Code
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Your QR Codes</CardTitle>
          <CardDescription>
            Manage your QR codes and track performance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Scans</TableHead>
                  <TableHead className="text-right">Conversions</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                  <TableHead className="text-right">Earnings</TableHead>
                  <TableHead className="text-right">Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {qrCodes.map((qrCode) => (
                  <TableRow key={qrCode.id}>
                    <TableCell className="font-medium">{qrCode.name}</TableCell>
                    <TableCell>
                      <span className="capitalize">{qrCode.type}</span>
                    </TableCell>
                    <TableCell className="text-right">{qrCode.scans}</TableCell>
                    <TableCell className="text-right">{qrCode.conversions}</TableCell>
                    <TableCell className="text-right">
                      {qrCode.conversionRate ? `${(qrCode.conversionRate * 100).toFixed(1)}%` : '0%'}
                    </TableCell>
                    <TableCell className="text-right">
                      ${qrCode.earnings.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      {format(new Date(qrCode.createdAt), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => openViewDialog(qrCode)}
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => window.open(getDemoUrl(qrCode.code), '_blank')}
                          title="View Demo"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => openDeleteDialog(qrCode)}
                          title="Delete"
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the QR code "{selectedQrCode?.name}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedQrCode && handleDelete(selectedQrCode.id)}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* View QR Code Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedQrCode?.name}</DialogTitle>
            <DialogDescription>
              {selectedQrCode?.description || 'No description provided'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex flex-col items-center justify-center p-4">
            {selectedQrCode?.imageUrl && (
              <div className="mb-4 p-2 bg-white rounded-lg shadow-sm">
                <img
                  src={selectedQrCode.imageUrl}
                  alt={`QR Code for ${selectedQrCode.name}`}
                  className="w-48 h-48"
                />
              </div>
            )}
            
            <div className="text-sm text-center mb-4">
              <p>Code: <span className="font-mono">{selectedQrCode?.code}</span></p>
              <p className="mt-1">Type: <span className="capitalize">{selectedQrCode?.type}</span></p>
            </div>
            
            <div className="flex flex-col gap-2 w-full">
              <Button onClick={() => selectedQrCode && copyToClipboard(getQrCodeUrl(selectedQrCode.code))}>
                Copy Tracking Link
              </Button>
              
              <Button variant="outline" onClick={() => selectedQrCode && window.open(getDemoUrl(selectedQrCode.code), '_blank')}>
                Open Demo Page
              </Button>
            </div>
            
            <div className="mt-4 grid grid-cols-2 gap-4 w-full">
              <div className="bg-gray-50 p-3 rounded-lg text-center">
                <p className="text-sm text-gray-500">Scans</p>
                <p className="text-xl font-bold">{selectedQrCode?.scans || 0}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg text-center">
                <p className="text-sm text-gray-500">Conversions</p>
                <p className="text-xl font-bold">{selectedQrCode?.conversions || 0}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg text-center">
                <p className="text-sm text-gray-500">Rate</p>
                <p className="text-xl font-bold">
                  {selectedQrCode?.conversionRate 
                    ? `${(selectedQrCode.conversionRate * 100).toFixed(1)}%` 
                    : '0%'}
                </p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg text-center">
                <p className="text-sm text-gray-500">Earnings</p>
                <p className="text-xl font-bold">
                  ${selectedQrCode?.earnings.toFixed(2) || '0.00'}
                </p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}