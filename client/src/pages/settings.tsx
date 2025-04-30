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
import { Sun, Moon, LifeBuoy, Settings2, RotateCcw, BellRing, Eye, Headphones, Keyboard, Sparkles } from 'lucide-react';

const SettingsPage = () => {
  const { theme, setTheme } = useTheme();

  return (
    <div className="container max-w-6xl mx-auto py-6 space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Settings</h1>
        <p className="text-muted-foreground">Manage your application preferences and accessibility options</p>
      </div>

      <Tabs defaultValue="appearance">
        <TabsList className="mb-4">
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
          <TabsTrigger value="accessibility">Accessibility</TabsTrigger>
          <TabsTrigger value="account">Account</TabsTrigger>
        </TabsList>

        <TabsContent value="appearance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Theme Settings</CardTitle>
              <CardDescription>
                Customize how Gold-Standard-Inventory looks and feels
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
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="accessibility" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Accessibility Settings</CardTitle>
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
          <Card>
            <CardHeader>
              <CardTitle>Account Settings</CardTitle>
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
                <Button variant="outline">Edit Profile</Button>
                <Button>Change Password</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SettingsPage;