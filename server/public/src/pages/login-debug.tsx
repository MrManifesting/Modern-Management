import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export default function LoginDebug() {
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin123");
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setResponse(null);

    try {
      // Direct fetch to test the API call
      const res = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      setResponse(data);

      if (data.success && data.user) {
        // Simple timeout to show success before redirect
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
          <CardTitle className="text-2xl font-bold text-center text-blue-600">Login Debug</CardTitle>
          <CardDescription className="text-center">This page directly tests the login API</CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="username" className="text-sm font-medium">Username</label>
              <Input 
                id="username"
                value={username} 
                onChange={(e) => setUsername(e.target.value)} 
                placeholder="Username" 
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">Password</label>
              <Input 
                id="password"
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                placeholder="Password" 
                disabled={isLoading}
              />
            </div>
            
            {error && (
              <div className="p-3 bg-red-100 border border-red-300 text-red-800 rounded">
                {error}
              </div>
            )}

            {response && (
              <div className="p-3 bg-gray-100 border border-gray-300 rounded">
                <pre className="text-xs overflow-auto max-h-40">
                  {JSON.stringify(response, null, 2)}
                </pre>
              </div>
            )}
          </CardContent>
          <CardFooter>
            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Logging in...
                </>
              ) : "Login"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}