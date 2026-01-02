'use client';

import Link from 'next/link';
import { TrendingDown, ArrowLeft } from 'lucide-react';

export default function TermsPage() {
    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-primary-800 text-white py-6">
                <div className="container mx-auto px-6">
                    <div className="flex items-center justify-between">
                        <Link href="/" className="flex items-center gap-2">
                            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
                                <TrendingDown className="w-6 h-6 text-primary-800" />
                            </div>
                            <span className="text-xl font-bold">MarktMinder</span>
                        </Link>
                        <Link href="/" className="flex items-center gap-2 text-white/80 hover:text-white transition-colors">
                            <ArrowLeft className="w-4 h-4" />
                            Back to Home
                        </Link>
                    </div>
                </div>
            </header>

            {/* Content */}
            <main className="container mx-auto px-6 py-12 max-w-4xl">
                <h1 className="text-4xl font-bold text-gray-900 mb-8">Terms of Service</h1>
                <p className="text-gray-500 mb-8">Last updated: January 1, 2026</p>

                <div className="prose prose-lg max-w-none">
                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Acceptance of Terms</h2>
                        <p className="text-gray-600 mb-4">
                            By accessing or using MarktMinder, you agree to be bound by these Terms of Service.
                            If you do not agree to these terms, please do not use our service.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Description of Service</h2>
                        <p className="text-gray-600 mb-4">
                            MarktMinder is a price tracking service that monitors product prices across various online marketplaces
                            including Amazon, Etsy, and Otto.de. We provide price history data and alert notifications when prices change.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. User Accounts</h2>
                        <p className="text-gray-600 mb-4">To use our service, you must:</p>
                        <ul className="list-disc pl-6 text-gray-600 space-y-2">
                            <li>Be at least 18 years old or have parental consent</li>
                            <li>Provide accurate and complete registration information</li>
                            <li>Maintain the security of your account credentials</li>
                            <li>Notify us immediately of any unauthorized use</li>
                        </ul>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Acceptable Use</h2>
                        <p className="text-gray-600 mb-4">You agree not to:</p>
                        <ul className="list-disc pl-6 text-gray-600 space-y-2">
                            <li>Use the service for any illegal purpose</li>
                            <li>Attempt to circumvent security measures</li>
                            <li>Scrape or collect data from our service without permission</li>
                            <li>Interfere with the proper functioning of the service</li>
                            <li>Share your account with others</li>
                        </ul>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Price Data Accuracy</h2>
                        <p className="text-gray-600 mb-4">
                            While we strive to provide accurate price information, we cannot guarantee the accuracy, completeness,
                            or timeliness of all price data. Prices displayed may differ from actual prices on retailer websites.
                            Always verify prices before making purchasing decisions.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Intellectual Property</h2>
                        <p className="text-gray-600 mb-4">
                            All content and materials on MarktMinder, including but not limited to text, graphics, logos, and software,
                            are the property of MarktMinder and are protected by applicable intellectual property laws.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Limitation of Liability</h2>
                        <p className="text-gray-600 mb-4">
                            MarktMinder is provided "as is" without warranties of any kind. We are not liable for any indirect,
                            incidental, special, or consequential damages arising from your use of the service.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Termination</h2>
                        <p className="text-gray-600 mb-4">
                            We reserve the right to suspend or terminate your account at any time for violation of these terms
                            or for any other reason at our sole discretion.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. Governing Law</h2>
                        <p className="text-gray-600 mb-4">
                            These terms are governed by the laws of the Federal Republic of Germany.
                            Any disputes shall be subject to the exclusive jurisdiction of the courts in Germany.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. Contact</h2>
                        <p className="text-gray-600 mb-4">
                            For questions about these terms, contact us at:{' '}
                            <a href="mailto:legal@marktminder.de" className="text-primary-600 hover:text-primary-700">
                                legal@marktminder.de
                            </a>
                        </p>
                    </section>
                </div>
            </main>

            {/* Footer */}
            <footer className="bg-gray-100 border-t border-gray-200 py-8 mt-12">
                <div className="container mx-auto px-6 text-center text-gray-500 text-sm">
                    © 2026 MarktMinder. All rights reserved.
                </div>
            </footer>
        </div>
    );
}
