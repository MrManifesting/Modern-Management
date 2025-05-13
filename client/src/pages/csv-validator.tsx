import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { InstantCSVValidator } from '@/components/inventory/instant-csv-validator';
import { FileSpreadsheet } from 'lucide-react';

export default function CSVValidatorPage() {
  const [syncToShopify, setSyncToShopify] = useState(false);
  
  const handleSyncToShopifyChange = (checked: boolean) => {
    setSyncToShopify(checked);
  };

  return (
    <div className="container mx-auto p-4 max-w-6xl">
      <Helmet>
        <title>CSV Validator | Inventory Pro</title>
      </Helmet>
      
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">CSV Validator</h1>
          <p className="text-muted-foreground">
            Validate and preview CSV files before importing them into your inventory
          </p>
        </div>
        <Button onClick={() => window.history.back()} variant="outline">
          Back
        </Button>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileSpreadsheet className="h-5 w-5 mr-2" />
              Instant CSV Validation
            </CardTitle>
            <CardDescription>
              Upload a CSV file to validate and visualize any errors before importing
            </CardDescription>
          </CardHeader>
          <CardContent>
            <InstantCSVValidator 
              syncToShopify={syncToShopify}
              onSyncToShopifyChange={handleSyncToShopifyChange}
            />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>CSV Format Guidelines</CardTitle>
            <CardDescription>
              Follow these guidelines to ensure your CSV files import correctly
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              <div>
                <h3 className="font-medium mb-2">Required Columns</h3>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li><strong>Name</strong> - The name of the product (aliases: product name, title, product title)</li>
                  <li><strong>Price</strong> - The base price of the product (aliases: product price, base price)</li>
                  <li><strong>SKU</strong> - Unique identifier for the product (aliases: product sku, item sku)</li>
                </ul>
              </div>
              
              <div>
                <h3 className="font-medium mb-2">Optional Columns</h3>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li><strong>Category</strong> - Product category or type</li>
                  <li><strong>Quantity</strong> - Number of items in stock</li>
                  <li><strong>Description</strong> - Detailed product description</li>
                  <li><strong>Weight</strong> - Product weight (enter the value only)</li>
                  <li><strong>Weight Unit</strong> - Unit of measurement (g, oz, lb)</li>
                </ul>
              </div>
              
              <div>
                <h3 className="font-medium mb-2">Sample Format</h3>
                <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                  name,sku,price,quantity,category,description,weight,weight_unit<br/>
                  "Product 1","SKU001",19.99,10,"Category A","Description here",28,"g"<br/>
                  "Product 2","SKU002",29.99,5,"Category B","Another description",1,"oz"
                </pre>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}