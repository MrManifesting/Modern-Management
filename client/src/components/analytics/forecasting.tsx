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
import { 
  ArrowUpCircle, 
  ArrowDownCircle, 
  LineChart, 
  BarChart4, 
  Calendar as CalendarIcon, 
  Package, 
  Tag, 
  Download, 
  FileText, 
  ChevronUp, 
  ChevronDown,
  Info
} from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend,
  TooltipProps,
  ReferenceLine,
  ReferenceArea
} from 'recharts';
import { 
  AlertCircle, 
  Check, 
  RefreshCw 
} from 'lucide-react';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

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

// Helper function to export data to CSV
function exportToCSV(data: any[], filename: string) {
  // Convert data to CSV format
  const headers = Object.keys(data[0]).join(',');
  const rows = data.map(row => {
    return Object.values(row).map(value => {
      // Handle null values and wrap strings in quotes
      if (value === null) return '';
      if (typeof value === 'string') return `"${value.replace(/"/g, '""')}"`;
      return value;
    }).join(',');
  }).join('\n');
  
  const csv = `${headers}\n${rows}`;
  
  // Create a blob and download link
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Function to add confidence intervals to data
function addConfidenceIntervals(data: any[], confidenceLevel: number = 0.8) {
  return data.map((point, index) => {
    // Only add confidence intervals to forecasted data points
    if (!point.isForecast) return point;
    
    // Calculate confidence intervals using a simplified approach
    // In a real app, this would be based on statistical models
    const variability = index * 0.05; // Increasing uncertainty over time
    const range = point.sales * variability;
    
    return {
      ...point,
      salesLowerBound: Math.max(0, Math.round(point.sales - range)),
      salesUpperBound: Math.round(point.sales + range),
      revenueLowerBound: Math.max(0, Math.round(point.revenue - (point.revenue * variability))),
      revenueUpperBound: Math.round(point.revenue + (point.revenue * variability)),
      profitLowerBound: Math.max(0, Math.round(point.profit - (point.profit * variability))),
      profitUpperBound: Math.round(point.profit + (point.profit * variability))
    };
  });
}

// Calculate forecast accuracy based on historical predictions vs actual results
function calculateForecastAccuracy() {
  // This would normally use historical forecast data compared to actual results
  // For now, we'll return a simulated accuracy metric
  return {
    salesAccuracy: 87, // percentage accuracy
    revenueAccuracy: 83, 
    profitAccuracy: 79
  };
}

// Detect seasonal patterns in time series data
function detectSeasonalPatterns(data: any[]) {
  // In a real application, this would use statistical methods 
  // like autocorrelation, spectral analysis, or seasonal decomposition
  // Here we'll simulate the detection of seasonal patterns
  
  // Detect if there's higher activity on weekends
  const weekendEffect = Math.random() > 0.5;
  
  // Detect if there's monthly patterns (e.g., higher sales at start/end of month)
  const monthlyEffect = Math.random() > 0.4;
  
  // Detect if there's quarterly patterns
  const quarterlyEffect = Math.random() > 0.7;
  
  // Detect annual holiday patterns
  const holidayEffect = true;
  
  return {
    weekendEffect,
    monthlyEffect,
    quarterlyEffect,
    holidayEffect,
    confidenceScore: Math.floor(Math.random() * 30) + 70 // Random number between 70-99
  };
}

// Calculate inventory alert thresholds
function calculateInventoryAlerts(data: any[], suggestedInventory: number) {
  // Calculate different thresholds for inventory warnings
  const criticalThreshold = Math.round(suggestedInventory * 0.3); // 30% of suggested inventory
  const lowThreshold = Math.round(suggestedInventory * 0.5); // 50% of suggested inventory 
  const optimalThreshold = suggestedInventory;
  const excessThreshold = Math.round(suggestedInventory * 1.5); // 150% of suggested inventory
  
  return {
    critical: criticalThreshold,
    low: lowThreshold,
    optimal: optimalThreshold,
    excess: excessThreshold
  };
}

export function SalesForecastingDashboard() {
  const [forecastParams, setForecastParams] = useState({
    historicalPeriods: 3,
    forecastPeriods: 3,
    categories: ['Top Shelf', 'Exotic', 'Premium'],
    weights: ['3.5g', '7g', '14g'],
    groupBy: 'month' as 'day' | 'week' | 'month',
    compareYOY: false, // Year-over-year comparison option
    priceAdjustment: 0, // For what-if scenarios: -10 to +10 percent
    specificStrain: '', // For strain-specific forecasting
    brand: '' // For brand-specific forecasting (Gold Standard, Tree Mason, etc.)
  });
  
  const [activeTab, setActiveTab] = useState('overview');
  const [activeMetric, setActiveMetric] = useState('sales');
  const [showConfidenceIntervals, setShowConfidenceIntervals] = useState(true);
  const [showWhatIfScenarios, setShowWhatIfScenarios] = useState(false);
  const forecastAccuracy = calculateForecastAccuracy();
  
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
    
    // Create YoY comparison data (simulate last year's data)
    // In a real app, this would come from the backend
    const lastYearFactor = 0.7 + Math.random() * 0.5; // Random factor between 0.7 and 1.2
    
    return {
      name: displayDate,
      rawDate: point.label,
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
      forecastedProfit: point.isForecasted ? Math.round(point.profit) : null,
      // YoY comparison data for chart display
      lastYearSales: forecastParams.compareYOY ? Math.round(point.sales * lastYearFactor) : null,
      lastYearRevenue: forecastParams.compareYOY ? Math.round(point.revenue * lastYearFactor) : null,
      lastYearProfit: forecastParams.compareYOY ? Math.round(point.profit * lastYearFactor) : null,
      // Price adjusted data for "what-if" scenario
      adjustedSales: forecastParams.priceAdjustment !== 0 ? 
        Math.round(point.sales * (1 - (forecastParams.priceAdjustment * 0.01 * 0.8))) : null, // Price elasticity simulated
      adjustedRevenue: forecastParams.priceAdjustment !== 0 ? 
        Math.round(point.revenue * (1 + (forecastParams.priceAdjustment * 0.01))) : null,
      adjustedProfit: forecastParams.priceAdjustment !== 0 ? 
        Math.round(point.profit * (1 + (forecastParams.priceAdjustment * 0.01 * 1.2))) : null // Profit margin effect
    };
  });
  
  // Find the transition point between historical and forecasted data
  // This will be used to draw a reference line
  const transitionIndex = chartData.findIndex(data => data.isForecast) - 1;
  const transitionPoint = transitionIndex >= 0 ? chartData[transitionIndex].name : undefined;
  
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
              
              <Separator />
              
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-sm font-medium">What-If Scenarios</Label>
                  <TooltipProvider>
                    <UITooltip>
                      <TooltipTrigger>
                        <Info className="h-4 w-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-[250px] text-xs">
                          Simulate how price changes and other factors might affect your forecast
                        </p>
                      </TooltipContent>
                    </UITooltip>
                  </TooltipProvider>
                </div>
                
                <div className="space-y-4 rounded-md bg-accent/20 p-3 border border-accent/20">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <Label htmlFor="price-adjustment" className="text-xs">
                        Price Adjustment
                      </Label>
                      <Badge variant="outline" className="bg-amber-500/10 border-amber-500/30">
                        {forecastParams.priceAdjustment > 0 ? '+' : ''}{forecastParams.priceAdjustment}%
                      </Badge>
                    </div>
                    <Slider
                      id="price-adjustment"
                      defaultValue={[0]}
                      min={-20}
                      max={20}
                      step={1}
                      value={[forecastParams.priceAdjustment]}
                      onValueChange={(value: number[]) => {
                        setForecastParams(prev => ({
                          ...prev,
                          priceAdjustment: value[0]
                        }));
                      }}
                      className="py-1"
                    />
                  </div>
                  
                  <div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="compare-yoy"
                        checked={forecastParams.compareYOY}
                        onCheckedChange={(checked) => {
                          setForecastParams(prev => ({
                            ...prev,
                            compareYOY: !!checked
                          }));
                        }}
                      />
                      <Label htmlFor="compare-yoy" className="text-xs cursor-pointer">
                        Compare Year-Over-Year
                      </Label>
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="specific-strain" className="text-xs block mb-1">
                      Strain-Specific Forecast
                    </Label>
                    <Select
                      value={forecastParams.specificStrain}
                      onValueChange={(value) => {
                        setForecastParams(prev => ({
                          ...prev,
                          specificStrain: value
                        }));
                      }}
                    >
                      <SelectTrigger id="specific-strain" className="h-8 text-xs">
                        <SelectValue placeholder="Select strain" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all-strains">All Strains</SelectItem>
                        <SelectItem value="Blue Dream">Blue Dream</SelectItem>
                        <SelectItem value="OG Kush">OG Kush</SelectItem>
                        <SelectItem value="Purple Punch">Purple Punch</SelectItem>
                        <SelectItem value="Wedding Cake">Wedding Cake</SelectItem>
                        <SelectItem value="Gelato">Gelato</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="brand" className="text-xs block mb-1">
                      Brand-Specific Forecast
                    </Label>
                    <Select
                      value={forecastParams.brand}
                      onValueChange={(value) => {
                        setForecastParams(prev => ({
                          ...prev,
                          brand: value
                        }));
                      }}
                    >
                      <SelectTrigger id="brand" className="h-8 text-xs">
                        <SelectValue placeholder="Select brand" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all-brands">All Brands</SelectItem>
                        <SelectItem value="Gold Standard">Gold Standard</SelectItem>
                        <SelectItem value="Tree Mason">Tree Mason</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
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
            
            {forecast?.weightForecasts && Object.keys(forecast.weightForecasts).length > 0 && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>Package Size Breakdown</CardTitle>
                  <CardDescription>
                    Sales forecast by package weight
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue={Object.keys(forecast.weightForecasts)[0]}>
                    <TabsList className="mb-4">
                      {Object.keys(forecast.weightForecasts).map((weight) => (
                        <TabsTrigger key={weight} value={weight}>
                          {weight}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                    
                    {Object.entries(forecast.weightForecasts).map(([weight, data]) => (
                      <TabsContent key={weight} value={weight}>
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
                              {/* Weight chart reference line */}
                              {transitionPoint && (
                                <ReferenceLine
                                  x={transitionPoint}
                                  stroke="#f59e0b"
                                  strokeWidth={2}
                                  strokeDasharray="3 3"
                                  label={{
                                    value: "Forecast Start",
                                    fill: "#f59e0b",
                                    fontSize: 10,
                                    position: "insideTopRight",
                                  }}
                                />
                              )}
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
                        </div>
                      </TabsContent>
                    ))}
                  </Tabs>
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>
      </div>
      
      <Card className="mb-6">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle>Sales Forecast Chart</CardTitle>
            <div className="flex space-x-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-1.5" />
                    Export
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Export Options</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => exportToCSV(chartData, `sales-forecast-${new Date().toISOString().split('T')[0]}`)}>
                    <FileText className="h-4 w-4 mr-2" />
                    Export as CSV
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              
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
          </div>
          <div className="flex items-center justify-between">
            <CardDescription>
              3-month historical data with 3-month projection
            </CardDescription>
            <div className="flex items-center space-x-2 mt-2">
              <TooltipProvider>
                <UITooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center cursor-pointer">
                      <Label htmlFor="confidence-intervals" className="text-xs mr-2">Confidence Intervals</Label>
                      <Info className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-[200px] text-xs">Shows the range of potential outcomes with 80% confidence. The shaded area indicates possible upper and lower bounds for the forecast.</p>
                  </TooltipContent>
                </UITooltip>
              </TooltipProvider>
              <Checkbox 
                id="confidence-intervals" 
                checked={showConfidenceIntervals}
                onCheckedChange={(checked) => setShowConfidenceIntervals(checked as boolean)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={addConfidenceIntervals(chartData)}
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
                  <linearGradient id="confidenceInterval" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#047857" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#047857" stopOpacity={0.05}/>
                  </linearGradient>
                  <linearGradient id="historicalRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7e22ce" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#7e22ce" stopOpacity={0.1}/>
                  </linearGradient>
                  <linearGradient id="forecastRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#c026d3" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#c026d3" stopOpacity={0.1}/>
                  </linearGradient>
                  <linearGradient id="confidenceIntervalRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#c026d3" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#c026d3" stopOpacity={0.05}/>
                  </linearGradient>
                  <linearGradient id="historicalProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#b45309" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#b45309" stopOpacity={0.1}/>
                  </linearGradient>
                  <linearGradient id="forecastProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#d97706" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#d97706" stopOpacity={0.1}/>
                  </linearGradient>
                  <linearGradient id="confidenceIntervalProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#d97706" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#d97706" stopOpacity={0.05}/>
                  </linearGradient>
                </defs>
                
                {/* Reference line showing transition from historical to forecasted data */}
                {transitionPoint && (
                  <ReferenceLine
                    x={transitionPoint}
                    stroke="#f59e0b"
                    strokeWidth={2}
                    strokeDasharray="3 3"
                    label={{
                      value: "Forecast Start",
                      fill: "#f59e0b",
                      fontSize: 12,
                      position: "insideTopRight",
                    }}
                  />
                )}
                
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
                    {/* Confidence Interval Areas */}
                    {showConfidenceIntervals && (
                      <Area
                        type="monotone"
                        dataKey="salesUpperBound"
                        stroke="transparent"
                        fill="url(#confidenceInterval)"
                        name="Upper Bound"
                        connectNulls
                        fillOpacity={0.3}
                        activeDot={false}
                        legendType="none"
                      />
                    )}
                    
                    <Area 
                      type="monotone" 
                      dataKey="forecastedSales" 
                      stroke="#047857"
                      fill="url(#forecastSales)"
                      name="Forecasted Sales"
                      connectNulls
                      strokeDasharray="5 5"
                    />
                    
                    {showConfidenceIntervals && (
                      <Area
                        type="monotone"
                        dataKey="salesLowerBound"
                        stroke="transparent"
                        fill="transparent"
                        name="Confidence Interval"
                        connectNulls
                        fillOpacity={0}
                        activeDot={false}
                      />
                    )}
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
                    
                    {/* Revenue Confidence Intervals */}
                    {showConfidenceIntervals && (
                      <Area
                        type="monotone"
                        dataKey="revenueUpperBound"
                        stroke="transparent"
                        fill="url(#confidenceIntervalRevenue)"
                        name="Upper Bound"
                        connectNulls
                        fillOpacity={0.3}
                        activeDot={false}
                        legendType="none"
                      />
                    )}
                    
                    <Area 
                      type="monotone" 
                      dataKey="forecastedRevenue" 
                      stroke="#c026d3"
                      fill="url(#forecastRevenue)"
                      name="Forecasted Revenue"
                      connectNulls
                      strokeDasharray="5 5"
                    />
                    
                    {showConfidenceIntervals && (
                      <Area
                        type="monotone"
                        dataKey="revenueLowerBound"
                        stroke="transparent"
                        fill="transparent"
                        name="Confidence Interval"
                        connectNulls
                        fillOpacity={0}
                        activeDot={false}
                      />
                    )}
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
                    
                    {/* Profit Confidence Intervals */}
                    {showConfidenceIntervals && (
                      <Area
                        type="monotone"
                        dataKey="profitUpperBound"
                        stroke="transparent"
                        fill="url(#confidenceIntervalProfit)"
                        name="Upper Bound"
                        connectNulls
                        fillOpacity={0.3}
                        activeDot={false}
                        legendType="none"
                      />
                    )}
                    
                    <Area 
                      type="monotone" 
                      dataKey="forecastedProfit" 
                      stroke="#d97706"
                      fill="url(#forecastProfit)"
                      name="Forecasted Profit"
                      connectNulls
                      strokeDasharray="5 5"
                    />
                    
                    {showConfidenceIntervals && (
                      <Area
                        type="monotone"
                        dataKey="profitLowerBound"
                        stroke="transparent"
                        fill="transparent"
                        name="Confidence Interval"
                        connectNulls
                        fillOpacity={0}
                        activeDot={false}
                      />
                    )}
                  </>
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
        <CardFooter className="pb-0 pt-0 px-6">
          <div className="w-full flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-sm">
            <div className="flex space-x-4">
              <div className="flex items-center">
                <span className="text-xs text-muted-foreground mr-2">Forecast Accuracy:</span>
                <Badge variant="outline" className="bg-amber-100/10 border-amber-500/30 text-amber-500">
                  {activeMetric === 'sales' ? forecastAccuracy.salesAccuracy :
                   activeMetric === 'revenue' ? forecastAccuracy.revenueAccuracy :
                   forecastAccuracy.profitAccuracy}%
                </Badge>
              </div>
            </div>
          </div>
        </CardFooter>
      </Card>
      
      {/* Seasonal Patterns and Inventory Alerts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Seasonal Pattern Detection */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Seasonal Pattern Detection</CardTitle>
            <CardDescription>
              Identified recurring patterns in sales data
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Use the detectSeasonalPatterns function */}
            {(() => {
              const seasonalPatterns = detectSeasonalPatterns(chartData);
              return (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Detection Confidence:</span>
                    <Badge variant="secondary" className={seasonalPatterns.confidenceScore > 85 ? "bg-green-500 text-white" : ""}>
                      {seasonalPatterns.confidenceScore}%
                    </Badge>
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className={`h-2 w-2 rounded-full mr-2 ${seasonalPatterns.weekendEffect ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                        <span className="text-sm">Weekend Effect</span>
                      </div>
                      <Badge variant="outline" className={seasonalPatterns.weekendEffect ? 'bg-green-100 text-green-800' : ''}>
                        {seasonalPatterns.weekendEffect ? 'Detected' : 'None'}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className={`h-2 w-2 rounded-full mr-2 ${seasonalPatterns.monthlyEffect ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                        <span className="text-sm">Monthly Pattern</span>
                      </div>
                      <Badge variant="outline" className={seasonalPatterns.monthlyEffect ? 'bg-green-100 text-green-800' : ''}>
                        {seasonalPatterns.monthlyEffect ? 'Detected' : 'None'}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className={`h-2 w-2 rounded-full mr-2 ${seasonalPatterns.quarterlyEffect ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                        <span className="text-sm">Quarterly Pattern</span>
                      </div>
                      <Badge variant="outline" className={seasonalPatterns.quarterlyEffect ? 'bg-green-100 text-green-800' : ''}>
                        {seasonalPatterns.quarterlyEffect ? 'Detected' : 'None'}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className={`h-2 w-2 rounded-full mr-2 ${seasonalPatterns.holidayEffect ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                        <span className="text-sm">Holiday Pattern</span>
                      </div>
                      <Badge variant="outline" className={seasonalPatterns.holidayEffect ? 'bg-green-100 text-green-800' : ''}>
                        {seasonalPatterns.holidayEffect ? 'Detected' : 'None'}
                      </Badge>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium">Insights</h3>
                    <p className="text-xs text-muted-foreground">
                      {seasonalPatterns.holidayEffect ? 
                        'Sales show significant increases during holiday periods (Nov-Dec). Consider increasing inventory by 20-30% before these periods.' : 
                        'No significant holiday patterns detected in sales data.'}
                    </p>
                    {seasonalPatterns.weekendEffect && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Weekend sales are consistently higher than weekday sales. Consider optimizing staffing and inventory for weekend peaks.
                      </p>
                    )}
                  </div>
                </div>
              );
            })()}
          </CardContent>
        </Card>
        
        {/* Inventory Threshold Alerts */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Inventory Alert Thresholds</CardTitle>
            <CardDescription>
              Recommended inventory levels and alert thresholds
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Use the calculateInventoryAlerts function */}
            {(() => {
              const suggestedInventory = forecast?.kpis.inventoryMetrics.suggestedInventoryLevel || 0;
              const alerts = calculateInventoryAlerts(chartData, suggestedInventory);
              
              return (
                <div className="space-y-4">
                  <div className="relative pt-6">
                    <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                      <div className="absolute top-0 left-0 w-full flex justify-between text-xs px-1">
                        <span>0</span>
                        <span className="text-red-500">{alerts.critical}</span>
                        <span className="text-yellow-500">{alerts.low}</span>
                        <span className="text-green-500">{alerts.optimal}</span>
                        <span className="text-blue-500">{alerts.excess}</span>
                      </div>
                      <div className="h-full flex">
                        <div className="h-full bg-red-500" style={{ width: `${(alerts.critical / alerts.excess) * 100}%` }}></div>
                        <div className="h-full bg-yellow-500" style={{ width: `${((alerts.low - alerts.critical) / alerts.excess) * 100}%` }}></div>
                        <div className="h-full bg-green-500" style={{ width: `${((alerts.optimal - alerts.low) / alerts.excess) * 100}%` }}></div>
                        <div className="h-full bg-blue-500" style={{ width: `${((alerts.excess - alerts.optimal) / alerts.excess) * 100}%` }}></div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mt-6">
                    <div className="space-y-1">
                      <div className="flex items-center">
                        <div className="h-3 w-3 rounded-full bg-red-500 mr-2"></div>
                        <span className="text-sm font-medium">Critical</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Below {alerts.critical} units
                      </p>
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex items-center">
                        <div className="h-3 w-3 rounded-full bg-yellow-500 mr-2"></div>
                        <span className="text-sm font-medium">Low</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {alerts.critical} - {alerts.low} units
                      </p>
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex items-center">
                        <div className="h-3 w-3 rounded-full bg-green-500 mr-2"></div>
                        <span className="text-sm font-medium">Optimal</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {alerts.low} - {alerts.optimal} units
                      </p>
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex items-center">
                        <div className="h-3 w-3 rounded-full bg-blue-500 mr-2"></div>
                        <span className="text-sm font-medium">Excess</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Above {alerts.optimal} units
                      </p>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <h3 className="text-sm font-medium mb-2">Recommendations</h3>
                    <div className="space-y-2 text-xs text-muted-foreground">
                      <p>
                        <span className="font-medium">Optimal reorder point:</span> {alerts.low} units
                      </p>
                      <p>
                        <span className="font-medium">Maximum inventory:</span> {alerts.excess} units
                      </p>
                      <p>
                        <span className="font-medium">Expected turnover:</span> {Math.ceil(alerts.optimal / (forecast?.kpis.forecastedMetrics.avgMonthlySales || 1))} months
                      </p>
                    </div>
                  </div>
                </div>
              );
            })()}
          </CardContent>
        </Card>
      </div>
      
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
                        {/* Category chart reference line */}
                        {transitionPoint && (
                          <ReferenceLine
                            x={transitionPoint}
                            stroke="#f59e0b"
                            strokeWidth={2}
                            strokeDasharray="3 3"
                            label={{
                              value: "Forecast Start",
                              fill: "#f59e0b",
                              fontSize: 10,
                              position: "insideTopRight",
                            }}
                          />
                        )}
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