import { useState } from "react";
import { useLocation } from "wouter";
import ItemGrid from "@/components/inventory/item-grid";
import AddItemModal from "@/components/modals/add-item-modal";

export default function Inventory() {
  const [location] = useLocation();
  const [isAddModalOpen, setIsAddModalOpen] = useState(
    location === "/inventory?action=new"
  );

  return (
    <div>
      <ItemGrid showViewAll={false} />
      
      <AddItemModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />
    </div>
  );
}
