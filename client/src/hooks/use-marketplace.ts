import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { API_ENDPOINTS, MARKETPLACE_PLATFORMS } from "@/lib/constants";
import { MarketplaceWithUI, CSVExportOptions } from "@/lib/types";
import { Marketplace } from "@shared/schema";

export function useMarketplace() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const [selectedMarketplaces, setSelectedMarketplaces] = useState<string[]>([]);

  // Fetch all marketplaces
  const {
    data: rawMarketplaces = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: [API_ENDPOINTS.MARKETPLACES],
  });

  // Enhanced marketplaces with UI elements
  const marketplaces = rawMarketplaces.map((marketplace: Marketplace) => {
    const uiInfo = MARKETPLACE_PLATFORMS.find(
      (p) => p.name.toLowerCase() === marketplace.name.toLowerCase()
    ) || {
      logo: "",
      bgColor: "bg-gray-50",
      badgeClass: "bg-gray-500",
    };

    return {
      ...marketplace,
      logo: uiInfo.logo,
      bgColor: uiInfo.bgColor,
      badgeClass: uiInfo.badgeClass,
    } as MarketplaceWithUI;
  });

  // Connect a marketplace
  const connectMarketplaceMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", API_ENDPOINTS.MARKETPLACE_CONNECT(id));
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [API_ENDPOINTS.MARKETPLACES] });
      toast({
        title: "Marketplace connected",
        description: "The marketplace has been successfully connected.",
      });
    },
    onError: () => {
      toast({
        title: "Connection failed",
        description: "Failed to connect to the marketplace. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Generate and download CSV
  const exportCSVMutation = useMutation({
    mutationFn: async (options: CSVExportOptions) => {
      const { selectedItems, selectedMarketplaces } = options;
      
      const response = await apiRequest("POST", API_ENDPOINTS.EXPORT_CSV, {
        items: selectedItems,
        marketplaces: selectedMarketplaces,
      });
      
      // Create and download CSV file
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `marketplace-listings-${Date.now()}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        return true;
      }
      
      throw new Error("Failed to generate CSV");
    },
    onSuccess: () => {
      toast({
        title: "CSV exported successfully",
        description: "Your marketplace listings have been exported as CSV.",
      });
    },
    onError: () => {
      toast({
        title: "Export failed",
        description: "Failed to export listings as CSV. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Toggle item selection
  const toggleItemSelection = useCallback((id: number) => {
    setSelectedItems(prev => 
      prev.includes(id) 
        ? prev.filter(item => item !== id)
        : [...prev, id]
    );
  }, []);

  // Toggle all items
  const toggleAllItems = useCallback((itemIds: number[]) => {
    if (selectedItems.length === itemIds.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems([...itemIds]);
    }
  }, [selectedItems]);

  // Toggle marketplace selection
  const toggleMarketplaceSelection = useCallback((name: string) => {
    setSelectedMarketplaces(prev => 
      prev.includes(name) 
        ? prev.filter(item => item !== name)
        : [...prev, name]
    );
  }, []);

  // Toggle all marketplaces
  const toggleAllMarketplaces = useCallback(() => {
    const allMarketplaceNames = marketplaces
      .filter((m: MarketplaceWithUI) => m.isConnected)
      .map((m: MarketplaceWithUI) => m.name);
      
    if (selectedMarketplaces.length === allMarketplaceNames.length) {
      setSelectedMarketplaces([]);
    } else {
      setSelectedMarketplaces(allMarketplaceNames);
    }
  }, [marketplaces, selectedMarketplaces]);

  // Generate CSV
  const generateCSV = useCallback(() => {
    if (selectedItems.length === 0) {
      toast({
        title: "No items selected",
        description: "Please select at least one item to export.",
        variant: "destructive",
      });
      return;
    }

    if (selectedMarketplaces.length === 0) {
      toast({
        title: "No marketplaces selected",
        description: "Please select at least one marketplace to export to.",
        variant: "destructive",
      });
      return;
    }

    exportCSVMutation.mutate({
      selectedItems,
      selectedMarketplaces,
    });
  }, [selectedItems, selectedMarketplaces, exportCSVMutation, toast]);

  return {
    marketplaces,
    isLoading,
    isError,
    refetch,
    connectMarketplace: connectMarketplaceMutation.mutate,
    isConnecting: connectMarketplaceMutation.isPending,
    generateCSV,
    isExporting: exportCSVMutation.isPending,
    selectedItems,
    selectedMarketplaces,
    toggleItemSelection,
    toggleAllItems,
    toggleMarketplaceSelection,
    toggleAllMarketplaces,
  };
}
