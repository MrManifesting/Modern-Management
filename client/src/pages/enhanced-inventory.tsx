import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ExternalLink, Package, DollarSign, Weight, Grid, List, FileSpreadsheet, Eye, Edit, MoreHorizontal } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import AddItemModal from '@/components/modals/add-item-modal';
import EditItemModal from '@/components/modals/edit-item-modal';
import ViewItemModal from '@/components/modals/view-item-modal';
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
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<EnhancedItem | null>(null);
  const { toast } = useToast();

  const { data: rawItems, isLoading, refetch } = useQuery<EnhancedItem[]>({
    queryKey: ['/api/inventory/enhanced'],
  });

  // Sort items to show available quantity items at the top, then draft items with quantity
  const items = rawItems ? [...rawItems].sort((a, b) => {
    // First priority: Active items with quantity > 0
    if (a.status === 'active' && a.quantity > 0 && (b.status !== 'active' || b.quantity <= 0)) return -1;
    if (b.status === 'active' && b.quantity > 0 && (a.status !== 'active' || a.quantity <= 0)) return 1;
    
    // Second priority: Draft items with quantity > 0
    if (a.status === 'draft' && a.quantity > 0 && b.quantity <= 0) return -1;
    if (b.status === 'draft' && b.quantity > 0 && a.quantity <= 0) return 1;
    
    // Third priority: Sort by quantity descending within same status
    if (a.status === b.status) return b.quantity - a.quantity;
    
    // Finally sort by status (active before draft before others)
    const statusOrder = { 'active': 0, 'draft': 1, 'archived': 2 };
    return (statusOrder[a.status as keyof typeof statusOrder] || 3) - (statusOrder[b.status as keyof typeof statusOrder] || 3);
  }) : [];

  const formatPrice = (price: string | number) => {
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    return isNaN(numPrice) ? '$0.00' : `$${numPrice.toFixed(2)}`;
  };

  const getShopifyUrl = (item: EnhancedItem) => {
    if (item.shopifyId) {
      return `https://mrlisterscurations.myshopify.com/admin/products/${item.shopifyId}`;
    }
    return `https://mrlisterscurations.myshopify.com/search?q=${encodeURIComponent(item.name)}`;
  };

  const getSheetsUrl = (item: EnhancedItem) => {
    const baseUrl = 'https://docs.google.com/spreadsheets/d/1QuACYR7mgsm3EKyQVFTYnbEnZt0NaBQfWqkHRHz4bTU/edit';
    const searchTerm = item.sku || item.name;
    return `${baseUrl}#gid=0&range=A:Z&search=${encodeURIComponent(searchTerm)}`;
  };

  const handleEditItem = (itemId: number) => {
    const item = items?.find(i => i.id === itemId);
    if (item) {
      setEditingItem(item);
      setIsEditModalOpen(true);
    }
  };

  const handleViewShopify = async (item: EnhancedItem) => {
    try {
      const response = await fetch(`/api/items/${item.id}/shopify-store-view`);
      const data = await response.json();
      if (data.url) {
        window.open(data.url, '_blank');
      } else {
        window.open(getShopifyUrl(item), '_blank');
      }
    } catch (error) {
      window.open(getShopifyUrl(item), '_blank');
    }
  };

  const handleViewSheets = async (item: EnhancedItem) => {
    try {
      const response = await fetch(`/api/items/${item.id}/sheets-view`, {
        method: 'GET',
        credentials: 'include'
      });
      const data = await response.json();
      if (data.url) {
        window.open(data.url, '_blank');
      } else {
        window.open(getSheetsUrl(item), '_blank');
      }
    } catch (error) {
      window.open(getSheetsUrl(item), '_blank');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Enhanced Inventory</h1>
        </div>
        <div className="text-center py-8">Loading inventory...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Enhanced Inventory</h1>
          <p className="text-gray-600">
            {items?.length || 0} items • Merged database and Google Sheets data
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={viewMode === 'table' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('table')}
          >
            <List className="w-4 h-4 mr-2" />
            Table
          </Button>
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('grid')}
          >
            <Grid className="w-4 h-4 mr-2" />
            Grid
          </Button>
          <Button onClick={() => setIsAddModalOpen(true)}>
            <Package className="w-4 h-4 mr-2" />
            Add Item
          </Button>
        </div>
      </div>

      {/* Table View */}
      {viewMode === 'table' && (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">Image</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Weight</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>THCa%</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-12">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items?.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <Package className="w-4 h-4 text-gray-400" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{item.name}</div>
                        <div className="text-sm text-gray-500">{item.brand}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                        {item.sku || 'No SKU'}
                      </code>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {item.weight || 'N/A'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{formatPrice(item.basePrice)}</div>
                      {item.costPrice && (
                        <div className="text-xs text-gray-500">
                          Cost: {formatPrice(item.costPrice)}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={item.quantity > 0 ? 'default' : 'destructive'}>
                        {item.quantity || 0}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {item.thcaPercentage ? (
                        <Badge variant="secondary">{item.thcaPercentage}%</Badge>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          item.status === 'active' ? 'default' :
                          item.status === 'draft' ? 'secondary' : 'outline'
                        }
                      >
                        {item.status || 'draft'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <ViewItemModal
                            item={item}
                            trigger={
                              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                <Eye className="w-4 h-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                            }
                          />
                          <EditItemModal
                            item={item}
                            trigger={
                              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                <Edit className="w-4 h-4 mr-2" />
                                Edit Item
                              </DropdownMenuItem>
                            }
                          />
                          <DropdownMenuItem onClick={() => handleViewShopify(item)}>
                            <ExternalLink className="w-4 h-4 mr-2" />
                            View on Shopify
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleViewSheets(item)}>
                            <FileSpreadsheet className="w-4 h-4 mr-2" />
                            View in Sheets
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Grid View */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {items?.map((item) => (
            <Card key={item.id} className="group hover:shadow-lg transition-shadow">
              <CardHeader className="pb-2">
                <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden mb-2">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-12 h-12 text-gray-400" />
                    </div>
                  )}
                </div>
                <CardTitle className="text-sm line-clamp-2">{item.name}</CardTitle>
                <div className="text-xs text-gray-500">{item.brand}</div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-bold">{formatPrice(item.basePrice)}</span>
                    <Badge variant={item.quantity > 0 ? 'default' : 'destructive'}>
                      {item.quantity || 0}
                    </Badge>
                  </div>
                  
                  <div className="flex gap-1 flex-wrap">
                    {item.weight && (
                      <Badge variant="outline" className="text-xs">
                        {item.weight}
                      </Badge>
                    )}
                    {item.thcaPercentage && (
                      <Badge variant="secondary" className="text-xs">
                        {item.thcaPercentage}%
                      </Badge>
                    )}
                    <Badge
                      variant={
                        item.status === 'active' ? 'default' :
                        item.status === 'draft' ? 'secondary' : 'outline'
                      }
                      className="text-xs"
                    >
                      {item.status || 'draft'}
                    </Badge>
                  </div>

                  <div className="flex gap-1">
                    <ViewItemModal
                      item={item}
                      trigger={
                        <Button variant="outline" size="sm" className="flex-1">
                          <Eye className="w-3 h-3 mr-1" />
                          View
                        </Button>
                      }
                    />
                    <EditItemModal
                      item={item}
                      trigger={
                        <Button variant="outline" size="sm" className="flex-1">
                          <Edit className="w-3 h-3 mr-1" />
                          Edit
                        </Button>
                      }
                    />
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm">
                          <MoreHorizontal className="w-3 h-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleViewShopify(item)}>
                          <ExternalLink className="w-4 h-4 mr-2" />
                          View on Shopify
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleViewSheets(item)}>
                          <FileSpreadsheet className="w-4 h-4 mr-2" />
                          View in Sheets
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modals */}
      <AddItemModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />
    </div>
  );
}