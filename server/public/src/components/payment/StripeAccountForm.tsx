import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import { CreditCard, CheckCircle, AlertCircle, ExternalLink } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface StripeAccountFormProps {
  affiliateId: number;
  onAccountConnected?: () => void;
}

export function StripeAccountForm({ affiliateId, onAccountConnected }: StripeAccountFormProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [status, setStatus] = useState<{
    hasStripeAccount: boolean;
    isOnboardingComplete: boolean;
  }>({ hasStripeAccount: false, isOnboardingComplete: false });

  useEffect(() => {
    if (affiliateId) {
      checkStripeStatus();
    }
  }, [affiliateId]);

  const checkStripeStatus = async () => {
    try {
      setLoading(true);
      const response = await apiRequest(
        "GET",
        `/api/affiliates/${affiliateId}/stripe-status`
      );
      const data = await response.json();

      if (data.success) {
        setStatus(data.data);
        
        // Notify parent if account is fully connected
        if (data.data.hasStripeAccount && data.data.isOnboardingComplete && onAccountConnected) {
          onAccountConnected();
        }
      } else {
        throw new Error(data.message || "Failed to check Stripe status");
      }
    } catch (error) {
      console.error("Error checking Stripe status:", error);
      toast({
        title: "Error",
        description: "Failed to check payment account status. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createStripeAccount = async () => {
    try {
      setCreating(true);
      const response = await apiRequest(
        "POST",
        `/api/affiliates/${affiliateId}/stripe-account`
      );
      const data = await response.json();

      if (data.success) {
        toast({
          title: "Account Created",
          description: "Your payment account has been created. Please complete the onboarding process.",
        });
        
        // Refresh status
        await checkStripeStatus();
      } else {
        throw new Error(data.message || "Failed to create Stripe account");
      }
    } catch (error) {
      console.error("Error creating Stripe account:", error);
      toast({
        title: "Error",
        description: "Failed to create payment account. Please try again.",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const startOnboarding = async () => {
    try {
      setCreating(true);
      const response = await apiRequest(
        "POST",
        `/api/affiliates/${affiliateId}/onboarding-link`
      );
      const data = await response.json();

      if (data.success && data.data.url) {
        // Open the onboarding URL in a new tab
        window.open(data.data.url, "_blank");
        
        toast({
          title: "Onboarding Started",
          description: "Please complete the onboarding process in the new tab.",
        });
      } else {
        throw new Error(data.message || "Failed to generate onboarding link");
      }
    } catch (error) {
      console.error("Error starting onboarding:", error);
      toast({
        title: "Error",
        description: "Failed to start onboarding process. Please try again.",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const openStripeDashboard = async () => {
    try {
      setCreating(true);
      const response = await apiRequest(
        "GET",
        `/api/affiliates/${affiliateId}/stripe-login`
      );
      const data = await response.json();

      if (data.success && data.data.url) {
        // Open the Stripe dashboard in a new tab
        window.open(data.data.url, "_blank");
      } else {
        throw new Error(data.message || "Failed to generate login link");
      }
    } catch (error) {
      console.error("Error opening Stripe dashboard:", error);
      toast({
        title: "Error",
        description: "Failed to open payment dashboard. Please try again.",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
        <CardFooter>
          <Skeleton className="h-10 w-full" />
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Stripe Connect
          </span>
          {status.hasStripeAccount && (
            <Badge variant={status.isOnboardingComplete ? "default" : "outline"} 
                   className={status.isOnboardingComplete ? "bg-green-500 hover:bg-green-600" : ""}>
              {status.isOnboardingComplete ? "Connected" : "Setup Needed"}
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Connect your Stripe account to receive commission payouts
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!status.hasStripeAccount ? (
          <div className="flex flex-col items-center justify-center gap-3 py-4">
            <AlertCircle className="h-12 w-12 text-amber-500" />
            <p className="text-center text-sm">
              You need to connect a Stripe account to receive commission payouts.
            </p>
          </div>
        ) : !status.isOnboardingComplete ? (
          <div className="flex flex-col items-center justify-center gap-3 py-4">
            <AlertCircle className="h-12 w-12 text-amber-500" />
            <p className="text-center text-sm">
              Your Stripe account is connected, but you need to complete the onboarding process.
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-3 py-4">
            <CheckCircle className="h-12 w-12 text-green-500" />
            <p className="text-center text-sm">
              Your Stripe account is fully connected and ready to receive payouts.
            </p>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-center">
        {!status.hasStripeAccount ? (
          <Button
            onClick={createStripeAccount}
            disabled={creating}
            className="w-full"
          >
            {creating ? "Creating Account..." : "Connect Stripe Account"}
          </Button>
        ) : !status.isOnboardingComplete ? (
          <Button
            onClick={startOnboarding}
            disabled={creating}
            className="w-full"
          >
            {creating ? "Loading..." : "Complete Onboarding"}
          </Button>
        ) : (
          <Button
            onClick={openStripeDashboard}
            variant="outline"
            className="w-full flex items-center gap-2"
          >
            <ExternalLink className="h-4 w-4" />
            Open Stripe Dashboard
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}