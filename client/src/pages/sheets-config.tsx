import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Sheet, CheckCircle, AlertCircle, ExternalLink } from "lucide-react";

interface SheetsConfig {
  configured: boolean;
  spreadsheetId?: string;
  message: string;
}

export default function SheetsConfigPage() {
  const { toast } = useToast();
  const [spreadsheetId, setSpreadsheetId] = useState("");

  // Check current Google Sheets configuration
  const { data: config, isLoading } = useQuery<SheetsConfig>({
    queryKey: ["/api/google-sheets/config"],
  });

  // Update configuration mutation
  const updateConfig = useMutation({
    mutationFn: async (newSpreadsheetId: string) => {
      const response = await apiRequest("POST", "/api/google-sheets/config", {
        spreadsheetId: newSpreadsheetId
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Configuration Updated",
        description: "Google Sheets integration configured successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/google-sheets/config"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Configuration Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (spreadsheetId.trim()) {
      updateConfig.mutate(spreadsheetId.trim());
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center p-8">Loading configuration...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Sheet className="h-8 w-8 text-green-600" />
        <div>
          <h1 className="text-3xl font-bold">Google Sheets Configuration</h1>
          <p className="text-muted-foreground">
            Configure your inventory spreadsheet for direct linking
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {config?.configured ? (
              <CheckCircle className="h-5 w-5 text-green-600" />
            ) : (
              <AlertCircle className="h-5 w-5 text-yellow-600" />
            )}
            Spreadsheet Configuration
          </CardTitle>
          <CardDescription>
            Set up your Google Sheets inventory spreadsheet ID for direct item linking
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {config?.configured && config.spreadsheetId && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Currently configured: {config.spreadsheetId}
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="spreadsheetId">Spreadsheet ID</Label>
              <Input
                id="spreadsheetId"
                placeholder="Enter your Google Sheets spreadsheet ID"
                value={spreadsheetId}
                onChange={(e) => setSpreadsheetId(e.target.value)}
                className="font-mono text-sm"
              />
              <p className="text-sm text-muted-foreground">
                Find the ID in your spreadsheet URL: docs.google.com/spreadsheets/d/<span className="font-bold">SPREADSHEET_ID</span>/edit
              </p>
            </div>

            <Button type="submit" disabled={!spreadsheetId.trim() || updateConfig.isPending}>
              {updateConfig.isPending ? "Updating..." : "Update Configuration"}
            </Button>
          </form>

          <div className="border-t pt-4">
            <h3 className="font-medium mb-2">Quick Setup Instructions:</h3>
            <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
              <li>Open your inventory spreadsheet in Google Sheets</li>
              <li>Copy the spreadsheet ID from the URL</li>
              <li>Paste the ID in the field above and click Update</li>
              <li>The "View in Google Sheets" buttons will now link directly to your spreadsheet</li>
            </ol>
          </div>

          {config?.configured && (
            <div className="flex gap-2">
              <Button variant="outline" asChild>
                <a 
                  href={`https://docs.google.com/spreadsheets/d/${config.spreadsheetId}/edit`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  Open Spreadsheet
                </a>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}