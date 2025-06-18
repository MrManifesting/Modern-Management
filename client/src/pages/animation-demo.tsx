import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton, CardSkeleton, TableSkeleton, LeafLoadingAnimation, InventoryItemSkeleton, DashboardLoadingSkeleton } from "@/components/ui/skeleton-loader";
import { LoadingOverlay, PageLoading, ButtonLoading, InlineLoading } from "@/components/ui/loading-overlay";
import { LeafLoader, LeafLoadingPattern, LeafLoadingRing, FallingLeaves } from "@/components/ui/leaf-loader";
import { motion } from "framer-motion";

export default function AnimationDemo() {
  const [isLoading, setIsLoading] = useState(false);
  const [activeDemo, setActiveDemo] = useState<string | null>(null);
  
  const handleLoadingDemo = (demoName: string) => {
    setActiveDemo(demoName);
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setActiveDemo(null);
    }, 3000);
  };
  
  return (
    <div className="container py-8 space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">Leaf Animation Components</h1>
        <p className="text-muted-foreground">Playful loading skeleton with leaf animations for Gold-Standard_Management</p>
      </header>
      
      <Tabs defaultValue="loaders">
        <TabsList className="grid w-full md:w-auto grid-cols-1 md:grid-cols-4">
          <TabsTrigger value="loaders">Leaf Loaders</TabsTrigger>
          <TabsTrigger value="skeletons">Skeleton Loaders</TabsTrigger>
          <TabsTrigger value="overlays">Loading Overlays</TabsTrigger>
          <TabsTrigger value="special">Special Animations</TabsTrigger>
        </TabsList>
        
        <TabsContent value="loaders" className="space-y-6 mt-6">
          <h2 className="text-xl font-semibold">Basic Leaf Loaders</h2>
          <p className="text-muted-foreground">Simple leaf-shaped loading indicators with various animations</p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Spinner</CardTitle>
              </CardHeader>
              <CardContent className="flex justify-center">
                <LeafLoader variant="spinner" size={60} message="Loading..." />
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Pulse</CardTitle>
              </CardHeader>
              <CardContent className="flex justify-center">
                <LeafLoader variant="pulse" size={60} message="Loading..." />
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Grow</CardTitle>
              </CardHeader>
              <CardContent className="flex justify-center">
                <LeafLoader variant="grow" size={60} message="Loading..." />
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Bounce</CardTitle>
              </CardHeader>
              <CardContent className="flex justify-center">
                <LeafLoader variant="bounce" size={60} message="Loading..." />
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Wave</CardTitle>
              </CardHeader>
              <CardContent className="flex justify-center">
                <LeafLoader variant="wave" size={60} message="Loading..." />
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Flower</CardTitle>
              </CardHeader>
              <CardContent className="flex justify-center">
                <LeafLoader variant="flower" size={60} message="Loading..." />
              </CardContent>
            </Card>
          </div>
          
          <h2 className="text-xl font-semibold mt-8">Advanced Leaf Animations</h2>
          <p className="text-muted-foreground">More complex loading patterns with multiple animated leaves</p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Leaf Pattern</CardTitle>
              </CardHeader>
              <CardContent className="flex justify-center">
                <LeafLoadingPattern message="Loading inventory..." />
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Leaf Ring</CardTitle>
              </CardHeader>
              <CardContent className="flex justify-center">
                <LeafLoadingRing message="Synchronizing..." />
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Falling Leaves</CardTitle>
              </CardHeader>
              <CardContent className="flex justify-center h-40">
                <div className="flex flex-col items-center">
                  <FallingLeaves count={12} />
                  <p className="text-sm text-muted-foreground mt-4">Processing data...</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="skeletons" className="space-y-6 mt-6">
          <h2 className="text-xl font-semibold">Skeleton Components</h2>
          <p className="text-muted-foreground">Placeholder loading states for various UI components</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Basic Skeletons</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <h3 className="text-sm font-medium">Rectangle</h3>
                <Skeleton height={20} className="mb-4" />
                
                <h3 className="text-sm font-medium">Circle</h3>
                <Skeleton shape="circle" width={50} height={50} className="mb-4" />
                
                <h3 className="text-sm font-medium">Leaf Shape</h3>
                <Skeleton shape="leaf" width={60} height={60} />
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Card Skeleton</CardTitle>
              </CardHeader>
              <CardContent>
                <CardSkeleton />
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Inventory Item</CardTitle>
              </CardHeader>
              <CardContent>
                <InventoryItemSkeleton />
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Table Skeleton</CardTitle>
              </CardHeader>
              <CardContent>
                <TableSkeleton rows={3} />
              </CardContent>
            </Card>
          </div>
          
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Dashboard Skeleton</CardTitle>
            </CardHeader>
            <CardContent>
              <DashboardLoadingSkeleton />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="overlays" className="space-y-6 mt-6">
          <h2 className="text-xl font-semibold">Loading Overlays</h2>
          <p className="text-muted-foreground">Loading states with overlays and transitions</p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Partial Overlay</CardTitle>
                <Button 
                  size="sm" 
                  onClick={() => handleLoadingDemo("partial")}
                  disabled={isLoading && activeDemo === "partial"}
                >
                  {isLoading && activeDemo === "partial" ? (
                    <>
                      <ButtonLoading className="mr-2" />
                      Loading...
                    </>
                  ) : (
                    "Show Demo"
                  )}
                </Button>
              </CardHeader>
              <CardContent className="h-60 relative">
                <LoadingOverlay 
                  isLoading={isLoading && activeDemo === "partial"} 
                  message="Loading content..." 
                  variant="partial"
                  animation="pattern"
                >
                  <div className="space-y-3">
                    <h3>Card Content</h3>
                    <p>This content will be overlaid with a loading animation.</p>
                    <p>The overlay will only cover this card.</p>
                  </div>
                </LoadingOverlay>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Ring Animation</CardTitle>
                <Button 
                  size="sm" 
                  onClick={() => handleLoadingDemo("ring")}
                  disabled={isLoading && activeDemo === "ring"}
                >
                  {isLoading && activeDemo === "ring" ? (
                    <>
                      <ButtonLoading className="mr-2" />
                      Loading...
                    </>
                  ) : (
                    "Show Demo"
                  )}
                </Button>
              </CardHeader>
              <CardContent className="h-60 relative">
                <LoadingOverlay 
                  isLoading={isLoading && activeDemo === "ring"} 
                  message="Processing data..." 
                  variant="partial"
                  animation="ring"
                >
                  <div className="space-y-3">
                    <h3>Card Content</h3>
                    <p>This content will be overlaid with a ring animation.</p>
                  </div>
                </LoadingOverlay>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Falling Leaves</CardTitle>
                <Button 
                  size="sm" 
                  onClick={() => handleLoadingDemo("falling")}
                  disabled={isLoading && activeDemo === "falling"}
                >
                  {isLoading && activeDemo === "falling" ? (
                    <>
                      <ButtonLoading className="mr-2" />
                      Loading...
                    </>
                  ) : (
                    "Show Demo"
                  )}
                </Button>
              </CardHeader>
              <CardContent className="h-60 relative">
                <LoadingOverlay 
                  isLoading={isLoading && activeDemo === "falling"} 
                  message="Updating inventory..." 
                  variant="partial"
                  animation="falling"
                >
                  <div className="space-y-3">
                    <h3>Card Content</h3>
                    <p>This content will be overlaid with falling leaves animation.</p>
                  </div>
                </LoadingOverlay>
              </CardContent>
            </Card>
          </div>
          
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Full Page Loading</CardTitle>
              <Button 
                size="sm" 
                onClick={() => handleLoadingDemo("page")}
                disabled={isLoading && activeDemo === "page"}
              >
                {isLoading && activeDemo === "page" ? (
                  <>
                    <ButtonLoading className="mr-2" />
                    Loading...
                  </>
                ) : (
                  "Show Demo"
                )}
              </Button>
            </CardHeader>
            <CardContent>
              {isLoading && activeDemo === "page" && (
                <PageLoading message="Loading page content..." animation="pattern" />
              )}
              <p>Click the button above to show a full-page loading overlay.</p>
            </CardContent>
          </Card>
          
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Inline Loading States</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-4">
                <InlineLoading message="Loading inventory items..." />
                <InlineLoading message="Connecting to marketplace..." />
                <InlineLoading message="Synchronizing data..." />
              </div>
              
              <div className="flex gap-4 mt-6">
                <Button disabled className="flex items-center gap-2">
                  <ButtonLoading size={18} />
                  <span>Loading...</span>
                </Button>
                
                <Button variant="outline" disabled className="flex items-center gap-2">
                  <ButtonLoading size={18} />
                  <span>Processing...</span>
                </Button>
                
                <Button variant="secondary" disabled className="flex items-center gap-2">
                  <ButtonLoading size={18} />
                  <span>Saving...</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="special" className="space-y-6 mt-6">
          <h2 className="text-xl font-semibold">Special Animation Patterns</h2>
          <p className="text-muted-foreground">More complex and specialized loading animations</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Loading Animation</CardTitle>
              </CardHeader>
              <CardContent className="min-h-60 flex items-center justify-center">
                <LeafLoadingAnimation />
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Dynamic Color Variants</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div className="flex flex-col items-center">
                    <LeafLoader color="primary" size={40} />
                    <p className="text-xs mt-2">Primary</p>
                  </div>
                  <div className="flex flex-col items-center">
                    <LeafLoader color="secondary" size={40} />
                    <p className="text-xs mt-2">Secondary</p>
                  </div>
                  <div className="flex flex-col items-center">
                    <LeafLoader color="accent" size={40} />
                    <p className="text-xs mt-2">Accent</p>
                  </div>
                  <div className="flex flex-col items-center">
                    <LeafLoader color="success" size={40} />
                    <p className="text-xs mt-2">Success</p>
                  </div>
                  <div className="flex flex-col items-center">
                    <LeafLoader color="warning" size={40} />
                    <p className="text-xs mt-2">Warning</p>
                  </div>
                  <div className="flex flex-col items-center">
                    <LeafLoader color="danger" size={40} />
                    <p className="text-xs mt-2">Danger</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Custom Animation Examples</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Growth animation */}
                <div className="flex flex-col items-center">
                  <div className="h-40 flex items-center justify-center">
                    <motion.div
                      animate={{
                        scale: [0, 1.1, 1],
                        opacity: [0, 1, 1],
                        y: [50, 0, 0],
                      }}
                      transition={{
                        duration: 3,
                        repeat: Infinity,
                        repeatDelay: 1,
                      }}
                      className="relative"
                    >
                      <svg
                        width="60"
                        height="120"
                        viewBox="0 0 60 120"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        {/* Stem */}
                        <motion.path
                          d="M30,120 L30,60"
                          stroke="currentColor"
                          strokeWidth="4"
                          className="text-green-500"
                          strokeLinecap="round"
                          animate={{
                            pathLength: [0, 1],
                          }}
                          transition={{
                            duration: 2,
                            repeat: Infinity,
                            repeatDelay: 2,
                          }}
                        />
                        
                        {/* Leaf */}
                        <motion.path
                          d="M30,60 C30,60 10,70 10,90 C10,105 20,115 30,120 C40,115 50,105 50,90 C50,70 30,60 30,60 Z"
                          className="fill-primary/70"
                          animate={{
                            scale: [0.5, 1],
                            opacity: [0.2, 1],
                          }}
                          transition={{
                            duration: 2,
                            repeat: Infinity,
                            repeatDelay: 2,
                            delay: 1,
                          }}
                        />
                      </svg>
                    </motion.div>
                  </div>
                  <p className="text-sm text-muted-foreground">Growth Animation</p>
                </div>
                
                {/* Wave animation */}
                <div className="flex flex-col items-center">
                  <div className="h-40 flex items-end justify-center">
                    <div className="flex items-end h-28 gap-2">
                      {[0, 1, 2, 3, 4].map((i) => (
                        <motion.div
                          key={i}
                          animate={{
                            y: [-10, 0, -10],
                          }}
                          transition={{
                            duration: 1.5,
                            repeat: Infinity,
                            delay: i * 0.2,
                          }}
                          className="w-8 h-40 flex items-end"
                        >
                          <svg
                            viewBox="0 0 100 100"
                            className="w-8 h-12 text-primary/70"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              className="fill-current"
                              d="M50,0 C50,0 20,20 20,50 C20,75 35,90 50,100 C65,90 80,75 80,50 C80,20 50,0 50,0 Z"
                            />
                          </svg>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">Wave Animation</p>
                </div>
                
                {/* Circle animation */}
                <div className="flex flex-col items-center">
                  <div className="h-40 flex items-center justify-center">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{
                        duration: 8,
                        repeat: Infinity,
                        ease: "linear",
                      }}
                      className="relative w-32 h-32"
                    >
                      {[0, 60, 120, 180, 240, 300].map((angle, i) => (
                        <motion.div
                          key={i}
                          className="absolute"
                          style={{
                            transformOrigin: "center",
                            rotate: `${angle}deg`,
                            left: "50%",
                            top: "50%",
                          }}
                          animate={{
                            scale: [1, 1.2, 1],
                          }}
                          transition={{
                            duration: 2,
                            repeat: Infinity,
                            delay: i * 0.3,
                          }}
                        >
                          <svg
                            viewBox="0 0 100 100"
                            className="w-8 h-8 text-primary/70 -translate-x-1/2 -translate-y-1/2"
                            style={{ translate: "0 -60px" }}
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              className="fill-current"
                              d="M50,0 C50,0 20,20 20,50 C20,75 35,90 50,100 C65,90 80,75 80,50 C80,20 50,0 50,0 Z"
                            />
                          </svg>
                        </motion.div>
                      ))}
                    </motion.div>
                  </div>
                  <p className="text-sm text-muted-foreground">Orbital Animation</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}