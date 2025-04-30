import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Camera, Mic, ScanLine, Search, Loader2, Type, Smartphone } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// For barcode scanning
declare global {
  interface Window {
    Html5Qrcode: any;
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}

interface ProductInfo {
  name: string;
  description: string;
  sku: string;
  barcode: string;
  category: string;
  condition: string;
  price: number;
  marketPrice?: number;
  priceRange?: {
    min: number;
    max: number;
  };
  source: 'internal' | 'external';
  imageUrl?: string;
  inStock?: boolean;
  quantity?: number;
}

const UniversalScanner = () => {
  const { toast } = useToast();
  const [barcodeValue, setBarcodeValue] = useState<string>('');
  const [manualBarcode, setManualBarcode] = useState<string>('');
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [productInfo, setProductInfo] = useState<ProductInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [speechRecognition, setSpeechRecognition] = useState<any | null>(null);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [scannerReady, setScannerReady] = useState<boolean>(false);
  const [isMobile, setIsMobile] = useState<boolean>(false);
  
  const scannerRef = useRef<HTMLDivElement>(null);
  const scannerInstance = useRef<any>(null);
  
  // Check if running on mobile device
  useEffect(() => {
    setIsMobile(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
  }, []);
  
  // Cleanup scanner on unmount
  useEffect(() => {
    return () => {
      if (scannerInstance.current) {
        scannerInstance.current.stop().catch((err: any) => {
          console.error('Error stopping scanner:', err);
        });
      }
    };
  }, []);
  
  // Load HTML5 QR code scanner script dynamically
  useEffect(() => {
    const loadScanner = async () => {
      if (!window.Html5Qrcode && !document.getElementById('html5-qrcode-script')) {
        const script = document.createElement('script');
        script.id = 'html5-qrcode-script';
        script.src = 'https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js';
        script.async = true;
        script.onload = () => setScannerReady(true);
        document.body.appendChild(script);
      } else {
        setScannerReady(true);
      }
    };
    
    loadScanner();
  }, []);
  
  // Start the barcode scanner
  const startScanner = async () => {
    if (!scannerReady) {
      toast({
        title: 'Scanner not ready',
        description: 'Please wait for the scanner to initialize.',
        variant: 'destructive',
      });
      return;
    }
    
    if (scannerRef.current) {
      try {
        setIsScanning(true);
        setError(null);
        
        const config = { fps: 10, qrbox: { width: 250, height: 150 } };
        scannerInstance.current = new window.Html5Qrcode("scanner");
        
        const qrCodeSuccessCallback = (decodedText: string) => {
          handleScannedCode(decodedText);
          stopScanner();
        };
        
        const qrCodeErrorCallback = (error: any) => {
          // Don't show errors during scanning, just log them
          console.log(error);
        };
        
        await scannerInstance.current.start(
          { facingMode: "environment" },
          config,
          qrCodeSuccessCallback,
          qrCodeErrorCallback
        );
        
        toast({
          title: 'Scanner Active',
          description: 'Point your camera at a barcode',
        });
      } catch (err) {
        console.error('Error starting scanner:', err);
        setIsScanning(false);
        setError('Failed to start camera. Please check permissions and try again.');
        
        toast({
          title: 'Scanner Error',
          description: 'Could not access camera. Check permissions.',
          variant: 'destructive',
        });
      }
    }
  };
  
  // Stop the barcode scanner
  const stopScanner = () => {
    if (scannerInstance.current && scannerInstance.current.isScanning) {
      scannerInstance.current.stop().then(() => {
        setIsScanning(false);
      }).catch((err: any) => {
        console.error('Error stopping scanner:', err);
      });
    } else {
      setIsScanning(false);
    }
  };
  
  // Handle a scanned barcode
  const handleScannedCode = (decodedText: string) => {
    setBarcodeValue(decodedText);
    
    // Auto-search after scanning
    searchProduct(decodedText);
  };
  
  // Start speech recognition for barcode input
  const startVoiceInput = () => {
    try {
      // Check if the browser supports the Web Speech API
      if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        toast({
          title: 'Speech Recognition Not Supported',
          description: 'Your browser does not support speech recognition.',
          variant: 'destructive',
        });
        return;
      }
      
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';
      
      recognition.onstart = () => {
        setIsListening(true);
        toast({
          title: 'Listening',
          description: 'Speak the barcode number...',
        });
      };
      
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        // Clean up transcript - remove spaces and non-numeric characters for barcodes
        const cleanedTranscript = transcript.replace(/[^\d]/g, '');
        setManualBarcode(cleanedTranscript);
      };
      
      recognition.onerror = (event: any) => {
        console.error('Speech recognition error', event);
        setIsListening(false);
        toast({
          title: 'Recognition Error',
          description: 'There was a problem understanding you.',
          variant: 'destructive',
        });
      };
      
      recognition.onend = () => {
        setIsListening(false);
      };
      
      setSpeechRecognition(recognition);
      recognition.start();
    } catch (error) {
      console.error('Error starting voice input', error);
      setIsListening(false);
      toast({
        title: 'Voice Input Error',
        description: 'Could not start voice recognition.',
        variant: 'destructive',
      });
    }
  };
  
  // Stop speech recognition
  const stopVoiceInput = () => {
    if (speechRecognition) {
      speechRecognition.stop();
      setIsListening(false);
    }
  };
  
  // Search for a product using the barcode
  const searchProduct = async (code: string = '') => {
    const barcodeToSearch = code || manualBarcode || barcodeValue;
    
    if (!barcodeToSearch) {
      toast({
        title: 'No Barcode',
        description: 'Please enter or scan a barcode first',
        variant: 'destructive',
      });
      return;
    }
    
    setIsSearching(true);
    setError(null);
    
    try {
      // First, check our internal inventory
      const internalResult = await apiRequest(`/api/items/barcode/${barcodeToSearch}`, {
        method: 'GET',
      }).catch(() => null);
      
      if (internalResult) {
        // Item found in our inventory
        setProductInfo({
          ...internalResult,
          source: 'internal',
          inStock: internalResult.quantity > 0,
        });
        
        // Read aloud the found product
        readProductInfo({
          ...internalResult,
          source: 'internal',
          inStock: internalResult.quantity > 0,
        });
        
        toast({
          title: 'Product Found',
          description: 'Item found in your inventory',
        });
      } else {
        // If not in our inventory, query external product database
        const externalResult = await apiRequest('/api/scan', {
          method: 'POST',
          body: JSON.stringify({ barcode: barcodeToSearch }),
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        if (externalResult && externalResult.name) {
          setProductInfo({
            ...externalResult,
            source: 'external',
          });
          
          // Read aloud the found product
          readProductInfo({
            ...externalResult,
            source: 'external',
          });
          
          toast({
            title: 'Product Found',
            description: 'Item found in external database',
          });
        } else {
          setProductInfo(null);
          setError('Product not found. Try another barcode or check format.');
          
          // Read error message aloud
          readAloud('Product not found. Please try another barcode or check the format.');
          
          toast({
            title: 'Product Not Found',
            description: 'No matching item found for this barcode',
            variant: 'destructive',
          });
        }
      }
    } catch (error) {
      console.error('Error searching product:', error);
      setProductInfo(null);
      setError('Error searching for product. Please try again.');
      
      toast({
        title: 'Search Error',
        description: 'Failed to search for product',
        variant: 'destructive',
      });
    } finally {
      setIsSearching(false);
    }
  };
  
  // Generate QR code for employee mobile scanning
  const generateEmployeeQRCode = async () => {
    try {
      // This would normally get the current item data and user permissions
      // For demo, we'll create a simple URL-based QR code
      const scannerUrl = `${window.location.origin}/scanner?mode=employee`;
      
      const response = await apiRequest('/api/qrcode/generate', {
        method: 'POST',
        body: JSON.stringify({ 
          data: scannerUrl,
          type: 'employee',
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response && response.qrCodeUrl) {
        // Open a modal or new window with the QR code
        window.open(response.qrCodeUrl, '_blank');
      }
    } catch (error) {
      console.error('Error generating QR code:', error);
      toast({
        title: 'QR Code Error',
        description: 'Failed to generate employee QR code',
        variant: 'destructive',
      });
    }
  };
  
  // Add scanned product to inventory
  const addToInventory = async () => {
    if (!productInfo) return;
    
    try {
      const response = await apiRequest('/api/items', {
        method: 'POST',
        body: JSON.stringify({
          name: productInfo.name,
          description: productInfo.description || '',
          price: productInfo.price,
          quantity: 1,
          category: productInfo.category || 'Uncategorized',
          condition: productInfo.condition || 'New',
          sku: productInfo.sku || generateRandomSKU(),
          barcode: productInfo.barcode,
          status: 'draft',
          tags: [],
          images: productInfo.imageUrl ? [productInfo.imageUrl] : [],
          aiEnhanced: true
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response) {
        toast({
          title: 'Added to Inventory',
          description: 'Product successfully added to your inventory',
        });
        
        // Update the product info to mark it as internal now
        setProductInfo({
          ...productInfo,
          source: 'internal',
          inStock: true,
          quantity: 1
        });
      }
    } catch (error) {
      console.error('Error adding to inventory:', error);
      toast({
        title: 'Add Failed',
        description: 'Failed to add product to inventory',
        variant: 'destructive',
      });
    }
  };
  
  // Generate a random SKU
  const generateRandomSKU = () => {
    const prefix = 'SKU';
    const randomDigits = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
    return `${prefix}-${randomDigits}`;
  };
  
  // Read text aloud using the Web Speech API
  const readAloud = (text: string) => {
    if ('speechSynthesis' in window) {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      window.speechSynthesis.speak(utterance);
    }
  };
  
  // Read product information aloud
  const readProductInfo = (product: ProductInfo) => {
    if (!product) return;
    
    const source = product.source === 'internal' ? 'your inventory' : 'external database';
    const stockInfo = product.source === 'internal' 
      ? (product.inStock ? `In stock with ${product.quantity} units.` : 'Out of stock.') 
      : '';
    
    const priceInfo = product.priceRange 
      ? `Estimated market price between $${product.priceRange.min} and $${product.priceRange.max}.` 
      : `Price: $${product.price}.`;
    
    const text = `Product found in ${source}. ${product.name}. ${product.description || ''}. 
      Category: ${product.category || 'Uncategorized'}. Condition: ${product.condition || 'Unknown'}. 
      ${priceInfo} ${stockInfo}`;
    
    readAloud(text);
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="camera">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="camera">Camera Scanner</TabsTrigger>
          <TabsTrigger value="manual">Manual Entry</TabsTrigger>
          <TabsTrigger value="qrcode">Employee QR Codes</TabsTrigger>
        </TabsList>
        
        <TabsContent value="camera" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Camera Barcode Scanner</CardTitle>
              <CardDescription>
                Scan any product barcode to get information, even if it's not in your inventory
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div 
                  id="scanner" 
                  ref={scannerRef} 
                  className={`w-full h-64 overflow-hidden rounded-md border border-gray-200 bg-black ${isScanning ? 'block' : 'hidden'}`}
                ></div>
                
                {!isScanning && (
                  <div className="flex justify-center items-center h-64 border border-dashed rounded-md border-gray-300 bg-gray-50">
                    <div className="text-center">
                      <ScanLine className="mx-auto h-10 w-10 text-gray-400" />
                      <h3 className="mt-2 text-sm font-medium text-gray-900">Ready to scan</h3>
                      <p className="mt-1 text-sm text-gray-500">Click the button below to start scanning</p>
                    </div>
                  </div>
                )}
                
                <div className="flex justify-center space-x-4">
                  {!isScanning ? (
                    <Button onClick={startScanner} className="flex items-center">
                      <Camera className="mr-2 h-4 w-4" />
                      Start Scanner
                    </Button>
                  ) : (
                    <Button variant="outline" onClick={stopScanner} className="flex items-center">
                      <ScanLine className="mr-2 h-4 w-4" />
                      Stop Scanner
                    </Button>
                  )}
                </div>
                
                {barcodeValue && (
                  <div className="mt-4">
                    <p className="text-sm text-gray-500">Scanned Barcode:</p>
                    <div className="flex items-center space-x-2">
                      <p className="font-mono text-lg">{barcodeValue}</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => searchProduct()}
                        className="flex items-center"
                      >
                        <Search className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="manual" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Manual Barcode Entry</CardTitle>
              <CardDescription>
                Type or dictate a barcode number to look up product information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex space-x-2">
                  <div className="flex-1">
                    <Label htmlFor="manual-barcode" className="sr-only">Barcode</Label>
                    <Input
                      id="manual-barcode"
                      placeholder="Enter barcode number..."
                      value={manualBarcode}
                      onChange={(e) => setManualBarcode(e.target.value)}
                    />
                  </div>
                  <Button 
                    variant="outline" 
                    onClick={isListening ? stopVoiceInput : startVoiceInput}
                    className={`flex items-center ${isListening ? 'bg-red-50' : ''}`}
                  >
                    <Mic className={`h-4 w-4 ${isListening ? 'text-red-500' : ''}`} />
                    <span className="ml-2 sr-only md:not-sr-only md:inline-block">
                      {isListening ? 'Stop' : 'Dictate'}
                    </span>
                  </Button>
                </div>
                
                <Button 
                  onClick={() => searchProduct()} 
                  disabled={isSearching || !manualBarcode}
                  className="w-full"
                >
                  {isSearching ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Searching...
                    </>
                  ) : (
                    <>
                      <Search className="mr-2 h-4 w-4" />
                      Search Product
                    </>
                  )}
                </Button>
                
                {error && (
                  <Alert variant="destructive">
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="qrcode" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Employee QR Codes</CardTitle>
              <CardDescription>
                Generate QR codes for employees to use their phone cameras as scanners
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 border rounded-lg bg-gray-50">
                  <div className="flex items-start space-x-4">
                    <div className="bg-primary/10 p-3 rounded-full">
                      <Smartphone className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium">Mobile Scanning for Employees</h3>
                      <p className="text-sm text-gray-500 mt-1">
                        Generate a QR code that employees can scan with their phones.
                        This will open a mobile-optimized scanner that connects to your inventory.
                      </p>
                    </div>
                  </div>
                </div>
                
                <Button onClick={generateEmployeeQRCode} className="w-full">
                  Generate Employee QR Code
                </Button>
                
                <Alert>
                  <AlertTitle>How It Works</AlertTitle>
                  <AlertDescription className="text-sm">
                    <ol className="list-decimal list-inside space-y-1 mt-2">
                      <li>Generate a unique QR code for an employee</li>
                      <li>Employee scans the QR code with their phone camera</li>
                      <li>This opens a web-based scanner on their device</li>
                      <li>They can now scan product barcodes which update your inventory in real-time</li>
                    </ol>
                  </AlertDescription>
                </Alert>
                
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  <Badge variant="outline">New Feature</Badge>
                  <span>
                    Employees can also use voice commands for hands-free operation
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Product Information Display */}
      {productInfo && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle>{productInfo.name}</CardTitle>
                <CardDescription>
                  {productInfo.source === 'internal' ? 'Found in your inventory' : 'Found in external database'}
                </CardDescription>
              </div>
              <Badge 
                variant={productInfo.source === 'internal' ? 'default' : 'secondary'}
              >
                {productInfo.source === 'internal' ? 'Your Inventory' : 'External Item'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                {productInfo.imageUrl ? (
                  <div className="border rounded-md overflow-hidden">
                    <img 
                      src={productInfo.imageUrl} 
                      alt={productInfo.name} 
                      className="w-full object-contain max-h-60"
                    />
                  </div>
                ) : (
                  <div className="border rounded-md flex items-center justify-center h-60 bg-gray-50">
                    <p className="text-gray-400">No image available</p>
                  </div>
                )}
                
                <div className="space-y-2">
                  <h3 className="font-medium text-sm">Description</h3>
                  <p className="text-sm text-gray-600">{productInfo.description || 'No description available'}</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Price</h3>
                    <p className="font-mono text-lg">${productInfo.price?.toFixed(2) || 'N/A'}</p>
                  </div>
                  
                  {productInfo.priceRange && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Market Price Range</h3>
                      <p className="text-sm">${productInfo.priceRange.min} - ${productInfo.priceRange.max}</p>
                    </div>
                  )}
                  
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Category</h3>
                    <p>{productInfo.category || 'Uncategorized'}</p>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Condition</h3>
                    <p>{productInfo.condition || 'Unknown'}</p>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">SKU</h3>
                    <p className="font-mono">{productInfo.sku || 'N/A'}</p>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Barcode</h3>
                    <p className="font-mono">{productInfo.barcode || 'N/A'}</p>
                  </div>
                  
                  {productInfo.source === 'internal' && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">In Stock</h3>
                      <div className="flex items-center space-x-2">
                        <div className={`w-3 h-3 rounded-full ${productInfo.inStock ? 'bg-green-500' : 'bg-red-500'}`}></div>
                        <p>{productInfo.inStock ? `Yes (${productInfo.quantity})` : 'No'}</p>
                      </div>
                    </div>
                  )}
                </div>
                
                <Separator />
                
                <div className="flex flex-col space-y-2">
                  <Button 
                    variant="outline" 
                    onClick={() => readProductInfo(productInfo)}
                    className="justify-start"
                  >
                    <span className="mr-2">🔊</span> Read Information Aloud
                  </Button>
                  
                  {productInfo.source === 'external' && (
                    <Button onClick={addToInventory}>
                      Add to Your Inventory
                    </Button>
                  )}
                  
                  {productInfo.source === 'internal' && (
                    <Button
                      variant="default"
                      onClick={() => window.location.href = `/inventory/edit/${productInfo.sku}`}
                    >
                      Edit Item in Inventory
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default UniversalScanner;