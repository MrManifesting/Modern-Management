import React from 'react';
import MainLayout from '@/components/layout/main-layout';
import ImageOptimizer from '@/components/inventory/image-optimizer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

const ImageOptimizationPage = () => {
  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6">Image Optimization</h1>

      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle>SEO Image Optimization</CardTitle>
          <CardDescription>
            Optimize your product images for faster loading and better SEO performance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-4 border rounded-lg bg-blue-50">
                <div className="font-semibold text-lg mb-2 text-blue-700">Bulk Image Compression</div>
                <p className="text-sm text-gray-600">
                  Optimize multiple images at once to reduce file sizes by up to 70% without losing quality. Smaller images mean faster page loads and better SEO rankings.
                </p>
              </div>
              
              <div className="p-4 border rounded-lg bg-green-50">
                <div className="font-semibold text-lg mb-2 text-green-700">AI-Generated Alt Text</div>
                <p className="text-sm text-gray-600">
                  Our system automatically generates SEO-friendly alt text for your images using advanced AI. Improve accessibility and help search engines understand your images.
                </p>
              </div>
              
              <div className="p-4 border rounded-lg bg-purple-50">
                <div className="font-semibold text-lg mb-2 text-purple-700">Lazy Loading Support</div>
                <p className="text-sm text-gray-600">
                  Generate optimized images with lazy loading support. Images load only when they come into view, improving initial page load times and user experience.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="optimize" className="space-y-4">
        <TabsList>
          <TabsTrigger value="optimize">Optimize Images</TabsTrigger>
          <TabsTrigger value="analyze">SEO Analysis</TabsTrigger>
          <TabsTrigger value="bulk">Bulk Processing</TabsTrigger>
        </TabsList>
        
        <TabsContent value="optimize" className="space-y-4">
          <ImageOptimizer />
        </TabsContent>
        
        <TabsContent value="analyze" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Image SEO Analysis</CardTitle>
              <CardDescription>
                Upload your existing images to analyze their SEO potential
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-10">
                <p className="text-gray-500">Image SEO Analysis feature coming soon!</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="bulk" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Bulk Image Processing</CardTitle>
              <CardDescription>
                Process and optimize multiple images at once
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-10">
                <p className="text-gray-500">Bulk processing feature coming soon!</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Separator className="my-8" />

      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Why Image Optimization Matters</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Better User Experience</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                Faster loading images lead to a better user experience. Users are more likely to stay on your site and engage with your content when images load quickly and smoothly.
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Higher Search Rankings</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                Search engines like Google factor page speed into their ranking algorithms. Optimized images help your site load faster, potentially boosting your search rankings.
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Lower Bandwidth Costs</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                Optimized images consume less bandwidth, reducing your hosting costs. This is especially important for high-traffic sites with many product images.
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Improved Accessibility</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                Proper alt text makes your images accessible to users with visual impairments who use screen readers. This broadens your audience and improves your site's accessibility compliance.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ImageOptimizationPage;