import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Crown, Star, Diamond, Trophy, RefreshCw, Users, TrendingUp } from "lucide-react";
import { Customer, CustomerTier } from "@shared/schema";

const customerFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().optional(),
  address: z.string().optional(),
  tier: z.string().default("standard"),
  priorityLevel: z.number().default(1),
  totalSpent: z.string().default("0"),
  totalOrders: z.number().default(0),
  notes: z.string().optional(),
});

type CustomerFormData = z.infer<typeof customerFormSchema>;

const tierIcons = {
  bronze: Star,
  silver: Crown,
  gold: Diamond,
  platinum: Trophy,
  big_spender: TrendingUp,
  standard: Users
};

const tierColors = {
  bronze: "bg-amber-100 text-amber-800",
  silver: "bg-gray-100 text-gray-800", 
  gold: "bg-yellow-100 text-yellow-800",
  platinum: "bg-purple-100 text-purple-800",
  big_spender: "bg-green-100 text-green-800",
  standard: "bg-blue-100 text-blue-800"
};

export default function CustomersPage() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: customers = [], isLoading: customersLoading } = useQuery({
    queryKey: ["/api/customers"],
  });

  const { data: bigSpenders = [], isLoading: bigSpendersLoading } = useQuery({
    queryKey: ["/api/customers/big-spenders"],
  });

  const { data: customerTiers = [], isLoading: tiersLoading } = useQuery({
    queryKey: ["/api/customer-tiers"],
  });

  const createCustomerMutation = useMutation({
    mutationFn: (data: CustomerFormData) => apiRequest("/api/customers", {
      method: "POST",
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/customers/big-spenders"] });
      setIsCreateDialogOpen(false);
      form.reset();
    },
  });

  const recalculateTiersMutation = useMutation({
    mutationFn: () => apiRequest("/api/customers/recalculate-tiers", {
      method: "POST",
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/customers/big-spenders"] });
    },
  });

  const form = useForm<CustomerFormData>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      address: "",
      tier: "standard",
      priorityLevel: 1,
      totalSpent: "0",
      totalOrders: 0,
      notes: "",
    },
  });

  const onSubmit = (data: CustomerFormData) => {
    createCustomerMutation.mutate(data);
  };

  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(num);
  };

  const getTierInfo = (tierName: string) => {
    const tier = customerTiers.find(t => t.name === tierName);
    const Icon = tierIcons[tierName as keyof typeof tierIcons] || Users;
    const colorClass = tierColors[tierName as keyof typeof tierColors] || "bg-gray-100 text-gray-800";
    
    return { tier, Icon, colorClass };
  };

  if (customersLoading || bigSpendersLoading || tiersLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Customer Management</h1>
          <p className="text-muted-foreground">Manage customers and track high-value relationships</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => recalculateTiersMutation.mutate()}
            disabled={recalculateTiersMutation.isPending}
            variant="outline"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${recalculateTiersMutation.isPending ? 'animate-spin' : ''}`} />
            Recalculate Tiers
          </Button>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Customer
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Add New Customer</DialogTitle>
                <DialogDescription>
                  Create a new customer record to track their purchases and tier status.
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes</FormLabel>
                        <FormControl>
                          <Textarea {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsCreateDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={createCustomerMutation.isPending}
                    >
                      {createCustomerMutation.isPending ? "Creating..." : "Create Customer"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Big Spenders Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            High-Value Customers
          </CardTitle>
          <CardDescription>
            Customers with significant spending requiring priority attention
          </CardDescription>
        </CardHeader>
        <CardContent>
          {bigSpenders.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No high-value customers found. Customers with $5,000+ in spending will appear here.
            </p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {bigSpenders.map((customer: Customer) => {
                const { Icon, colorClass } = getTierInfo(customer.tier || 'standard');
                return (
                  <Card key={customer.id} className="border-yellow-200">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold">{customer.name}</h3>
                          <p className="text-sm text-muted-foreground">{customer.email}</p>
                          <div className="mt-2 space-y-1">
                            <p className="text-sm">
                              <span className="font-medium">Total Spent:</span> {formatCurrency(customer.totalSpent || 0)}
                            </p>
                            <p className="text-sm">
                              <span className="font-medium">Orders:</span> {customer.totalOrders || 0}
                            </p>
                          </div>
                        </div>
                        <Badge className={colorClass}>
                          <Icon className="h-3 w-3 mr-1" />
                          {customer.tier?.replace('_', ' ').toUpperCase()}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* All Customers Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Customers</CardTitle>
          <CardDescription>
            Complete customer list with tier information and spending history
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead>Total Spent</TableHead>
                  <TableHead>Orders</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Last Order</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No customers found. Add your first customer to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  customers.map((customer: Customer) => {
                    const { Icon, colorClass } = getTierInfo(customer.tier || 'standard');
                    return (
                      <TableRow key={customer.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{customer.name}</div>
                            <div className="text-sm text-muted-foreground">{customer.email}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={colorClass}>
                            <Icon className="h-3 w-3 mr-1" />
                            {customer.tier?.replace('_', ' ').toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatCurrency(customer.totalSpent || 0)}</TableCell>
                        <TableCell>{customer.totalOrders || 0}</TableCell>
                        <TableCell>
                          <Badge variant={customer.priorityLevel >= 4 ? "destructive" : "secondary"}>
                            Level {customer.priorityLevel || 1}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {customer.lastOrderDate 
                            ? new Date(customer.lastOrderDate).toLocaleDateString()
                            : "Never"
                          }
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Customer Tiers Reference */}
      <Card>
        <CardHeader>
          <CardTitle>Customer Tiers</CardTitle>
          <CardDescription>
            Tier requirements and automatic classification system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {customerTiers.map((tier: CustomerTier) => {
              const { Icon, colorClass } = getTierInfo(tier.name);
              return (
                <Card key={tier.id} className="border">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className={colorClass}>
                        <Icon className="h-3 w-3 mr-1" />
                        {tier.displayName || tier.name.replace('_', ' ').toUpperCase()}
                      </Badge>
                      <span className="text-sm text-muted-foreground">Priority {tier.priority}</span>
                    </div>
                    <div className="text-sm space-y-1">
                      <p>Min. Spending: {formatCurrency(tier.minSpent || 0)}</p>
                      <p>Min. Orders: {tier.minOrders || 0}</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}