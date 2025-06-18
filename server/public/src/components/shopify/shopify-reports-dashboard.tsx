import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import {
  ArrowUpCircle,
  ArrowDownCircle,
  ShoppingBag,
  Package,
  Users,
  AlertCircle,
  DollarSign,
  Calendar,
  TrendingUp,
  Tag,
  FileDown
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

// Types for Shopify report data
interface ShopifyOrderReport {
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  topProducts: Array<{
    productId: string;
    title: string;
    sku: string;
    quantity: number;
    revenue: number;
  }>;
  periodSales: Array<{
    date: string;
    orders: number;
    revenue: number;
  }>;
}

interface ShopifyInventoryReport {
  totalProducts: number;
  totalVariants: number;
  lowStockItems: Array<{
    productId: string;
    variantId: string;
    title: string;
    sku: string;
    inventory: number;
    price: number;
  }>;
  outOfStockItems: Array<{
    productId: string;
    variantId: string;
    title: string;
    sku: string;
    price: number;
  }>;
  inventoryValue: number;
}

interface ShopifyCustomerReport {
  totalCustomers: number;
  newCustomers: number;
  returningCustomers: number;
  topCustomers: Array<{
    customerId: string;
    name: string;
    email: string;
    ordersCount: number;
    totalSpent: number;
  }>;
}

// Colors for charts
const COLORS = ['#4285F4', '#EA4335', '#FBBC05', '#34A853', '#FF6D01', '#46BDC6', '#8B77D9'];
const GOLD_COLOR = '#F5A623';
const GREEN_COLOR = '#34A853';
const BLACK_COLOR = '#333333';

export function ShopifyReportsDashboard() {
  const [timeframe, setTimeframe] = useState('30d'); // Default to 30 days

  // Fetch sales report data
  const {
    data: salesData,
    isLoading: isSalesLoading,
    isError: isSalesError,
    error: salesError
  } = useQuery({
    queryKey: ['/api/shopify/reports/sales', timeframe],
    queryFn: async () => {
      const response = await fetch(`/api/shopify/reports/sales/${timeframe}`);
      if (!response.ok) {
        throw new Error('Failed to fetch sales report');
      }
      return response.json() as Promise<ShopifyOrderReport>;
    }
  });

  // Fetch inventory report data
  const {
    data: inventoryData,
    isLoading: isInventoryLoading,
    isError: isInventoryError,
    error: inventoryError
  } = useQuery({
    queryKey: ['/api/shopify/reports/inventory'],
    queryFn: async () => {
      const response = await fetch('/api/shopify/reports/inventory');
      if (!response.ok) {
        throw new Error('Failed to fetch inventory report');
      }
      return response.json() as Promise<ShopifyInventoryReport>;
    }
  });

  // Fetch customer report data
  const {
    data: customerData,
    isLoading: isCustomerLoading,
    isError: isCustomerError,
    error: customerError
  } = useQuery({
    queryKey: ['/api/shopify/reports/customers'],
    queryFn: async () => {
      const response = await fetch('/api/shopify/reports/customers');
      if (!response.ok) {
        throw new Error('Failed to fetch customer report');
      }
      return response.json() as Promise<ShopifyCustomerReport>;
    }
  });

  // Format currency values
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  // Format date values
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric'
    }).format(date);
  };

  // Render error state
  const renderError = (errorMessage: string) => (
    <Alert variant="destructive" className="mb-4">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Error</AlertTitle>
      <AlertDescription>{errorMessage}</AlertDescription>
    </Alert>
  );

  // Render loading skeletons
  const renderSkeletons = () => (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <Card key={i} className="overflow-hidden">
          <CardHeader className="pb-2">
            <Skeleton className="h-4 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-12 w-24 mb-2" />
            <Skeleton className="h-4 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );

  // Transform sales data for chart display
  const prepareSalesChartData = () => {
    if (!salesData?.periodSales) return [];
    
    return salesData.periodSales.map(item => ({
      date: formatDate(item.date),
      orders: item.orders,
      revenue: item.revenue
    }));
  };

  // Transform customer data for pie chart
  const prepareCustomerChartData = () => {
    if (!customerData) return [];
    
    return [
      { name: 'New Customers', value: customerData.newCustomers },
      { name: 'Returning Customers', value: customerData.returningCustomers }
    ];
  };

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Shopify Reports</h1>
        <p className="text-muted-foreground">
          Integrated reports from your Shopify store
        </p>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
          <Select
            value={timeframe}
            onValueChange={setTimeframe}
          >
            <SelectTrigger className="w-full sm:w-[180px]">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Select timeframe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 Days</SelectItem>
              <SelectItem value="14d">Last 14 Days</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
              <SelectItem value="60d">Last 60 Days</SelectItem>
              <SelectItem value="90d">Last 90 Days</SelectItem>
              <SelectItem value="180d">Last 180 Days</SelectItem>
              <SelectItem value="365d">Last 365 Days</SelectItem>
              <SelectItem value="ytd">Year to Date</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Button 
            variant="outline" 
            className="flex gap-2 items-center"
            onClick={() => window.open(`/api/shopify/reports/sales/${timeframe}/export`, '_blank')}
          >
            <FileDown className="w-4 h-4" />
            <span>Export Sales</span>
          </Button>
          
          <Button 
            variant="outline" 
            className="flex gap-2 items-center"
            onClick={() => window.open('/api/shopify/reports/inventory/export', '_blank')}
          >
            <FileDown className="w-4 h-4" />
            <span>Export Inventory</span>
          </Button>
          
          <Button 
            variant="outline" 
            className="flex gap-2 items-center"
            onClick={() => window.open('/api/shopify/reports/customers/export', '_blank')}
          >
            <FileDown className="w-4 h-4" />
            <span>Export Customers</span>
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="bg-muted/20 bg-gradient-to-r from-background to-muted/40 border">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="sales">Sales</TabsTrigger>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="customers">Customers</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          {(isSalesError || isInventoryError || isCustomerError) && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error fetching data</AlertTitle>
              <AlertDescription>
                There was an error loading one or more reports. Please check your Shopify connection and try again.
              </AlertDescription>
            </Alert>
          )}

          {(isSalesLoading || isInventoryLoading || isCustomerLoading) ? (
            renderSkeletons()
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {/* Sales Card */}
              <Card className="bg-gradient-to-br from-background to-muted/30 border-gold-500/20">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <ShoppingBag className="h-4 w-4 text-gold-500" />
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Total Sales
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {salesData ? formatCurrency(salesData.totalRevenue) : 'N/A'}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {salesData ? `${salesData.totalOrders} orders` : 'No data available'}
                  </p>
                </CardContent>
              </Card>

              {/* AOV Card */}
              <Card className="bg-gradient-to-br from-background to-muted/30 border-gold-500/20">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-gold-500" />
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Average Order Value
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {salesData ? formatCurrency(salesData.averageOrderValue) : 'N/A'}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Per order average
                  </p>
                </CardContent>
              </Card>

              {/* Inventory Value Card */}
              <Card className="bg-gradient-to-br from-background to-muted/30 border-gold-500/20">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-gold-500" />
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Inventory Value
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {inventoryData ? formatCurrency(inventoryData.inventoryValue) : 'N/A'}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {inventoryData ? `${inventoryData.totalProducts} products (${inventoryData.totalVariants} variants)` : 'No data available'}
                  </p>
                </CardContent>
              </Card>

              {/* Customers Card */}
              <Card className="bg-gradient-to-br from-background to-muted/30 border-gold-500/20">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-gold-500" />
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Total Customers
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {customerData ? customerData.totalCustomers : 'N/A'}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {customerData ? `${customerData.newCustomers} new in last 30 days` : 'No data available'}
                  </p>
                </CardContent>
              </Card>

              {/* Out of Stock Card */}
              <Card className="bg-gradient-to-br from-background to-muted/30 border-gold-500/20">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-red-500" />
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Out of Stock Items
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {inventoryData ? inventoryData.outOfStockItems.length : 'N/A'}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {inventoryData?.lowStockItems && `${inventoryData.lowStockItems.length} low stock items`}
                  </p>
                </CardContent>
              </Card>

              {/* Sales Chart Card */}
              <Card className="col-span-full bg-gradient-to-br from-background to-muted/30 border-gold-500/20">
                <CardHeader>
                  <CardTitle>Sales Trend</CardTitle>
                  <CardDescription>
                    Revenue over time ({timeframe === '7d' ? 'Last 7 Days' : 
                                      timeframe === '14d' ? 'Last 14 Days' : 
                                      timeframe === '30d' ? 'Last 30 Days' : 
                                      timeframe === '60d' ? 'Last 60 Days' : 
                                      timeframe === '90d' ? 'Last 90 Days' : 
                                      timeframe === '180d' ? 'Last 180 Days' : 
                                      timeframe === '365d' ? 'Last 365 Days' : 
                                      timeframe === 'ytd' ? 'Year to Date' : timeframe})
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    {salesData ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={prepareSalesChartData()}
                          margin={{ top: 20, right: 30, left: 20, bottom: 30 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                          <XAxis dataKey="date" />
                          <YAxis yAxisId="left" />
                          <YAxis yAxisId="right" orientation="right" />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: 'rgba(0, 0, 0, 0.8)', 
                              borderColor: 'rgba(245, 166, 35, 0.5)',
                              color: '#fff'
                            }} 
                          />
                          <Legend />
                          <Line
                            type="monotone"
                            dataKey="revenue"
                            name="Revenue ($)"
                            stroke={GOLD_COLOR}
                            strokeWidth={2}
                            yAxisId="left"
                            dot={{ r: 1 }}
                            activeDot={{ r: 5 }}
                          />
                          <Line
                            type="monotone"
                            dataKey="orders"
                            name="Orders"
                            stroke={GREEN_COLOR}
                            strokeWidth={2}
                            yAxisId="right"
                            dot={{ r: 1 }}
                            activeDot={{ r: 5 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center">
                        <Skeleton className="h-full w-full" />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Sales Tab */}
        <TabsContent value="sales" className="space-y-4">
          {isSalesError && renderError(salesError instanceof Error ? salesError.message : 'Failed to load sales data')}

          {isSalesLoading ? (
            renderSkeletons()
          ) : salesData ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Total Orders</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{salesData.totalOrders}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Total Revenue</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{formatCurrency(salesData.totalRevenue)}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Average Order Value</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{formatCurrency(salesData.averageOrderValue)}</div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Top Selling Products</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>SKU</TableHead>
                        <TableHead className="text-right">Quantity</TableHead>
                        <TableHead className="text-right">Revenue</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {salesData.topProducts.map((product) => (
                        <TableRow key={product.productId}>
                          <TableCell className="font-medium">{product.title}</TableCell>
                          <TableCell>{product.sku}</TableCell>
                          <TableCell className="text-right">{product.quantity}</TableCell>
                          <TableCell className="text-right">{formatCurrency(product.revenue)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Sales Over Time</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={prepareSalesChartData()}
                        margin={{ top: 20, right: 30, left: 20, bottom: 30 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'rgba(0, 0, 0, 0.8)',
                            borderColor: 'rgba(245, 166, 35, 0.5)',
                            color: '#fff'
                          }}
                        />
                        <Legend />
                        <Bar dataKey="revenue" name="Revenue ($)" fill={GOLD_COLOR} />
                        <Bar dataKey="orders" name="Orders" fill={GREEN_COLOR} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Alert>
              <AlertTitle>No sales data available</AlertTitle>
              <AlertDescription>
                There is no sales data available for the selected time period.
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>

        {/* Inventory Tab */}
        <TabsContent value="inventory" className="space-y-4">
          {isInventoryError && renderError(inventoryError instanceof Error ? inventoryError.message : 'Failed to load inventory data')}

          {isInventoryLoading ? (
            renderSkeletons()
          ) : inventoryData ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Total Products</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{inventoryData.totalProducts}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Total Variants</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{inventoryData.totalVariants}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Inventory Value</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{formatCurrency(inventoryData.inventoryValue)}</div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Low Stock Items</CardTitle>
                </CardHeader>
                <CardContent>
                  {inventoryData.lowStockItems.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product</TableHead>
                          <TableHead>SKU</TableHead>
                          <TableHead className="text-right">Price</TableHead>
                          <TableHead className="text-right">Inventory</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {inventoryData.lowStockItems.map((item) => (
                          <TableRow key={item.variantId}>
                            <TableCell className="font-medium">{item.title}</TableCell>
                            <TableCell>{item.sku}</TableCell>
                            <TableCell className="text-right">{formatCurrency(item.price)}</TableCell>
                            <TableCell className="text-right">
                              <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
                                {item.inventory} left
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-4 text-muted-foreground">
                      No low stock items
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Out of Stock Items</CardTitle>
                </CardHeader>
                <CardContent>
                  {inventoryData.outOfStockItems.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product</TableHead>
                          <TableHead>SKU</TableHead>
                          <TableHead className="text-right">Price</TableHead>
                          <TableHead className="text-right">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {inventoryData.outOfStockItems.map((item) => (
                          <TableRow key={item.variantId}>
                            <TableCell className="font-medium">{item.title}</TableCell>
                            <TableCell>{item.sku}</TableCell>
                            <TableCell className="text-right">{formatCurrency(item.price)}</TableCell>
                            <TableCell className="text-right">
                              <Badge variant="outline" className="bg-red-100 text-red-800">
                                Out of stock
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-4 text-muted-foreground">
                      No out of stock items
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : (
            <Alert>
              <AlertTitle>No inventory data available</AlertTitle>
              <AlertDescription>
                There is no inventory data available from your Shopify store.
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>

        {/* Customers Tab */}
        <TabsContent value="customers" className="space-y-4">
          {isCustomerError && renderError(customerError instanceof Error ? customerError.message : 'Failed to load customer data')}

          {isCustomerLoading ? (
            renderSkeletons()
          ) : customerData ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Total Customers</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{customerData.totalCustomers}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">New Customers</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{customerData.newCustomers}</div>
                    <p className="text-xs text-muted-foreground">
                      Last 30 days
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Returning Customers</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{customerData.returningCustomers}</div>
                    <p className="text-xs text-muted-foreground">
                      Prior to 30 days
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Customer Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={prepareCustomerChartData()}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            fill={GOLD_COLOR}
                            paddingAngle={5}
                            dataKey="value"
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          >
                            {prepareCustomerChartData().map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip 
                            formatter={(value) => [value, 'Customers']}
                            contentStyle={{ 
                              backgroundColor: 'rgba(0, 0, 0, 0.8)', 
                              borderColor: 'rgba(245, 166, 35, 0.5)',
                              color: '#fff'
                            }} 
                          />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Top Customers</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Customer</TableHead>
                          <TableHead className="text-right">Orders</TableHead>
                          <TableHead className="text-right">Spent</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {customerData.topCustomers.slice(0, 5).map((customer) => (
                          <TableRow key={customer.customerId}>
                            <TableCell className="font-medium">{customer.name}</TableCell>
                            <TableCell className="text-right">{customer.ordersCount}</TableCell>
                            <TableCell className="text-right">{formatCurrency(customer.totalSpent)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : (
            <Alert>
              <AlertTitle>No customer data available</AlertTitle>
              <AlertDescription>
                There is no customer data available from your Shopify store.
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}