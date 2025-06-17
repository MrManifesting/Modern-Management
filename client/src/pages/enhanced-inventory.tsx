import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ExternalLink, Package, DollarSign, Weight, Grid, List, FileSpreadsheet, Eye, Edit, MoreHorizontal } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import AddItemModal from '@/components/modals/add-item-modal';
import { Item } from '@shared/schema';

interface EnhancedItem {
  id: number;
  name: string;
  sku: string;
  handle: string;
  imageUrl: string;
  basePrice: string;
  costPrice: string;
  quantity: number;
  weight: string;
  brand: string;
  category: string;
  status: string;
  description: string;
  shopifyId: string | null;
  strainBannerText: string;
  thcaPercentage: string;
  coasLink: string;
}

export default function EnhancedInventory() {
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [viewingItem, setViewingItem] = useState<Item | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const { toast } = useToast();
  const { data: items = [], isLoading, error } = useQuery<EnhancedItem[]>({
    queryKey: ['/api/inventory/enhanced'],
  });

  // Handle viewing in Google Sheets
  const handleViewSheetsClick = (itemId: number) => {
    apiRequest('GET', `/api/items/${itemId}/sheets-view`)
      .then(response => response.json())
      .then(data => {
        if (data.success && data.url) {
          window.open(data.url, '_blank');
        } else {
          toast({
            title: "Error",
            description: data.message || "Unable to open Google Sheets view.",
            variant: "destructive"
          });
        }
      })
      .catch(() => {
        toast({
          title: "Error",
          description: "Failed to open Google Sheets view. Please try again.",
          variant: "destructive"
        });
      });
  };

  // Handle edit item
  const handleEditItem = async (itemId: number) => {
    try {
      const response = await apiRequest('GET', `/api/items/${itemId}`);
      const item = await response.json();
      setEditingItem(item);
      setIsEditModalOpen(true);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load item details for editing.",
        variant: "destructive"
      });
    }
  };

  // Handle view item details
  const handleViewItem = async (itemId: number) => {
    try {
      const response = await apiRequest('GET', `/api/items/${itemId}`);
      const item = await response.json();
      setViewingItem(item);
      setIsViewModalOpen(true);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load item details.",
        variant: "destructive"
      });
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded mb-4 w-1/3"></div>
          <div className="space-y-3">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card className="max-w-md mx-auto">
          <CardContent className="p-6 text-center">
            <h2 className="text-lg font-semibold text-red-600 mb-2">Error Loading Inventory</h2>
            <p className="text-gray-600">Unable to load enhanced inventory data from Google Sheets.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const formatPrice = (price: string | number) => {
    if (!price || price === '0' || price === 0) return 'No Price';
    
    // Handle string prices that might have currency symbols
    const priceStr = String(price).replace(/[$,\s]/g, '');
    const num = parseFloat(priceStr);
    
    if (isNaN(num) || num === 0) return 'No Price';
    return `$${num.toFixed(2)}`;
  };

  const getShopifyUrl = (item: EnhancedItem) => {
    if (item.shopifyId) {
      return `https://mrlisterscurations.myshopify.com/admin/products/${item.shopifyId}`;
    }
    // Fallback to search if no shopifyId
    return `https://mrlisterscurations.myshopify.com/admin/products?query=${encodeURIComponent(item.handle || item.name)}`;
  };

  // Sort items - recently added with available quantities first, then other available items, then out of stock
  const sortedItems = [...items].sort((a, b) => {
    const aQuantity = a.quantity ?? 0;
    const bQuantity = b.quantity ?? 0;
    const dateA = new Date(a.id || 0); // Using ID as proxy for creation order since we don't have createdAt
    const dateB = new Date(b.id || 0);
    
    // Define "recently added" as items with higher IDs (more recently created)
    const totalItems = items.length;
    const recentThreshold = Math.max(1, Math.floor(totalItems * 0.2)); // Top 20% of items by ID
    const maxId = Math.max(...items.map(item => item.id));
    const recentIdThreshold = maxId - recentThreshold;
    
    const aIsRecent = a.id > recentIdThreshold;
    const bIsRecent = b.id > recentIdThreshold;
    
    // Priority 1: Recently added items with available quantities (newest first)
    if (aIsRecent && aQuantity > 0 && !(bIsRecent && bQuantity > 0)) return -1;
    if (bIsRecent && bQuantity > 0 && !(aIsRecent && aQuantity > 0)) return 1;
    
    // Both are recent with available quantities - sort by newest first (higher ID)
    if (aIsRecent && aQuantity > 0 && bIsRecent && bQuantity > 0) {
      return b.id - a.id;
    }
    
    // Priority 2: Other items with available quantities (newest first)
    if (aQuantity > 0 && bQuantity <= 0) return -1;
    if (bQuantity > 0 && aQuantity <= 0) return 1;
    
    // Both have available quantities - sort by newest first (higher ID)
    if (aQuantity > 0 && bQuantity > 0) {
      return b.id - a.id;
    }
    
    // Priority 3: Out of stock items (newest first)
    if (b.id !== a.id) {
      return b.id - a.id;
    }
    
    // Final fallback: alphabetical
    return (a.name || '').localeCompare(b.name || '');
  });

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gold-600">Enhanced Inventory</h1>
          <div className="flex gap-4 mt-2">
            <p className="text-gray-600">
              Total Items: <span className="font-semibold">{sortedItems.length}</span>
            </p>
            <p className="text-green-600">
              In Stock: <span className="font-semibold">{sortedItems.filter(item => item.quantity > 0).length}</span>
            </p>
            <p className="text-yellow-600">
              Low Stock: <span className="font-semibold">{sortedItems.filter(item => item.quantity > 0 && item.quantity <= 10).length}</span>
            </p>
            <p className="text-red-600">
              Out of Stock: <span className="font-semibold">{sortedItems.filter(item => item.quantity === 0).length}</span>
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <div className="flex rounded-lg border">
            <Button
              variant={viewMode === 'table' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('table')}
              className="rounded-r-none"
            >
              <List className="w-4 h-4 mr-1" />
              Table
            </Button>
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="rounded-l-none"
            >
              <Grid className="w-4 h-4 mr-1" />
              Grid
            </Button>
          </div>
          <Button variant="outline" onClick={() => window.location.reload()}>
            Refresh Data
          </Button>
        </div>
      </div>

      {viewMode === 'table' ? (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-20">Image</TableHead>
                <TableHead>Product Name</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Weight</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Cost</TableHead>
                <TableHead>Available Stock</TableHead>
                <TableHead>THCa %</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedItems.map((item) => (
                <TableRow key={item.id} className="hover:bg-gray-50">
                  <TableCell>
                    <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center">
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                            (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                          }}
                        />
                      ) : null}
                      <Package className="w-6 h-6 text-gray-400 hidden" />
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="max-w-sm">
                      <div className="font-medium text-sm line-clamp-2">{item.name}</div>
                      {item.strainBannerText && (
                        <div className="text-xs text-gray-500 mt-1 line-clamp-1">
                          {item.strainBannerText}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                      {item.sku}
                    </span>
                  </TableCell>
                  <TableCell>
                    {item.weight ? (
                      <Badge variant="outline" className="text-xs">
                        <Weight className="w-3 h-3 mr-1" />
                        {item.weight}
                      </Badge>
                    ) : (
                      <span className="text-gray-400 text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className={`font-semibold ${item.basePrice !== '0' ? 'text-green-600' : 'text-gray-400'}`}>
                      {formatPrice(item.basePrice)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={`font-semibold ${item.costPrice !== '0' ? 'text-gray-700' : 'text-gray-400'}`}>
                      {formatPrice(item.costPrice)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {item.quantity > 10 ? (
                        <Badge className="bg-green-100 text-green-800 font-semibold">
                          {item.quantity} units
                        </Badge>
                      ) : item.quantity > 0 ? (
                        <Badge className="bg-yellow-100 text-yellow-800 font-semibold">
                          {item.quantity} units (Low Stock)
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="bg-red-100 text-red-800 font-semibold">
                          Out of Stock
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {item.thcaPercentage ? (
                      <Badge variant="secondary" className="text-xs">
                        {item.thcaPercentage}
                      </Badge>
                    ) : (
                      <span className="text-gray-400 text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="sm" variant="outline">
                            <MoreHorizontal className="w-3 h-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleViewItem(item.id)}>
                            <Eye className="w-4 h-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEditItem(item.id)}>
                            <Edit className="w-4 h-4 mr-2" />
                            Edit Item
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <a
                              href={getShopifyUrl(item)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center"
                            >
                              <ExternalLink className="w-4 h-4 mr-2" />
                              View on Shopify
                            </a>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleViewSheetsClick(item.id)}>
                            <FileSpreadsheet className="w-4 h-4 mr-2" />
                            View in Google Sheets
                          </DropdownMenuItem>
                          {item.coasLink && (
                            <DropdownMenuItem asChild>
                              <a 
                                href={item.coasLink} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="flex items-center"
                              >
                                <Package className="w-4 h-4 mr-2" />
                                View COAs
                              </a>
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {sortedItems.map((item) => (
            <Card key={item.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              <div className="aspect-square relative bg-gray-100">
                {item.imageUrl ? (
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/placeholder-product.png';
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package className="w-12 h-12 text-gray-400" />
                  </div>
                )}
                
                {item.quantity > 0 && (
                  <Badge className="absolute top-2 right-2 bg-green-600">
                    {item.quantity} in stock
                  </Badge>
                )}
              </div>

              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold line-clamp-2 min-h-[2.5rem]">
                  {item.name}
                </CardTitle>
                
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span className="font-mono bg-gray-100 px-2 py-1 rounded">
                    {item.sku}
                  </span>
                  {item.weight && (
                    <Badge variant="outline" className="text-xs">
                      <Weight className="w-3 h-3 mr-1" />
                      {item.weight}
                    </Badge>
                  )}
                </div>
              </CardHeader>

              <CardContent className="pt-0">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Price:</span>
                    <span className={`font-semibold ${item.basePrice !== '0' ? 'text-green-600' : 'text-gray-400'}`}>
                      {formatPrice(item.basePrice)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Cost:</span>
                    <span className={`font-semibold ${item.costPrice !== '0' ? 'text-gray-700' : 'text-gray-400'}`}>
                      {formatPrice(item.costPrice)}
                    </span>
                  </div>

                  {item.thcaPercentage && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">THCa:</span>
                      <Badge variant="secondary">{item.thcaPercentage}</Badge>
                    </div>
                  )}

                  {item.strainBannerText && (
                    <div className="text-xs text-gray-500 line-clamp-2">
                      {item.strainBannerText}
                    </div>
                  )}

                  <div className="flex gap-1 pt-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleViewItem(item.id)}
                      className="flex-1"
                    >
                      <Eye className="w-3 h-3 mr-1" />
                      View
                    </Button>
                    
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleEditItem(item.id)}
                      className="flex-1"
                    >
                      <Edit className="w-3 h-3 mr-1" />
                      Edit
                    </Button>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="sm" variant="outline">
                          <MoreHorizontal className="w-3 h-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <a
                            href={getShopifyUrl(item)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center"
                          >
                            <ExternalLink className="w-4 h-4 mr-2" />
                            View on Shopify
                          </a>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleViewSheetsClick(item.id)}>
                          <FileSpreadsheet className="w-4 h-4 mr-2" />
                          View in Google Sheets
                        </DropdownMenuItem>
                        {item.coasLink && (
                          <DropdownMenuItem asChild>
                            <a 
                              href={item.coasLink} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="flex items-center"
                            >
                              <Package className="w-4 h-4 mr-2" />
                              View COAs
                            </a>
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {items.length === 0 && (
        <div className="text-center py-12">
          <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-600 mb-2">No Products Found</h3>
          <p className="text-gray-500">
            No products available in the enhanced inventory at this time.
          </p>
        </div>
      )}

      {/* Edit Item Modal */}
      <AddItemModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingItem(null);
        }}
        editItem={editingItem}
      />

      {/* View Item Details Modal */}
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Item Details</DialogTitle>
            <DialogDescription>
              View complete information for this inventory item
            </DialogDescription>
          </DialogHeader>
          
          {viewingItem && (
            <div className="space-y-6">
              {/* Item Images */}
              {viewingItem.images && Array.isArray(viewingItem.images) && viewingItem.images.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium">Images</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {viewingItem.images.map((image: string, index: number) => (
                      <div key={index} className="aspect-square relative bg-gray-100 rounded-lg overflow-hidden">
                        <img
                          src={image}
                          alt={`${viewingItem.name} image ${index + 1}`}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Item Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2">Basic Information</h4>
                  <div className="space-y-2 text-sm">
                    <div><strong>Name:</strong> {viewingItem.name}</div>
                    <div><strong>SKU:</strong> {viewingItem.sku || 'Not assigned'}</div>
                    <div><strong>Category:</strong> {viewingItem.category || 'N/A'}</div>
                    <div><strong>Brand:</strong> {viewingItem.brand || 'N/A'}</div>
                    <div><strong>Weight:</strong> {viewingItem.weight || 'N/A'}</div>
                    <div><strong>Status:</strong> {viewingItem.status || 'N/A'}</div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Pricing & Inventory</h4>
                  <div className="space-y-2 text-sm">
                    <div><strong>Base Price:</strong> {formatPrice(viewingItem.basePrice)}</div>
                    <div><strong>Cost Price:</strong> {formatPrice(viewingItem.costPrice)}</div>
                    <div><strong>Sale Price:</strong> {formatPrice(viewingItem.salePrice)}</div>
                    <div><strong>Quantity:</strong> {viewingItem.quantity || 0} units</div>
                  </div>
                </div>
              </div>

              {/* Description */}
              {viewingItem.description && (
                <div>
                  <h4 className="font-medium mb-2">Description</h4>
                  <p className="text-sm text-gray-600">{viewingItem.description}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-4 border-t">
                <Button
                  onClick={() => {
                    setIsViewModalOpen(false);
                    handleEditItem(viewingItem.id);
                  }}
                  className="flex-1"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Item
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsViewModalOpen(false)}
                  className="flex-1"
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}