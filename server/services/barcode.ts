/**
 * Barcode generation service
 */
import JsBarcode from 'jsbarcode';
import { DOMImplementation, XMLSerializer } from 'xmldom';
import { Item } from '@shared/schema';

/**
 * Generate a barcode as a data URL
 */
export function generateBarcodeData(text: string): string {
  try {
    const xmlSerializer = new XMLSerializer();
    const document = new DOMImplementation().createDocument('http://www.w3.org/1999/xhtml', 'html', null);
    const svgNode = document.createElementNS('http://www.w3.org/2000/svg', 'svg');

    JsBarcode(svgNode, text, {
      format: 'CODE128',
      lineColor: '#000',
      width: 2,
      height: 100,
      displayValue: true,
      fontSize: 16,
      margin: 10,
      background: '#ffffff'
    });

    const svgText = xmlSerializer.serializeToString(svgNode);
    const encoded = Buffer.from(svgText).toString('base64');
    return `data:image/svg+xml;base64,${encoded}`;
  } catch (error) {
    console.error('Error generating barcode:', error);
    return '';
  }
}

/**
 * Generate a barcode as an SVG string
 */
export function generateBarcodeSVG(text: string): string {
  try {
    const xmlSerializer = new XMLSerializer();
    const document = new DOMImplementation().createDocument('http://www.w3.org/1999/xhtml', 'html', null);
    const svgNode = document.createElementNS('http://www.w3.org/2000/svg', 'svg');

    JsBarcode(svgNode, text, {
      format: 'CODE128',
      lineColor: '#000',
      width: 2,
      height: 100,
      displayValue: true,
      fontSize: 16,
      margin: 10,
      background: '#ffffff'
    });

    return xmlSerializer.serializeToString(svgNode);
  } catch (error) {
    console.error('Error generating barcode SVG:', error);
    return '';
  }
}

/**
 * Generate a barcode for an item
 */
export function generateBarcodeForItem(item: Item): string {
  // Use the SKU as the barcode value
  return generateBarcodeData(item.sku);
}