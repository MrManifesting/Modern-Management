import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequestSimple, queryClient } from '../../lib/queryClient';
import { TimeSeriesData } from '@shared/schema';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ArrowUpCircle, ArrowDownCircle, LineChart, BarChart4, Calendar as CalendarIcon, Package, Tag } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend,
  TooltipProps
} from 'recharts';
import { AlertCircle, Check, RefreshCw } from 'lucide-react';

// Define the forecast response type
interface ForecastResponse {
  timeSeries: TimeSeriesData[];
  kpis: {
    historicalMetrics: {
      totalSales: number;
      totalRevenue: number;
      totalProfit: number;
      avgMonthlySales: number;
    };
    forecastedMetrics: {
      totalSales: number;
      totalRevenue: number;
      totalProfit: number;
      avgMonthlySales: number;
    };
    growthMetrics: {
      salesGrowth: number;
      revenueGrowth: number;
      profitGrowth: number;
    };
    inventoryMetrics: {
      suggestedInventoryLevel: number;
    };
  };
  categoryForecasts?: Record<string, {
    timeSeries: TimeSeriesData[];
    suggestedInventoryLevel: number;
  }>;
  weightForecasts?: Record<string, {
    timeSeries: TimeSeriesData[];
    suggestedInventoryLevel: number;
  }>;
}

// Define categories and weights for the form
const CANNABIS_CATEGORIES = [
  'Top Shelf', 
  'Exotic', 
  'Premium', 
  'Indoor', 
  'Reserve',
  'Classic', 
  'AA Smalls'
];

const WEIGHT_OPTIONS = [
  '3.5g', 
  '7g', 
  '14g', 
  '28g'
];

export function SalesForecastingDashboard() {
  const [forecastParams, setForecastParams] = useState({
    historicalPeriods: 3,
    forecastPeriods: 3,
    categories: ['Top Shelf', 'Exotic', 'Premium'],
    weights: ['3.5g', '7g', '14g'],
    groupBy: 'month' as 'day' | 'week' | 'month'
  });
  
  const [activeTab, setActiveTab] = useState('overview');
  const [activeMetric, setActiveMetric] = useState('sales');
  
  // Query for fetching forecast data
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['/api/analytics/forecast', forecastParams],
    queryFn: async () => {
      return await apiRequestSimple<ForecastResponse>('/api/analytics/forecast', {
        method: 'POST',
        body: JSON.stringify(forecastParams),
        headers: {
          'Content-Type': 'application/json'
        }
      });
    },
    enabled: true // We're always fetching on component mount
  });
  
  if (isLoading) {
    return <ForecastSkeleton />;
  }
  
  if (isError) {
    return (
      <div className="p-4">
        <Alert variant="destructive" className="mb-4">
          <AlertTitle className="flex items-center font-semibold">
            <AlertCircle className="h-4 w-4 mr-2" />
            Error loading forecast data
          </AlertTitle>
          <AlertDescription className="mt-2">
            {error instanceof Error ? error.message : 'An unknown error occurred'}
          </AlertDescription>
        </Alert>
        
        <Card className="mt-6 border-amber-500/30 bg-gradient-to-r from-zinc-900 to-zinc-950">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Try These Solutions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-2">
              <div className="mt-0.5 bg-amber-500/10 border border-amber-500/20 rounded-full p-1">
                <Check className="h-4 w-4 text-amber-500" />
              </div>
              <div>
                <h4 className="font-medium text-amber-400">Check date range</h4>
                <p className="text-sm text-muted-foreground">Ensure the historical and forecast periods are properly set</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="mt-0.5 bg-amber-500/10 border border-amber-500/20 rounded-full p-1">
                <Check className="h-4 w-4 text-amber-500" />
              </div>
              <div>
                <h4 className="font-medium text-amber-400">Refresh data</h4>
                <p className="text-sm text-muted-foreground">Try refreshing your browser or updating forecast parameters</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="mt-0.5 bg-amber-500/10 border border-amber-500/20 rounded-full p-1">
                <Check className="h-4 w-4 text-amber-500" />
              </div>
              <div>
                <h4 className="font-medium text-amber-400">Verify API connection</h4>
                <p className="text-sm text-muted-foreground">Check that the API is accessible and returning valid data</p>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/analytics/forecast'] })}
              className="bg-amber-500 hover:bg-amber-600 text-black"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry Forecast
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }
  
  const forecast = data as ForecastResponse;
  
  // Combine historical and forecasted data for the charts
  const combinedTimeSeries = forecast?.timeSeries || [];
  
  // Format the data for Recharts
  const chartData = combinedTimeSeries.map(point => {
    // Format date for better display if it's in YYYY-MM-DD format
    let displayDate = point.label;
    if (/^\d{4}-\d{2}-\d{2}$/.test(point.label)) {
      const date = new Date(point.label);
      displayDate = new Intl.DateTimeFormat('en-US', { 
        month: 'short', 
        year: 'numeric'
      }).format(date);
    }
    
    return {
      name: displayDate,
      sales: Math.round(point.sales),
      revenue: Math.round(point.revenue),
      profit: Math.round(point.profit),
      isForecast: point.isForecasted,
      // Separate historical and forecasted data points for better visualization
      historicalSales: point.isForecasted ? null : Math.round(point.sales),
      forecastedSales: point.isForecasted ? Math.round(point.sales) : null,
      historicalRevenue: point.isForecasted ? null : Math.round(point.revenue),
      forecastedRevenue: point.isForecasted ? Math.round(point.revenue) : null,
      historicalProfit: point.isForecasted ? null : Math.round(point.profit),
      forecastedProfit: point.isForecasted ? Math.round(point.profit) : null
    };
  });
  
  // Handle parameter changes
  const handleCategoryChange = (category: string, checked: boolean) => {
    setForecastParams(prev => {
      if (checked) {
        return { ...prev, categories: [...prev.categories, category] };
      } else {
        return { ...prev, categories: prev.categories.filter(c => c !== category) };
      }
    });
  };
  
  const handleWeightChange = (weight: string, checked: boolean) => {
    setForecastParams(prev => {
      if (checked) {
        return { ...prev, weights: [...prev.weights, weight] };
      } else {
        return { ...prev, weights: prev.weights.filter(w => w !== weight) };
      }
    });
  };
  
  const handleGroupByChange = (value: string) => {
    setForecastParams(prev => ({
      ...prev,
      groupBy: value as 'day' | 'week' | 'month'
    }));
  };
  
  const handlePeriodsChange = (type: 'historical' | 'forecast', value: string) => {
    const numValue = parseInt(value);
    if (!isNaN(numValue) && numValue > 0) {
      setForecastParams(prev => ({
        ...prev,
        [type === 'historical' ? 'historicalPeriods' : 'forecastPeriods']: numValue
      }));
    }
  };
  
  // Calculate the growth indicators for display
  const salesGrowth = forecast?.kpis.growthMetrics.salesGrowth || 0;
  const revenueGrowth = forecast?.kpis.growthMetrics.revenueGrowth || 0;
  const profitGrowth = forecast?.kpis.growthMetrics.profitGrowth || 0;
  
  // Format currency values
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };
  
  // Custom tooltip for the area chart
  const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
    if (active && payload && payload.length) {
      const isForecast = payload[0]?.payload?.isForecast;
      const dataType = payload[0]?.dataKey?.toString().includes('forecast') ? 'forecast' : 'historical';
      
      // Find the right values based on payload keys
      let salesValue = null;
      let revenueValue = null;
      let profitValue = null;
      
      payload.forEach(item => {
        if (item.dataKey?.toString().includes('Sales')) {
          salesValue = item.value;
        } else if (item.dataKey?.toString().includes('Revenue')) {
          revenueValue = item.value;
        } else if (item.dataKey?.toString().includes('Profit')) {
          profitValue = item.value;
        }
      });
      
      return (
        <div className="bg-background border rounded p-3 shadow-md">
          <p className="font-medium">{label}</p>
          {salesValue !== null && (
            <p className="text-sm flex justify-between">
              Sales: <span className="ml-2 font-medium">{salesValue}</span>
            </p>
          )}
          {revenueValue !== null && (
            <p className="text-sm flex justify-between">
              Revenue: <span className="ml-2 font-medium">{formatCurrency(revenueValue as number)}</span>
            </p>
          )}
          {profitValue !== null && (
            <p className="text-sm flex justify-between">
              Profit: <span className="ml-2 font-medium">{formatCurrency(profitValue as number)}</span>
            </p>
          )}
          <Badge 
            variant="outline" 
            className={`mt-1 ${dataType === 'forecast' ? 
              'bg-green-100 text-green-800 border-green-500' : 
              'bg-blue-100 text-blue-800 border-blue-500'}`}
          >
            {dataType === 'forecast' ? 'Forecasted' : 'Historical'}
          </Badge>
        </div>
      );
    }
    return null;
  };
  
  // Render the metric cards
  const renderMetricCards = () => {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Projected Sales
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(forecast?.kpis.forecastedMetrics.totalSales || 0)}
              <span className="text-xs ml-1">units</span>
            </div>
            <p className={`text-sm flex items-center ${salesGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {salesGrowth >= 0 ? <ArrowUpCircle className="h-4 w-4 mr-1" /> : <ArrowDownCircle className="h-4 w-4 mr-1" />}
              {Math.abs(salesGrowth).toFixed(1)}% from previous period
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Projected Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(forecast?.kpis.forecastedMetrics.totalRevenue || 0)}
            </div>
            <p className={`text-sm flex items-center ${revenueGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {revenueGrowth >= 0 ? <ArrowUpCircle className="h-4 w-4 mr-1" /> : <ArrowDownCircle className="h-4 w-4 mr-1" />}
              {Math.abs(revenueGrowth).toFixed(1)}% from previous period
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Projected Profit
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(forecast?.kpis.forecastedMetrics.totalProfit || 0)}
            </div>
            <p className={`text-sm flex items-center ${profitGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {profitGrowth >= 0 ? <ArrowUpCircle className="h-4 w-4 mr-1" /> : <ArrowDownCircle className="h-4 w-4 mr-1" />}
              {Math.abs(profitGrowth).toFixed(1)}% from previous period
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Suggested Inventory
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(forecast?.kpis.inventoryMetrics.suggestedInventoryLevel || 0)}
              <span className="text-xs ml-1">units</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Based on 1.5x monthly sales
            </p>
          </CardContent>
        </Card>
      </div>
    );
  };
  
  return (
    <div className="container mx-auto py-6">
      <div className="flex flex-col md:flex-row justify-between items-start gap-6 mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sales Forecasting</h1>
          <p className="text-muted-foreground">
            Predict future sales trends and optimize inventory levels
          </p>
        </div>
        
        <Card className="w-full md:w-auto">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Forecast Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="historicalPeriods">Historical Months</Label>
                  <Select 
                    value={forecastParams.historicalPeriods.toString()}
                    onValueChange={(value) => handlePeriodsChange('historical', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Historical Periods" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 Month</SelectItem>
                      <SelectItem value="2">2 Months</SelectItem>
                      <SelectItem value="3">3 Months</SelectItem>
                      <SelectItem value="6">6 Months</SelectItem>
                      <SelectItem value="12">12 Months</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="forecastPeriods">Forecast Months</Label>
                  <Select 
                    value={forecastParams.forecastPeriods.toString()}
                    onValueChange={(value) => handlePeriodsChange('forecast', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Forecast Periods" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 Month</SelectItem>
                      <SelectItem value="2">2 Months</SelectItem>
                      <SelectItem value="3">3 Months</SelectItem>
                      <SelectItem value="6">6 Months</SelectItem>
                      <SelectItem value="12">12 Months</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Group By</Label>
                <RadioGroup 
                  defaultValue={forecastParams.groupBy}
                  className="flex space-x-4"
                  onValueChange={handleGroupByChange}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="day" id="day" />
                    <Label htmlFor="day">Day</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="week" id="week" />
                    <Label htmlFor="week">Week</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="month" id="month" />
                    <Label htmlFor="month">Month</Label>
                  </div>
                </RadioGroup>
              </div>
              
              <Button
                onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/analytics/forecast'] })}
              >
                Update Forecast
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {renderMetricCards()}
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Category Filters</CardTitle>
            <CardDescription>
              Select categories to include in the forecast
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col space-y-2">
              {CANNABIS_CATEGORIES.map((category) => (
                <div key={category} className="flex items-center space-x-2">
                  <Checkbox 
                    id={`category-${category}`} 
                    checked={forecastParams.categories.includes(category)}
                    onCheckedChange={(checked) => 
                      handleCategoryChange(category, checked as boolean)
                    }
                  />
                  <label
                    htmlFor={`category-${category}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {category}
                  </label>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Package Size Filters</CardTitle>
            <CardDescription>
              Select package sizes to include in the forecast
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col space-y-2">
              {WEIGHT_OPTIONS.map((weight) => (
                <div key={weight} className="flex items-center space-x-2">
                  <Checkbox 
                    id={`weight-${weight}`} 
                    checked={forecastParams.weights.includes(weight)}
                    onCheckedChange={(checked) => 
                      handleWeightChange(weight, checked as boolean)
                    }
                  />
                  <label
                    htmlFor={`weight-${weight}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {weight}
                  </label>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Suggested Inventory</CardTitle>
            <CardDescription>
              Recommended inventory levels by category and weight
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-auto max-h-64">
            {forecast?.categoryForecasts && (
              <>
                <h3 className="font-medium text-sm mb-2 flex items-center">
                  <Tag className="h-4 w-4 mr-1" /> By Category
                </h3>
                <div className="space-y-2 mb-4">
                  {Object.entries(forecast.categoryForecasts).map(([category, data]) => (
                    <div key={category} className="flex justify-between items-center">
                      <span className="text-sm">{category}:</span>
                      <span className="font-medium">{Math.round(data.suggestedInventoryLevel)} units</span>
                    </div>
                  ))}
                </div>
              </>
            )}
            
            {forecast?.weightForecasts && (
              <>
                <Separator className="my-4" />
                <h3 className="font-medium text-sm mb-2 flex items-center">
                  <Package className="h-4 w-4 mr-1" /> By Package Size
                </h3>
                <div className="space-y-2">
                  {Object.entries(forecast.weightForecasts).map(([weight, data]) => (
                    <div key={weight} className="flex justify-between items-center">
                      <span className="text-sm">{weight}:</span>
                      <span className="font-medium">{Math.round(data.suggestedInventoryLevel)} units</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
      
      <Card className="mb-6">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle>Sales Forecast Chart</CardTitle>
            <div className="flex space-x-2">
              <Button 
                variant={activeMetric === 'sales' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setActiveMetric('sales')}
              >
                Sales
              </Button>
              <Button 
                variant={activeMetric === 'revenue' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setActiveMetric('revenue')}
              >
                Revenue
              </Button>
              <Button 
                variant={activeMetric === 'profit' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setActiveMetric('profit')}
              >
                Profit
              </Button>
            </div>
          </div>
          <CardDescription>
            3-month historical data with 3-month projection
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={chartData}
                margin={{
                  top: 10,
                  right: 30,
                  left: 0,
                  bottom: 0,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <defs>
                  <linearGradient id="historicalSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1e3a8a" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#1e3a8a" stopOpacity={0.1}/>
                  </linearGradient>
                  <linearGradient id="forecastSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#047857" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#047857" stopOpacity={0.1}/>
                  </linearGradient>
                  <linearGradient id="historicalRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7e22ce" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#7e22ce" stopOpacity={0.1}/>
                  </linearGradient>
                  <linearGradient id="forecastRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#c026d3" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#c026d3" stopOpacity={0.1}/>
                  </linearGradient>
                  <linearGradient id="historicalProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#b45309" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#b45309" stopOpacity={0.1}/>
                  </linearGradient>
                  <linearGradient id="forecastProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#d97706" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#d97706" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                
                {activeMetric === 'sales' && (
                  <>
                    <Area 
                      type="monotone" 
                      dataKey="historicalSales" 
                      stroke="#1e3a8a"
                      fill="url(#historicalSales)"
                      name="Historical Sales"
                      connectNulls
                    />
                    <Area 
                      type="monotone" 
                      dataKey="forecastedSales" 
                      stroke="#047857"
                      fill="url(#forecastSales)"
                      name="Forecasted Sales"
                      connectNulls
                      strokeDasharray="5 5"
                    />
                  </>
                )}
                
                {activeMetric === 'revenue' && (
                  <>
                    <Area 
                      type="monotone" 
                      dataKey="historicalRevenue" 
                      stroke="#7e22ce"
                      fill="url(#historicalRevenue)"
                      name="Historical Revenue"
                      connectNulls
                    />
                    <Area 
                      type="monotone" 
                      dataKey="forecastedRevenue" 
                      stroke="#c026d3"
                      fill="url(#forecastRevenue)"
                      name="Forecasted Revenue"
                      connectNulls
                      strokeDasharray="5 5"
                    />
                  </>
                )}
                
                {activeMetric === 'profit' && (
                  <>
                    <Area 
                      type="monotone" 
                      dataKey="historicalProfit" 
                      stroke="#b45309"
                      fill="url(#historicalProfit)"
                      name="Historical Profit"
                      connectNulls
                    />
                    <Area 
                      type="monotone" 
                      dataKey="forecastedProfit" 
                      stroke="#d97706"
                      fill="url(#forecastProfit)"
                      name="Forecasted Profit"
                      connectNulls
                      strokeDasharray="5 5"
                    />
                  </>
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
      
      {forecast?.categoryForecasts && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Category Breakdown</CardTitle>
            <CardDescription>
              Sales forecast by product category
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue={Object.keys(forecast.categoryForecasts)[0]}>
              <TabsList className="mb-4">
                {Object.keys(forecast.categoryForecasts).map((category) => (
                  <TabsTrigger key={category} value={category}>
                    {category}
                  </TabsTrigger>
                ))}
              </TabsList>
              
              {Object.entries(forecast.categoryForecasts).map(([category, data]) => (
                <TabsContent key={category} value={category}>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={data.timeSeries.map(point => {
                          // Format date for better display if it's in YYYY-MM-DD format
                          let displayDate = point.label;
                          if (/^\d{4}-\d{2}-\d{2}$/.test(point.label)) {
                            const date = new Date(point.label);
                            displayDate = new Intl.DateTimeFormat('en-US', { 
                              month: 'short', 
                              year: 'numeric' 
                            }).format(date);
                          }
                          
                          return {
                            name: displayDate,
                            sales: Math.round(point.sales),
                            revenue: Math.round(point.revenue),
                            profit: Math.round(point.profit),
                            isForecast: point.isForecasted,
                            historicalSales: point.isForecasted ? null : Math.round(point.sales),
                            forecastedSales: point.isForecasted ? Math.round(point.sales) : null,
                          };
                        })}
                        margin={{
                          top: 10,
                          right: 30,
                          left: 0,
                          bottom: 0,
                        }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend />
                        <Area 
                          type="monotone" 
                          dataKey="historicalSales" 
                          stroke="#1e3a8a"
                          fill="url(#historicalSales)"
                          name="Historical Sales"
                          connectNulls
                        />
                        <Area 
                          type="monotone" 
                          dataKey="forecastedSales" 
                          stroke="#047857"
                          fill="url(#forecastSales)"
                          name="Forecasted Sales"
                          connectNulls
                          strokeDasharray="5 5"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                  
                  <div className="mt-4 flex justify-between items-center">
                    <div className="text-sm">
                      <span className="text-muted-foreground">Suggested Inventory:</span>
                      <span className="ml-2 font-medium">{Math.round(data.suggestedInventoryLevel)} units</span>
                    </div>
                    
                    <Button size="sm" variant="outline">
                      View Products
                    </Button>
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Skeleton loader for when the forecast data is loading
function ForecastSkeleton() {
  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <Skeleton className="h-9 w-48 mb-2" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-36 w-72" />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {Array(4).fill(0).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-28" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-24 mb-2" />
              <Skeleton className="h-4 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {Array(3).fill(0).map((_, i) => (
          <Card key={i} className="col-span-1">
            <CardHeader>
              <Skeleton className="h-5 w-32 mb-2" />
              <Skeleton className="h-4 w-48" />
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Array(5).fill(0).map((_, j) => (
                  <Skeleton key={j} className="h-6 w-full" />
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      <Card className="mb-6">
        <CardHeader>
          <Skeleton className="h-6 w-48 mb-2" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[400px] w-full" />
        </CardContent>
      </Card>
    </div>
  );
}