import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusIcon } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function MarketplaceStatus() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch marketplaces
  const { data: marketplaces = [], isLoading } = useQuery({
    queryKey: ['/api/marketplaces'],
  });

  // Connect marketplace mutation
  const connectMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/marketplaces/${id}/connect`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/marketplaces'] });
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

  // Get logo URL based on marketplace name
  const getLogoUrl = (name: string) => {
    const logos: Record<string, string> = {
      "eBay": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/EBay_logo.svg/2560px-EBay_logo.svg.png",
      "Etsy": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/89/Etsy_logo.svg/2560px-Etsy_logo.svg.png",
      "Amazon": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a9/Amazon_logo.svg/2560px-Amazon_logo.svg.png",
      "Shopify": "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0e/Shopify_logo_2018.svg/2560px-Shopify_logo_2018.svg.png",
    };
    return logos[name] || "https://via.placeholder.com/100x40";
  };

  // Get background color based on marketplace name
  const getBgColor = (name: string) => {
    const colors: Record<string, string> = {
      "eBay": "bg-blue-50",
      "Etsy": "bg-purple-50",
      "Amazon": "bg-red-50",
      "Shopify": "bg-gray-50"
    };
    return colors[name] || "bg-gray-50";
  };

  const handleConnect = (id: number) => {
    connectMutation.mutate(id);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Marketplace Status</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {isLoading ? (
            // Loading skeletons
            Array(4)
              .fill(0)
              .map((_, i) => (
                <div
                  key={i}
                  className="flex animate-pulse items-center justify-between rounded-lg bg-gray-50 p-3"
                >
                  <div className="flex items-center">
                    <div className="h-6 w-16 bg-gray-200 rounded"></div>
                    <div className="ml-2 h-4 w-24 bg-gray-200 rounded"></div>
                  </div>
                  <div className="h-6 w-20 bg-gray-200 rounded-full"></div>
                </div>
              ))
          ) : (
            // Actual marketplace listings
            marketplaces.map((marketplace: any) => (
              <div
                key={marketplace.id}
                className={`flex items-center justify-between rounded-lg ${getBgColor(marketplace.name)} p-3`}
              >
                <div className="flex items-center">
                  <img
                    src={getLogoUrl(marketplace.name)}
                    alt={marketplace.name}
                    className="h-6 w-16 object-contain"
                  />
                  <span className="ml-2 text-sm font-medium text-gray-700">
                    {marketplace.name}
                  </span>
                </div>
                {marketplace.isConnected ? (
                  <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-700">
                    Connected
                  </span>
                ) : (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => handleConnect(marketplace.id)}
                    disabled={connectMutation.isPending}
                  >
                    Connect
                  </Button>
                )}
              </div>
            ))
          )}

          <div className="mt-4">
            <Button variant="outline" className="w-full" size="sm">
              <PlusIcon className="mr-1 h-4 w-4" />
              Add Marketplace
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
