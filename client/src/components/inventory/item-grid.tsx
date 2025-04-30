import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { FilterIcon } from "lucide-react";

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
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<number | null>(null);

  // Fetch items
  const { data: items = [], isLoading } = useQuery({
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
  const categories = ["all", ...new Set(items.map((item: Item) => item.category))];

  // Limit the number of items to display
  const displayedItems = limit ? filteredItems.slice(0, limit) : filteredItems;

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
          <h2 className="text-lg font-semibold text-gray-800">
            {limit ? "Recent Inventory" : "Inventory Items"}
          </h2>
          <div className="flex space-x-2">
            <div className="relative">
              <Select 
                value={selectedCategory} 
                onValueChange={setSelectedCategory}
              >
                <SelectTrigger className="min-w-[150px]">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category === "all" 
                        ? "All Categories" 
                        : category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <Button variant="outline" size="sm">
              <FilterIcon className="mr-1.5 h-4 w-4 text-gray-500" />
              Filter
            </Button>
            
            {showViewAll && (
              <Button variant="secondary" size="sm">
                View All
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
