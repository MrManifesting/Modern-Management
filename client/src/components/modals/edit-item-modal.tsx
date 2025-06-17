import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Edit } from "lucide-react";
import SimpleItemForm from "@/components/inventory/simple-item-form";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { type Item } from "@shared/schema";

interface EditItemModalProps {
  item: any; // Accept any item type to handle both Item and EnhancedItem
  trigger?: React.ReactNode;
}

export default function EditItemModal({ item, trigger }: EditItemModalProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Convert enhanced item to proper form data with all existing values
  const getFormDefaults = () => {
    return {
      name: item.name || "",
      description: item.description || "",
      category: item.category || "Bulk Flower",
      brand: item.brand || "Gold Standard", 
      weight: item.weight || "",
      sku: item.sku || "",
      basePrice: item.basePrice || "",
      costPrice: item.costPrice || "",
      salePrice: item.salePrice || "",
      wholesalePrice: item.wholesalePrice || "",
      quantity: item.quantity || 0,
      status: item.status || "draft",
      vendor: item.vendor || "Gold Standard",
      quality: item.quality || "Top Shelf",
      imageUrl: item.imageUrl || "",
      shopifyId: item.shopifyId || null,
    };
  };

  const handleSubmit = async (formData: any) => {
    setIsLoading(true);
    
    try {
      const response = await apiRequest('PATCH', `/api/items/${item.id}`, formData);
      
      if (!response.ok) {
        throw new Error('Failed to update item');
      }

      // Invalidate all relevant caches
      queryClient.invalidateQueries({ queryKey: ["/api/items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/items/with-media"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/enhanced"] });
      
      toast({
        title: "Item Updated",
        description: `${formData.name} has been updated successfully`,
      });
      
      setOpen(false);
    } catch (error) {
      console.error("Error updating item:", error);
      toast({
        title: "Error",
        description: "Failed to update item. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Item</DialogTitle>
          <DialogDescription>
            Update the details for {item.name}
          </DialogDescription>
        </DialogHeader>
        
        <SimpleItemForm
          defaultValues={getFormDefaults()}
          onSubmit={handleSubmit}
          isLoading={isLoading}
          isEditing={true}
        />
      </DialogContent>
    </Dialog>
  );
}