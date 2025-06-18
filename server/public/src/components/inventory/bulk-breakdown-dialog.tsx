import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BulkBreakdownDnd } from "./bulk-breakdown-dnd";
import { Item } from "@shared/schema";

interface BulkBreakdownDialogProps {
  item: Item;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete?: () => void;
}

export function BulkBreakdownDialog({
  item,
  open,
  onOpenChange,
  onComplete,
}: BulkBreakdownDialogProps) {
  const handleComplete = () => {
    onOpenChange(false);
    if (onComplete) onComplete();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Breakdown: {item.name}</DialogTitle>
          <DialogDescription>
            Drag weight options to create new inventory items from this bulk item.
          </DialogDescription>
        </DialogHeader>
        <BulkBreakdownDnd item={item} onComplete={handleComplete} />
      </DialogContent>
    </Dialog>
  );
}