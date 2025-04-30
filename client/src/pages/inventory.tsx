import { useState } from "react";
import { useLocation } from "wouter";
import { Helmet } from "react-helmet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Package, Upload, ArrowDownToLine, Plus } from "lucide-react";
import ItemGrid from "@/components/inventory/item-grid";
import AddItemModal from "@/components/modals/add-item-modal";
import CSVImport from "@/components/inventory/csv-import";

export default function Inventory() {
  const [location] = useLocation();
  const [isAddModalOpen, setIsAddModalOpen] = useState(
    location === "/inventory?action=new"
  );
  const [activeTab, setActiveTab] = useState("view");

  return (
    <div className="space-y-6">
      <Helmet>
        <title>Inventory Management | MrManifestLister</title>
      </Helmet>
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center">
            <Package className="mr-2 h-6 w-6" />
            Inventory Management
          </h1>
          <p className="text-slate-500 mt-1">
            Manage your products inventory across all marketplaces
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setActiveTab("import")}>
            <Upload className="mr-2 h-4 w-4" />
            Import Inventory
          </Button>
          <Button onClick={() => setIsAddModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Item
          </Button>
        </div>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-3 w-full max-w-md">
          <TabsTrigger value="view">View Inventory</TabsTrigger>
          <TabsTrigger value="import">Import CSV</TabsTrigger>
          <TabsTrigger value="export">Export</TabsTrigger>
        </TabsList>
        
        <TabsContent value="view" className="space-y-6">
          <ItemGrid showViewAll={false} />
        </TabsContent>
        
        <TabsContent value="import" className="space-y-6">
          <CSVImport />
        </TabsContent>
        
        <TabsContent value="export" className="space-y-6">
          <div className="bg-white rounded-lg border p-6 text-center">
            <ArrowDownToLine className="h-10 w-10 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium">Export Inventory</h3>
            <p className="text-gray-500 mt-2 mb-4">
              Export your inventory data in CSV format for backup or use in other systems
            </p>
            <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2 justify-center">
              <Button variant="outline">Export All Items</Button>
              <Button variant="outline">Export Shopify Items</Button>
              <Button variant="outline">Export eBay Items</Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
      
      <AddItemModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />
    </div>
  );
}
