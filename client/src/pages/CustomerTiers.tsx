import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { 
  Users, 
  TrendingUp, 
  DollarSign, 
  Award,
  Search,
  Download,
  Phone,
  Mail,
  Building,
  RefreshCw
} from 'lucide-react';

interface CustomerTier {
  name: string;
  threshold: number;
  color: string;
  icon: string;
}

interface CustomerWithTier {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  totalSpent: number;
  ordersCount: number;
  tier: CustomerTier;
  lastOrderDate: string;
  tags: string[];
  phone?: string;
  company?: string;
}

interface CustomerTierSummary {
  tier: CustomerTier;
  count: number;
  totalRevenue: number;
  customers: CustomerWithTier[];
}

interface TierData {
  summary: CustomerTierSummary[];
  totalCustomers: number;
  totalRevenue: number;
  averageSpend: number;
}

export function CustomerTiersPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTier, setSelectedTier] = useState<string>('all');
  const { toast } = useToast();

  const { data: tierData, isLoading, error, refetch } = useQuery<TierData>({
    queryKey: ['/api/customers/tiers'],
    refetchInterval: 60000 // Refresh every minute
  });

  // Filter customers based on search and tier selection
  const getFilteredCustomers = () => {
    if (!tierData) return [];
    
    let allCustomers: CustomerWithTier[] = [];
    
    // Collect customers from selected tier or all tiers
    tierData.summary.forEach(tierSummary => {
      if (selectedTier === 'all' || tierSummary.tier.name === selectedTier) {
        allCustomers = [...allCustomers, ...tierSummary.customers];
      }
    });

    // Apply search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      allCustomers = allCustomers.filter(customer => 
        customer.email.toLowerCase().includes(search) ||
        `${customer.firstName} ${customer.lastName}`.toLowerCase().includes(search) ||
        (customer.company && customer.company.toLowerCase().includes(search))
      );
    }

    return allCustomers;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const exportToCSV = () => {
    const customers = getFilteredCustomers();
    const headers = ['Name', 'Email', 'Company', 'Phone', 'Tier', 'Total Spent', 'Orders', 'Last Order'];
    
    const csvContent = [
      headers.join(','),
      ...customers.map(c => [
        `"${c.firstName} ${c.lastName}"`,
        c.email,
        c.company || '',
        c.phone || '',
        c.tier.name,
        c.totalSpent,
        c.ordersCount,
        formatDate(c.lastOrderDate)
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `customer-tiers-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "Export Successful",
      description: `Exported ${customers.length} customers to CSV`
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-lg">Loading customer tier data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Error Loading Customer Data</CardTitle>
            <CardDescription>
              Failed to fetch customer tier information from Shopify.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const filteredCustomers = getFilteredCustomers();

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold gradient-text">Customer Tiers</h1>
          <p className="text-muted-foreground mt-2">
            Prioritize customers based on their lifetime spending
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => refetch()} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={exportToCSV}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Customers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">{tierData?.totalCustomers || 0}</span>
              <Users className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">
                {formatCurrency(tierData?.totalRevenue || 0)}
              </span>
              <DollarSign className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Average Spend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">
                {formatCurrency(tierData?.averageSpend || 0)}
              </span>
              <TrendingUp className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              VIP Customers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">
                {tierData?.summary.filter(s => s.tier.threshold >= 50000)
                  .reduce((acc, s) => acc + s.count, 0) || 0}
              </span>
              <Award className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tier Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Tier Distribution</CardTitle>
          <CardDescription>
            Customer distribution across spending tiers
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {tierData?.summary.map((tierSummary) => {
              const percentage = tierData.totalCustomers > 0
                ? (tierSummary.count / tierData.totalCustomers) * 100
                : 0;
              
              return (
                <div key={tierSummary.tier.name} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{tierSummary.tier.icon}</span>
                      <span className="font-medium">{tierSummary.tier.name}</span>
                      <Badge 
                        variant="outline"
                        style={{ borderColor: tierSummary.tier.color, color: tierSummary.tier.color }}
                      >
                        {formatCurrency(tierSummary.tier.threshold)}+
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {tierSummary.count} customers • {formatCurrency(tierSummary.totalRevenue)}
                    </div>
                  </div>
                  <Progress 
                    value={percentage} 
                    className="h-2"
                    style={{ 
                      '--progress-background': tierSummary.tier.color 
                    } as any}
                  />
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Customer List */}
      <Card>
        <CardHeader>
          <CardTitle>Customer Details</CardTitle>
          <CardDescription>
            View and search customers by tier
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, or company..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Tabs value={selectedTier} onValueChange={setSelectedTier} className="w-full md:w-auto">
              <TabsList>
                <TabsTrigger value="all">All Tiers</TabsTrigger>
                {tierData?.summary
                  .filter(s => s.tier.threshold >= 10000)
                  .map(s => (
                    <TabsTrigger key={s.tier.name} value={s.tier.name}>
                      {s.tier.icon} {s.tier.name}
                    </TabsTrigger>
                  ))}
              </TabsList>
            </Tabs>
          </div>

          {/* Customer Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead className="text-right">Total Spent</TableHead>
                  <TableHead className="text-center">Orders</TableHead>
                  <TableHead>Last Order</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No customers found matching your criteria
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCustomers.map((customer) => (
                    <TableRow key={customer.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {customer.firstName} {customer.lastName}
                          </div>
                          {customer.company && (
                            <div className="text-sm text-muted-foreground flex items-center gap-1">
                              <Building className="h-3 w-3" />
                              {customer.company}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-sm">
                            <Mail className="h-3 w-3" />
                            <a href={`mailto:${customer.email}`} className="hover:underline">
                              {customer.email}
                            </a>
                          </div>
                          {customer.phone && (
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Phone className="h-3 w-3" />
                              <a href={`tel:${customer.phone}`} className="hover:underline">
                                {customer.phone}
                              </a>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline"
                          style={{ 
                            borderColor: customer.tier.color, 
                            color: customer.tier.color,
                            backgroundColor: `${customer.tier.color}20`
                          }}
                        >
                          {customer.tier.icon} {customer.tier.name}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(customer.totalSpent)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary">
                          {customer.ordersCount}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(customer.lastOrderDate)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="mt-4 text-sm text-muted-foreground text-center">
            Showing {filteredCustomers.length} of {tierData?.totalCustomers || 0} customers
          </div>
        </CardContent>
      </Card>
    </div>
  );
}