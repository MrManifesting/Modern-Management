import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Users, DollarSign, TrendingUp, Crown, Award, Medal, Star, User } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface Customer {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  displayName: string;
  phone: string;
  totalSpent: number;
  orderCount: number;
  tier: string;
  tierColor: string;
  nextTier: string | null;
  nextTierAmount: number | null;
  remainingToNextTier: number;
  createdAt: string;
}

interface TierSummary {
  name: string;
  threshold: number;
  color: string;
  count: number;
  totalRevenue: number;
}

interface CustomerTiersData {
  totalCustomers: number;
  totalRevenue: number;
  averageSpend: number;
  summary: Array<{
    tier: {
      name: string;
      threshold: number;
      color: string;
      icon: string;
    };
    count: number;
    totalRevenue: number;
    customers: Customer[];
  }>;
}

const getTierIcon = (tierName: string) => {
  switch (tierName) {
    case 'Diamond':
      return <Crown className="h-5 w-5" />;
    case 'Platinum':
      return <Award className="h-5 w-5" />;
    case 'Gold':
      return <Medal className="h-5 w-5" />;
    case 'Silver':
      return <Star className="h-5 w-5" />;
    case 'Bronze':
      return <Users className="h-5 w-5" />;
    default:
      return <User className="h-5 w-5" />;
  }
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export default function CustomerTiersPage() {
  const { data: tierData, isLoading, error } = useQuery<CustomerTiersData>({
    queryKey: ['/api/customers/tiers'],
  });

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error || !tierData) {
    return (
      <div className="container mx-auto p-6">
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-800">Error Loading Customer Tiers</CardTitle>
            <CardDescription className="text-red-600">
              Failed to fetch customer tier data. Please check your Shopify connection.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const { totalCustomers, totalRevenue, averageSpend, summary } = tierData;
  
  // Extract all customers from tier data and sort by totalSpent
  const allCustomers = summary
    .flatMap(tierData => tierData.customers)
    .sort((a, b) => b.totalSpent - a.totalSpent);

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-gold-600">Customer Tiers</h1>
        <p className="text-muted-foreground">
          Customer segmentation based on total spending: $250,000+, $100,000+, $50,000+, $25,000+, $5,000+
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCustomers.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalRevenue)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Spend</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(averageSpend)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">VIP Customers</CardTitle>
            <Crown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary.filter(t => ['Diamond', 'Platinum', 'Gold'].includes(t.tier.name)).reduce((sum, t) => sum + t.count, 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tier Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {summary.map((tierData) => (
          <Card key={tierData.tier.name} className="border-2" style={{ borderColor: tierData.tier.color }}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                {getTierIcon(tierData.tier.name)}
                {tierData.tier.name} Tier
              </CardTitle>
              <Badge style={{ backgroundColor: tierData.tier.color, color: '#000' }}>
                {formatCurrency(tierData.tier.threshold)}+
              </Badge>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-2xl font-bold">{tierData.count} customers</div>
              <div className="text-sm text-muted-foreground">
                Total Revenue: {formatCurrency(tierData.totalRevenue)}
              </div>
              <div className="text-sm text-muted-foreground">
                Avg: {tierData.count > 0 ? formatCurrency(tierData.totalRevenue / tierData.count) : '$0'}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Top Customers */}
      <Card>
        <CardHeader>
          <CardTitle>Top Customers by Spending</CardTitle>
          <CardDescription>
            Your highest value customers across all tiers
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {allCustomers.slice(0, 20).map((customer, index) => (
              <div key={customer.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gold-100 text-gold-800 font-bold">
                    {index + 1}
                  </div>
                  <div>
                    <div className="font-medium">
                      {customer.displayName || `${customer.firstName} ${customer.lastName}`.trim() || customer.email}
                    </div>
                    <div className="text-sm text-muted-foreground">{customer.email}</div>
                  </div>
                </div>
                <div className="text-right space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge style={{ backgroundColor: customer.tierColor, color: '#000' }}>
                      {customer.tier}
                    </Badge>
                    <div className="font-bold">{formatCurrency(customer.totalSpent)}</div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {customer.orderCount} orders
                  </div>
                  {customer.nextTier && (
                    <div className="text-xs text-muted-foreground">
                      {formatCurrency(customer.remainingToNextTier)} to {customer.nextTier}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* All Customers Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Customers ({allCustomers.length})</CardTitle>
          <CardDescription>
            Complete customer list with tier information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {allCustomers.map((customer) => (
              <div key={customer.id} className="flex items-center justify-between p-3 border rounded hover:bg-gray-50">
                <div className="flex items-center space-x-3">
                  <div style={{ color: customer.tierColor }}>
                    {getTierIcon(customer.tier)}
                  </div>
                  <div>
                    <div className="font-medium">
                      {customer.displayName || `${customer.firstName} ${customer.lastName}`.trim() || customer.email}
                    </div>
                    <div className="text-xs text-muted-foreground">{customer.email}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" style={{ borderColor: customer.tierColor, color: customer.tierColor }}>
                      {customer.tier}
                    </Badge>
                    <div className="font-medium">{formatCurrency(customer.totalSpent)}</div>
                  </div>
                  <div className="text-xs text-muted-foreground">{customer.orderCount} orders</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}