import { Link } from "wouter";
import { Package, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 text-white">
      <nav className="border-b border-yellow-500/20 bg-gray-950/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <Link href="/marketing">
            <div className="flex items-center gap-3 cursor-pointer">
              <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-lg flex items-center justify-center">
                <Package className="h-6 w-6 text-gray-900" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-yellow-400 to-yellow-200 bg-clip-text text-transparent">
                Gold Standard Management
              </span>
            </div>
          </Link>
          <div className="flex items-center gap-4">
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

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Link href="/marketing">
          <Button variant="ghost" className="text-yellow-400 hover:text-yellow-300 mb-6 -ml-4">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Home
          </Button>
        </Link>

        <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-yellow-400 to-yellow-200 bg-clip-text text-transparent">
          Privacy Policy
        </h1>
        <p className="text-gray-500 mb-10">Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>

        <div className="prose prose-invert prose-yellow max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">1. Introduction</h2>
            <p className="text-gray-400 leading-relaxed">
              Gold Standard Management ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our inventory management platform, including our web application and mobile applications (collectively, the "Service").
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">2. Information We Collect</h2>
            <h3 className="text-lg font-medium text-yellow-400 mt-4 mb-2">Personal Information</h3>
            <p className="text-gray-400 leading-relaxed">
              When you create an account, we may collect your name, email address, and authentication credentials. If you sign in through Google or Replit OAuth, we receive basic profile information from those providers.
            </p>
            <h3 className="text-lg font-medium text-yellow-400 mt-4 mb-2">Business Information</h3>
            <p className="text-gray-400 leading-relaxed">
              We collect inventory data, product information, sales records, customer data, and marketplace integration details that you input into the Service. This includes Shopify store data, product descriptions, pricing, and order information.
            </p>
            <h3 className="text-lg font-medium text-yellow-400 mt-4 mb-2">Usage Information</h3>
            <p className="text-gray-400 leading-relaxed">
              We automatically collect information about how you interact with our Service, including access times, pages viewed, features used, and device information such as browser type, operating system, and IP address.
            </p>
            <h3 className="text-lg font-medium text-yellow-400 mt-4 mb-2">Images and Media</h3>
            <p className="text-gray-400 leading-relaxed">
              If you use our image analysis or barcode scanning features, we may process images you upload. Images processed through AI features (such as Google Vision or OpenAI) are sent to those third-party services for analysis.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">3. How We Use Your Information</h2>
            <ul className="list-disc list-inside text-gray-400 space-y-2">
              <li>To provide, maintain, and improve our inventory management Service</li>
              <li>To process transactions and manage your account</li>
              <li>To sync inventory data with connected marketplaces (e.g., Shopify)</li>
              <li>To generate AI-powered product descriptions and analytics</li>
              <li>To produce reports and export data to Google Sheets</li>
              <li>To send service-related notifications via email (SendGrid)</li>
              <li>To process payments through PayPal and Stripe</li>
              <li>To manage affiliate programs and commission tracking</li>
              <li>To detect and prevent fraud or unauthorized access</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">4. Third-Party Services</h2>
            <p className="text-gray-400 leading-relaxed mb-4">
              We integrate with the following third-party services to provide our features. Each service has its own privacy policy governing their use of your data:
            </p>
            <ul className="list-disc list-inside text-gray-400 space-y-2">
              <li><strong className="text-gray-300">Shopify</strong> — Product, order, and inventory synchronization</li>
              <li><strong className="text-gray-300">OpenAI</strong> — AI-powered product analysis and content generation</li>
              <li><strong className="text-gray-300">Google Cloud Vision</strong> — Image analysis and OCR processing</li>
              <li><strong className="text-gray-300">Google Sheets</strong> — Automated report generation</li>
              <li><strong className="text-gray-300">PayPal & Stripe</strong> — Payment processing</li>
              <li><strong className="text-gray-300">SendGrid</strong> — Email notifications</li>
              <li><strong className="text-gray-300">Google OAuth & Replit OAuth</strong> — Authentication</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">5. Data Storage and Security</h2>
            <p className="text-gray-400 leading-relaxed">
              Your data is stored in a secure PostgreSQL database hosted on Neon. We implement industry-standard security measures including encrypted connections, secure authentication, and regular backups. However, no method of transmission over the Internet is 100% secure, and we cannot guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">6. Data Retention</h2>
            <p className="text-gray-400 leading-relaxed">
              We retain your data for as long as your account is active or as needed to provide the Service. You may request deletion of your account and associated data at any time by contacting us. Some data may be retained as required by law or for legitimate business purposes.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">7. Your Rights</h2>
            <p className="text-gray-400 leading-relaxed">You have the right to:</p>
            <ul className="list-disc list-inside text-gray-400 space-y-2 mt-2">
              <li>Access, correct, or delete your personal information</li>
              <li>Export your inventory and business data</li>
              <li>Opt out of non-essential communications</li>
              <li>Disconnect third-party marketplace integrations</li>
              <li>Request information about how your data is processed</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">8. Children's Privacy</h2>
            <p className="text-gray-400 leading-relaxed">
              Our Service is not intended for use by anyone under the age of 18. We do not knowingly collect personal information from children. If we learn that we have collected data from a child, we will take steps to delete it promptly.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">9. Changes to This Policy</h2>
            <p className="text-gray-400 leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the new policy on this page and updating the "Last updated" date. Your continued use of the Service after changes constitutes acceptance of the updated policy.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">10. Contact Us</h2>
            <p className="text-gray-400 leading-relaxed">
              If you have questions or concerns about this Privacy Policy or our data practices, please contact us through the application's settings page or reach out to our support team.
            </p>
          </section>
        </div>
      </div>

      <footer className="border-t border-gray-800 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-gray-600">
              &copy; {new Date().getFullYear()} Gold Standard Management. All rights reserved.
            </p>
            <div className="flex items-center gap-6 text-sm text-gray-500">
              <Link href="/marketing">
                <span className="hover:text-yellow-400 transition-colors cursor-pointer">Home</span>
              </Link>
              <Link href="/terms-of-service">
                <span className="hover:text-yellow-400 transition-colors cursor-pointer">Terms of Service</span>
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
