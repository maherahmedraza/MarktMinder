'use client';

import Link from 'next/link';
import { TrendingDown, ArrowLeft } from 'lucide-react';

export default function PrivacyPage() {
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
                <h1 className="text-4xl font-bold text-gray-900 mb-8">Privacy Policy</h1>
                <p className="text-gray-500 mb-8">Last updated: January 1, 2026</p>

                <div className="prose prose-lg max-w-none">
                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Introduction</h2>
                        <p className="text-gray-600 mb-4">
                            MarktMinder ("we", "our", or "us") respects your privacy and is committed to protecting your personal data.
                            This privacy policy explains how we collect, use, and safeguard your information when you use our price tracking service.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Data We Collect</h2>
                        <p className="text-gray-600 mb-4">We collect the following types of information:</p>
                        <ul className="list-disc pl-6 text-gray-600 space-y-2">
                            <li><strong>Account Information:</strong> Name, email address, and password when you register</li>
                            <li><strong>Product Data:</strong> URLs and product information you choose to track</li>
                            <li><strong>Usage Data:</strong> How you interact with our service, including pages visited and features used</li>
                            <li><strong>Technical Data:</strong> IP address, browser type, device information, and cookies</li>
                        </ul>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. How We Use Your Data</h2>
                        <p className="text-gray-600 mb-4">Your data is used to:</p>
                        <ul className="list-disc pl-6 text-gray-600 space-y-2">
                            <li>Provide and maintain our price tracking service</li>
                            <li>Send you price alerts and notifications</li>
                            <li>Improve and personalize your experience</li>
                            <li>Communicate important updates about our service</li>
                            <li>Ensure security and prevent fraud</li>
                        </ul>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Data Sharing</h2>
                        <p className="text-gray-600 mb-4">
                            We do not sell your personal data. We may share data with trusted service providers who assist in operating our service,
                            subject to confidentiality agreements. We may also disclose data when required by law.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Your Rights (GDPR)</h2>
                        <p className="text-gray-600 mb-4">Under the General Data Protection Regulation (GDPR), you have the right to:</p>
                        <ul className="list-disc pl-6 text-gray-600 space-y-2">
                            <li>Access your personal data</li>
                            <li>Rectify inaccurate data</li>
                            <li>Request deletion of your data</li>
                            <li>Object to or restrict processing</li>
                            <li>Data portability</li>
                            <li>Withdraw consent at any time</li>
                        </ul>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Data Security</h2>
                        <p className="text-gray-600 mb-4">
                            We implement appropriate technical and organizational measures to protect your personal data against unauthorized access,
                            alteration, disclosure, or destruction. All data is encrypted in transit using TLS/SSL.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Cookies</h2>
                        <p className="text-gray-600 mb-4">
                            We use essential cookies for authentication and functionality. Analytics cookies are only used with your consent.
                            You can manage cookie preferences in your browser settings.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Contact</h2>
                        <p className="text-gray-600 mb-4">
                            For privacy-related inquiries, contact us at:{' '}
                            <a href="mailto:privacy@marktminder.de" className="text-primary-600 hover:text-primary-700">
                                privacy@marktminder.de
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
