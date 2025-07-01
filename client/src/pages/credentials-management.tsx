import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Shield, Key, Trash2, Eye, EyeOff, Calendar, CheckCircle2, AlertCircle, Plus } from "lucide-react";

interface SavedCredential {
  id: number;
  service: string;
  name: string;
  isActive: boolean;
  lastUsed?: string;
  createdAt: string;
  hasCredentials: boolean;
}

export default function CredentialsManagement() {
  const { toast } = useToast();
  const [newCredDialog, setNewCredDialog] = useState(false);
  const [selectedService, setSelectedService] = useState<string>("");
  const [credentialName, setCredentialName] = useState("");
  const [credentialData, setCredentialData] = useState("");
  const [showCredentials, setShowCredentials] = useState<{[key: string]: boolean}>({});

  // Fetch saved credentials
  const { data: credentials = [], isLoading } = useQuery<SavedCredential[]>({
    queryKey: ["/api/credentials"],
  });

  // Save credentials mutation
  const saveCredentialMutation = useMutation({
    mutationFn: async ({ service, name, credentials }: { service: string; name: string; credentials: any }) => {
      const endpoint = service === "google_sheets" ? "/api/credentials/google-sheets" : "/api/credentials/shopify";
      const res = await apiRequest("POST", endpoint, { name, credentials });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Credentials saved successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/credentials"] });
      setNewCredDialog(false);
      setCredentialName("");
      setCredentialData("");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete credential mutation
  const deleteCredentialMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/credentials/${id}`);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Credentials deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/credentials"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Test credentials mutation
  const testCredentialMutation = useMutation({
    mutationFn: async (service: string) => {
      const res = await apiRequest("POST", `/api/credentials/test/${service}`);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Credentials are working correctly",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Test Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSaveCredentials = () => {
    if (!selectedService || !credentialName || !credentialData) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    try {
      const parsedCredentials = JSON.parse(credentialData);
      saveCredentialMutation.mutate({
        service: selectedService,
        name: credentialName,
        credentials: parsedCredentials
      });
    } catch (error) {
      toast({
        title: "Invalid JSON",
        description: "Please enter valid JSON credentials",
        variant: "destructive",
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getServiceDisplayName = (service: string) => {
    switch (service) {
      case 'google_sheets':
        return 'Google Sheets';
      case 'shopify':
        return 'Shopify';
      default:
        return service;
    }
  };

  const getServiceIcon = (service: string) => {
    switch (service) {
      case 'google_sheets':
        return '📊';
      case 'shopify':
        return '🛒';
      default:
        return '🔑';
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Credential Management</h1>
          <p className="text-gray-600 mt-2">Securely store and manage your API credentials</p>
        </div>
        <Dialog open={newCredDialog} onOpenChange={setNewCredDialog}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Credentials
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Credentials</DialogTitle>
              <DialogDescription>
                Save your API credentials securely for future use
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="service">Service</Label>
                <Tabs value={selectedService} onValueChange={setSelectedService} className="mt-2">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="google_sheets">Google Sheets</TabsTrigger>
                    <TabsTrigger value="shopify">Shopify</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
              
              <div>
                <Label htmlFor="name">Credential Name</Label>
                <Input
                  id="name"
                  value={credentialName}
                  onChange={(e) => setCredentialName(e.target.value)}
                  placeholder="e.g., My Google Sheets API Key"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="credentials">Credentials (JSON)</Label>
                <Textarea
                  id="credentials"
                  value={credentialData}
                  onChange={(e) => setCredentialData(e.target.value)}
                  placeholder={selectedService === "google_sheets" 
                    ? '{"type": "service_account", "project_id": "...", "private_key": "...", ...}'
                    : '{"shopName": "your-shop.myshopify.com", "apiKey": "...", "apiSecret": "..."}'
                  }
                  className="mt-1 min-h-[200px] font-mono text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {selectedService === "google_sheets" 
                    ? "Paste your Google Service Account JSON credentials"
                    : "Enter your Shopify API credentials as JSON"
                  }
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setNewCredDialog(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleSaveCredentials}
                  disabled={saveCredentialMutation.isPending}
                >
                  {saveCredentialMutation.isPending ? "Saving..." : "Save Credentials"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {credentials.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Shield className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Credentials Saved</h3>
            <p className="text-gray-600 text-center mb-4">
              Save your API credentials to avoid entering them every time you use integrations.
            </p>
            <Button onClick={() => setNewCredDialog(true)}>
              Add Your First Credentials
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {credentials.map((credential) => (
            <Card key={credential.id} className={`transition-all ${credential.isActive ? 'border-green-200 bg-green-50' : 'border-gray-200'}`}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{getServiceIcon(credential.service)}</span>
                    <div>
                      <CardTitle className="text-lg">{credential.name}</CardTitle>
                      <CardDescription className="flex items-center gap-2">
                        {getServiceDisplayName(credential.service)}
                        {credential.isActive ? (
                          <Badge variant="default" className="bg-green-100 text-green-800">
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => testCredentialMutation.mutate(credential.service)}
                      disabled={testCredentialMutation.isPending}
                    >
                      {testCredentialMutation.isPending ? "Testing..." : "Test"}
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Credentials</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete these credentials? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteCredentialMutation.mutate(credential.id)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      Created {formatDate(credential.createdAt)}
                    </div>
                    {credential.lastUsed && (
                      <div className="flex items-center gap-1">
                        <Key className="h-4 w-4" />
                        Last used {formatDate(credential.lastUsed)}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {credential.hasCredentials ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-yellow-600" />
                    )}
                    <span className="text-xs">
                      {credential.hasCredentials ? "Configured" : "Incomplete"}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Security Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm text-gray-600">
            <p>🔒 All credentials are encrypted using industry-standard encryption before storage</p>
            <p>🔑 Credentials are only decrypted when needed for API operations</p>
            <p>📊 You can test your credentials at any time to ensure they're working</p>
            <p>🗑️ Delete credentials you no longer need to maintain security</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}