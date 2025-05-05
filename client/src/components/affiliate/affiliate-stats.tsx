import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDistanceToNow, format } from 'date-fns';

interface AffiliateTransaction {
  id: number;
  affiliateId: number;
  saleId: number;
  transactionType: string;
  amount: number;
  description: string;
  status: string;
  createdAt: string;
  processedAt: string | null;
}

interface AffiliateStats {
  totalSales: number;
  totalEarnings: number;
  pendingPayouts: number;
  conversionRate: number;
  recentTransactions: AffiliateTransaction[];
}

interface AffiliateStatsProps {
  stats: AffiliateStats;
  isLoading?: boolean;
}

export function AffiliateStats({ stats, isLoading = false }: AffiliateStatsProps) {
  if (isLoading) {
    return (
      <Card className="w-full h-full">
        <CardHeader>
          <CardTitle>Statistics</CardTitle>
          <CardDescription>Your affiliate performance at a glance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="w-full h-48 flex items-center justify-center">
            <div className="animate-pulse flex space-x-4">
              <div className="flex-1 space-y-6 py-1">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="h-4 bg-gray-200 rounded col-span-2"></div>
                    <div className="h-4 bg-gray-200 rounded col-span-1"></div>
                  </div>
                  <div className="h-4 bg-gray-200 rounded"></div>
                </div>
                <div className="h-24 bg-gray-200 rounded"></div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Statistics</CardTitle>
        <CardDescription>Your affiliate performance at a glance</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="text-sm text-gray-500">Total Sales</div>
            <div className="text-2xl font-bold">{stats.totalSales}</div>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="text-sm text-gray-500">Total Earnings</div>
            <div className="text-2xl font-bold">${stats.totalEarnings.toFixed(2)}</div>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="text-sm text-gray-500">Pending Payout</div>
            <div className="text-2xl font-bold">${stats.pendingPayouts.toFixed(2)}</div>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="text-sm text-gray-500">Conversion Rate</div>
            <div className="text-2xl font-bold">{(stats.conversionRate * 100).toFixed(1)}%</div>
          </div>
        </div>

        <div className="mt-6">
          <h3 className="text-lg font-medium mb-3">Recent Transactions</h3>
          
          {stats.recentTransactions.length === 0 ? (
            <div className="text-center p-4 text-gray-500">
              No transactions yet.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Transaction</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.recentTransactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell className="font-medium">
                      {format(new Date(transaction.createdAt), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{transaction.transactionType}</div>
                      <div className="text-xs text-gray-500">{transaction.description}</div>
                    </TableCell>
                    <TableCell className="text-right">
                      ${transaction.amount.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        transaction.status === 'pending' 
                          ? 'bg-yellow-100 text-yellow-800' 
                          : transaction.status === 'processed'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {transaction.status}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </CardContent>
    </Card>
  );
}