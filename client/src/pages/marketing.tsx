import { Link } from "wouter";
import { Package, BarChart3, Globe, Zap, Shield, Users, ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function MarketingPage() {
  const features = [
    {
      icon: <Package className="h-8 w-8 text-yellow-500" />,
      title: "Smart Inventory Tracking",
      description: "Track every item with barcode scanning, SKU management, and real-time quantity updates across all your channels."
    },
    {
      icon: <Globe className="h-8 w-8 text-yellow-500" />,
      title: "Shopify Integration",
      description: "Seamlessly sync products, orders, and inventory with your Shopify store. Automatic webhook processing keeps everything in sync."
    },
    {
      icon: <BarChart3 className="h-8 w-8 text-yellow-500" />,
      title: "Advanced Analytics",
      description: "AI-powered forecasting, sales trends, and customer analytics help you make smarter business decisions."
    },
    {
      icon: <Zap className="h-8 w-8 text-yellow-500" />,
      title: "Bulk Operations",
      description: "Break down bulk items, import via CSV, and manage large inventories efficiently with powerful batch tools."
    },
    {
      icon: <Shield className="h-8 w-8 text-yellow-500" />,
      title: "Secure & Reliable",
      description: "Enterprise-grade security with multi-provider authentication, encrypted data storage, and automated backups."
    },
    {
      icon: <Users className="h-8 w-8 text-yellow-500" />,
      title: "Team Management",
      description: "Employee accounts, role-based access, and affiliate tracking with QR code generation and commission management."
    }
  ];

  const benefits = [
    "Real-time inventory synchronization",
    "AI-powered product descriptions",
    "Barcode & QR code generation",
    "Multi-marketplace support",
    "Automated reporting to Google Sheets",
    "Customer tier management",
    "Mobile app for iOS & Android",
    "GraphQL API for custom integrations"
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 text-white">
      <nav className="border-b border-yellow-500/20 bg-gray-950/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-lg flex items-center justify-center">
              <Package className="h-6 w-6 text-gray-900" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-yellow-400 to-yellow-200 bg-clip-text text-transparent">
              Gold Standard Management
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/privacy-policy">
              <span className="text-sm text-gray-400 hover:text-yellow-400 transition-colors cursor-pointer">Privacy</span>
            </Link>
            <Link href="/terms-of-service">
              <span className="text-sm text-gray-400 hover:text-yellow-400 transition-colors cursor-pointer">Terms</span>
            </Link>
            <Link href="/auth">
              <Button className="bg-yellow-500 hover:bg-yellow-600 text-gray-900 font-semibold">
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32 text-center">
        <div className="inline-flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/30 rounded-full px-4 py-1.5 mb-8">
          <Zap className="h-4 w-4 text-yellow-400" />
          <span className="text-sm text-yellow-300">The Gold Standard in Inventory Management</span>
        </div>
        <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
          Manage Your Inventory
          <br />
          <span className="bg-gradient-to-r from-yellow-400 via-yellow-300 to-yellow-500 bg-clip-text text-transparent">
            Like Never Before
          </span>
        </h1>
        <p className="text-lg md:text-xl text-gray-400 max-w-3xl mx-auto mb-10">
          A comprehensive inventory management system built for modern e-commerce businesses. 
          Track products, sync with Shopify, analyze trends with AI, and grow your business — all from one platform.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/auth">
            <Button size="lg" className="bg-gradient-to-r from-yellow-400 to-yellow-600 hover:from-yellow-500 hover:to-yellow-700 text-gray-900 font-bold text-lg px-8 py-6">
              Get Started Free <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
          <Link href="/catalog">
            <Button size="lg" variant="outline" className="border-yellow-500/40 text-yellow-400 hover:bg-yellow-500/10 text-lg px-8 py-6">
              View Live Catalog
            </Button>
          </Link>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Everything You Need to <span className="text-yellow-400">Scale</span>
          </h2>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Powerful tools designed to streamline your operations and help your business grow.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <Card key={index} className="bg-gray-800/50 border-gray-700/50 hover:border-yellow-500/30 transition-colors">
              <CardContent className="p-6">
                <div className="mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-gray-400">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="bg-gradient-to-r from-yellow-500/10 to-yellow-600/5 border border-yellow-500/20 rounded-2xl p-8 md:p-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-4">Why Choose Gold Standard?</h2>
              <p className="text-gray-400 mb-6">
                Built from the ground up for e-commerce businesses that need reliable, 
                feature-rich inventory management without the complexity.
              </p>
              <Link href="/auth">
                <Button className="bg-yellow-500 hover:bg-yellow-600 text-gray-900 font-semibold">
                  Start Managing Now <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
            <div className="grid grid-cols-1 gap-3">
              {benefits.map((benefit, index) => (
                <div key={index} className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-yellow-400 flex-shrink-0" />
                  <span className="text-gray-300">{benefit}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-gray-800 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-lg flex items-center justify-center">
                <Package className="h-5 w-5 text-gray-900" />
              </div>
              <span className="font-semibold text-gray-300">Gold Standard Management</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-gray-500">
              <Link href="/privacy-policy">
                <span className="hover:text-yellow-400 transition-colors cursor-pointer">Privacy Policy</span>
              </Link>
              <Link href="/terms-of-service">
                <span className="hover:text-yellow-400 transition-colors cursor-pointer">Terms of Service</span>
              </Link>
              <Link href="/marketing">
                <span className="hover:text-yellow-400 transition-colors cursor-pointer">About</span>
              </Link>
            </div>
            <p className="text-sm text-gray-600">
              &copy; {new Date().getFullYear()} Gold Standard Management. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
