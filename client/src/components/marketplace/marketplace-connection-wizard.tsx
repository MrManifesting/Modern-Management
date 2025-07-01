import { useState } from "react";
import { Check, ChevronRight, Store, Link, Key, Loader2 } from "lucide-react";
import { useMarketplace } from "@/hooks/use-marketplace";
import { useToast } from "@/hooks/use-toast";
import { MARKETPLACE_PLATFORM_DETAILS } from "@/lib/constants";
import { MarketplaceWithUI } from "@/lib/types";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Steps,
  Step,
  StepDescription,
  StepTitle,
} from "@/components/ui/steps";

const ConnectionSteps = {
  SELECT_MARKETPLACE: 0,
  ENTER_CREDENTIALS: 1,
  CONFIRM_CONNECTION: 2,
  CONNECTION_COMPLETE: 3,
};

export function MarketplaceConnectionWizard({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { toast } = useToast();
  const { marketplaces, connectMarketplace, isConnecting } = useMarketplace();
  const [step, setStep] = useState(ConnectionSteps.SELECT_MARKETPLACE);
  const [selectedMarketplace, setSelectedMarketplace] = useState<MarketplaceWithUI | null>(null);
  const [credentials, setCredentials] = useState({
    apiKey: "",
    storeUrl: "",
    secret: "",
  });

  // Handles the marketplace selection
  const handleMarketplaceSelect = (marketplace: MarketplaceWithUI) => {
    setSelectedMarketplace(marketplace);
    setStep(ConnectionSteps.ENTER_CREDENTIALS);
  };

  // Handle credential input changes
  const handleCredentialChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCredentials((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Proceed to confirmation step
  const handleProceedToConfirmation = () => {
    // Validate form fields
    if (!credentials.apiKey) {
      toast({
        title: "API Key Required",
        description: "Please provide an API key to connect to the marketplace.",
        variant: "destructive",
      });
      return;
    }

    if (!credentials.storeUrl && selectedMarketplace?.name === "Shopify") {
      toast({
        title: "Store URL Required",
        description: "Please provide your store URL for Shopify integration.",
        variant: "destructive",
      });
      return;
    }

    setStep(ConnectionSteps.CONFIRM_CONNECTION);
  };

  // Handle the final connection step
  const handleConnectMarketplace = () => {
    if (selectedMarketplace) {
      connectMarketplace(selectedMarketplace.id);
      // After connection is successful, move to completion step
      setStep(ConnectionSteps.CONNECTION_COMPLETE);
    }
  };

  // Close the dialog and reset state
  const handleClose = () => {
    onOpenChange(false);
    // Reset state after dialog closes with a small delay
    setTimeout(() => {
      setStep(ConnectionSteps.SELECT_MARKETPLACE);
      setSelectedMarketplace(null);
      setCredentials({
        apiKey: "",
        storeUrl: "",
        secret: "",
      });
    }, 300);
  };

  const availableMarketplaces = MARKETPLACE_PLATFORM_DETAILS.filter(
    (platform) => !marketplaces.find((m) => m.name === platform.name && m.isConnected)
  );

  // Handle steps back
  const handleBack = () => {
    if (step === ConnectionSteps.ENTER_CREDENTIALS) {
      setStep(ConnectionSteps.SELECT_MARKETPLACE);
    } else if (step === ConnectionSteps.CONFIRM_CONNECTION) {
      setStep(ConnectionSteps.ENTER_CREDENTIALS);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle className="text-2xl">Connect to a Marketplace</DialogTitle>
          <DialogDescription>
            Follow this guide to connect your inventory to your favorite online marketplace.
          </DialogDescription>
        </DialogHeader>

        {/* Progress indicator */}
        <div className="my-4">
          <Steps value={step} className="w-full">
            <Step value={ConnectionSteps.SELECT_MARKETPLACE}>
              <StepTitle>Select</StepTitle>
              <StepDescription>Choose a marketplace</StepDescription>
            </Step>
            <Step value={ConnectionSteps.ENTER_CREDENTIALS}>
              <StepTitle>Connect</StepTitle>
              <StepDescription>Enter API credentials</StepDescription>
            </Step>
            <Step value={ConnectionSteps.CONFIRM_CONNECTION}>
              <StepTitle>Confirm</StepTitle>
              <StepDescription>Verify and connect</StepDescription>
            </Step>
            <Step value={ConnectionSteps.CONNECTION_COMPLETE}>
              <StepTitle>Complete</StepTitle>
              <StepDescription>Ready to use</StepDescription>
            </Step>
          </Steps>
        </div>

        {/* Step Content */}
        <div className="mt-4">
          {/* Step 1: Select Marketplace */}
          {step === ConnectionSteps.SELECT_MARKETPLACE && (
            <div className="grid grid-cols-2 gap-4">
              {availableMarketplaces.length > 0 ? (
                availableMarketplaces.map((platform) => (
                  <Card
                    key={platform.name}
                    className={`cursor-pointer hover:border-blue-400 transition-all ${platform.bgColor}`}
                    onClick={() => handleMarketplaceSelect({
                      ...platform,
                      id: marketplaces.find(m => m.name === platform.name)?.id || -1,
                      isConnected: false,
                      credentials: {},
                    })}
                  >
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">{platform.name}</CardTitle>
                      <CardDescription>
                        Connect to {platform.name} store
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="h-24 flex items-center justify-center">
                      <img
                        src={platform.logo}
                        alt={`${platform.name} logo`}
                        className="max-h-full max-w-full object-contain"
                      />
                    </CardContent>
                    <CardFooter className="pt-1">
                      <Button variant="outline" className="w-full">
                        <ChevronRight className="h-4 w-4 mr-1" /> Select
                      </Button>
                    </CardFooter>
                  </Card>
                ))
              ) : (
                <div className="col-span-2 p-8 text-center">
                  <Store className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                  <h3 className="text-xl font-medium mb-2">All marketplaces connected!</h3>
                  <p className="text-gray-500">
                    You have already connected all available marketplaces.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Enter Credentials */}
          {step === ConnectionSteps.ENTER_CREDENTIALS && selectedMarketplace && (
            <div>
              <div className="mb-6 flex items-center">
                <div className={`w-12 h-12 rounded-full ${selectedMarketplace.bgColor} p-2 mr-4 flex items-center justify-center`}>
                  <img
                    src={selectedMarketplace.logo}
                    alt={`${selectedMarketplace.name} logo`}
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">{selectedMarketplace.name}</h3>
                  <p className="text-sm text-gray-500">
                    Enter your API credentials to connect
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="apiKey">API Key</Label>
                  <Input
                    id="apiKey"
                    name="apiKey"
                    placeholder="Enter your API key"
                    value={credentials.apiKey}
                    onChange={handleCredentialChange}
                  />
                  <p className="text-sm text-gray-500">
                    You can find this in your {selectedMarketplace.name} developer settings
                  </p>
                </div>

                {selectedMarketplace.name === "Shopify" && (
                  <div className="grid gap-2">
                    <Label htmlFor="storeUrl">Store URL</Label>
                    <Input
                      id="storeUrl"
                      name="storeUrl"
                      placeholder="your-store.myshopify.com"
                      value={credentials.storeUrl}
                      onChange={handleCredentialChange}
                    />
                  </div>
                )}

                <div className="grid gap-2">
                  <Label htmlFor="secret">
                    Secret Key {selectedMarketplace.name !== "Shopify" && "(Optional)"}
                  </Label>
                  <Input
                    id="secret"
                    name="secret"
                    type="password"
                    placeholder="Enter your secret key"
                    value={credentials.secret}
                    onChange={handleCredentialChange}
                  />
                </div>

                <div className="bg-blue-50 p-4 rounded-md border border-blue-100">
                  <h4 className="text-sm font-semibold text-blue-700 flex items-center">
                    <Key className="h-4 w-4 mr-2" /> How to get your API credentials
                  </h4>
                  <ol className="text-sm text-blue-600 mt-2 pl-5 list-decimal">
                    <li>Log into your {selectedMarketplace.name} account</li>
                    <li>Navigate to Developer Settings or API section</li>
                    <li>Create a new private app or API key</li>
                    <li>Copy the API key and secret (if provided)</li>
                    <li>Paste them into the fields above</li>
                  </ol>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Confirm Connection */}
          {step === ConnectionSteps.CONFIRM_CONNECTION && selectedMarketplace && (
            <div className="space-y-6">
              <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                <h3 className="text-lg font-semibold mb-4">Connection Summary</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Marketplace:</span>
                    <span className="font-medium">{selectedMarketplace.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">API Key:</span>
                    <span className="font-medium">
                      {credentials.apiKey.substring(0, 4)}...
                      {credentials.apiKey.substring(credentials.apiKey.length - 4)}
                    </span>
                  </div>
                  {credentials.storeUrl && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Store URL:</span>
                      <span className="font-medium">{credentials.storeUrl}</span>
                    </div>
                  )}
                  {credentials.secret && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Secret Key:</span>
                      <span className="font-medium">
                        {credentials.secret.substring(0, 2)}...
                        {credentials.secret.substring(credentials.secret.length - 2)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-blue-50 p-4 rounded-md border border-blue-100">
                <h4 className="text-sm font-medium text-blue-700">
                  What happens next?
                </h4>
                <p className="text-sm text-blue-600 mt-1">
                  We'll establish a connection to your {selectedMarketplace.name} account and start
                  synchronizing your inventory. This process may take a few moments.
                </p>
              </div>
            </div>
          )}

          {/* Step 4: Connection Complete */}
          {step === ConnectionSteps.CONNECTION_COMPLETE && selectedMarketplace && (
            <div className="text-center py-6">
              <div className="bg-green-100 rounded-full h-20 w-20 flex items-center justify-center mx-auto mb-4">
                <Check className="h-10 w-10 text-green-600" />
              </div>
              <h3 className="text-2xl font-semibold mb-2">
                Successfully Connected!
              </h3>
              <p className="text-gray-500 mb-6">
                Your {selectedMarketplace.name} account is now connected and ready to use. You can
                now synchronize your inventory and manage your listings.
              </p>
              <div className="bg-blue-50 p-4 rounded-md border border-blue-100 text-left">
                <h4 className="text-sm font-medium text-blue-700">
                  Next Steps
                </h4>
                <ul className="text-sm text-blue-600 mt-1 space-y-1 pl-5 list-disc">
                  <li>Go to the Marketplace tab to view your connected accounts</li>
                  <li>Synchronize your inventory with {selectedMarketplace.name}</li>
                  <li>Create and manage listings directly from the inventory page</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          {step !== ConnectionSteps.SELECT_MARKETPLACE && step !== ConnectionSteps.CONNECTION_COMPLETE && (
            <Button variant="outline" onClick={handleBack} disabled={isConnecting}>
              Back
            </Button>
          )}
          
          {step === ConnectionSteps.SELECT_MARKETPLACE && (
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
          )}
          
          {step === ConnectionSteps.ENTER_CREDENTIALS && (
            <Button onClick={handleProceedToConfirmation}>
              Continue
            </Button>
          )}
          
          {step === ConnectionSteps.CONFIRM_CONNECTION && (
            <Button 
              onClick={handleConnectMarketplace} 
              disabled={isConnecting}
              className="min-w-[120px]"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Link className="mr-2 h-4 w-4" />
                  Connect
                </>
              )}
            </Button>
          )}
          
          {step === ConnectionSteps.CONNECTION_COMPLETE && (
            <Button onClick={handleClose}>
              Done
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}