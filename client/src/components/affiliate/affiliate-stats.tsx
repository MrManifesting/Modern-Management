import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Loader2, TrendingUp, DollarSign, ShoppingCart, CreditCard } from 'lucide-react';
import { format } from 'date-fns';

interface Transaction {
  id: number;
  amount: number;
  commission: number;
  date: string;
  type: string;
  status: string;
  source: string;
}

interface AffiliateStatsProps {
  stats: {
    totalSales: number;
    totalEarnings: number;
    pendingPayouts: number;
    conversionRate: number;
    recentTransactions: Transaction[];
  };
  isLoading: boolean;
}

export function AffiliateStats({ stats, isLoading }: AffiliateStatsProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const StatCard = ({ 
    title, 
    value, 
    description,
    icon: Icon,
    iconColorClass = "text-blue-500"
  }: { 
    title: string; 
    value: string | number; 
    description: string;
    icon: any;
    iconColorClass?: string;
  }) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="space-y-1">
          <CardTitle className="text-lg">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        <div className={`h-10 w-10 rounded-full flex items-center justify-center ${iconColorClass} bg-opacity-10`}>
          <Icon className="h-6 w-6" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Sales"
          value={stats.totalSales}
          description="Products sold through your links"
          icon={ShoppingCart}
          iconColorClass="text-blue-500"
        />
        <StatCard
          title="Total Earnings"
          value={`$${stats.totalEarnings.toFixed(2)}`}
          description="Commission earned to date"
          icon={DollarSign}
          iconColorClass="text-green-500"
        />
        <StatCard
          title="Pending Payout"
          value={`$${stats.pendingPayouts.toFixed(2)}`}
          description="Available for withdrawal"
          icon={CreditCard}
          iconColorClass="text-purple-500"
        />
        <StatCard
          title="Conversion Rate"
          value={`${(stats.conversionRate * 100).toFixed(1)}%`}
          description="QR scans to purchases"
          icon={TrendingUp}
          iconColorClass="text-orange-500"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
          <CardDescription>Your most recent sales and commissions</CardDescription>
        </CardHeader>
        <CardContent>
          {stats.recentTransactions && stats.recentTransactions.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead className="text-right">Sale Amount</TableHead>
                    <TableHead className="text-right">Commission</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.recentTransactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell>
                        {format(new Date(transaction.date), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell className="capitalize">{transaction.type}</TableCell>
                      <TableCell>{transaction.source}</TableCell>
                      <TableCell className="text-right">
                        ${transaction.amount.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-green-600">
                        ${transaction.commission.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            transaction.status === 'paid'
                              ? 'bg-green-100 text-green-800'
                              : transaction.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {transaction.status}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-6">
              <ShoppingCart className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium">No transactions yet</h3>
              <p className="text-sm text-gray-500 mt-1">
                Your transactions will appear here once you start making sales
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}