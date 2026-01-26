import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { inventoryApi, statsApi } from '../services/api';

export function useInventoryItems() {
  return useQuery({
    queryKey: ['inventory'],
    queryFn: async () => {
      try {
        const items = await inventoryApi.getItems();
        return Array.isArray(items) ? items : [];
      } catch (error) {
        console.error('Failed to fetch inventory:', error);
        return [];
      }
    },
    retry: 2,
    staleTime: 1000 * 60 * 2,
  });
}

export function useInventoryItem(id: number) {
  return useQuery({
    queryKey: ['inventory', id],
    queryFn: async () => {
      try {
        return await inventoryApi.getItem(id);
      } catch (error) {
        console.error(`Failed to fetch item ${id}:`, error);
        return null;
      }
    },
    enabled: !!id && id > 0,
    retry: 1,
  });
}

export function useStats() {
  return useQuery({
    queryKey: ['stats'],
    queryFn: async () => {
      try {
        return await statsApi.getStats();
      } catch (error) {
        console.error('Failed to fetch stats:', error);
        return { totalItems: 0, totalValue: 0, lowStock: 0, outOfStock: 0 };
      }
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useCreateInventoryItem() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: inventoryApi.createItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
    onError: (error) => {
      console.error('Failed to create item:', error);
    },
  });
}

export function useUpdateInventoryItem() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => 
      inventoryApi.updateItem(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['inventory', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
    onError: (error) => {
      console.error('Failed to update item:', error);
    },
  });
}

export function useDeleteInventoryItem() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: inventoryApi.deleteItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
    onError: (error) => {
      console.error('Failed to delete item:', error);
    },
  });
}
