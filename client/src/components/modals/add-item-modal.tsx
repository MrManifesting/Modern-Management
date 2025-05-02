import { useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ItemForm, Item } from "@shared/schema";
import ItemFormComponent from "@/components/inventory/item-form";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface AddItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  editItem?: Item | null;
}

export default function AddItemModal({
  isOpen,
  onClose,
  editItem = null,
}: AddItemModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEditing = !!editItem;

  const createMutation = useMutation({
    mutationFn: async (data: ItemForm) => {
      // Create FormData for sending files
      const formData = new FormData();
      
      // Add all form fields to formData
      Object.entries(data).forEach(([key, value]) => {
        // Handle arrays and objects by stringifying them
        if (key === "files") {
          // Add each file separately
          if (data.files) {
            data.files.forEach((file: File) => {
              formData.append("files", file);
            });
          }
        } else if (Array.isArray(value) || typeof value === "object") {
          formData.append(key, JSON.stringify(value));
        } else {
          formData.append(key, String(value));
        }
      });
      
      if (isEditing && editItem) {
        const res = await apiRequest("PATCH", `/api/items/${editItem.id}`, formData);
        return res.json();
      } else {
        const res = await apiRequest("POST", "/api/items", formData);
        return res.json();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/items'] });
      toast({
        title: isEditing ? "Item updated" : "Item created",
        description: isEditing
          ? "The item has been successfully updated."
          : "The item has been successfully added to your inventory.",
      });
      onClose();
    },
    onError: () => {
      toast({
        title: "Error",
        description: isEditing
          ? "Failed to update the item. Please try again."
          : "Failed to create the item. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Prepare default values for the form
  const getDefaultValues = () => {
    if (isEditing && editItem) {
      return {
        ...editItem,
        // Ensure these fields are properly converted from JSON if stored as strings
        tags: Array.isArray(editItem.tags) ? editItem.tags : [],
        marketplace: Array.isArray(editItem.marketplace) ? editItem.marketplace : [],
        aiTags: Array.isArray(editItem.aiTags) ? editItem.aiTags : [],
      };
    }
    return undefined;
  };

  const handleSubmit = (data: ItemForm) => {
    createMutation.mutate(data);
  };

  // Reset form when modal is closed
  useEffect(() => {
    if (!isOpen) {
      createMutation.reset();
    }
  }, [isOpen, createMutation]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Item" : "Add New Item"}
          </DialogTitle>
        </DialogHeader>
        <div className="mt-4">
          <ItemFormComponent
            defaultValues={getDefaultValues()}
            onSubmit={handleSubmit}
            isLoading={createMutation.isPending}
            isEditing={isEditing}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
