import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { 
  Palette, 
  Upload, 
  Download, 
  Eye, 
  RefreshCw, 
  RotateCcw,
  ShoppingCart, 
  FileText, 
  Images,
  ExternalLink,
  Sparkles,
  Zap,
  Cloud
} from 'lucide-react';

interface BrandingConfig {
  companyName: string;
  tagline: string;
  logoUrl: string;
  description: string;
  contactInfo: {
    phone: string;
    email: string;
    website: string;
    address: string;
  };
}

interface MenuTheme {
  id: string;
  name: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
  };
  backgroundImage?: string;
  backgroundGradient?: string;
}

const defaultThemes: MenuTheme[] = [
  {
    id: 'gold-standard',
    name: 'Gold Standard',
    colors: {
      primary: '#D4AF37',
      secondary: '#228B22',
      accent: '#FFD700',
      background: '#1A1A1A',
      text: '#FFFFFF'
    },
    backgroundGradient: 'linear-gradient(135deg, #1A1A1A 0%, #2D2D2D 100%)'
  },
  {
    id: 'cannabis-green',
    name: 'Cannabis Green',
    colors: {
      primary: '#4CAF50',
      secondary: '#2E7D32',
      accent: '#8BC34A',
      background: '#0F1419',
      text: '#E8F5E8'
    },
    backgroundGradient: 'linear-gradient(135deg, #0F1419 0%, #1B5E20 100%)'
  },
  {
    id: 'purple-haze',
    name: 'Purple Haze',
    colors: {
      primary: '#9C27B0',
      secondary: '#673AB7',
      accent: '#E1BEE7',
      background: '#1A0033',
      text: '#F3E5F5'
    },
    backgroundGradient: 'linear-gradient(135deg, #1A0033 0%, #4A148C 100%)'
  },
  {
    id: 'sunset-orange',
    name: 'Sunset Orange',
    colors: {
      primary: '#FF6B35',
      secondary: '#FF8E53',
      accent: '#FFA726',
      background: '#2E1065',
      text: '#FFF3E0'
    },
    backgroundGradient: 'linear-gradient(135deg, #2E1065 0%, #FF6B35 100%)'
  },
  {
    id: 'ice-blue',
    name: 'Ice Blue',
    colors: {
      primary: '#2196F3',
      secondary: '#1976D2',
      accent: '#64B5F6',
      background: '#0D1421',
      text: '#E3F2FD'
    },
    backgroundGradient: 'linear-gradient(135deg, #0D1421 0%, #1565C0 100%)'
  }
];

export default function MenuGenerator() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [selectedTheme, setSelectedTheme] = useState<MenuTheme>(defaultThemes[0]);
  const [customBackground, setCustomBackground] = useState('');
  const [branding, setBranding] = useState<BrandingConfig>({
    companyName: 'Gold Standard CBD',
    tagline: 'Premium Cannabis Products',
    logoUrl: '',
    description: 'Premium quality cannabis products for wholesale and distribution.',
    contactInfo: {
      phone: '541-295-8811',
      email: 'kaya@goldcbd.com',
      website: 'goldcbd.com',
      address: 'Contact for location'
    }
  });
  
  const [generatedMenuUrl, setGeneratedMenuUrl] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  // Fetch current inventory for menu generation
  const { data: inventory } = useQuery({
    queryKey: ['/api/inventory/enhanced'],
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  const generateMenu = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/generate-white-label-menu', {
        theme: selectedTheme,
        branding,
        customBackground,
        includeLinks: {
          coa: true,
          media: true,
          store: true
        }
      });
      return response;
    },
    onSuccess: (data: any) => {
      const menuUrl = data?.menuUrl || data?.url || null;
      if (menuUrl) {
        setGeneratedMenuUrl(menuUrl);
      }
      toast({
        title: "Menu Generated Successfully",
        description: "Your customized menu is ready to view and share."
      });
    },
    onError: (error) => {
      toast({
        title: "Generation Failed",
        description: "Failed to generate menu. Please try again.",
        variant: "destructive"
      });
    }
  });

  const uploadLogo = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('logo', file);
      const response = await fetch('/api/upload-logo', {
        method: 'POST',
        body: formData
      });
      return response.json();
    },
    onSuccess: (data) => {
      setBranding(prev => ({ ...prev, logoUrl: data.logoUrl }));
      toast({
        title: "Logo Uploaded",
        description: "Your logo has been uploaded successfully."
      });
    }
  });

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      uploadLogo.mutate(file);
    }
  };

  const previewMenu = () => {
    if (generatedMenuUrl) {
      window.open(generatedMenuUrl, '_blank');
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">White Label Menu Generator</h1>
        <p className="text-muted-foreground">
          Create customizable product menus with COA links, media downloads, and direct store purchase links
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <Tabs defaultValue="branding" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="branding">Branding</TabsTrigger>
              <TabsTrigger value="theme">Theme</TabsTrigger>
              <TabsTrigger value="advanced">Advanced</TabsTrigger>
            </TabsList>

            <TabsContent value="branding" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5" />
                    Brand Information
                  </CardTitle>
                  <CardDescription>
                    Customize your brand identity and contact information
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="companyName">Company Name</Label>
                      <Input
                        id="companyName"
                        value={branding.companyName}
                        onChange={(e) => setBranding(prev => ({ ...prev, companyName: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="tagline">Tagline</Label>
                      <Input
                        id="tagline"
                        value={branding.tagline}
                        onChange={(e) => setBranding(prev => ({ ...prev, tagline: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={branding.description}
                      onChange={(e) => setBranding(prev => ({ ...prev, description: e.target.value }))}
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label htmlFor="logo">Logo Upload</Label>
                    <div className="flex items-center gap-4 mt-2">
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="flex-1"
                      />
                      <Button size="sm" disabled={uploadLogo.isPending}>
                        <Upload className="h-4 w-4 mr-2" />
                        {uploadLogo.isPending ? 'Uploading...' : 'Upload'}
                      </Button>
                    </div>
                    {branding.logoUrl && (
                      <div className="mt-2">
                        <img src={branding.logoUrl} alt="Logo" className="h-12 w-auto" />
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        value={branding.contactInfo.phone}
                        onChange={(e) => setBranding(prev => ({ 
                          ...prev, 
                          contactInfo: { ...prev.contactInfo, phone: e.target.value }
                        }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        value={branding.contactInfo.email}
                        onChange={(e) => setBranding(prev => ({ 
                          ...prev, 
                          contactInfo: { ...prev.contactInfo, email: e.target.value }
                        }))}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="website">Website</Label>
                      <Input
                        id="website"
                        value={branding.contactInfo.website}
                        onChange={(e) => setBranding(prev => ({ 
                          ...prev, 
                          contactInfo: { ...prev.contactInfo, website: e.target.value }
                        }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="address">Address</Label>
                      <Input
                        id="address"
                        value={branding.contactInfo.address}
                        onChange={(e) => setBranding(prev => ({ 
                          ...prev, 
                          contactInfo: { ...prev.contactInfo, address: e.target.value }
                        }))}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="theme" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Palette className="h-5 w-5" />
                    Theme Selection
                  </CardTitle>
                  <CardDescription>
                    Choose a pre-made theme or customize your own
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 gap-4">
                    {defaultThemes.map((theme) => (
                      <div
                        key={theme.id}
                        className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                          selectedTheme.id === theme.id ? 'border-primary' : 'border-muted'
                        }`}
                        onClick={() => setSelectedTheme(theme)}
                        style={{ background: theme.backgroundGradient }}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-semibold" style={{ color: theme.colors.text }}>
                              {theme.name}
                            </h3>
                            <div className="flex gap-2 mt-2">
                              <div
                                className="w-4 h-4 rounded-full border"
                                style={{ backgroundColor: theme.colors.primary }}
                              />
                              <div
                                className="w-4 h-4 rounded-full border"
                                style={{ backgroundColor: theme.colors.secondary }}
                              />
                              <div
                                className="w-4 h-4 rounded-full border"
                                style={{ backgroundColor: theme.colors.accent }}
                              />
                            </div>
                          </div>
                          {selectedTheme.id === theme.id && (
                            <Badge variant="secondary">Selected</Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="advanced" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    Advanced Customization
                  </CardTitle>
                  <CardDescription>
                    Custom background images and additional styling options
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="customBackground">Custom Background Image URL</Label>
                    <Input
                      id="customBackground"
                      value={customBackground}
                      onChange={(e) => setCustomBackground(e.target.value)}
                      placeholder="https://example.com/background.jpg"
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      Leave empty to use theme gradient background
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Menu Generation</CardTitle>
              <CardDescription>
                Generate your customized menu with real-time Shopify inventory
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div>
                  <p className="font-semibold">Current Inventory</p>
                  <p className="text-sm text-muted-foreground">
                    {Array.isArray(inventory) ? inventory.length : (inventory?.products?.length || 0)} products available
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/shopify/bulk-query/execute'] })}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-2">
                <p className="font-semibold">Menu Features:</p>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm">
                    <FileText className="h-4 w-4 text-green-500" />
                    COA Certificate Links
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Images className="h-4 w-4 text-blue-500" />
                    Media Download Links
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <ShoppingCart className="h-4 w-4 text-purple-500" />
                    Direct Store Purchase Links
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <ExternalLink className="h-4 w-4 text-orange-500" />
                    Real-time Shopify Sync
                  </div>
                </div>
              </div>

              <Separator />

              <Button
                onClick={() => generateMenu.mutate()}
                disabled={generateMenu.isPending}
                className="w-full"
                size="lg"
              >
                {generateMenu.isPending ? (
                  <>
                    <RotateCcw className="h-4 w-4 mr-2 animate-spin" />
                    Generating Menu...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate Menu
                  </>
                )}
              </Button>

              {generatedMenuUrl && (
                <div className="space-y-2">
                  <Button
                    onClick={previewMenu}
                    variant="outline"
                    className="w-full"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Preview Menu
                  </Button>
                  <Button
                    onClick={() => {
                      navigator.clipboard.writeText(generatedMenuUrl);
                      toast({ title: "Copied!", description: "Menu URL copied to clipboard" });
                    }}
                    variant="secondary"
                    className="w-full"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Copy Menu URL
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Preview</CardTitle>
              <CardDescription>
                Live preview of your menu theme
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div 
                className="p-6 rounded-lg border-2 min-h-[200px] relative overflow-hidden"
                style={{ 
                  background: customBackground ? `url(${customBackground})` : selectedTheme.backgroundGradient,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                }}
              >
                {customBackground && (
                  <div className="absolute inset-0 bg-black/40" />
                )}
                <div className="relative z-10">
                  {branding.logoUrl && (
                    <img src={branding.logoUrl} alt="Logo" className="h-8 w-auto mb-4" />
                  )}
                  <h2 
                    className="text-2xl font-bold mb-2"
                    style={{ color: selectedTheme.colors.text }}
                  >
                    {branding.companyName}
                  </h2>
                  <p 
                    className="text-lg mb-4"
                    style={{ color: selectedTheme.colors.accent }}
                  >
                    {branding.tagline}
                  </p>
                  <div className="flex gap-2">
                    <div 
                      className="px-3 py-1 rounded text-sm"
                      style={{ 
                        backgroundColor: selectedTheme.colors.primary,
                        color: selectedTheme.colors.background
                      }}
                    >
                      COA
                    </div>
                    <div 
                      className="px-3 py-1 rounded text-sm"
                      style={{ 
                        backgroundColor: selectedTheme.colors.secondary,
                        color: selectedTheme.colors.text
                      }}
                    >
                      Media
                    </div>
                    <div 
                      className="px-3 py-1 rounded text-sm"
                      style={{ 
                        backgroundColor: selectedTheme.colors.accent,
                        color: selectedTheme.colors.background
                      }}
                    >
                      Buy Now
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}