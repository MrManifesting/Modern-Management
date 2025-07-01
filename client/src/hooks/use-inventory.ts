import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { API_ENDPOINTS } from "@/lib/constants";
import { InventoryFilters, ItemWithUIState } from "@/lib/types";
import { Item, InsertItem, ItemForm } from "@shared/schema";

export function useInventory(initialFilters: InventoryFilters = {}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<InventoryFilters>(initialFilters);

  // Fetch all items
  const {
    data: items = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: [API_ENDPOINTS.ITEMS],
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Create a new item
  const createItemMutation = useMutation({
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
      
      const res = await apiRequest("POST", API_ENDPOINTS.ITEMS, formData, true);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [API_ENDPOINTS.ITEMS] });
      queryClient.invalidateQueries({ queryKey: [API_ENDPOINTS.STATS] });
      toast({
        title: "Item created",
        description: "The item has been successfully added to your inventory.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create the item. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Update an existing item
  const updateItemMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: ItemForm }) => {
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
      
      const res = await apiRequest("PATCH", API_ENDPOINTS.ITEM_DETAIL(id), formData, true);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [API_ENDPOINTS.ITEMS] });
      queryClient.invalidateQueries({ queryKey: [API_ENDPOINTS.STATS] });
      toast({
        title: "Item updated",
        description: "The item has been successfully updated.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update the item. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Delete an item
  const deleteItemMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", API_ENDPOINTS.ITEM_DETAIL(id));
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [API_ENDPOINTS.ITEMS] });
      queryClient.invalidateQueries({ queryKey: [API_ENDPOINTS.STATS] });
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

  // Apply filters to items
  const filteredItems = useCallback(() => {
    if (!items || items.length === 0) return [];

    return items.filter((item: Item) => {
      // Filter by category
      if (filters.category && filters.category !== "all" && item.category !== filters.category) {
        return false;
      }
      
      // Filter by status
      if (filters.status && item.status !== filters.status) {
        return false;
      }
      
      // Filter by in-stock status
      if (filters.inStock !== undefined) {
        const hasStock = item.quantity > 0;
        if (hasStock !== filters.inStock) {
          return false;
        }
      }
      
      // Filter by price range
      if (filters.priceRange) {
        const [min, max] = filters.priceRange;
        if (item.price < min || item.price > max) {
          return false;
        }
      }
      
      // Filter by search query
      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase();
        const itemName = item.name.toLowerCase();
        const itemDescription = item.description.toLowerCase();
        const itemCategory = item.category.toLowerCase();
        const itemTags = (item.tags as string[]).map(tag => tag.toLowerCase());
        
        const matchesName = itemName.includes(query);
        const matchesDescription = itemDescription.includes(query);
        const matchesCategory = itemCategory.includes(query);
        const matchesTags = itemTags.some(tag => tag.includes(query));
        
        if (!matchesName && !matchesDescription && !matchesCategory && !matchesTags) {
          return false;
        }
      }
      
      return true;
    });
  }, [items, filters]);

  // Update filters
  const updateFilters = useCallback((newFilters: Partial<InventoryFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  // Reset filters
  const resetFilters = useCallback(() => {
    setFilters({});
  }, []);

  return {
    items,
    filteredItems: filteredItems(),
    isLoading,
    isError,
    refetch,
    filters,
    updateFilters,
    resetFilters,
    createItem: createItemMutation.mutate,
    updateItem: updateItemMutation.mutate,
    deleteItem: deleteItemMutation.mutate,
    isCreating: createItemMutation.isPending,
    isUpdating: updateItemMutation.isPending,
    isDeleting: deleteItemMutation.isPending,
  };
}
