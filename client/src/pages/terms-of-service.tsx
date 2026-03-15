import { Link } from "wouter";
import { Package, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function TermsOfServicePage() {
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
            <Link href="/privacy-policy">
              <span className="text-sm text-gray-400 hover:text-yellow-400 transition-colors cursor-pointer">Privacy</span>
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
          Terms of Service
        </h1>
        <p className="text-gray-500 mb-10">Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>

        <div className="prose prose-invert prose-yellow max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">1. Acceptance of Terms</h2>
            <p className="text-gray-400 leading-relaxed">
              By accessing or using the Gold Standard Management inventory management platform (the "Service"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, you may not access or use the Service. These Terms apply to all users, including administrators, employees, and affiliates.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">2. Description of Service</h2>
            <p className="text-gray-400 leading-relaxed">
              Gold Standard Management provides a comprehensive inventory management platform that includes product tracking, marketplace integrations (including Shopify), AI-powered analytics, barcode and QR code generation, order management, payment processing, affiliate management, and reporting tools. The Service is available through web and mobile applications.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">3. Account Registration</h2>
            <p className="text-gray-400 leading-relaxed">
              To use the Service, you must create an account by providing accurate and complete information. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You must immediately notify us of any unauthorized use of your account.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">4. Acceptable Use</h2>
            <p className="text-gray-400 leading-relaxed mb-3">You agree not to:</p>
            <ul className="list-disc list-inside text-gray-400 space-y-2">
              <li>Use the Service for any unlawful purpose or in violation of any applicable laws</li>
              <li>Upload malicious code, viruses, or harmful content</li>
              <li>Attempt to gain unauthorized access to the Service or its systems</li>
              <li>Interfere with or disrupt the integrity or performance of the Service</li>
              <li>Reverse engineer, decompile, or disassemble any aspect of the Service</li>
              <li>Use the Service to process or store data that violates third-party rights</li>
              <li>Exceed reasonable usage limits or abuse API endpoints</li>
              <li>Share your account credentials with unauthorized individuals</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">5. Marketplace Integrations</h2>
            <p className="text-gray-400 leading-relaxed">
              When you connect third-party marketplaces (such as Shopify) to our Service, you authorize us to access and modify data on those platforms on your behalf. You are responsible for ensuring that your use of our Service complies with the terms of service of any connected marketplace. We are not responsible for any changes, disruptions, or data loss on third-party platforms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">6. Payment Processing</h2>
            <p className="text-gray-400 leading-relaxed">
              Payment processing is handled through third-party providers (PayPal and Stripe). By using payment features, you agree to the terms of service and privacy policies of those payment processors. We are not responsible for payment processing errors or disputes between you and payment providers.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">7. AI-Powered Features</h2>
            <p className="text-gray-400 leading-relaxed">
              Our Service uses artificial intelligence (via OpenAI and Google Cloud Vision) for product analysis, description generation, and image recognition. AI-generated content is provided as suggestions and may not always be accurate. You are responsible for reviewing and approving any AI-generated content before use. Data sent to AI services is subject to their respective privacy policies.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">8. Intellectual Property</h2>
            <p className="text-gray-400 leading-relaxed">
              The Service, including its design, code, features, and documentation, is the property of Gold Standard Management and is protected by intellectual property laws. You retain ownership of all data you input into the Service. By using the Service, you grant us a limited license to process, display, and store your data solely to provide the Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">9. Affiliate Program</h2>
            <p className="text-gray-400 leading-relaxed">
              If you participate in our affiliate program, you agree to the affiliate commission structure as defined within the Service. Commission rates, payment terms, and eligibility criteria may be modified at our discretion with reasonable notice. Fraudulent affiliate activity will result in account termination and forfeiture of unpaid commissions.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">10. Data and Backups</h2>
            <p className="text-gray-400 leading-relaxed">
              While we take reasonable measures to protect your data, you are responsible for maintaining your own backups. We provide export features (CSV, Google Sheets) to help you back up your data regularly. We are not liable for any data loss resulting from system failures, security breaches, or other unforeseen events.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">11. Limitation of Liability</h2>
            <p className="text-gray-400 leading-relaxed">
              To the maximum extent permitted by law, Gold Standard Management shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to loss of profits, data, business opportunities, or goodwill, arising out of or related to your use of the Service. Our total liability shall not exceed the amount you paid for the Service in the twelve months preceding the claim.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">12. Disclaimer of Warranties</h2>
            <p className="text-gray-400 leading-relaxed">
              The Service is provided "as is" and "as available" without warranties of any kind, either express or implied, including but not limited to implied warranties of merchantability, fitness for a particular purpose, and non-infringement. We do not warrant that the Service will be uninterrupted, error-free, or completely secure.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">13. Termination</h2>
            <p className="text-gray-400 leading-relaxed">
              We may suspend or terminate your access to the Service at any time for violation of these Terms or for any other reason with reasonable notice. You may terminate your account at any time through the Service settings. Upon termination, your right to use the Service ceases immediately, but provisions that by their nature should survive will remain in effect.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">14. Changes to Terms</h2>
            <p className="text-gray-400 leading-relaxed">
              We reserve the right to modify these Terms at any time. We will notify you of material changes by posting the updated Terms on this page and updating the "Last updated" date. Your continued use of the Service after changes take effect constitutes acceptance of the revised Terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">15. Governing Law</h2>
            <p className="text-gray-400 leading-relaxed">
              These Terms shall be governed by and construed in accordance with applicable laws, without regard to conflict of law principles. Any disputes arising from these Terms or your use of the Service shall be resolved through binding arbitration or in the courts of competent jurisdiction.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">16. Contact</h2>
            <p className="text-gray-400 leading-relaxed">
              If you have any questions about these Terms, please contact us through the application's settings page or reach out to our support team.
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
              <Link href="/privacy-policy">
                <span className="hover:text-yellow-400 transition-colors cursor-pointer">Privacy Policy</span>
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
