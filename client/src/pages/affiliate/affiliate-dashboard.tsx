/**
 * Affiliate Marketing Dashboard
 * Comprehensive dashboard for managing affiliates, QR codes, and commissions
 */
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  Users, 
  QrCode, 
  DollarSign, 
  TrendingUp, 
  Eye, 
  MousePointer, 
  Plus,
  Download,
  Share,
  Settings,
  CreditCard,
  Banknote
} from "lucide-react";

interface Affiliate {
  id: number;
  name: string;
  email: string;
  code: string;
  commissionRate: number;
  totalEarnings: number;
  totalSales: number;
  status: string;
  stripeAccountId?: string;
  paypalEmail?: string;
  createdAt: string;
}

interface QrCodeData {
  id: number;
  code: string;
  title: string;
  description: string;
  url: string;
  imageUrl: string;
  scans: number;
  conversions: number;
  status: string;
  createdAt: string;
}

interface Transaction {
  id: number;
  amount: number;
  status: string;
  type: string;
  description: string;
  createdAt: string;
  processedAt?: string;
}

export default function AffiliateDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedAffiliate, setSelectedAffiliate] = useState<number | null>(null);
  const [showCreateAffiliate, setShowCreateAffiliate] = useState(false);
  const [showCreateQrCode, setShowCreateQrCode] = useState(false);

  // Fetch affiliates
  const { data: affiliates = [], isLoading: affiliatesLoading } = useQuery({
    queryKey: ['/api/affiliates'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/affiliates');
      const data = await response.json();
      return data.success ? data.data : [];
    }
  });

  // Fetch affiliate stats
  const { data: stats } = useQuery({
    queryKey: ['/api/affiliates/stats'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/affiliates/stats');
      const data = await response.json();
      return data.success ? data.data : {
        totalAffiliates: 0,
        totalEarnings: 0,
        totalSales: 0,
        activeQrCodes: 0
      };
    }
  });

  // Fetch QR codes for selected affiliate
  const { data: qrCodes = [] } = useQuery({
    queryKey: ['/api/affiliates', selectedAffiliate, 'qrcodes'],
    queryFn: async () => {
      if (!selectedAffiliate) return [];
      const response = await apiRequest('GET', `/api/affiliates/${selectedAffiliate}/qrcodes`);
      const data = await response.json();
      return data.success ? data.data : [];
    },
    enabled: !!selectedAffiliate
  });

  // Fetch transactions for selected affiliate
  const { data: transactions = [] } = useQuery({
    queryKey: ['/api/affiliates', selectedAffiliate, 'transactions'],
    queryFn: async () => {
      if (!selectedAffiliate) return [];
      const response = await apiRequest('GET', `/api/affiliates/${selectedAffiliate}/transactions`);
      const data = await response.json();
      return data.success ? data.data : [];
    },
    enabled: !!selectedAffiliate
  });

  // Create affiliate mutation
  const createAffiliateMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('POST', '/api/affiliates', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/affiliates'] });
      setShowCreateAffiliate(false);
      toast({
        title: "Success",
        description: "Affiliate created successfully"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create affiliate",
        variant: "destructive"
      });
    }
  });

  // Create QR code mutation
  const createQrCodeMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('POST', `/api/affiliates/${selectedAffiliate}/qrcodes`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/affiliates', selectedAffiliate, 'qrcodes'] });
      setShowCreateQrCode(false);
      toast({
        title: "Success",
        description: "QR code created successfully"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create QR code",
        variant: "destructive"
      });
    }
  });

  const handleCreateAffiliate = (formData: FormData) => {
    const data = {
      name: formData.get('name'),
      email: formData.get('email'),
      commissionRate: parseFloat(formData.get('commissionRate') as string) / 100,
      paypalEmail: formData.get('paypalEmail') || null
    };
    createAffiliateMutation.mutate(data);
  };

  const handleCreateQrCode = (formData: FormData) => {
    const data = {
      title: formData.get('title'),
      description: formData.get('description'),
      type: formData.get('type') || 'affiliate'
    };
    createQrCodeMutation.mutate(data);
  };

  const downloadQrCode = async (qrCode: QrCodeData) => {
    try {
      // Convert data URL to blob and download
      const response = await fetch(qrCode.imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `qr-${qrCode.code}.png`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to download QR code",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Affiliate Marketing</h1>
          <p className="text-muted-foreground">Manage affiliates, QR codes, and track commissions</p>
        </div>
        <Button onClick={() => setShowCreateAffiliate(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Affiliate
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Affiliates</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalAffiliates || 0}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${(stats?.totalEarnings || 0).toFixed(2)}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalSales || 0}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active QR Codes</CardTitle>
            <QrCode className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.activeQrCodes || 0}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="affiliates" className="space-y-4">
        <TabsList>
          <TabsTrigger value="affiliates">Affiliates</TabsTrigger>
          <TabsTrigger value="qr-codes">QR Codes</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
        </TabsList>

        <TabsContent value="affiliates" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Affiliates</CardTitle>
              <CardDescription>Manage your affiliate partners</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Commission Rate</TableHead>
                    <TableHead>Total Earnings</TableHead>
                    <TableHead>Sales</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {affiliates.map((affiliate: Affiliate) => (
                    <TableRow key={affiliate.id}>
                      <TableCell className="font-medium">{affiliate.name}</TableCell>
                      <TableCell>{affiliate.email}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{affiliate.code}</Badge>
                      </TableCell>
                      <TableCell>{(affiliate.commissionRate * 100).toFixed(1)}%</TableCell>
                      <TableCell>${(affiliate.totalEarnings || 0).toFixed(2)}</TableCell>
                      <TableCell>{affiliate.totalSales || 0}</TableCell>
                      <TableCell>
                        <Badge variant={affiliate.status === 'active' ? 'default' : 'secondary'}>
                          {affiliate.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedAffiliate(affiliate.id)}
                        >
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="qr-codes" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-medium">QR Codes</h3>
              <p className="text-sm text-muted-foreground">
                {selectedAffiliate ? `QR codes for selected affiliate` : `Select an affiliate to view QR codes`}
              </p>
            </div>
            {selectedAffiliate && (
              <Button onClick={() => setShowCreateQrCode(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create QR Code
              </Button>
            )}
          </div>

          {selectedAffiliate ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {qrCodes.map((qr: QrCodeData) => (
                <Card key={qr.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-base">{qr.title}</CardTitle>
                        <CardDescription>{qr.description}</CardDescription>
                      </div>
                      <Badge variant={qr.status === 'active' ? 'default' : 'secondary'}>
                        {qr.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-center">
                      <img src={qr.imageUrl} alt="QR Code" className="w-32 h-32" />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center">
                        <Eye className="w-4 h-4 mr-1" />
                        {qr.scans} scans
                      </div>
                      <div className="flex items-center">
                        <MousePointer className="w-4 h-4 mr-1" />
                        {qr.conversions} conversions
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadQrCode(qr)}
                      >
                        <Download className="w-4 h-4 mr-1" />
                        Download
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          navigator.clipboard.writeText(qr.url);
                          toast({
                            title: "Copied",
                            description: "QR code URL copied to clipboard"
                          });
                        }}
                      >
                        <Share className="w-4 h-4 mr-1" />
                        Copy URL
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <QrCode className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Select an affiliate to view and manage QR codes</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="transactions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Commission Transactions</CardTitle>
              <CardDescription>
                {selectedAffiliate ? `Transactions for selected affiliate` : `All commission transactions`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Processed</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((transaction: Transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell>
                        {new Date(transaction.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>{transaction.description}</TableCell>
                      <TableCell>${transaction.amount.toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge variant={
                          transaction.status === 'processed' ? 'default' : 
                          transaction.status === 'pending' ? 'secondary' : 'destructive'
                        }>
                          {transaction.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {transaction.processedAt 
                          ? new Date(transaction.processedAt).toLocaleDateString()
                          : '-'
                        }
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Affiliate Dialog */}
      <Dialog open={showCreateAffiliate} onOpenChange={setShowCreateAffiliate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Affiliate</DialogTitle>
            <DialogDescription>Add a new affiliate partner to your program</DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            handleCreateAffiliate(formData);
          }} className="space-y-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" required />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required />
            </div>
            <div>
              <Label htmlFor="commissionRate">Commission Rate (%)</Label>
              <Input 
                id="commissionRate" 
                name="commissionRate" 
                type="number" 
                min="0" 
                max="100" 
                step="0.1" 
                defaultValue="5.0"
                required 
              />
            </div>
            <div>
              <Label htmlFor="paypalEmail">PayPal Email (Optional)</Label>
              <Input id="paypalEmail" name="paypalEmail" type="email" />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowCreateAffiliate(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createAffiliateMutation.isPending}>
                Create Affiliate
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Create QR Code Dialog */}
      <Dialog open={showCreateQrCode} onOpenChange={setShowCreateQrCode}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create QR Code</DialogTitle>
            <DialogDescription>Generate a new QR code for the selected affiliate</DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            handleCreateQrCode(formData);
          }} className="space-y-4">
            <div>
              <Label htmlFor="title">Title</Label>
              <Input id="title" name="title" required />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" name="description" />
            </div>
            <div>
              <Label htmlFor="type">Type</Label>
              <Select name="type" defaultValue="affiliate">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="affiliate">Affiliate</SelectItem>
                  <SelectItem value="product">Product Specific</SelectItem>
                  <SelectItem value="campaign">Campaign</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowCreateQrCode(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createQrCodeMutation.isPending}>
                Create QR Code
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}