import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Item } from "@shared/schema";
import ItemCard from "@/components/inventory/item-card";
import AddItemModal from "@/components/modals/add-item-modal";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ArrowRight, FilterIcon } from "lucide-react";

type ItemGridProps = {
  limit?: number;
  showHeader?: boolean;
  showViewAll?: boolean;
};

export default function ItemGrid({ 
  limit,
  showHeader = true,
  showViewAll = true
}: ItemGridProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<number | null>(null);

  // Fetch items
  const { data: items = [], isLoading } = useQuery<Item[]>({
    queryKey: ['/api/items'],
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Delete item mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/items/${id}`);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/items'] });
      toast({
        title: "Item deleted",
        description: "The item has been successfully deleted.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete the item. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Filter items by category
  const filteredItems = selectedCategory === "all" 
    ? items 
    : items.filter((item: Item) => item.category === selectedCategory);

  // Get unique categories from items
  const uniqueCategories = Array.from(new Set(items.map((item: Item) => item.category).filter(Boolean))) as string[];
  const categories: string[] = ["all", ...uniqueCategories];
  
  // Sort items - recently added with available quantities first, then other available items, then out of stock
  const sortedItems = [...filteredItems].sort((a, b) => {
    const aQuantity = a.quantity ?? 0;
    const bQuantity = b.quantity ?? 0;
    const dateA = new Date(a.createdAt || 0);
    const dateB = new Date(b.createdAt || 0);
    
    // Define "recently added" as items added within the last 7 days
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
    const aIsRecent = dateA > sevenDaysAgo;
    const bIsRecent = dateB > sevenDaysAgo;
    
    // Priority 1: Recently added items with available quantities (newest first)
    if (aIsRecent && aQuantity > 0 && !(bIsRecent && bQuantity > 0)) return -1;
    if (bIsRecent && bQuantity > 0 && !(aIsRecent && aQuantity > 0)) return 1;
    
    // Both are recent with available quantities - sort by newest first
    if (aIsRecent && aQuantity > 0 && bIsRecent && bQuantity > 0) {
      return dateB.getTime() - dateA.getTime();
    }
    
    // Priority 2: Other items with available quantities (newest first)
    if (aQuantity > 0 && bQuantity <= 0) return -1;
    if (bQuantity > 0 && aQuantity <= 0) return 1;
    
    // Both have available quantities - sort by newest first
    if (aQuantity > 0 && bQuantity > 0) {
      return dateB.getTime() - dateA.getTime();
    }
    
    // Priority 3: Out of stock items (newest first)
    if (dateB.getTime() !== dateA.getTime()) {
      return dateB.getTime() - dateA.getTime();
    }
    
    // Final fallback: alphabetical
    return (a.name || '').localeCompare(b.name || '');
  });

  // Limit the number of items to display
  const displayedItems = limit ? sortedItems.slice(0, limit) : sortedItems;

  // Handle edit item
  const handleEditItem = (item: Item) => {
    setEditingItem(item);
    setIsAddModalOpen(true);
  };

  // Handle delete item
  const handleDeleteItem = (id: number) => {
    setItemToDelete(id);
  };

  // Confirm delete item
  const confirmDelete = () => {
    if (itemToDelete !== null) {
      deleteMutation.mutate(itemToDelete);
      setItemToDelete(null);
    }
  };

  return (
    <div>
      {showHeader && (
        <div className="mb-4 flex items-center justify-between">
          <h2 
            className="text-lg font-semibold text-gray-800 hover:text-primary-600 cursor-pointer flex items-center"
            onClick={() => navigate("/inventory")}
          >
            {limit ? "Recent Inventory" : "Inventory Items"}
          </h2>
          <div className="flex space-x-2">
            <div className="relative">
              <div className="flex flex-col gap-1">
                <label htmlFor="category-filter" className="text-sm font-medium mb-1">Category</label>
                <Select 
                  value={selectedCategory} 
                  onValueChange={setSelectedCategory}
                >
                  <SelectTrigger id="category-filter" className="min-w-[150px]">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category || ""}>
                        {category === "all" 
                          ? "All Categories" 
                          : category || "Unknown"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* View All button */}
            {limit && showViewAll && items.length > limit && (
              <Button 
                variant="outline" 
                size="sm"
                className="flex items-center"
                onClick={() => navigate("/products-inventory")}
              >
                View All
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {[...Array(limit || 4)].map((_, i) => (
            <div 
              key={i} 
              className="animate-pulse rounded-lg bg-white shadow-md"
            >
              <div className="h-48 bg-gray-200 rounded-t-lg"></div>
              <div className="p-4">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      ) : displayedItems.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {displayedItems.map((item: Item) => (
            <ItemCard
              key={item.id}
              item={item}
              onEdit={handleEditItem}
              onDelete={handleDeleteItem}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg p-8 text-center">
          <h3 className="text-lg font-medium text-gray-800 mb-2">No items found</h3>
          <p className="text-gray-600 mb-4">
            {selectedCategory !== "all" 
              ? `There are no items in the "${selectedCategory}" category.`
              : "Start by adding your first inventory item."}
          </p>
          <Button onClick={() => setIsAddModalOpen(true)}>
            Add Your First Item
          </Button>
        </div>
      )}

      {/* Edit/Add modal */}
      <AddItemModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingItem(null);
        }}
        editItem={editingItem}
      />

      {/* Delete confirmation dialog */}
      <AlertDialog open={itemToDelete !== null} onOpenChange={(open) => !open && setItemToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the item
              from your inventory.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}