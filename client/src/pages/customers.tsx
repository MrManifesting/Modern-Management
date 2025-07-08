import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Crown, Star, Diamond, Trophy, RefreshCw, Users, TrendingUp, DollarSign, Award, Medal, User, Mail, Phone, MapPin } from "lucide-react";

// Helper functions
const formatCurrency = (amount: number | string) => {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num || 0);
};

const getTierIcon = (tierName: string) => {
  switch (tierName.toLowerCase()) {
    case 'diamond':
      return React.createElement(Crown, { className: "h-5 w-5" });
    case 'platinum':
      return React.createElement(Award, { className: "h-5 w-5" });
    case 'gold':
      return React.createElement(Medal, { className: "h-5 w-5" });
    case 'silver':
      return React.createElement(Star, { className: "h-5 w-5" });
    case 'bronze':
      return React.createElement(Users, { className: "h-5 w-5" });
    default:
      return React.createElement(User, { className: "h-5 w-5" });
  }
};

const getTierColor = (tierName: string) => {
  switch (tierName.toLowerCase()) {
    case 'diamond':
      return 'bg-purple-100 text-purple-800';
    case 'platinum':
      return 'bg-gray-100 text-gray-800';
    case 'gold':
      return 'bg-yellow-100 text-yellow-800';
    case 'silver':
      return 'bg-zinc-100 text-zinc-800';
    case 'bronze':
      return 'bg-amber-100 text-amber-800';
    default:
      return 'bg-blue-100 text-blue-800';
  }
};

export default function CustomersPage() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("management");
  const queryClient = useQueryClient();

  // Customer management queries
  const { data: customers = [], isLoading: customersLoading } = useQuery<any[]>({
    queryKey: ["/api/customers"],
  });

  // Customer tiers query
  const { data: tierData, isLoading: tiersLoading, error: tiersError } = useQuery<any>({
    queryKey: ['/api/customers/tiers'],
    retry: 1,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Sync tiers mutation
  const syncTiersMutation = useMutation({
    mutationFn: () => 
      apiRequest("POST", "/api/customers/sync-shopify-tiers", {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/customers/tiers'] });
    },
  });

  if (customersLoading || tiersLoading) {
    return React.createElement(
      'div',
      { className: "container mx-auto p-6 space-y-6" },
      React.createElement(
        'div',
        { className: "space-y-2" },
        React.createElement(Skeleton, { className: "h-8 w-64" }),
        React.createElement(Skeleton, { className: "h-4 w-96" })
      )
    );
  }

  return React.createElement(
    'div',
    { className: "container mx-auto p-6" },
    React.createElement(
      Tabs,
      { 
        value: activeTab,
        onValueChange: setActiveTab,
        className: "space-y-6" 
      },
      React.createElement(
        TabsList,
        { className: "grid w-full grid-cols-2 max-w-[400px]" },
        React.createElement(TabsTrigger, { value: "management" }, "Customer Management"),
        React.createElement(TabsTrigger, { value: "tiers" }, "Customer Tiers")
      ),
      // Customer Management Tab
      React.createElement(
        TabsContent,
        { value: "management" },
        React.createElement(
          'div',
          { className: "space-y-6" },
          // Header
          React.createElement(
            'div',
            { className: "flex justify-between items-center" },
            React.createElement(
              'div',
              null,
              React.createElement('h2', { className: "text-2xl font-bold" }, "All Customers"),
              React.createElement('p', { className: "text-muted-foreground" }, `${customers.length} customers`)
            ),
            React.createElement(
              Button,
              { onClick: () => setIsCreateDialogOpen(true) },
              React.createElement(Plus, { className: "h-4 w-4 mr-2" }),
              "Add Customer"
            )
          ),
          // Customer Table
          React.createElement(
            Card,
            null,
            React.createElement(
              CardContent,
              { className: "p-0" },
              React.createElement(
                'div',
                { className: "overflow-x-auto" },
                React.createElement(
                  Table,
                  null,
                  React.createElement(
                    TableHeader,
                    null,
                    React.createElement(
                      TableRow,
                      null,
                      React.createElement(TableHead, null, "Name"),
                      React.createElement(TableHead, null, "Email"),
                      React.createElement(TableHead, null, "Phone"),
                      React.createElement(TableHead, null, "Total Spent"),
                      React.createElement(TableHead, null, "Orders")
                    )
                  ),
                  React.createElement(
                    TableBody,
                    null,
                    customers.map((customer: any) => 
                      React.createElement(
                        TableRow,
                        { key: customer.id },
                        React.createElement(TableCell, { className: "font-medium" }, customer.firstName || customer.email),
                        React.createElement(TableCell, null, customer.email),
                        React.createElement(TableCell, null, customer.phone || "-"),
                        React.createElement(TableCell, null, formatCurrency(customer.totalSpent || 0)),
                        React.createElement(TableCell, null, customer.totalOrders || 0)
                      )
                    )
                  )
                )
              )
            )
          )
        )
      ),
      // Customer Tiers Tab
      React.createElement(
        TabsContent,
        { value: "tiers" },
        React.createElement(
          'div',
          { className: "space-y-6" },
          // Header with sync button
          React.createElement(
            'div',
            { className: "flex justify-between items-center" },
            React.createElement(
              'div',
              null,
              React.createElement('h2', { className: "text-2xl font-bold" }, "Customer Tiers"),
              React.createElement('p', { className: "text-muted-foreground" }, "Analyze customer spending patterns")
            ),
            React.createElement(
              Button,
              { 
                onClick: () => syncTiersMutation.mutate(),
                disabled: syncTiersMutation.isPending
              },
              React.createElement(RefreshCw, { className: `h-4 w-4 mr-2 ${syncTiersMutation.isPending ? 'animate-spin' : ''}` }),
              syncTiersMutation.isPending ? 'Syncing...' : 'Sync from Shopify'
            )
          ),
          // Show error or loading state if no tier data
          !tierData || tiersError ? React.createElement(
            Card,
            { className: "p-6" },
            React.createElement(
              'div',
              { className: "text-center space-y-4" },
              React.createElement(
                'p',
                { className: "text-muted-foreground" },
                tiersError ? 
                  "Failed to fetch customer tier data. Please check your Shopify connection." :
                  syncTiersMutation.isPending ? 
                    "Syncing customer data from Shopify... This may take a few minutes for large customer bases." :
                    "No customer tier data available. Click 'Sync from Shopify' to load customer spending data."
              ),
              syncTiersMutation.isPending && React.createElement(
                Progress,
                { className: "w-full max-w-md mx-auto", indeterminate: true }
              )
            )
          ) : tierData && tierData.summary && tierData.summary.totalCustomers === 0 ? React.createElement(
            Card,
            { className: "p-6" },
            React.createElement(
              'div',
              { className: "text-center space-y-4" },
              React.createElement(
                'div',
                null,
                React.createElement(Users, { className: "h-12 w-12 text-muted-foreground mx-auto mb-4" }),
                React.createElement('h3', { className: "text-lg font-semibold" }, "No High-Value Customers Yet"),
                React.createElement(
                  'p',
                  { className: "text-muted-foreground" },
                  "Your customer tier system is configured to show customers with $25,000+ in lifetime spending."
                ),
                React.createElement(
                  'p',
                  { className: "text-sm text-muted-foreground mt-2" },
                  "Currently, no customers have reached this spending threshold. As your business grows and customers reach $25,000 in total purchases, they will appear here organized by tiers:"
                ),
                React.createElement(
                  'div',
                  { className: "mt-4 space-y-2 text-sm" },
                  React.createElement('div', { className: "flex items-center justify-center gap-2" },
                    React.createElement(Crown, { className: "h-4 w-4 text-purple-600" }),
                    React.createElement('span', null, "Diamond: $250,000+")
                  ),
                  React.createElement('div', { className: "flex items-center justify-center gap-2" },
                    React.createElement(Award, { className: "h-4 w-4 text-gray-600" }),
                    React.createElement('span', null, "Platinum: $100,000+")
                  ),
                  React.createElement('div', { className: "flex items-center justify-center gap-2" },
                    React.createElement(Medal, { className: "h-4 w-4 text-yellow-600" }),
                    React.createElement('span', null, "Gold: $50,000+")
                  ),
                  React.createElement('div', { className: "flex items-center justify-center gap-2" },
                    React.createElement(Star, { className: "h-4 w-4 text-gray-400" }),
                    React.createElement('span', null, "Silver: $25,000+")
                  )
                )
              )
            )
          ) : null,
          // Summary cards
          tierData && tierData.summary && React.createElement(
            'div',
            { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" },
            // Total Customers Card
            React.createElement(
              Card,
              null,
              React.createElement(
                CardHeader,
                { className: "pb-2" },
                React.createElement(CardTitle, { className: "text-sm font-medium" }, "Total Customers")
              ),
              React.createElement(
                CardContent,
                null,
                React.createElement('div', { className: "flex items-center gap-2" },
                  React.createElement(Users, { className: "h-4 w-4 text-muted-foreground" }),
                  React.createElement('p', { className: "text-2xl font-bold" }, tierData.summary.totalCustomers || 0)
                )
              )
            ),
            // Total Revenue Card
            React.createElement(
              Card,
              null,
              React.createElement(
                CardHeader,
                { className: "pb-2" },
                React.createElement(CardTitle, { className: "text-sm font-medium" }, "Total Revenue")
              ),
              React.createElement(
                CardContent,
                null,
                React.createElement('div', { className: "flex items-center gap-2" },
                  React.createElement(DollarSign, { className: "h-4 w-4 text-muted-foreground" }),
                  React.createElement('p', { className: "text-2xl font-bold" }, formatCurrency(tierData.summary.totalRevenue || 0))
                )
              )
            ),
            // Average Spend Card
            React.createElement(
              Card,
              null,
              React.createElement(
                CardHeader,
                { className: "pb-2" },
                React.createElement(CardTitle, { className: "text-sm font-medium" }, "Average Spend")
              ),
              React.createElement(
                CardContent,
                null,
                React.createElement('div', { className: "flex items-center gap-2" },
                  React.createElement(TrendingUp, { className: "h-4 w-4 text-muted-foreground" }),
                  React.createElement('p', { className: "text-2xl font-bold" }, formatCurrency(tierData.summary.averageSpend || 0))
                )
              )
            ),
            // Tier Count Card
            React.createElement(
              Card,
              null,
              React.createElement(
                CardHeader,
                { className: "pb-2" },
                React.createElement(CardTitle, { className: "text-sm font-medium" }, "Tier Distribution")
              ),
              React.createElement(
                CardContent,
                null,
                React.createElement('div', { className: "flex items-center gap-2" },
                  React.createElement(Crown, { className: "h-4 w-4 text-muted-foreground" }),
                  React.createElement('p', { className: "text-2xl font-bold" }, tierData.tiers ? tierData.tiers.length : 0)
                )
              )
            )
          ),
          // Tier breakdown
          tierData && tierData.summary && tierData.summary.tierBreakdown && React.createElement(
            Card,
            null,
            React.createElement(
              CardHeader,
              null,
              React.createElement(CardTitle, null, "Tier Breakdown"),
              React.createElement(CardDescription, null, "Customer distribution by spending tiers")
            ),
            React.createElement(
              CardContent,
              null,
              React.createElement(
                'div',
                { className: "space-y-4" },
                tierData.summary.tierBreakdown.map((tier: any) => 
                  React.createElement(
                    'div',
                    { key: tier.name, className: "space-y-2" },
                    React.createElement(
                      'div',
                      { className: "flex items-center justify-between" },
                      React.createElement(
                        'div',
                        { className: "flex items-center gap-2" },
                        getTierIcon(tier.name),
                        React.createElement('span', { className: "font-medium" }, tier.name),
                        React.createElement(
                          Badge,
                          { className: getTierColor(tier.name), variant: "outline" },
                          `${tier.count} customers`
                        )
                      ),
                      React.createElement(
                        'div',
                        { className: "text-right" },
                        React.createElement('p', { className: "font-medium" }, formatCurrency(tier.totalRevenue)),
                        React.createElement('p', { className: "text-sm text-muted-foreground" }, `Min: ${formatCurrency(tier.threshold)}`)
                      )
                    ),
                    React.createElement(Progress, { 
                      value: tierData.summary.totalCustomers > 0 ? (tier.count / tierData.summary.totalCustomers) * 100 : 0,
                      className: "h-2"
                    })
                  )
                )
              )
            )
          ),
          // Top customers list
          tierData && tierData.customers && tierData.customers.length > 0 && React.createElement(
            Card,
            null,
            React.createElement(
              CardHeader,
              null,
              React.createElement(CardTitle, null, "Top Customers"),
              React.createElement(CardDescription, null, "Highest spending customers by tier")
            ),
            React.createElement(
              CardContent,
              null,
              React.createElement(
                'div',
                { className: "overflow-x-auto" },
                React.createElement(
                  Table,
                  null,
                  React.createElement(
                    TableHeader,
                    null,
                    React.createElement(
                      TableRow,
                      null,
                      React.createElement(TableHead, null, "Customer"),
                      React.createElement(TableHead, null, "Email"),
                      React.createElement(TableHead, null, "Tier"),
                      React.createElement(TableHead, { className: "text-right" }, "Total Spent"),
                      React.createElement(TableHead, { className: "text-right" }, "Orders"),
                      React.createElement(TableHead, { className: "text-right" }, "To Next Tier")
                    )
                  ),
                  React.createElement(
                    TableBody,
                    null,
                    tierData.customers.slice(0, 10).map((customer: any) => 
                      React.createElement(
                        TableRow,
                        { key: customer.id },
                        React.createElement(TableCell, { className: "font-medium" }, customer.displayName),
                        React.createElement(TableCell, null, customer.email),
                        React.createElement(
                          TableCell,
                          null,
                          React.createElement(
                            Badge,
                            { className: getTierColor(customer.tier) },
                            customer.tier
                          )
                        ),
                        React.createElement(TableCell, { className: "text-right font-medium" }, formatCurrency(customer.totalSpent)),
                        React.createElement(TableCell, { className: "text-right" }, customer.orderCount),
                        React.createElement(
                          TableCell,
                          { className: "text-right" },
                          customer.nextTier && React.createElement(
                            'div',
                            null,
                            React.createElement('p', { className: "font-medium" }, formatCurrency(customer.remainingToNextTier)),
                            React.createElement('p', { className: "text-sm text-muted-foreground" }, `to ${customer.nextTier}`)
                          )
                        )
                      )
                    )
                  )
                )
              )
            )
          )
        )
      )
    ),
    // Create Customer Dialog
    React.createElement(
      Dialog,
      { 
        open: isCreateDialogOpen,
        onOpenChange: setIsCreateDialogOpen
      },
      React.createElement(
        DialogContent,
        { className: "max-w-md" },
        React.createElement(
          DialogHeader,
          null,
          React.createElement(DialogTitle, null, "Add New Customer"),
          React.createElement(DialogDescription, null, "Customer creation coming soon")
        ),
        React.createElement(
          'div',
          { className: "flex justify-end mt-4" },
          React.createElement(
            Button,
            { 
              variant: "outline",
              onClick: () => setIsCreateDialogOpen(false)
            },
            "Close"
          )
        )
      )
    )
  );
}