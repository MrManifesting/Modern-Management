import React, { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { useTheme } from '@/components/ui/theme-provider';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Sun, Moon, LifeBuoy, Settings2, RotateCcw, BellRing, Eye, Headphones, Keyboard, Sparkles, Store } from 'lucide-react';
import { EditProfileModal } from '@/components/edit-profile-modal';

const SettingsPage = () => {
  const { theme, setTheme } = useTheme();
  const [isLoaded, setIsLoaded] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);

  // Simulate loading state for demonstration
  useEffect(() => {
    // Set the loaded state after a short delay
    const timer = setTimeout(() => {
      setIsLoaded(true);
    }, 300);
    
    return () => clearTimeout(timer);
  }, []);

  if (!isLoaded) {
    return (
      <div className="container max-w-6xl mx-auto py-6 space-y-8 animate-pulse">
        <div className="space-y-2">
          <div className="h-8 w-48 bg-muted rounded"></div>
          <div className="h-4 w-96 bg-muted rounded"></div>
        </div>
        <div className="h-8 w-64 bg-muted rounded"></div>
        <div className="space-y-4">
          <div className="h-48 w-full bg-muted rounded-lg"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-6xl mx-auto py-6 space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2 gold-gradient-text">Settings</h1>
        <p className="text-muted-foreground">Manage your application preferences and accessibility options</p>
      </div>

      <Tabs defaultValue="appearance">
        <TabsList className="mb-4 bg-black/20 dark:bg-black/40 border border-gold/20">
          <TabsTrigger 
            value="appearance" 
            className="border-b-2 border-transparent data-[state=active]:border-gold data-[state=active]:bg-gold/10 data-[state=active]:text-gold">
            Appearance
          </TabsTrigger>
          <TabsTrigger 
            value="accessibility" 
            className="border-b-2 border-transparent data-[state=active]:border-gold data-[state=active]:bg-gold/10 data-[state=active]:text-gold">
            Accessibility
          </TabsTrigger>
          <TabsTrigger 
            value="account" 
            className="border-b-2 border-transparent data-[state=active]:border-gold data-[state=active]:bg-gold/10 data-[state=active]:text-gold">
            Account
          </TabsTrigger>
        </TabsList>

        <TabsContent value="appearance" className="space-y-4">
          <Card className="border-gold/30">
            <CardHeader className="bg-gold/5 border-b border-gold/20">
              <CardTitle className="text-gold">Theme Settings</CardTitle>
              <CardDescription>
                Customize how Gold-Standard_Management looks and feels
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="p-2 rounded-md bg-primary/10 text-primary">
                      {theme === 'dark' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
                    </div>
                    <div>
                      <h3 className="font-medium">Dark Mode</h3>
                      <p className="text-sm text-muted-foreground">
                        Switch between light and dark themes
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={theme === 'dark'}
                    onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="p-2 rounded-md bg-primary/10 text-primary">
                      <Settings2 className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-medium">Sidebar Expanded</h3>
                      <p className="text-sm text-muted-foreground">
                        Keep the sidebar expanded by default
                      </p>
                    </div>
                  </div>
                  <Switch defaultChecked />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="p-2 rounded-md bg-primary/10 text-primary">
                      <RotateCcw className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-medium">Auto-refresh Data</h3>
                      <p className="text-sm text-muted-foreground">
                        Automatically refresh data at regular intervals
                      </p>
                    </div>
                  </div>
                  <Switch />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="p-2 rounded-md bg-primary/10 text-primary">
                      <BellRing className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-medium">Notifications</h3>
                      <p className="text-sm text-muted-foreground">
                        Enable in-app notification alerts
                      </p>
                    </div>
                  </div>
                  <Switch defaultChecked />
                </div>
                
                <Separator />
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="p-2 rounded-md bg-gold/20">
                      <Sparkles className="h-5 w-5 text-gold" />
                    </div>
                    <div>
                      <h3 className="font-medium">Gold Standard Theme</h3>
                      <p className="text-sm text-muted-foreground">
                        Enable the premium Black & Gold theme
                      </p>
                    </div>
                  </div>
                  <Switch defaultChecked />
                </div>
                
                <Separator />
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="p-2 rounded-md bg-gold/20">
                      <Store className="h-5 w-5 text-gold" />
                    </div>
                    <div>
                      <h3 className="font-medium">Shopify Integration</h3>
                      <p className="text-sm text-muted-foreground">
                        Configure Shopify marketplace connection
                      </p>
                    </div>
                  </div>
                  <Button asChild variant="outline" size="sm" className="border-gold/40 text-gold hover:bg-gold/10">
                    <Link href="/shopify-settings">
                      Configure
                    </Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="accessibility" className="space-y-4">
          <Card className="border-gold/30">
            <CardHeader className="bg-gold/5 border-b border-gold/20">
              <CardTitle className="text-gold">Accessibility Settings</CardTitle>
              <CardDescription>
                Make Gold-Standard-Inventory more accessible for your needs
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="p-2 rounded-md bg-primary/10 text-primary">
                      <Eye className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-medium">High Contrast Mode</h3>
                      <p className="text-sm text-muted-foreground">
                        Increase contrast for better readability
                      </p>
                    </div>
                  </div>
                  <Switch />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="p-2 rounded-md bg-primary/10 text-primary">
                      <Headphones className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-medium">Screen Reader Support</h3>
                      <p className="text-sm text-muted-foreground">
                        Optimize for screen readers and text-to-speech tools
                      </p>
                    </div>
                  </div>
                  <Switch defaultChecked />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="p-2 rounded-md bg-primary/10 text-primary">
                      <Keyboard className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-medium">Keyboard Navigation</h3>
                      <p className="text-sm text-muted-foreground">
                        Navigate the app using keyboard shortcuts
                      </p>
                    </div>
                  </div>
                  <Switch defaultChecked />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="p-2 rounded-md bg-primary/10 text-primary">
                      <Headphones className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-medium">Voice Accessibility Settings</h3>
                      <p className="text-sm text-muted-foreground">
                        Configure voice recognition, speech feedback, and accessibility features
                      </p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/voice-accessibility-settings">
                      Configure
                    </Link>
                  </Button>
                </div>
              </div>

              <div className="mt-6 bg-muted p-4 rounded-lg">
                <h3 className="font-medium mb-2 flex items-center">
                  <LifeBuoy className="h-4 w-4 mr-2" />
                  Accessibility Guide
                </h3>
                <div className="space-y-4 text-sm">
                  <p>
                    Gold-Standard-Inventory is designed to be accessible to everyone. Here are some tips to help you navigate:
                  </p>
                  
                  <div>
                    <h4 className="font-medium">Keyboard Shortcuts</h4>
                    <ul className="list-disc pl-5 mt-2 space-y-1">
                      <li><code>Alt + D</code> - Navigate to Dashboard</li>
                      <li><code>Alt + I</code> - Navigate to Inventory</li>
                      <li><code>Alt + S</code> - Navigate to Scanner</li>
                      <li><code>Alt + R</code> - Navigate to Reports</li>
                      <li><code>Alt + /</code> - Open search</li>
                    </ul>
                  </div>
                  
                  <div>
                    <h4 className="font-medium">Voice Commands</h4>
                    <p className="mt-1">
                      Enable dictation in image optimization and product descriptions with the microphone button.
                    </p>
                  </div>
                  
                  <div>
                    <h4 className="font-medium">Screen Reader Tips</h4>
                    <p className="mt-1">
                      All images include alt text, and data tables include proper headers for navigation.
                    </p>
                  </div>
                  
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/accessibility-guide">View Complete Accessibility Guide</Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="account" className="space-y-4">
          <Card className="border-gold/30">
            <CardHeader className="bg-gold/5 border-b border-gold/20">
              <CardTitle className="text-gold">Account Settings</CardTitle>
              <CardDescription>
                Manage your account details and preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h3 className="font-medium">Profile Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="fullname">Full Name</Label>
                    <div className="p-2 border rounded bg-muted">John Smith</div>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="email">Email</Label>
                    <div className="p-2 border rounded bg-muted">john@example.com</div>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="role">Role</Label>
                    <div className="p-2 border rounded bg-muted">Administrator</div>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="lastLogin">Last Login</Label>
                    <div className="p-2 border rounded bg-muted">Today at 10:24 AM</div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-2 mt-4">
                <Button 
                  variant="outline" 
                  className="border-gold hover:bg-gold/10"
                  onClick={() => setIsEditProfileOpen(true)}
                >
                  Edit Profile
                </Button>
                <Button className="bg-gold hover:bg-gold-dark text-black">Change Password</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      <EditProfileModal 
        open={isEditProfileOpen} 
        onOpenChange={setIsEditProfileOpen} 
      />
    </div>
  );
};

export default SettingsPage;