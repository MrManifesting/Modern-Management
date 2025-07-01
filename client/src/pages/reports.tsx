import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { 
  SalesReport, 
  TimeSeriesData, 
  ReportParams 
} from "../../shared/schema";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from "recharts";
import { 
  CalendarIcon, 
  ArrowDownIcon, 
  ArrowUpIcon, 
  DownloadIcon,
  Loader2
} from "lucide-react";
import { format, sub } from "date-fns";

// Define chart colors
const CHART_COLORS = [
  "#3b82f6", // Blue
  "#10b981", // Green
  "#f59e0b", // Yellow
  "#ef4444", // Red
  "#8b5cf6", // Purple
  "#ec4899", // Pink
  "#06b6d4", // Cyan
  "#f97316", // Orange
];

export default function Reports() {
  // State for report parameters
  const [dateRange, setDateRange] = useState<{
    from: Date;
    to: Date;
  }>({
    from: sub(new Date(), { months: 1 }),
    to: new Date(),
  });
  const [groupBy, setGroupBy] = useState<string>("day");
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  
  // Format currency for display
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };
  
  // Format percentage for display
  const formatPercentage = (value: number): string => {
    return new Intl.NumberFormat('en-US', { 
      style: 'percent',
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    }).format(value / 100);
  };
  
  // Format date range for display
  const formatDateRange = (): string => {
    if (!dateRange.from || !dateRange.to) {
      return "Select date range";
    }
    return `${format(dateRange.from, "MMM d, yyyy")} - ${format(dateRange.to, "MMM d, yyyy")}`;
  };
  
  // Prepare report parameters
  const reportParams: ReportParams = {
    startDate: dateRange.from?.toISOString() || "",
    endDate: dateRange.to?.toISOString() || "",
    groupBy
  };
  
  // Fetch sales report data
  const { data: reportData, isLoading, refetch } = useQuery({
    queryKey: ['/api/analytics/report', reportParams],
    queryFn: async () => {
      const response = await apiRequest('POST', '/api/analytics/report', reportParams);
      if (!response.ok) {
        throw new Error("Failed to fetch report data");
      }
      return response.json() as Promise<SalesReport>;
    },
    enabled: !!dateRange.from && !!dateRange.to,
  });
  
  // Fetch time series data
  const { data: timeSeriesData } = useQuery({
    queryKey: ['/api/analytics/time-series', reportParams],
    queryFn: async () => {
      const response = await apiRequest('POST', '/api/analytics/time-series', reportParams);
      if (!response.ok) {
        throw new Error("Failed to fetch time series data");
      }
      return response.json() as Promise<TimeSeriesData[]>;
    },
    enabled: !!dateRange.from && !!dateRange.to,
  });
  
  // Handle date range selection
  const handleDateRangeSelect = (range: { from?: Date; to?: Date }) => {
    if (range.from && range.to) {
      setDateRange({ from: range.from, to: range.to });
      setIsCalendarOpen(false);
      refetch();
    }
  };
  
  // Handle grouping selection
  const handleGroupByChange = (value: string) => {
    setGroupBy(value);
    refetch();
  };
  
  // Export report as CSV
  const exportReportCSV = () => {
    if (!reportData) return;
    
    // Prepare CSV content
    const csvHeader = "Date,Sales,Revenue,Profit\n";
    const csvRows = timeSeriesData?.map(item => 
      `${item.label},${item.sales},${item.revenue},${item.profit}`
    ).join('\n') || '';
    
    const csvContent = csvHeader + csvRows;
    
    // Create downloadable link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `sales_report_${format(dateRange.from, 'yyyy-MM-dd')}_to_${format(dateRange.to, 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6">Sales Analytics</h1>
      
      {/* Report controls */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="justify-start text-left font-normal w-full sm:w-auto">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {formatDateRange()}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="range"
              selected={dateRange}
              onSelect={handleDateRangeSelect}
              initialFocus
            />
          </PopoverContent>
        </Popover>
        
        <Select value={groupBy} onValueChange={handleGroupByChange}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Group by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="day">Daily</SelectItem>
            <SelectItem value="week">Weekly</SelectItem>
            <SelectItem value="month">Monthly</SelectItem>
          </SelectContent>
        </Select>
        
        <Button 
          variant="outline" 
          className="ml-auto"
          onClick={exportReportCSV}
          disabled={!reportData}
        >
          <DownloadIcon className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <span className="sr-only">Loading...</span>
        </div>
      ) : reportData ? (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-medium text-gray-500">Total Sales</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{reportData.summary.totalSales}</div>
                <p className="text-sm text-gray-500">Orders</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-medium text-gray-500">Total Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{formatCurrency(reportData.summary.totalRevenue)}</div>
                <p className="text-sm text-gray-500">Gross sales</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-medium text-gray-500">Total Profit</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{formatCurrency(reportData.summary.totalProfit)}</div>
                <p className="text-sm text-gray-500">Net earnings</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-medium text-gray-500">Avg. Order Value</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{formatCurrency(reportData.summary.averageOrderValue)}</div>
                <p className="text-sm text-gray-500">Per transaction</p>
              </CardContent>
            </Card>
          </div>
          
          {/* Charts */}
          <Tabs defaultValue="overview" className="mb-6">
            <TabsList className="mb-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="revenue">Revenue</TabsTrigger>
              <TabsTrigger value="products">Products</TabsTrigger>
              <TabsTrigger value="channels">Channels</TabsTrigger>
            </TabsList>
            
            {/* Overview Tab */}
            <TabsContent value="overview">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Sales Over Time</CardTitle>
                    <CardDescription>Number of orders by {groupBy}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                          data={timeSeriesData}
                          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="label" />
                          <YAxis />
                          <Tooltip formatter={(value) => [value, "Sales"]} />
                          <Area 
                            type="monotone" 
                            dataKey="sales" 
                            stroke="#3b82f6" 
                            fill="#3b82f67f"
                            name="Sales" 
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Revenue Breakdown</CardTitle>
                    <CardDescription>Revenue by marketplace</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={reportData.marketplaceBreakdown}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                            nameKey="name"
                            label={({name, percent}) => `${name}: ${formatPercentage(percent * 100)}`}
                          >
                            {reportData.marketplaceBreakdown.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            
            {/* Revenue Tab */}
            <TabsContent value="revenue">
              <div className="grid grid-cols-1 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Revenue & Profit</CardTitle>
                    <CardDescription>Comparing revenue and profit over time</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-96">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={timeSeriesData}
                          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="label" />
                          <YAxis />
                          <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                          <Legend />
                          <Bar dataKey="revenue" name="Revenue" fill="#3b82f6" />
                          <Bar dataKey="profit" name="Profit" fill="#10b981" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            
            {/* Products Tab */}
            <TabsContent value="products">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Top Selling Products</CardTitle>
                    <CardDescription>By quantity sold</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          layout="vertical"
                          data={reportData.topProducts.slice(0, 5)}
                          margin={{ top: 20, right: 30, left: 60, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" />
                          <YAxis 
                            type="category" 
                            dataKey="name"
                            width={150}
                            tickFormatter={(value) => value.length > 20 ? `${value.substring(0, 20)}...` : value}
                          />
                          <Tooltip />
                          <Bar dataKey="quantity" name="Quantity Sold" fill="#8b5cf6" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Products by Revenue</CardTitle>
                    <CardDescription>Total revenue generated per product</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          layout="vertical"
                          data={reportData.topProducts.slice(0, 5)}
                          margin={{ top: 20, right: 30, left: 60, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" />
                          <YAxis 
                            type="category" 
                            dataKey="name"
                            width={150}
                            tickFormatter={(value) => value.length > 20 ? `${value.substring(0, 20)}...` : value}
                          />
                          <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                          <Bar dataKey="revenue" name="Revenue" fill="#f59e0b" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            
            {/* Channels Tab */}
            <TabsContent value="channels">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Sales by Channel</CardTitle>
                    <CardDescription>Number of sales per marketplace</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={reportData.marketplaceBreakdown}
                          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip />
                          <Bar dataKey="value" name="Sales" fill="#ef4444">
                            {reportData.marketplaceBreakdown.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Category Distribution</CardTitle>
                    <CardDescription>Sales by product category</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={reportData.categoryBreakdown}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                            nameKey="name"
                            label={({name, percent}) => `${name}: ${formatPercentage(percent * 100)}`}
                          >
                            {reportData.categoryBreakdown.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => [value, "Sales"]} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
          
          {/* Top Products Table */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Top Performing Products</CardTitle>
              <CardDescription>Products with highest revenue</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="pb-3 text-left">Product</th>
                      <th className="pb-3 text-right">Quantity</th>
                      <th className="pb-3 text-right">Revenue</th>
                      <th className="pb-3 text-right">Profit</th>
                      <th className="pb-3 text-right">Margin</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.topProducts.map((product, index) => (
                      <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 text-left">{product.name}</td>
                        <td className="py-3 text-right">{product.quantity}</td>
                        <td className="py-3 text-right">{formatCurrency(product.revenue)}</td>
                        <td className="py-3 text-right">{formatCurrency(product.profit)}</td>
                        <td className="py-3 text-right">
                          {product.profit > 0 ? (
                            <span className="flex items-center justify-end text-green-600">
                              <ArrowUpIcon className="h-4 w-4 mr-1" />
                              {formatPercentage(product.profit / product.revenue * 100)}
                            </span>
                          ) : (
                            <span className="flex items-center justify-end text-red-600">
                              <ArrowDownIcon className="h-4 w-4 mr-1" />
                              {formatPercentage(Math.abs(product.profit / product.revenue * 100))}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <div className="text-center py-20 border rounded-xl">
          <h3 className="text-xl font-medium text-gray-900">No sales data available</h3>
          <p className="mt-2 text-gray-500">Select a date range to view sales analytics</p>
        </div>
      )}
    </div>
  );
}