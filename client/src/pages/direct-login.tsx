import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export default function DirectLogin() {
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleDirectLogin = async () => {
    setIsLoading(true);
    setError(null);
    setResponse(null);

    try {
      // Use our force-login endpoint for direct access
      const res = await fetch("/api/force-login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        // No body needed - server handles everything
        body: JSON.stringify({}),
      });

      const data = await res.json();
      setResponse(data);

      if (data.success && data.user) {
        // Display success message before redirecting
        setTimeout(() => {
          window.location.href = "/products-inventory";
        }, 1000);
      } else {
        setError("Login failed: " + (data.message || "Unknown error"));
      }
    } catch (err: any) {
      setError("Login request failed: " + (err?.message || "Unknown error"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-950 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center text-blue-600">Direct Login</CardTitle>
          <CardDescription className="text-center">Click the button below to log in immediately</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="p-3 bg-red-100 border border-red-300 text-red-800 rounded">
              {error}
            </div>
          )}

          {response && response.success && (
            <div className="p-3 bg-green-100 border border-green-300 text-green-800 rounded">
              <p className="mb-2 font-medium">Login successful!</p>
              <p>Redirecting to inventory in a moment...</p>
            </div>
          )}
        </CardContent>
        <CardFooter>
          <Button 
            className="w-full bg-blue-600 hover:bg-blue-700"
            onClick={handleDirectLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Logging in...
              </>
            ) : "Log in as Admin"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}