import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, CheckCircle, Loader2, LogIn } from "lucide-react";

export default function BypassLogin() {
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Automatic login on page load
  useEffect(() => {
    handleLogin();
  }, []);

  const handleLogin = async () => {
    setIsLoggingIn(true);
    setError(null);

    try {
      // Create login route that simply bypasses auth
      const response = await fetch('/api/bypass-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        setSuccess(true);
        // Redirect to inventory page after a short delay
        setTimeout(() => {
          window.location.href = '/products-inventory';
        }, 1000);
      } else {
        const data = await response.json();
        setError(data.message || "Login failed. Please try again.");
      }
    } catch (err) {
      setError("Error connecting to server. Please try again.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 to-emerald-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center space-y-2">
          <CardTitle className="text-2xl font-bold text-emerald-600">Gold Standard Inventory</CardTitle>
          <CardDescription>Direct system access - no password needed</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {success ? (
            <div className="p-4 bg-green-50 border border-green-200 rounded-md flex items-center space-x-3">
              <CheckCircle className="text-green-500 h-6 w-6" />
              <div>
                <p className="font-medium text-green-800">Login successful!</p>
                <p className="text-green-600 text-sm">Redirecting to inventory...</p>
              </div>
            </div>
          ) : error ? (
            <div className="p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-800 font-medium">Login Error</p>
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          ) : (
            <div className="text-center py-4">
              {isLoggingIn ? (
                <div className="flex flex-col items-center">
                  <Loader2 className="h-8 w-8 text-emerald-600 animate-spin mb-2" />
                  <p className="text-slate-600">Logging you in automatically...</p>
                </div>
              ) : (
                <p className="text-slate-600">Click the button below to login immediately</p>
              )}
            </div>
          )}

          <Button 
            className="w-full bg-emerald-600 hover:bg-emerald-700"
            onClick={handleLogin}
            disabled={isLoggingIn || success}
          >
            {isLoggingIn ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Logging in...
              </>
            ) : success ? (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                Success!
              </>
            ) : (
              <>
                <LogIn className="mr-2 h-4 w-4" />
                Login to Inventory
              </>
            )}
          </Button>
          
          {!isLoggingIn && !success && (
            <div className="text-center mt-4">
              <p className="text-sm text-slate-500">
                This login bypasses all authentication checks
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}