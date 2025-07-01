import { Item } from "@shared/schema";

interface AutoPrintLabelsProps {
  item: Item;
  quantity?: number;
  autoOpen?: boolean;
}

// Utility function to generate barcode labels (no hooks)
export function createPrintLabels(item: Item, quantity = 1) {

  const generateBarcodeLabels = (printQuantity: number): string | null => {
    if (!item.sku) return null;
    
    const cleanSku = (item.sku || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    const barcodeUrl = `https://barcode.tec-it.com/barcode.ashx?data=${encodeURIComponent(cleanSku)}&code=Code128&translate-esc=on&unit=Fit&dpi=96&imagetype=Gif&rotation=0&color=%23000000&bgcolor=%23ffffff&qunit=Mm&quiet=0`;
    
    // Generate multiple labels based on quantity
    const labels = Array.from({ length: printQuantity }, (_, index) => {
      const labelNumber = index + 1;
      return `
        <div class="label-page" style="page-break-after: ${labelNumber < printQuantity ? 'always' : 'auto'}; margin: 0; padding: 20px;">
          <div class="label-container" style="border: 2px solid #000; padding: 15px; background: white; text-align: center; width: 4in; height: 2in; margin: 0 auto; display: flex; flex-direction: column; justify-content: center;">
            <h3 style="margin: 0 0 10px 0; font-size: 14px; font-weight: bold;">${item.name}</h3>
            <div style="margin: 10px 0;">
              <img src="${barcodeUrl}" alt="Barcode for ${item.sku}" style="max-width: 100%; height: auto;" onload="if(${labelNumber === 1}) window.print();" />
            </div>
            <p style="margin: 5px 0; font-size: 12px; font-family: monospace; font-weight: bold;">${item.sku}</p>
            <div style="display: flex; justify-content: space-between; font-size: 10px; margin-top: 5px;">
              <span>Category: ${item.category || 'N/A'}</span>
              <span>Label ${labelNumber}/${printQuantity}</span>
            </div>
          </div>
        </div>
      `;
    }).join('');

    const printContent = `
      <html>
        <head>
          <title>Barcode Labels - ${item.name}</title>
          <style>
            body { margin: 0; font-family: Arial, sans-serif; }
            .label-page { margin: 0; }
            .label-container { 
              border: 2px solid #000; 
              padding: 15px; 
              background: white; 
              text-align: center; 
              width: 4in; 
              height: 2in; 
              margin: 0 auto; 
              display: flex; 
              flex-direction: column; 
              justify-content: center;
              box-sizing: border-box;
            }
            img { max-width: 100%; height: auto; }
            @media print {
              body { margin: 0; }
              .no-print { display: none; }
              .label-page { margin: 0; padding: 0; }
            }
            @page {
              size: 4.25in 2.75in;
              margin: 0.125in;
            }
          </style>
        </head>
        <body>
          ${labels}
          <div class="no-print" style="text-align: center; padding: 20px; background: #f5f5f5; margin-top: 20px;">
            <h3>Print Preview - ${printQuantity} Label${printQuantity > 1 ? 's' : ''}</h3>
            <p>This window will automatically trigger print when the barcode images load.</p>
            <p><strong>Item:</strong> ${item.name}</p>
            <p><strong>SKU:</strong> ${item.sku || 'N/A'}</p>
            <p><strong>Labels to print:</strong> ${printQuantity}</p>
            <button onclick="window.print()" style="padding: 10px 20px; margin: 10px; cursor: pointer;">Print Now</button>
            <button onclick="window.close()" style="padding: 10px 20px; margin: 10px; cursor: pointer;">Close</button>
          </div>
        </body>
      </html>
    `;

    return printContent;
  };

  const openPrintPreview = (printQuantity: number): boolean => {
    try {
      const printWindow = window.open('', '_blank', 'width=800,height=600');
      if (printWindow) {
        const printContent = generateBarcodeLabels(printQuantity);
        if (printContent) {
          printWindow.document.write(printContent);
        }
        printWindow.document.close();
        return true;
      } else {
        return false;
      }
    } catch (error) {
      return false;
    }
  };

  return {
    openPrintPreview,
    generateBarcodeLabels
  };
}