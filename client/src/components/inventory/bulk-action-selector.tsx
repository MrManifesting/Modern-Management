import { useState, useEffect, createContext, useContext } from 'react';
import { 
  Package, 
  Trash2, 
  Tag, 
  ArrowDownUp, 
  Edit, 
  ShoppingCart, 
  ChevronUp, 
  Printer
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { queryClient } from '@/lib/queryClient';
import './cannabis-cursor.css';

// Context to manage selected items
interface BulkActionContextType {
  selectedItems: number[];
  selectItem: (id: number) => void;
  deselectItem: (id: number) => void;
  clearSelection: () => void;
  isSelected: (id: number) => boolean;
}

const BulkActionContext = createContext<BulkActionContextType | undefined>(undefined);

// Provider component to wrap around the inventory grid
export const BulkActionProvider = ({ children }: { children: React.ReactNode }) => {
  const [selectedItems, setSelectedItems] = useState<number[]>([]);

  // Add an item to the selection
  const selectItem = (id: number) => {
    setSelectedItems(prev => [...prev, id]);
  };

  // Remove an item from the selection
  const deselectItem = (id: number) => {
    setSelectedItems(prev => prev.filter(itemId => itemId !== id));
  };

  // Clear all selected items
  const clearSelection = () => {
    setSelectedItems([]);
  };

  // Check if an item is currently selected
  const isSelected = (id: number) => {
    return selectedItems.includes(id);
  };

  return (
    <BulkActionContext.Provider value={{
      selectedItems,
      selectItem,
      deselectItem,
      clearSelection,
      isSelected
    }}>
      {children}
    </BulkActionContext.Provider>
  );
};

// Hook to access bulk action context
export const useBulkActions = () => {
  const context = useContext(BulkActionContext);
  if (!context) {
    throw new Error('useBulkActions must be used within a BulkActionProvider');
  }
  return context;
};

// Types for bulk actions
type BulkAction = {
  id: string;
  label: string;
  icon: React.ReactNode;
  action: (ids: number[]) => Promise<void>;
};

// Component for selectable item (wraps existing item cards)
interface SelectableItemProps {
  id: number;
  children: React.ReactNode;
  className?: string;
}

export const SelectableItem = ({ id, children, className = '' }: SelectableItemProps) => {
  const { selectedItems, selectItem, deselectItem, isSelected } = useBulkActions();
  const selected = isSelected(id);

  const handleClick = (e: React.MouseEvent) => {
    // Only handle selection if ctrl/cmd key is pressed
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      e.stopPropagation();
      
      if (selected) {
        deselectItem(id);
      } else {
        selectItem(id);
      }
    }
  };

  return (
    <div 
      className={`selectable-item ${selected ? 'selected' : ''} ${className} ${selectedItems.length > 0 ? 'cannabis-cursor' : ''}`}
      onClick={handleClick}
    >
      {children}
      {selected && (
        <div className="absolute top-2 right-2 z-10">
          <Badge className="bg-green-700 text-white">Selected</Badge>
        </div>
      )}
    </div>
  );
};

// The main bulk action bar component
export const BulkActionBar = () => {
  const { selectedItems, clearSelection } = useBulkActions();
  const { toast } = useToast();
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0 });
  const [dragCurrentPos, setDragCurrentPos] = useState({ x: 0, y: 0 });

  // Available bulk actions
  const bulkActions: BulkAction[] = [
    {
      id: 'edit',
      label: 'Edit',
      icon: <Edit className="h-4 w-4" />,
      action: async (ids) => {
        toast({
          title: 'Bulk Edit',
          description: `Editing ${ids.length} items`,
        });
        // Implement bulk edit logic
      }
    },
    {
      id: 'print',
      label: 'Print',
      icon: <Printer className="h-4 w-4" />,
      action: async (ids) => {
        toast({
          title: 'Bulk Print',
          description: `Printing barcodes for ${ids.length} items`,
        });
        // Implement bulk print logic
      }
    },
    {
      id: 'publish',
      label: 'Publish',
      icon: <ShoppingCart className="h-4 w-4" />,
      action: async (ids) => {
        try {
          const response = await apiRequest(
            'POST',
            '/api/items/bulk-publish',
            { itemIds: ids }
          );
          
          const result = await response.json();
          
          if (result.success) {
            toast({
              title: 'Items Published',
              description: `Successfully published ${ids.length} items to marketplaces`,
            });
            // Refetch inventory data
            queryClient.invalidateQueries({ queryKey: ['/api/items'] });
          } else {
            toast({
              title: 'Error',
              description: result.message || 'Failed to publish items',
              variant: 'destructive',
            });
          }
        } catch (error) {
          toast({
            title: 'Error',
            description: 'Failed to publish items to marketplaces',
            variant: 'destructive',
          });
        }
      }
    },
    {
      id: 'delete',
      label: 'Delete',
      icon: <Trash2 className="h-4 w-4" />,
      action: async (ids) => {
        try {
          const response = await apiRequest(
            'POST',
            '/api/items/bulk-delete',
            { itemIds: ids }
          );
          
          const result = await response.json();
          
          if (result.success) {
            toast({
              title: 'Items Deleted',
              description: `Successfully deleted ${ids.length} items`,
            });
            // Refetch inventory data
            queryClient.invalidateQueries({ queryKey: ['/api/items'] });
            // Clear selection
            clearSelection();
          } else {
            toast({
              title: 'Error',
              description: result.message || 'Failed to delete items',
              variant: 'destructive',
            });
          }
        } catch (error) {
          toast({
            title: 'Error',
            description: 'Failed to delete items',
            variant: 'destructive',
          });
        }
      }
    }
  ];

  // Start dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStartPos({ x: e.clientX, y: e.clientY });
    setDragCurrentPos({ x: e.clientX, y: e.clientY });
    
    // Add the cannabis-cursor-grabbing class to body
    document.body.classList.add('cannabis-cursor-grabbing');
  };

  // Update position during drag
  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      setDragCurrentPos({ x: e.clientX, y: e.clientY });
    }
  };

  // End dragging
  const handleMouseUp = () => {
    setIsDragging(false);
    document.body.classList.remove('cannabis-cursor-grabbing');
  };

  // Effect to add and remove mouse move and up listeners
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  // If no items are selected, don't show the bar
  if (selectedItems.length === 0) {
    return null;
  }

  return (
    <>
      <div 
        className={`bulk-action-bar ${isDragging ? 'cannabis-cursor-grabbing' : 'cannabis-cursor'}`}
        style={isDragging ? {
          transform: `translateX(${dragCurrentPos.x - dragStartPos.x}px) translateY(${dragCurrentPos.y - dragStartPos.y}px)`,
          transition: 'none'
        } : undefined}
        onMouseDown={handleMouseDown}
      >
        <div className="bulk-action-bar-count">{selectedItems.length}</div>
        <div className="bulk-action-text">items selected</div>
        
        <div className="flex gap-2 ml-4">
          {bulkActions.map((action) => (
            <Button
              key={action.id}
              size="sm"
              variant="secondary"
              className="bulk-action-button"
              onClick={() => action.action(selectedItems)}
            >
              {action.icon}
              <span className="ml-1">{action.label}</span>
            </Button>
          ))}
        </div>
        
        <Button
          size="sm"
          variant="ghost"
          className="ml-auto text-white"
          onClick={clearSelection}
        >
          Clear
        </Button>
      </div>
      
      {/* Drag overlay that follows cursor when dragging items */}
      {selectedItems.length > 0 && isDragging && (
        <div 
          className="cannabis-drag-overlay"
          style={{
            left: dragCurrentPos.x + 15,
            top: dragCurrentPos.y + 15,
          }}
        >
          <Package className="h-4 w-4 mr-2" />
          {selectedItems.length} items
        </div>
      )}
    </>
  );
};

// Add a server route handler for bulk delete
// Note: This doesn't go in this file, but is needed for the feature to work
// const bulkDeleteRoute = `
// app.post("/api/items/bulk-delete", async (req: Request, res: Response) => {
//   try {
//     const { itemIds } = req.body;
//     
//     if (!Array.isArray(itemIds) || itemIds.length === 0) {
//       return res.status(400).json({
//         success: false,
//         message: "No item IDs provided"
//       });
//     }
//     
//     // Delete each item
//     const results = await Promise.all(
//       itemIds.map(id => storage.deleteItem(id))
//     );
//     
//     // Count successful deletions
//     const successCount = results.filter(Boolean).length;
//     
//     res.json({
//       success: true,
//       message: `Successfully deleted ${successCount} of ${itemIds.length} items`
//     });
//   } catch (error) {
//     console.error("Error in bulk delete:", error);
//     res.status(500).json({
//       success: false,
//       message: "Failed to delete items"
//     });
//   }
// });
// `;