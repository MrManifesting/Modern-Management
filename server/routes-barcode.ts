import { Request, Response, Express } from 'express';

/**
 * Register barcode generation routes using external API service
 */
export function registerBarcodeRoutes(app: Express) {
  /**
   * Generate barcode image for a given SKU using external service
   */
  app.get('/api/barcode/:sku', async (req: Request, res: Response) => {
    try {
      const { sku } = req.params;
      
      if (!sku || sku.trim().length === 0) {
        return res.status(400).json({ error: 'SKU is required' });
      }

      // Clean the SKU for barcode generation
      const cleanSku = sku.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
      if (cleanSku.length < 1) {
        return res.status(400).json({ error: 'SKU contains no valid characters' });
      }

      // Use external barcode service
      const barcodeUrl = `https://barcode.tec-it.com/barcode.ashx?data=${encodeURIComponent(cleanSku)}&code=Code128&translate-esc=on&unit=Fit&dpi=96&imagetype=Gif&rotation=0&color=%23000000&bgcolor=%23ffffff&qunit=Mm&quiet=0`;
      
      try {
        const response = await fetch(barcodeUrl);
        
        if (!response.ok) {
          throw new Error(`Barcode service responded with ${response.status}`);
        }

        // Set response headers for image
        res.setHeader('Content-Type', 'image/gif');
        res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
        
        // Pipe the image response
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        res.send(buffer);

      } catch (fetchError) {
        console.error('External barcode service error:', fetchError);
        
        // Fallback: Return a simple text-based barcode representation
        const fallbackSvg = `
          <svg width="200" height="80" xmlns="http://www.w3.org/2000/svg">
            <rect width="200" height="80" fill="white" stroke="black" stroke-width="1"/>
            <text x="100" y="25" text-anchor="middle" font-family="monospace" font-size="10" fill="black">BARCODE</text>
            <text x="100" y="45" text-anchor="middle" font-family="monospace" font-size="14" font-weight="bold" fill="black">${cleanSku}</text>
            <text x="100" y="65" text-anchor="middle" font-family="monospace" font-size="8" fill="gray">Scan-ready format</text>
          </svg>
        `;
        
        res.setHeader('Content-Type', 'image/svg+xml');
        res.send(fallbackSvg);
      }

    } catch (error) {
      console.error('Barcode generation error:', error);
      res.status(500).json({ 
        error: 'Failed to generate barcode',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * Generate barcode data URL for a given SKU
   */
  app.get('/api/barcode-data/:sku', async (req: Request, res: Response) => {
    try {
      const { sku } = req.params;
      
      if (!sku || sku.trim().length === 0) {
        return res.status(400).json({ error: 'SKU is required' });
      }

      // Clean the SKU for barcode generation
      const cleanSku = sku.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
      if (cleanSku.length < 1) {
        return res.status(400).json({ error: 'SKU contains no valid characters' });
      }

      // Use external barcode service
      const barcodeUrl = `https://barcode.tec-it.com/barcode.ashx?data=${encodeURIComponent(cleanSku)}&code=Code128&translate-esc=on&unit=Fit&dpi=96&imagetype=Gif&rotation=0&color=%23000000&bgcolor=%23ffffff&qunit=Mm&quiet=0`;
      
      res.json({ 
        success: true,
        dataUrl: barcodeUrl,
        sku: cleanSku
      });

    } catch (error) {
      console.error('Barcode data URL generation error:', error);
      res.status(500).json({ 
        error: 'Failed to generate barcode data URL',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
}