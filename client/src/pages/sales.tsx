import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Sale } from "../../shared/schema";
import { SaleForm } from "@/components/sales/sale-form";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { 
  PlusCircle, 
  Search, 
  ShoppingCart, 
  CreditCard, 
  Package2, 
  FileBarChart, 
  Loader2 
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Link } from "wouter";

export default function Sales() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  // Fetch all sales
  const { data: sales, isLoading, error, refetch } = useQuery({
    queryKey: ['/api/sales'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/sales');
      if (!response.ok) {
        throw new Error("Failed to fetch sales");
      }
      return response.json() as Promise<Sale[]>;
    },
  });

  // Fetch items to get names
  const { data: items } = useQuery({
    queryKey: ['/api/items'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/items');
      if (!response.ok) {
        throw new Error("Failed to fetch items");
      }
      return response.json();
    },
  });

  // Format currency for display
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  // Get item name by ID
  const getItemName = (itemId: number): string => {
    const item = items?.find(i => i.id === itemId);
    return item ? item.name : `Item #${itemId}`;
  };

  // Filter sales based on search term and active tab
  const filteredSales = sales?.filter(sale => {
    // Filter by search term
    const matchesSearch = 
      !searchTerm || 
      getItemName(sale.itemId).toLowerCase().includes(searchTerm.toLowerCase()) ||
      sale.orderNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sale.trackingNumber?.toLowerCase().includes(searchTerm.toLowerCase());
      
    // Filter by tab
    const matchesTab = 
      activeTab === "all" || 
      sale.status === activeTab;
      
    return matchesSearch && matchesTab;
  });

  // Handle successful sale creation
  const handleSaleSuccess = () => {
    setIsDialogOpen(false);
    refetch();
  };

  // Get status badge color
  const getStatusBadge = (status: string) => {
    switch(status) {
      case "completed":
        return <Badge className="bg-green-500">Completed</Badge>;
      case "pending":
        return <Badge className="bg-blue-500">Pending</Badge>;
      case "refunded":
        return <Badge className="bg-amber-500">Refunded</Badge>;
      case "cancelled":
        return <Badge className="bg-red-500">Cancelled</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  // Calculate total sales statistics
  const calculateStats = () => {
    if (!sales || sales.length === 0) {
      return { 
        totalSales: 0, 
        totalRevenue: 0, 
        averageOrderValue: 0 
      };
    }
    
    const totalSales = sales.length;
    const totalRevenue = sales.reduce((sum, sale) => sum + (sale.salePrice * sale.quantity), 0);
    const averageOrderValue = totalRevenue / totalSales;
    
    return { totalSales, totalRevenue, averageOrderValue };
  };
  
  const stats = calculateStats();

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Sales Management</h1>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Record Sale
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Record New Sale</DialogTitle>
              <DialogDescription>
                Enter the details of the sale to record it in your system.
              </DialogDescription>
            </DialogHeader>
            <SaleForm onSuccess={handleSaleSuccess} />
          </DialogContent>
        </Dialog>
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium text-gray-500">Total Sales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalSales}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium text-gray-500">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatCurrency(stats.totalRevenue)}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium text-gray-500">Average Order Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatCurrency(stats.averageOrderValue)}</div>
          </CardContent>
        </Card>
      </div>
      
      {/* Search and Tabs */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
          <h2 className="text-lg font-semibold">Sale Records</h2>
          
          <div className="relative w-full sm:w-64 mt-2 sm:mt-0">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search orders..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        
        <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="all" className="flex items-center">
              <ShoppingCart className="mr-2 h-4 w-4" />
              All Sales
            </TabsTrigger>
            <TabsTrigger value="completed" className="flex items-center">
              <CreditCard className="mr-2 h-4 w-4" />
              Completed
            </TabsTrigger>
            <TabsTrigger value="pending" className="flex items-center">
              <Package2 className="mr-2 h-4 w-4" />
              Pending
            </TabsTrigger>
            <TabsTrigger value="refunded" className="flex items-center">
              <FileBarChart className="mr-2 h-4 w-4" />
              Refunded
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value={activeTab} className="mt-0">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredSales && filteredSales.length > 0 ? (
              <div className="border rounded-md overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order #</TableHead>
                      <TableHead>Item</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Marketplace</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSales.map((sale) => (
                      <TableRow key={sale.id}>
                        <TableCell className="font-medium">
                          {sale.orderNumber || `Order #${sale.id}`}
                        </TableCell>
                        <TableCell>{getItemName(sale.itemId)}</TableCell>
                        <TableCell>{format(new Date(sale.saleDate), "MMM d, yyyy")}</TableCell>
                        <TableCell>{sale.marketplace}</TableCell>
                        <TableCell>{sale.quantity}</TableCell>
                        <TableCell>{formatCurrency(sale.salePrice)}</TableCell>
                        <TableCell>{formatCurrency(sale.salePrice * sale.quantity)}</TableCell>
                        <TableCell>{getStatusBadge(sale.status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 border rounded-md">
                <ShoppingCart className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-lg font-medium text-gray-900">No sales found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {searchTerm 
                    ? "No sales matching your search criteria." 
                    : "Get started by recording your first sale."}
                </p>
                <div className="mt-6">
                  <Button onClick={() => setIsDialogOpen(true)}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Record Sale
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Analytics Link */}
      <div className="text-center mt-8">
        <h2 className="text-xl font-semibold mb-3">Need more insights?</h2>
        <p className="text-gray-500 mb-4">
          View detailed sales analytics with charts and reports
        </p>
        <Link href="/reports">
          <Button size="lg">
            <FileBarChart className="mr-2 h-5 w-5" />
            View Sales Analytics
          </Button>
        </Link>
      </div>
    </div>
  );
}