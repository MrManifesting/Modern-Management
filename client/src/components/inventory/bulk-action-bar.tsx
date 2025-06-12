import React from 'react';
import { 
  Tag, 
  Trash2, 
  Download, 
  Copy, 
  Share2,
  ShoppingCart,
  Printer,
  Edit3,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Item } from '@shared/schema';

interface BulkActionBarProps {
  selectedItems: Item[];
  onBulkPublish: () => void;
  onBulkDelete: () => void;
  onBulkPrint: () => void;
  onBulkExport: () => void;
  onBulkCopy: () => void;
  onBulkQuantityEdit: () => void;
  onClearSelection: () => void;
}

export const BulkActionBar: React.FC<BulkActionBarProps> = ({
  selectedItems,
  onBulkPublish,
  onBulkDelete,
  onBulkPrint,
  onBulkExport,
  onBulkCopy,
  onBulkQuantityEdit,
  onClearSelection
}) => {
  if (selectedItems.length === 0) return null;

  return (
    <div className={`bulk-action-bar ${selectedItems.length === 0 ? 'hidden' : ''}`}>
      <div className="bulk-action-bar-count">{selectedItems.length}</div>
      <span className="mr-2">items selected</span>
      
      <Button 
        variant="ghost" 
        size="sm" 
        className="bulk-action-button" 
        onClick={onBulkPublish}
      >
        <ShoppingCart className="h-4 w-4 mr-1" />
        Publish
      </Button>
      
      <Button 
        variant="ghost" 
        size="sm" 
        className="bulk-action-button" 
        onClick={onBulkPrint}
      >
        <Printer className="h-4 w-4 mr-1" />
        Print
      </Button>
      
      <Button 
        variant="ghost" 
        size="sm" 
        className="bulk-action-button" 
        onClick={onBulkExport}
      >
        <Download className="h-4 w-4 mr-1" />
        Export
      </Button>
      
      <Button 
        variant="ghost" 
        size="sm" 
        className="bulk-action-button" 
        onClick={onBulkCopy}
      >
        <Copy className="h-4 w-4 mr-1" />
        Copy
      </Button>
      
      <Button 
        variant="ghost" 
        size="sm" 
        className="bulk-action-button text-red-400 hover:text-red-500 hover:bg-red-100/20" 
        onClick={onBulkDelete}
      >
        <Trash2 className="h-4 w-4 mr-1" />
        Delete
      </Button>
      
      <div className="flex-1"></div>
      
      <Button 
        variant="ghost" 
        size="sm"
        onClick={onClearSelection}
      >
        Cancel
      </Button>
    </div>
  );
};