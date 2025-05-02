import { useState } from "react";
import { useLocation } from "wouter";
import { Helmet } from "react-helmet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Package, ArrowDownToLine, Plus, FileSpreadsheet } from "lucide-react";
import ItemGrid from "@/components/inventory/item-grid";
import AddItemModal from "@/components/modals/add-item-modal";

export default function Inventory() {
  const [location] = useLocation();
  const [isAddModalOpen, setIsAddModalOpen] = useState(
    location === "/inventory?action=new"
  );
  const [activeTab, setActiveTab] = useState("view");

  // Function to handle CSV export
  const handleExportCSV = () => {
    window.location.href = '/api/export-csv?format=all';
  };

  // Function to handle price sheet export
  const handlePriceSheet = () => {
    window.location.href = '/api/price-sheet';
  };

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
          <Button variant="outline" className="gap-1.5" onClick={handlePriceSheet}>
            <FileSpreadsheet className="h-4 w-4" />
            Price Sheet
          </Button>
          <Button variant="outline" className="gap-1.5" onClick={handleExportCSV}>
            <ArrowDownToLine className="h-4 w-4" />
            Export
          </Button>
        </div>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-1 w-full max-w-md">
          <TabsTrigger value="view">View Inventory</TabsTrigger>
        </TabsList>
        
        <TabsContent value="view" className="space-y-6">
          <ItemGrid showViewAll={false} />
        </TabsContent>
      </Tabs>
      
      <AddItemModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />
    </div>
  );
}
