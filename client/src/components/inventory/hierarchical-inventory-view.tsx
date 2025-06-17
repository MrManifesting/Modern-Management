import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, Package, Scissors } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Item {
  id: number;
  name: string;
  sku: string;
  quantity: number;
  weight: string;
  parentItemId: number | null;
  status: string;
  category: string;
}

interface ParentChildItem extends Item {
  children: Item[];
  isExpanded?: boolean;
}

export function HierarchicalInventoryView() {
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['/api/items'],
  });

  // Group items by parent-child relationships
  const hierarchicalItems = items.reduce((acc: ParentChildItem[], item: Item) => {
    if (!item.parentItemId) {
      // This is a parent item
      const children = items.filter((child: Item) => child.parentItemId === item.id);
      acc.push({
        ...item,
        children,
        isExpanded: expandedItems.has(item.id)
      });
    }
    return acc;
  }, []);

  const toggleExpand = (itemId: number) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
    }
    setExpandedItems(newExpanded);
  };

  const getQuantityBadgeColor = (quantity: number) => {
    if (quantity === 0) return "bg-red-100 text-red-800";
    if (quantity < 5) return "bg-yellow-100 text-yellow-800";
    return "bg-green-100 text-green-800";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-4">
        <Package className="h-5 w-5 text-green-600" />
        <h2 className="text-lg font-semibold">Hierarchical Inventory View</h2>
        <Badge variant="outline">{hierarchicalItems.length} parent items</Badge>
      </div>

      {hierarchicalItems.map((parentItem) => (
        <div key={parentItem.id} className="border rounded-lg overflow-hidden">
          {/* Parent Item Row */}
          <div
            className={cn(
              "flex items-center p-4 hover:bg-gray-50 cursor-pointer",
              parentItem.children.length > 0 && "border-b"
            )}
            onClick={() => parentItem.children.length > 0 && toggleExpand(parentItem.id)}
          >
            <div className="flex items-center gap-2 flex-1">
              {parentItem.children.length > 0 ? (
                expandedItems.has(parentItem.id) ? (
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                )
              ) : (
                <div className="w-4 h-4" />
              )}
              
              <Package className="h-4 w-4 text-green-600" />
              
              <div className="flex-1">
                <div className="font-medium">{parentItem.name}</div>
                <div className="text-sm text-gray-500">
                  SKU: {parentItem.sku} • Weight: {parentItem.weight}
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Badge className={getQuantityBadgeColor(parentItem.quantity)}>
                  Qty: {parentItem.quantity}
                </Badge>
                
                {parentItem.children.length > 0 && (
                  <Badge variant="outline" className="bg-blue-50 text-blue-700">
                    <Scissors className="h-3 w-3 mr-1" />
                    {parentItem.children.length} breakdown{parentItem.children.length !== 1 ? 's' : ''}
                  </Badge>
                )}
                
                <Badge 
                  variant={parentItem.status === 'available' ? 'default' : 'secondary'}
                  className={parentItem.status === 'available' ? 'bg-green-100 text-green-800' : ''}
                >
                  {parentItem.status}
                </Badge>
              </div>
            </div>
          </div>

          {/* Child Items (Breakdown Items) */}
          {parentItem.children.length > 0 && expandedItems.has(parentItem.id) && (
            <div className="bg-gray-50">
              {parentItem.children.map((child, index) => (
                <div
                  key={child.id}
                  className={cn(
                    "flex items-center p-4 pl-12 hover:bg-gray-100",
                    index < parentItem.children.length - 1 && "border-b border-gray-200"
                  )}
                >
                  <Scissors className="h-4 w-4 text-orange-600 mr-2" />
                  
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{child.name}</div>
                    <div className="text-sm text-gray-500">
                      SKU: {child.sku} • Weight: {child.weight}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Badge className={getQuantityBadgeColor(child.quantity)}>
                      Qty: {child.quantity}
                    </Badge>
                    
                    <Badge variant="outline" className="bg-orange-50 text-orange-700">
                      Breakdown Item
                    </Badge>
                    
                    <Badge 
                      variant={child.status === 'available' ? 'default' : 'secondary'}
                      className={child.status === 'available' ? 'bg-green-100 text-green-800' : ''}
                    >
                      {child.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      {hierarchicalItems.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p>No inventory items found</p>
        </div>
      )}
    </div>
  );
}