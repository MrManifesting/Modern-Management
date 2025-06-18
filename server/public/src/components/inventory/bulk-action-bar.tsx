import React, { useState } from 'react';
import { 
  Tag, 
  Trash2, 
  Download, 
  Copy, 
  Share2,
  ShoppingCart,
  Printer,
  Edit3,
  Percent,
  Hash,
  QrCode,
  Barcode,
  DollarSign,
  Package,
  ToggleLeft,
  Camera
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Item } from '@shared/schema';
import { BulkEditDialog } from './bulk-edit-dialog';
import { CameraDialog } from './camera-dialog';

interface BulkActionBarProps {
  selectedItems: Item[];
  onBulkPublish: () => void;
  onBulkDelete: () => void;
  onBulkPrint: () => void;
  onBulkExport: () => void;
  onBulkCopy: () => void;
  onBulkQuantityEdit: () => void;
  onClearSelection: () => void;
  onBulkUpdate?: (updates: any) => void;
}

export const BulkActionBar: React.FC<BulkActionBarProps> = ({
  selectedItems,
  onBulkPublish,
  onBulkDelete,
  onBulkPrint,
  onBulkExport,
  onBulkCopy,
  onBulkQuantityEdit,
  onClearSelection,
  onBulkUpdate
}) => {
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [editType, setEditType] = useState<'sale' | 'quantity' | 'status' | 'codes'>('sale');

  if (selectedItems.length === 0) return null;

  const handleBulkEdit = (type: 'sale' | 'quantity' | 'status' | 'codes') => {
    setEditType(type);
    setBulkEditOpen(true);
  };

  return (
    <>
      <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-white border border-gray-200 rounded-lg shadow-lg p-4 z-50 flex items-center gap-3 max-w-screen-xl overflow-x-auto">
        <div className="flex items-center gap-2">
          <div className="bg-blue-500 text-white rounded-full px-3 py-1 text-sm font-medium">
            {selectedItems.length}
          </div>
          <span className="text-sm font-medium">items selected</span>
        </div>
        
        <div className="h-6 w-px bg-gray-300" />
        
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => handleBulkEdit('sale')}
            title="Apply Sale/Discount"
          >
            <Percent className="h-4 w-4 mr-1" />
            Sale
          </Button>
          
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => handleBulkEdit('quantity')}
            title="Update Quantities"
          >
            <Package className="h-4 w-4 mr-1" />
            Quantity
          </Button>
          
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => handleBulkEdit('status')}
            title="Change Status"
          >
            <ToggleLeft className="h-4 w-4 mr-1" />
            Status
          </Button>
          
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => handleBulkEdit('codes')}
            title="Generate SKUs/Barcodes/QR Codes"
          >
            <QrCode className="h-4 w-4 mr-1" />
            Codes
          </Button>
          
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onBulkPublish}
            title="Publish to Marketplace"
          >
            <ShoppingCart className="h-4 w-4 mr-1" />
            Publish
          </Button>
          
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setCameraOpen(true)}
            title="Take Photo"
          >
            <Camera className="h-4 w-4 mr-1" />
            Photo
          </Button>
          
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onBulkPrint}
            title="Print Labels"
          >
            <Printer className="h-4 w-4 mr-1" />
            Print
          </Button>
          
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onBulkExport}
            title="Export Data"
          >
            <Download className="h-4 w-4 mr-1" />
            Export
          </Button>
          
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onBulkDelete}
            title="Delete Items"
            className="text-red-600 hover:text-red-700"
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Delete
          </Button>
          
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onClearSelection}
            title="Clear Selection"
          >
            ✕
          </Button>
        </div>
      </div>

      {/* Bulk Edit Dialog */}
      <BulkEditDialog
        open={bulkEditOpen}
        onOpenChange={setBulkEditOpen}
        selectedItems={selectedItems}
        editType={editType}
        onUpdate={onBulkUpdate}
      />
      
      {/* Camera Dialog */}
      <CameraDialog
        open={cameraOpen}
        onOpenChange={setCameraOpen}
      />
    </>
  );
};