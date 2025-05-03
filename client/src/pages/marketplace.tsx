import { useState } from "react";
import { useMarketplace } from "@/hooks/use-marketplace";
import { MarketplaceConnectionWizard } from "@/components/marketplace/marketplace-connection-wizard";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle,
  CardFooter
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Item } from "@shared/schema";
import { 
  FileSpreadsheet, 
  Download, 
  Plus, 
  Store, 
  RefreshCw, 
  CheckCircle2, 
  ShoppingCart,
  AlertCircle
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MarketplaceWithUI } from "@/lib/types";

export default function Marketplace() {
  const { 
    marketplaces, 
    isLoading: isLoadingMarketplaces,
    refetch,
    selectedItems,
    selectedMarketplaces,
    toggleItemSelection,
    toggleAllItems,
    toggleMarketplaceSelection,
    toggleAllMarketplaces,
    generateCSV,
    isExporting
  } = useMarketplace();
  
  const [activeTab, setActiveTab] = useState("connected");
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  
  // For demo purposes - normally would be fetched from the API
  const items = [
    { id: 1, name: "Wireless Headphones", category: "Electronics", basePrice: 149.99, status: "listed" },
    { id: 2, name: "Smart Watch", category: "Electronics", basePrice: 249.99, status: "sold" },
    { id: 3, name: "Desk Lamp", category: "Home Goods", basePrice: 39.99, status: "draft" },
    { id: 4, name: "Yoga Mat", category: "Sporting Goods", basePrice: 29.99, status: "listed" },
    { id: 5, name: "Coffee Maker", category: "Kitchen", basePrice: 89.99, status: "listed" },
  ];
  
  const isLoadingItems = false;
  
  const connectedMarketplaces = marketplaces.filter(m => m.isConnected);
  const availableMarketplaces = marketplaces.filter(m => !m.isConnected);

  return (
    <div className="space-y-6">
      {/* Marketplaces Section */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle>Marketplaces</CardTitle>
              <CardDescription>
                Connect and manage your online marketplace integrations
              </CardDescription>
            </div>
            <Button onClick={() => setIsWizardOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Marketplace
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="connected" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="connected">
                Connected
                {connectedMarketplaces.length > 0 && (
                  <Badge className="ml-2 bg-blue-500" variant="secondary">
                    {connectedMarketplaces.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="available">
                Available
                {availableMarketplaces.length > 0 && (
                  <Badge className="ml-2" variant="outline">
                    {availableMarketplaces.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>
            
            {/* Connected Marketplaces */}
            <TabsContent value="connected">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {isLoadingMarketplaces ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <Card key={i} className="h-[180px] animate-pulse">
                      <CardHeader className="pb-2">
                        <div className="h-6 w-32 bg-gray-200 rounded mb-2"></div>
                        <div className="h-4 w-24 bg-gray-200 rounded"></div>
                      </CardHeader>
                      <CardContent>
                        <div className="h-10 w-10 bg-gray-200 rounded-full mx-auto"></div>
                      </CardContent>
                      <CardFooter>
                        <div className="h-9 w-full bg-gray-200 rounded"></div>
                      </CardFooter>
                    </Card>
                  ))
                ) : connectedMarketplaces.length > 0 ? (
                  connectedMarketplaces.map((marketplace) => (
                    <MarketplaceCard 
                      key={marketplace.id} 
                      marketplace={marketplace} 
                      isConnected={true} 
                    />
                  ))
                ) : (
                  <div className="col-span-full flex flex-col items-center justify-center p-8 text-center border rounded-lg border-dashed">
                    <Store className="h-12 w-12 text-gray-300 mb-4" />
                    <h3 className="text-lg font-medium mb-2">No Connected Marketplaces</h3>
                    <p className="text-gray-500 max-w-md mb-4">
                      Connect to online marketplaces to synchronize your inventory and manage your listings in one place.
                    </p>
                    <Button onClick={() => setActiveTab("available")}>
                      Browse Available Marketplaces
                    </Button>
                  </div>
                )}
              </div>
            </TabsContent>
            
            {/* Available Marketplaces */}
            <TabsContent value="available">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {isLoadingMarketplaces ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <Card key={i} className="h-[180px] animate-pulse">
                      <CardHeader className="pb-2">
                        <div className="h-6 w-32 bg-gray-200 rounded mb-2"></div>
                        <div className="h-4 w-24 bg-gray-200 rounded"></div>
                      </CardHeader>
                      <CardContent>
                        <div className="h-10 w-10 bg-gray-200 rounded-full mx-auto"></div>
                      </CardContent>
                      <CardFooter>
                        <div className="h-9 w-full bg-gray-200 rounded"></div>
                      </CardFooter>
                    </Card>
                  ))
                ) : availableMarketplaces.length > 0 ? (
                  availableMarketplaces.map((marketplace) => (
                    <MarketplaceCard 
                      key={marketplace.id} 
                      marketplace={marketplace} 
                      isConnected={false}
                      onConnect={() => setIsWizardOpen(true)}
                    />
                  ))
                ) : (
                  <div className="col-span-full flex flex-col items-center justify-center p-8 text-center border rounded-lg border-dashed">
                    <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
                    <h3 className="text-lg font-medium mb-2">All Marketplaces Connected!</h3>
                    <p className="text-gray-500 max-w-md">
                      You've connected all available marketplaces. Your inventory is ready to be synchronized.
                    </p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Export Section */}
      <Card>
        <CardHeader>
          <CardTitle>Marketplace Export</CardTitle>
          <CardDescription>
            Generate CSV files to bulk upload your listings to various marketplaces
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Marketplace Selection */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Select Marketplaces</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingMarketplaces ? (
                  <div className="space-y-2">
                    {[1, 2].map((i) => (
                      <div key={i} className="flex items-center space-x-2">
                        <div className="h-4 w-4 rounded bg-gray-200 animate-pulse" />
                        <div className="h-4 w-32 rounded bg-gray-200 animate-pulse" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="all-marketplaces"
                        checked={
                          selectedMarketplaces.length === 
                          connectedMarketplaces.length && 
                          connectedMarketplaces.length > 0
                        }
                        onCheckedChange={toggleAllMarketplaces}
                      />
                      <Label htmlFor="all-marketplaces">All Marketplaces</Label>
                    </div>
                    
                    {connectedMarketplaces.map((marketplace) => (
                      <div 
                        key={marketplace.id} 
                        className="flex items-center space-x-2 ml-4"
                      >
                        <Checkbox
                          id={`marketplace-${marketplace.id}`}
                          checked={selectedMarketplaces.includes(marketplace.name)}
                          onCheckedChange={() => toggleMarketplaceSelection(marketplace.name)}
                        />
                        <Label htmlFor={`marketplace-${marketplace.id}`}>
                          {marketplace.name}
                        </Label>
                      </div>
                    ))}
                    
                    {connectedMarketplaces.length === 0 && (
                      <div className="text-sm text-gray-500 pt-2">
                        <AlertCircle className="h-4 w-4 inline mr-2" />
                        No connected marketplaces. Please connect a marketplace first.
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Export Options */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Export Options</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>CSV Format</Label>
                  <div className="flex justify-between items-center p-2 rounded-md border">
                    <div className="flex items-center space-x-2">
                      <FileSpreadsheet className="h-5 w-5 text-blue-500" />
                      <span className="text-sm font-medium">Standard CSV</span>
                    </div>
                    <Button variant="outline" size="sm" disabled>
                      Change
                    </Button>
                  </div>
                </div>
                
                <div className="pt-4">
                  <Button
                    onClick={generateCSV}
                    disabled={
                      isExporting || 
                      selectedItems.length === 0 || 
                      selectedMarketplaces.length === 0
                    }
                    className="w-full"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    {isExporting ? "Generating..." : "Generate & Download CSV"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Item Selection Table */}
          <Card className="mt-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Select Items to Export</CardTitle>
              <CardDescription>
                {selectedItems.length} of {items.length} items selected
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectedItems.length === items.length && items.length > 0}
                          onCheckedChange={() => toggleAllItems(items.map(item => item.id))}
                          disabled={isLoadingItems}
                        />
                      </TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoadingItems ? (
                      [1, 2, 3, 4, 5].map((i) => (
                        <TableRow key={i}>
                          <TableCell>
                            <div className="h-4 w-4 rounded bg-gray-200 animate-pulse" />
                          </TableCell>
                          <TableCell>
                            <div className="h-4 w-32 rounded bg-gray-200 animate-pulse" />
                          </TableCell>
                          <TableCell>
                            <div className="h-4 w-20 rounded bg-gray-200 animate-pulse" />
                          </TableCell>
                          <TableCell>
                            <div className="h-4 w-16 rounded bg-gray-200 animate-pulse" />
                          </TableCell>
                          <TableCell>
                            <div className="h-4 w-16 rounded bg-gray-200 animate-pulse" />
                          </TableCell>
                        </TableRow>
                      ))
                    ) : items.length > 0 ? (
                      items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <Checkbox
                              checked={selectedItems.includes(item.id)}
                              onCheckedChange={() => toggleItemSelection(item.id)}
                            />
                          </TableCell>
                          <TableCell className="font-medium">{item.name}</TableCell>
                          <TableCell>{item.category}</TableCell>
                          <TableCell>${item.basePrice.toFixed(2)}</TableCell>
                          <TableCell>
                            <span className={`text-xs font-medium rounded-full px-2 py-1 ${
                              item.status === "listed" 
                                ? "bg-green-100 text-green-800" 
                                : item.status === "sold" 
                                ? "bg-blue-100 text-blue-800" 
                                : "bg-orange-100 text-orange-800"
                            }`}>
                              {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-4">
                          No items available
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
      
      {/* Marketplace Connection Wizard */}
      <MarketplaceConnectionWizard 
        open={isWizardOpen} 
        onOpenChange={setIsWizardOpen} 
      />
    </div>
  );
}

// Marketplace Card Component
function MarketplaceCard({ 
  marketplace, 
  isConnected = false,
  onConnect
}: { 
  marketplace: MarketplaceWithUI, 
  isConnected?: boolean,
  onConnect?: () => void
}) {
  return (
    <Card className={`border overflow-hidden ${marketplace.bgColor}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          {marketplace.name}
          {isConnected && (
            <Badge className={marketplace.badgeClass}>Connected</Badge>
          )}
        </CardTitle>
        <CardDescription>
          {marketplace.description || `Connect to ${marketplace.name}`}
        </CardDescription>
      </CardHeader>
      <CardContent className="h-24 flex items-center justify-center">
        <img
          src={marketplace.logo}
          alt={`${marketplace.name} logo`}
          className="max-h-16 max-w-[80%] object-contain"
        />
      </CardContent>
      <CardFooter className="pt-1">
        {isConnected ? (
          <Button variant="outline" className="w-full">
            <ShoppingCart className="h-4 w-4 mr-1" /> Manage Products
          </Button>
        ) : (
          <Button variant="default" className="w-full" onClick={onConnect}>
            <Plus className="h-4 w-4 mr-1" /> Connect
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
