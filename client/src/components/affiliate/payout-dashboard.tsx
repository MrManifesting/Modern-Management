import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { apiRequest } from "@/lib/queryClient";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar } from "@/components/ui/avatar";
import { DollarSign, Clock, CheckCircle, AlertCircle, RefreshCw } from "lucide-react";

interface AffiliateTransaction {
  id: number;
  affiliateId: number;
  saleId?: number;
  transactionType: string;
  amount: number;
  description: string;
  status: string;
  stripeTransferId?: string;
  stripePaymentIntentId?: string;
  payoutBatchId?: string;
  processedAt?: string;
  createdAt: string;
}

interface PayoutDashboardProps {
  affiliateId: number;
  hasPayout?: boolean;
  stripeConnected?: boolean;
  onRequestPayout?: () => void;
}

export function PayoutDashboard({
  affiliateId,
  hasPayout = true,
  stripeConnected = false,
  onRequestPayout,
}: PayoutDashboardProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [transactions, setTransactions] = useState<AffiliateTransaction[]>([]);
  const [stats, setStats] = useState<{
    totalEarnings: number;
    pendingPayouts: number;
    totalSales: number;
  }>({
    totalEarnings: 0,
    pendingPayouts: 0,
    totalSales: 0,
  });

  useEffect(() => {
    if (affiliateId) {
      fetchTransactions();
      fetchStats();
    }
  }, [affiliateId]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      // This would be replaced with an actual API endpoint for transactions
      const response = await apiRequest(
        "GET", 
        `/api/affiliates/${affiliateId}/transactions`
      );
      const data = await response.json();

      if (data.success) {
        setTransactions(data.data || []);
      } else {
        console.error("Error fetching transactions:", data.message);
      }
    } catch (error) {
      console.error("Error fetching transactions:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await apiRequest(
        "GET",
        `/api/affiliates/${affiliateId}/stats`
      );
      const data = await response.json();

      if (data.success) {
        setStats({
          totalEarnings: data.data.totalEarnings || 0,
          pendingPayouts: data.data.pendingPayouts || 0,
          totalSales: data.data.totalSales || 0,
        });
      } else {
        console.error("Error fetching affiliate stats:", data.message);
      }
    } catch (error) {
      console.error("Error fetching affiliate stats:", error);
    }
  };

  const requestPayout = async () => {
    try {
      setProcessing(true);
      
      if (!stripeConnected) {
        // If onRequestPayout is provided, it will handle showing the Stripe connect UI
        if (onRequestPayout) {
          onRequestPayout();
          return;
        }
        
        toast({
          title: "Payment Account Required",
          description: "Please connect a payment account before requesting a payout.",
          variant: "destructive",
        });
        return;
      }
      
      // In a real implementation, this would call the payout API
      const response = await apiRequest(
        "POST",
        `/api/affiliates/${affiliateId}/payout`,
        { amount: stats.pendingPayouts }
      );
      const data = await response.json();

      if (data.success) {
        toast({
          title: "Payout Successful",
          description: `Your payout of $${stats.pendingPayouts.toFixed(2)} has been processed.`,
        });
        
        // Refresh data
        fetchTransactions();
        fetchStats();
      } else {
        throw new Error(data.message || "Failed to process payout");
      }
    } catch (error) {
      console.error("Error requesting payout:", error);
      toast({
        title: "Payout Failed",
        description: "There was an error processing your payout. Please try again.",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
    }).format(date);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-amber-500" />;
      case 'processed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'canceled':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-slate-500" />;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
          <Skeleton className="h-48 w-full" />
        </CardContent>
      </Card>
    );
  }

  const hasTransactions = transactions.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Earnings & Payouts
        </CardTitle>
        <CardDescription>
          Track your affiliate earnings and request payouts
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Earnings</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {formatCurrency(stats.totalEarnings)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Available for Payout</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {formatCurrency(stats.pendingPayouts)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Sales</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats.totalSales}</p>
            </CardContent>
          </Card>
        </div>

        <div className="mb-4 flex justify-between items-center">
          <h3 className="text-lg font-medium">Recent Transactions</h3>
          <Button variant="outline" size="sm" onClick={fetchTransactions}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {hasTransactions ? (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell>
                      {formatDate(transaction.processedAt || transaction.createdAt)}
                    </TableCell>
                    <TableCell className="capitalize">
                      {transaction.transactionType}
                    </TableCell>
                    <TableCell>{transaction.description}</TableCell>
                    <TableCell>
                      <span className={transaction.transactionType === 'payout' ? 'text-red-500' : 'text-green-500'}>
                        {transaction.transactionType === 'payout' ? '-' : '+'}
                        {formatCurrency(transaction.amount)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(transaction.status)}
                        <span className="capitalize">{transaction.status}</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="py-12 flex items-center justify-center flex-col gap-4 border rounded-md bg-slate-50">
            <Avatar className="h-16 w-16 flex items-center justify-center">
              <DollarSign className="h-8 w-8" />
            </Avatar>
            <p className="text-sm text-slate-600 text-center">
              No transactions yet. Start promoting your affiliate links to earn commissions!
            </p>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-center">
        <Button
          onClick={requestPayout}
          disabled={
            processing || 
            !hasPayout || 
            stats.pendingPayouts <= 0
          }
          className="w-full md:w-auto"
        >
          {processing
            ? "Processing..."
            : `Request Payout (${formatCurrency(stats.pendingPayouts)})`}
        </Button>
      </CardFooter>
    </Card>
  );
}