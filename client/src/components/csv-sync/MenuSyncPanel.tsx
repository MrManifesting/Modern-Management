import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Download, RefreshCw, Package, Play, Clock, Settings, Eye, FileText, Globe, Palette, Upload } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface MenuTabItem {
  strain: string;
  amount: number;
  tier: string;
  bulk: string;
  distro25: string;
  master50: string;
  master100: string;
  variantSku: string;
  keyId: string;
}

interface SyncSummary {
  totalItems: number;
  itemsWithQuantity: number;
  itemsWithoutQuantity: number;
  totalAvailableQuantity: number;
}

interface MenuTheme {
  id: string;
  name: string;
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  textColor: string;
  accentColor: string;
  backgroundImage?: string;
}

interface CompanyBranding {
  companyName: string;
  subtitle: string;
  contactInfo: {
    phone: string;
    email: string;
    website: string;
    address: string;
  };
  logoUrl: string;
  description: string;
  watermark?: string;
}

const defaultThemes: MenuTheme[] = [
  {
    id: 'gold-standard',
    name: 'Gold Standard Premium',
    primaryColor: '#D4AF37',
    secondaryColor: '#228B22',
    backgroundColor: '#0F0F0F',
    textColor: '#FFFFFF',
    accentColor: '#FFD700'
  },
  {
    id: 'emerald-elite',
    name: 'Emerald Elite',
    primaryColor: '#50C878',
    secondaryColor: '#2F4F2F',
    backgroundColor: '#1A1A1A',
    textColor: '#F0F0F0',
    accentColor: '#00FF7F'
  },
  {
    id: 'royal-purple',
    name: 'Royal Purple',
    primaryColor: '#7B68EE',
    secondaryColor: '#4B0082',
    backgroundColor: '#1C1C1C',
    textColor: '#FFFFFF',
    accentColor: '#9370DB'
  },
  {
    id: 'sunset-orange',
    name: 'Sunset Orange',
    primaryColor: '#FF8C00',
    secondaryColor: '#FF4500',
    backgroundColor: '#2F1B14',
    textColor: '#FFF8DC',
    accentColor: '#FFD700'
  },
  {
    id: 'forest-green',
    name: 'Forest Green',
    primaryColor: '#228B22',
    secondaryColor: '#006400',
    backgroundColor: '#0D1B0D',
    textColor: '#F0FFF0',
    accentColor: '#32CD32'
  }
];

export function MenuSyncPanel() {
  const [isDownloading, setIsDownloading] = useState(false);
  const [isTriggering, setIsTriggering] = useState(false);
  const [isGeneratingCustom, setIsGeneratingCustom] = useState(false);
  
  // Custom menu filters
  const [selectedTiers, setSelectedTiers] = useState<string[]>([]);
  const [minQuantity, setMinQuantity] = useState(1);
  const [maxQuantity, setMaxQuantity] = useState(1000);
  const [includeOutOfStock, setIncludeOutOfStock] = useState(false);
  const [sortBy, setSortBy] = useState<'strain' | 'quantity' | 'tier' | 'price'>('quantity');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [outputFormat, setOutputFormat] = useState<'json' | 'csv' | 'html'>('html');

  // Branding and theme state
  const [selectedTheme, setSelectedTheme] = useState<MenuTheme>(defaultThemes[0]);
  const [customTheme, setCustomTheme] = useState<MenuTheme>({
    id: 'custom',
    name: 'Custom Theme',
    primaryColor: '#D4AF37',
    secondaryColor: '#228B22',
    backgroundColor: '#0F0F0F',
    textColor: '#FFFFFF',
    accentColor: '#FFD700'
  });
  const [companyBranding, setCompanyBranding] = useState<CompanyBranding>({
    companyName: 'Gold Standard CBD',
    subtitle: 'Premium THCA Flower Wholesale',
    contactInfo: {
      phone: '541-295-8811',
      email: 'wholesale@goldcbd.com',
      website: 'goldcbd.com',
      address: 'Oregon, USA'
    },
    logoUrl: '',
    description: 'Premium quality THCA flower for wholesale distribution'
  });

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['/api/csv-sync/summary']
  });

  const { data: menuItems, isLoading: itemsLoading, refetch } = useQuery({
    queryKey: ['/api/csv-sync/menu-tab-updated']
  });

  const { data: schedulerStatus, isLoading: statusLoading } = useQuery({
    queryKey: ['/api/csv-sync/scheduler/status'],
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  const handleDownloadCSV = async () => {
    setIsDownloading(true);
    try {
      const response = await fetch('/api/csv-sync/download-updated-csv');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `gold-standard-menu-updated-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download failed:', error);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleTriggerSync = async () => {
    setIsTriggering(true);
    try {
      const response = await fetch('/api/csv-sync/scheduler/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (response.ok) {
        // Refresh data after sync
        refetch();
      }
    } catch (error) {
      console.error('Manual sync failed:', error);
    } finally {
      setIsTriggering(false);
    }
  };

  const handleGenerateCustomMenu = async () => {
    setIsGeneratingCustom(true);
    try {
      const options = {
        includeTiers: selectedTiers,
        minQuantity,
        maxQuantity,
        includeOutOfStock,
        sortBy,
        sortOrder,
        format: outputFormat,
        theme: selectedTheme.id === 'custom' ? customTheme : selectedTheme,
        branding: companyBranding,
        includeImages: true,
        includeQrCodes: true,
        includePricing: true
      };

      const response = await fetch('/api/csv-sync/generate-custom-menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(options)
      });
      
      const result = await response.json();

      if (outputFormat === 'html') {
        // Open HTML in new window
        const newWindow = window.open('', '_blank');
        if (newWindow) {
          newWindow.document.write(result.data);
          newWindow.document.close();
        }
      } else if (outputFormat === 'csv') {
        // Download CSV file
        const blob = new Blob([result.data], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `custom-menu-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        // JSON format - show in console for debugging
        console.log('Custom Menu JSON:', result.data);
      }

      // Refresh data
      refetch();
    } catch (error) {
      console.error('Custom menu generation failed:', error);
    } finally {
      setIsGeneratingCustom(false);
    }
  };

  const handlePreviewLiveMenu = () => {
    const params = new URLSearchParams({
      format: 'html',
      minQuantity: minQuantity.toString(),
      ...(selectedTiers.length > 0 && { tiers: selectedTiers.join(',') })
    });
    
    window.open(`/api/csv-sync/live-menu-preview?${params}`, '_blank');
  };

  const availableTiers = ['EXOTIC', 'TOP SHELF', 'AAA INDOOR', 'AA INDOOR', 'CLASSIC RESERVE'];

  const handleTierToggle = (tier: string) => {
    setSelectedTiers(prev => 
      prev.includes(tier) 
        ? prev.filter(t => t !== tier)
        : [...prev, tier]
    );
  };

  const summaryData = summary as SyncSummary;
  const itemsData = menuItems as MenuTabItem[];
  const availableItems = itemsData?.filter(item => item.amount > 0) || [];
  const schedulerData = schedulerStatus as { isRunning: boolean; syncIntervalMinutes: number; nextSyncTime?: string };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gold-600">Advanced Menu Sync & Generation</h1>
          <p className="text-muted-foreground">
            Real-time Shopify sync with custom menu generation, filtering, and multi-format export
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetch()} disabled={itemsLoading}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" onClick={handleTriggerSync} disabled={isTriggering}>
            <Play className="h-4 w-4 mr-2" />
            {isTriggering ? 'Syncing...' : 'Sync Now'}
          </Button>
          <Button onClick={handleDownloadCSV} disabled={isDownloading}>
            <Download className="h-4 w-4 mr-2" />
            {isDownloading ? 'Downloading...' : 'Download CSV'}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="custom-menu">Custom Menu</TabsTrigger>
          <TabsTrigger value="branding">Branding</TabsTrigger>
          <TabsTrigger value="live-sync">Live Sync</TabsTrigger>
          <TabsTrigger value="inventory">Current Inventory</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Scheduler Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-gold-600" />
                Automatic Sync Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center gap-2">
                  <div className={`h-3 w-3 rounded-full ${schedulerData?.isRunning ? 'bg-green-500' : 'bg-red-500'}`} />
                  <span className="font-medium">
                    Status: {schedulerData?.isRunning ? 'Running' : 'Stopped'}
                  </span>
                </div>
                <div className="text-sm text-muted-foreground">
                  Interval: {schedulerData?.syncIntervalMinutes || 30} minutes
                </div>
                {schedulerData?.nextSyncTime && (
                  <div className="text-sm text-muted-foreground">
                    Next sync: {new Date(schedulerData.nextSyncTime).toLocaleTimeString()}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Total Menu Items</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summaryLoading ? '...' : summaryData?.totalItems}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Available Strains</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {summaryLoading ? '...' : summaryData?.itemsWithQuantity}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Out of Stock</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {summaryLoading ? '...' : summaryData?.itemsWithoutQuantity}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Total Available</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gold-600">
                  {summaryLoading ? '...' : summaryData?.totalAvailableQuantity} lbs
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="custom-menu" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-gold-600" />
                Custom Menu Generation
              </CardTitle>
              <CardDescription>
                Create filtered menus with advanced options and multi-format export
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Tier Selection */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Quality Tiers</Label>
                  <div className="space-y-2">
                    {availableTiers.map(tier => (
                      <div key={tier} className="flex items-center space-x-2">
                        <Checkbox
                          id={tier}
                          checked={selectedTiers.includes(tier)}
                          onCheckedChange={() => handleTierToggle(tier)}
                        />
                        <Label htmlFor={tier} className="text-sm">{tier}</Label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Quantity Range */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Quantity Range (lbs)</Label>
                  <div className="space-y-2">
                    <div>
                      <Label htmlFor="minQty" className="text-xs text-muted-foreground">Minimum</Label>
                      <Input
                        id="minQty"
                        type="number"
                        value={minQuantity}
                        onChange={(e) => setMinQuantity(parseInt(e.target.value) || 0)}
                        min="0"
                        placeholder="Min quantity"
                      />
                    </div>
                    <div>
                      <Label htmlFor="maxQty" className="text-xs text-muted-foreground">Maximum</Label>
                      <Input
                        id="maxQty"
                        type="number"
                        value={maxQuantity}
                        onChange={(e) => setMaxQuantity(parseInt(e.target.value) || 1000)}
                        min="1"
                        placeholder="Max quantity"
                      />
                    </div>
                  </div>
                </div>

                {/* Sorting & Format Options */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Sort & Format</Label>
                  <div className="space-y-2">
                    <Select value={sortBy} onValueChange={(value: 'strain' | 'quantity' | 'tier' | 'price') => setSortBy(value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sort by" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="strain">Strain Name</SelectItem>
                        <SelectItem value="quantity">Quantity</SelectItem>
                        <SelectItem value="tier">Quality Tier</SelectItem>
                        <SelectItem value="price">Price</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select value={sortOrder} onValueChange={(value: 'asc' | 'desc') => setSortOrder(value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sort order" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="asc">Ascending</SelectItem>
                        <SelectItem value="desc">Descending</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select value={outputFormat} onValueChange={(value: 'json' | 'csv' | 'html') => setOutputFormat(value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Output format" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="html">HTML Menu</SelectItem>
                        <SelectItem value="csv">CSV Export</SelectItem>
                        <SelectItem value="json">JSON Data</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Include Out of Stock Option */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeOutOfStock"
                  checked={includeOutOfStock}
                  onCheckedChange={(checked) => setIncludeOutOfStock(checked as boolean)}
                />
                <Label htmlFor="includeOutOfStock" className="text-sm">Include out-of-stock items</Label>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button 
                  onClick={handleGenerateCustomMenu} 
                  disabled={isGeneratingCustom}
                  className="flex-1"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  {isGeneratingCustom ? 'Generating...' : 'Generate Custom Menu'}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handlePreviewLiveMenu}
                  className="flex-1"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Live Preview
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="live-sync" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-gold-600" />
                Real-Time Shopify Sync
              </CardTitle>
              <CardDescription>
                Monitor and control live synchronization with Shopify store
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">
                  Real-time sync runs automatically every minute. Use the controls above to trigger manual sync.
                </p>
                <div className="flex justify-center gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => window.open('/api/csv-sync/live-menu-preview', '_blank')}
                  >
                    <Globe className="h-4 w-4 mr-2" />
                    View Live Menu
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => window.open('/api/csv-sync/live-menu-preview?format=csv', '_blank')}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download Live CSV
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="branding" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Company Information */}
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="h-5 w-5 text-gold-600" />
                    Company Information
                  </CardTitle>
                  <CardDescription>
                    Customize the company details that appear on your menus
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="companyName">Company Name</Label>
                      <Input
                        id="companyName"
                        value={companyBranding.companyName}
                        onChange={(e) => setCompanyBranding(prev => ({
                          ...prev,
                          companyName: e.target.value
                        }))}
                        placeholder="Your Company Name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="subtitle">Subtitle</Label>
                      <Input
                        id="subtitle"
                        value={companyBranding.subtitle}
                        onChange={(e) => setCompanyBranding(prev => ({
                          ...prev,
                          subtitle: e.target.value
                        }))}
                        placeholder="Premium Cannabis Wholesale"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={companyBranding.description}
                      onChange={(e) => setCompanyBranding(prev => ({
                        ...prev,
                        description: e.target.value
                      }))}
                      placeholder="Brief description of your business"
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label htmlFor="logoUrl">Logo URL</Label>
                    <Input
                      id="logoUrl"
                      value={companyBranding.logoUrl}
                      onChange={(e) => setCompanyBranding(prev => ({
                        ...prev,
                        logoUrl: e.target.value
                      }))}
                      placeholder="https://your-domain.com/logo.png"
                    />
                  </div>

                  <Separator />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        value={companyBranding.contactInfo.phone}
                        onChange={(e) => setCompanyBranding(prev => ({
                          ...prev,
                          contactInfo: { ...prev.contactInfo, phone: e.target.value }
                        }))}
                        placeholder="(555) 123-4567"
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        value={companyBranding.contactInfo.email}
                        onChange={(e) => setCompanyBranding(prev => ({
                          ...prev,
                          contactInfo: { ...prev.contactInfo, email: e.target.value }
                        }))}
                        placeholder="contact@company.com"
                      />
                    </div>
                    <div>
                      <Label htmlFor="website">Website</Label>
                      <Input
                        id="website"
                        value={companyBranding.contactInfo.website}
                        onChange={(e) => setCompanyBranding(prev => ({
                          ...prev,
                          contactInfo: { ...prev.contactInfo, website: e.target.value }
                        }))}
                        placeholder="company.com"
                      />
                    </div>
                    <div>
                      <Label htmlFor="address">Address</Label>
                      <Input
                        id="address"
                        value={companyBranding.contactInfo.address}
                        onChange={(e) => setCompanyBranding(prev => ({
                          ...prev,
                          contactInfo: { ...prev.contactInfo, address: e.target.value }
                        }))}
                        placeholder="City, State"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Theme Selection */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Palette className="h-5 w-5 text-gold-600" />
                    Theme & Colors
                  </CardTitle>
                  <CardDescription>
                    Choose a predefined theme or create a custom color scheme
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
                    {defaultThemes.map((theme) => (
                      <div
                        key={theme.id}
                        className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                          selectedTheme.id === theme.id
                            ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                        }`}
                        onClick={() => setSelectedTheme(theme)}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <div
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: theme.primaryColor }}
                          />
                          <div
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: theme.secondaryColor }}
                          />
                        </div>
                        <p className="text-sm font-medium">{theme.name}</p>
                      </div>
                    ))}
                    <div
                      className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                        selectedTheme.id === 'custom'
                          ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                      }`}
                      onClick={() => setSelectedTheme(customTheme)}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: customTheme.primaryColor }}
                        />
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: customTheme.secondaryColor }}
                        />
                      </div>
                      <p className="text-sm font-medium">Custom</p>
                    </div>
                  </div>

                  {selectedTheme.id === 'custom' && (
                    <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <h4 className="font-medium">Custom Theme Colors</h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <div>
                          <Label htmlFor="primaryColor">Primary Color</Label>
                          <div className="flex gap-2">
                            <Input
                              id="primaryColor"
                              type="color"
                              value={customTheme.primaryColor}
                              onChange={(e) => setCustomTheme(prev => ({
                                ...prev,
                                primaryColor: e.target.value
                              }))}
                              className="w-16 h-10"
                            />
                            <Input
                              value={customTheme.primaryColor}
                              onChange={(e) => setCustomTheme(prev => ({
                                ...prev,
                                primaryColor: e.target.value
                              }))}
                              placeholder="#D4AF37"
                            />
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="secondaryColor">Secondary Color</Label>
                          <div className="flex gap-2">
                            <Input
                              id="secondaryColor"
                              type="color"
                              value={customTheme.secondaryColor}
                              onChange={(e) => setCustomTheme(prev => ({
                                ...prev,
                                secondaryColor: e.target.value
                              }))}
                              className="w-16 h-10"
                            />
                            <Input
                              value={customTheme.secondaryColor}
                              onChange={(e) => setCustomTheme(prev => ({
                                ...prev,
                                secondaryColor: e.target.value
                              }))}
                              placeholder="#228B22"
                            />
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="backgroundColor">Background</Label>
                          <div className="flex gap-2">
                            <Input
                              id="backgroundColor"
                              type="color"
                              value={customTheme.backgroundColor}
                              onChange={(e) => setCustomTheme(prev => ({
                                ...prev,
                                backgroundColor: e.target.value
                              }))}
                              className="w-16 h-10"
                            />
                            <Input
                              value={customTheme.backgroundColor}
                              onChange={(e) => setCustomTheme(prev => ({
                                ...prev,
                                backgroundColor: e.target.value
                              }))}
                              placeholder="#0F0F0F"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Live Preview */}
            <div className="lg:col-span-1">
              <Card className="sticky top-6">
                <CardHeader>
                  <CardTitle>Live Preview</CardTitle>
                  <CardDescription>
                    See how your branding will look on menus
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div 
                    className="p-4 rounded-lg min-h-64 relative overflow-hidden"
                    style={{
                      backgroundColor: selectedTheme.id === 'custom' ? customTheme.backgroundColor : selectedTheme.backgroundColor,
                      color: selectedTheme.id === 'custom' ? customTheme.textColor : selectedTheme.textColor
                    }}
                  >
                    <div className="text-center space-y-2">
                      {companyBranding.logoUrl && (
                        <img 
                          src={companyBranding.logoUrl} 
                          alt="Company Logo"
                          className="h-12 mx-auto object-contain"
                        />
                      )}
                      <h3 
                        className="text-xl font-bold"
                        style={{ 
                          color: selectedTheme.id === 'custom' ? customTheme.primaryColor : selectedTheme.primaryColor 
                        }}
                      >
                        {companyBranding.companyName}
                      </h3>
                      <p 
                        className="text-sm"
                        style={{ 
                          color: selectedTheme.id === 'custom' ? customTheme.secondaryColor : selectedTheme.secondaryColor 
                        }}
                      >
                        {companyBranding.subtitle}
                      </p>
                      <div className="mt-4 p-3 rounded border border-opacity-20">
                        <p className="text-xs opacity-75">Sample Product</p>
                        <p className="font-medium">Purple Push Pop</p>
                        <Badge 
                          className="mt-1"
                          style={{ 
                            backgroundColor: selectedTheme.id === 'custom' ? customTheme.accentColor : selectedTheme.accentColor,
                            color: '#000'
                          }}
                        >
                          $850/lb
                        </Badge>
                      </div>
                      <div className="mt-4 text-xs space-y-1 opacity-75">
                        <p>{companyBranding.contactInfo.phone}</p>
                        <p>{companyBranding.contactInfo.email}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="inventory" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Current Available Inventory
              </CardTitle>
              <CardDescription>
                Items with current stock quantities from Shopify sync
              </CardDescription>
            </CardHeader>
            <CardContent>
              {itemsLoading ? (
                <div className="text-center py-8">Loading inventory data...</div>
              ) : availableItems.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No items with available quantities found
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 font-medium">Strain</th>
                        <th className="text-left py-3 px-4 font-medium">Available</th>
                        <th className="text-left py-3 px-4 font-medium">Tier</th>
                        <th className="text-left py-3 px-4 font-medium">Bulk Price</th>
                        <th className="text-left py-3 px-4 font-medium">Distro 25lbs+</th>
                        <th className="text-left py-3 px-4 font-medium">Master 50lbs+</th>
                      </tr>
                    </thead>
                    <tbody>
                      {availableItems.map((item, index) => (
                        <tr key={index} className="border-b hover:bg-muted/50">
                          <td className="py-3 px-4 font-medium">{item.strain}</td>
                          <td className="py-3 px-4">
                            <Badge variant="secondary" className="font-mono">
                              {item.amount} lbs
                            </Badge>
                          </td>
                          <td className="py-3 px-4">
                            <Badge variant={
                              item.tier.includes('TOP SHELF') ? 'default' :
                              item.tier.includes('EXOTIC') ? 'destructive' :
                              item.tier.includes('AAA') ? 'secondary' :
                              'outline'
                            }>
                              {item.tier}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-green-600 font-medium">{item.bulk}</td>
                          <td className="py-3 px-4 text-blue-600">{item.distro25}</td>
                          <td className="py-3 px-4 text-purple-600">{item.master50}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}