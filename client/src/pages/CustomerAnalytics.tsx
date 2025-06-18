import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  Users, 
  TrendingUp, 
  DollarSign, 
  ShoppingCart, 
  Crown, 
  Star,
  Trophy,
  Gift,
  Target,
  Calendar
} from 'lucide-react';

interface CustomerTier {
  id: number;
  tierName: string;
  minTotalSpent: number;
  minOrders: number;
  minMonthsActive: number;
  discountPercentage: number;
  loyaltyPointsMultiplier: number;
  badgeColor: string;
  displayOrder: number;
}

interface Customer {
  id: number;
  name: string;
  email: string;
  customerTier: string;
  totalSpent: number;
  totalOrders: number;
  averageOrderValue: number;
  lastOrderDate: string;
}

interface AnalyticsReport {
  tierDistribution: Array<{
    tier: string;
    count: number;
    totalSpent: number;
    averageSpent: number;
  }>;
  topCustomers: Customer[];
  orderTrends: Array<{
    date: string;
    orders: number;
    revenue: number;
    averageOrderValue: number;
  }>;
  summary: {
    totalCustomers: number;
    newCustomersThisPeriod: number;
    totalRevenue: number;
    averageOrderValue: number;
  };
}

const getTierIcon = (tier: string) => {
  switch (tier.toLowerCase()) {
    case 'diamond': return <Trophy className="h-4 w-4" />;
    case 'platinum': return <Crown className="h-4 w-4" />;
    case 'gold': return <Star className="h-4 w-4" />;
    case 'silver': return <Gift className="h-4 w-4" />;
    default: return <Target className="h-4 w-4" />;
  }
};

const getTierColor = (tier: string) => {
  switch (tier.toLowerCase()) {
    case 'diamond': return 'bg-blue-100 text-blue-800';
    case 'platinum': return 'bg-gray-100 text-gray-800';
    case 'gold': return 'bg-yellow-100 text-yellow-800';
    case 'silver': return 'bg-slate-100 text-slate-800';
    default: return 'bg-orange-100 text-orange-800';
  }
};

export default function CustomerAnalytics() {
  const [timeRange, setTimeRange] = useState('month');
  const [selectedCustomer, setSelectedCustomer] = useState<number | null>(null);

  // Fetch customer analytics report
  const { data: analyticsReport, isLoading: reportLoading } = useQuery<AnalyticsReport>({
    queryKey: ['/api/analytics/customers/report', timeRange],
    queryFn: async () => {
      const response = await fetch(`/api/analytics/customers/report?timeRange=${timeRange}`);
      if (!response.ok) throw new Error('Failed to fetch analytics report');
      const result = await response.json();
      return result.data;
    }
  });

  // Fetch customer tiers
  const { data: customerTiers, isLoading: tiersLoading } = useQuery<CustomerTier[]>({
    queryKey: ['/api/analytics/customers/tiers'],
    queryFn: async () => {
      const response = await fetch('/api/analytics/customers/tiers');
      if (!response.ok) throw new Error('Failed to fetch customer tiers');
      const result = await response.json();
      return result.data;
    }
  });

  // Fetch customer profile if selected
  const { data: customerProfile } = useQuery({
    queryKey: ['/api/analytics/customers', selectedCustomer, 'profile'],
    queryFn: async () => {
      if (!selectedCustomer) return null;
      const response = await fetch(`/api/analytics/customers/${selectedCustomer}/profile`);
      if (!response.ok) throw new Error('Failed to fetch customer profile');
      const result = await response.json();
      return result.data;
    },
    enabled: !!selectedCustomer
  });

  // Initialize analytics system
  const initializeAnalytics = async () => {
    try {
      const response = await fetch('/api/analytics/initialize', { method: 'POST' });
      if (!response.ok) throw new Error('Failed to initialize analytics');
      // Refresh data after initialization
      window.location.reload();
    } catch (error) {
      console.error('Error initializing analytics:', error);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (reportLoading || tiersLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Customer Analytics</h1>
          <p className="text-gray-600">Comprehensive customer insights and tiered segmentation</p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Last Week</SelectItem>
              <SelectItem value="month">Last Month</SelectItem>
              <SelectItem value="quarter">Last Quarter</SelectItem>
              <SelectItem value="year">Last Year</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={initializeAnalytics} variant="outline">
            Initialize Analytics
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsReport?.summary.totalCustomers || 0}</div>
            <p className="text-xs text-muted-foreground">
              +{analyticsReport?.summary.newCustomersThisPeriod || 0} new this period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(analyticsReport?.summary.totalRevenue || 0)}
            </div>
            <p className="text-xs text-muted-foreground">This {timeRange}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Order Value</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(analyticsReport?.summary.averageOrderValue || 0)}
            </div>
            <p className="text-xs text-muted-foreground">Per order</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Customer Tiers</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{customerTiers?.length || 0}</div>
            <p className="text-xs text-muted-foreground">Active tier levels</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="customers">Top Customers</TabsTrigger>
          <TabsTrigger value="tiers">Customer Tiers</TabsTrigger>
          <TabsTrigger value="trends">Order Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Tier Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Customer Tier Distribution</CardTitle>
              <CardDescription>Revenue and customer count by tier</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analyticsReport?.tierDistribution.map((tier, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Badge className={getTierColor(tier.tier)}>
                        {getTierIcon(tier.tier)}
                        <span className="ml-1">{tier.tier}</span>
                      </Badge>
                      <div>
                        <p className="font-medium">{tier.count} customers</p>
                        <p className="text-sm text-gray-600">
                          Avg: {formatCurrency(tier.averageSpent)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatCurrency(tier.totalSpent)}</p>
                      <p className="text-sm text-gray-600">Total Revenue</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="customers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top Customers</CardTitle>
              <CardDescription>Highest value customers by total spending</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Tier</TableHead>
                    <TableHead>Total Spent</TableHead>
                    <TableHead>Orders</TableHead>
                    <TableHead>Avg Order</TableHead>
                    <TableHead>Last Order</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analyticsReport?.topCustomers.map((customer) => (
                    <TableRow key={customer.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{customer.name || customer.email}</p>
                          <p className="text-sm text-gray-600">{customer.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getTierColor(customer.customerTier)}>
                          {getTierIcon(customer.customerTier)}
                          <span className="ml-1">{customer.customerTier}</span>
                        </Badge>
                      </TableCell>
                      <TableCell className="font-semibold">
                        {formatCurrency(customer.totalSpent)}
                      </TableCell>
                      <TableCell>{customer.totalOrders}</TableCell>
                      <TableCell>{formatCurrency(customer.averageOrderValue)}</TableCell>
                      <TableCell>{formatDate(customer.lastOrderDate)}</TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedCustomer(customer.id)}
                        >
                          View Profile
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tiers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Customer Tier Configuration</CardTitle>
              <CardDescription>Tier thresholds and benefits</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {customerTiers?.map((tier) => (
                  <div key={tier.id} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <Badge className={getTierColor(tier.tierName)}>
                        {getTierIcon(tier.tierName)}
                        <span className="ml-1">{tier.tierName}</span>
                      </Badge>
                      <div className="text-sm text-gray-600">
                        Order #{tier.displayOrder}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="font-medium">Min Spending</p>
                        <p className="text-gray-600">{formatCurrency(tier.minTotalSpent)}</p>
                      </div>
                      <div>
                        <p className="font-medium">Min Orders</p>
                        <p className="text-gray-600">{tier.minOrders}</p>
                      </div>
                      <div>
                        <p className="font-medium">Discount</p>
                        <p className="text-gray-600">{tier.discountPercentage}%</p>
                      </div>
                      <div>
                        <p className="font-medium">Loyalty Multiplier</p>
                        <p className="text-gray-600">{tier.loyaltyPointsMultiplier}x</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Order Trends</CardTitle>
              <CardDescription>Daily order and revenue trends for the selected period</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analyticsReport?.orderTrends.map((trend, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded">
                    <div className="flex items-center gap-3">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      <div>
                        <p className="font-medium">{formatDate(trend.date)}</p>
                        <p className="text-sm text-gray-600">{trend.orders} orders</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatCurrency(trend.revenue)}</p>
                      <p className="text-sm text-gray-600">
                        Avg: {formatCurrency(trend.averageOrderValue)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Customer Profile Modal */}
      {selectedCustomer && customerProfile && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Customer Profile</CardTitle>
                <Button variant="ghost" onClick={() => setSelectedCustomer(null)}>
                  ×
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <div>
                  <h3 className="font-semibold">{customerProfile.customer.name || customerProfile.customer.email}</h3>
                  <p className="text-gray-600">{customerProfile.customer.email}</p>
                </div>
                <Badge className={getTierColor(customerProfile.customer.customerTier)}>
                  {getTierIcon(customerProfile.customer.customerTier)}
                  <span className="ml-1">{customerProfile.customer.customerTier}</span>
                </Badge>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium">Total Spent</p>
                  <p className="text-lg">{formatCurrency(customerProfile.customer.totalSpent)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Total Orders</p>
                  <p className="text-lg">{customerProfile.customer.totalOrders}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Average Order</p>
                  <p className="text-lg">{formatCurrency(customerProfile.customer.averageOrderValue)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Loyalty Points</p>
                  <p className="text-lg">{customerProfile.customer.loyaltyPoints || 0}</p>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">Recent Orders</h4>
                <div className="space-y-2">
                  {customerProfile.recentOrders?.slice(0, 5).map((order: any, index: number) => (
                    <div key={index} className="flex justify-between text-sm p-2 bg-gray-50 rounded">
                      <span>{order.orderId}</span>
                      <span>{formatCurrency(order.totalAmount)}</span>
                      <span>{formatDate(order.orderDate)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}