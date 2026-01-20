'use client';

import Link from 'next/link';
import { TrendingDown, ArrowLeft, Target, Users, Globe, Mail, Github, Linkedin } from 'lucide-react';

export default function AboutPage() {
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

            {/* Hero */}
            <section className="bg-gradient-to-b from-primary-800 to-primary-900 text-white py-20">
                <div className="container mx-auto px-6 text-center">
                    <h1 className="text-4xl md:text-5xl font-bold mb-6">
                        About MarktMinder
                    </h1>
                    <p className="text-xl text-white/80 max-w-3xl mx-auto">
                        We're on a mission to help you save money by tracking prices across your favorite online marketplaces.
                    </p>
                </div>
            </section>

            {/* Content */}
            <main className="container mx-auto px-6 py-16 max-w-5xl">
                {/* Mission Section */}
                <section className="mb-16">
                    <div className="grid md:grid-cols-2 gap-12 items-center">
                        <div>
                            <div className="inline-flex items-center gap-2 bg-primary-100 text-primary-700 px-4 py-2 rounded-full text-sm font-medium mb-4">
                                <Target className="w-4 h-4" />
                                Our Mission
                            </div>
                            <h2 className="text-3xl font-bold text-gray-900 mb-4">
                                Never Overpay Again
                            </h2>
                            <p className="text-gray-600 mb-4">
                                MarktMinder was born from a simple frustration: prices change constantly,
                                and it's nearly impossible to track them manually across multiple marketplaces.
                            </p>
                            <p className="text-gray-600">
                                We built MarktMinder to automatically monitor prices on Amazon, Etsy, and Otto,
                                alerting you when prices drop so you can buy at the perfect moment.
                            </p>
                        </div>
                        <div className="bg-gradient-to-br from-primary-100 to-primary-200 rounded-2xl p-8 flex items-center justify-center">
                            <div className="text-center">
                                <div className="text-5xl font-bold text-primary-800 mb-2">€2.3M+</div>
                                <div className="text-primary-700">Saved by our users</div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* How It Works */}
                <section className="mb-16">
                    <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">How It Works</h2>
                    <div className="grid md:grid-cols-3 gap-8">
                        <div className="text-center">
                            <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                <span className="text-2xl font-bold text-primary-800">1</span>
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">Add Products</h3>
                            <p className="text-gray-600">
                                Paste any product URL from Amazon, Etsy, or Otto. We'll start tracking it immediately.
                            </p>
                        </div>
                        <div className="text-center">
                            <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                <span className="text-2xl font-bold text-primary-800">2</span>
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">We Monitor Prices</h3>
                            <p className="text-gray-600">
                                Our system checks prices multiple times daily and builds a complete price history.
                            </p>
                        </div>
                        <div className="text-center">
                            <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                <span className="text-2xl font-bold text-primary-800">3</span>
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">Get Alerts</h3>
                            <p className="text-gray-600">
                                Set your target price and we'll notify you instantly when it drops below your threshold.
                            </p>
                        </div>
                    </div>
                </section>

                {/* Stats */}
                <section className="mb-16 bg-white rounded-2xl border border-gray-200 p-8">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
                        <div>
                            <div className="text-3xl font-bold text-gray-900 mb-1">50K+</div>
                            <div className="text-gray-500">Products Tracked</div>
                        </div>
                        <div>
                            <div className="text-3xl font-bold text-gray-900 mb-1">10K+</div>
                            <div className="text-gray-500">Happy Users</div>
                        </div>
                        <div>
                            <div className="text-3xl font-bold text-gray-900 mb-1">3</div>
                            <div className="text-gray-500">Marketplaces</div>
                        </div>
                        <div>
                            <div className="text-3xl font-bold text-gray-900 mb-1">24/7</div>
                            <div className="text-gray-500">Price Monitoring</div>
                        </div>
                    </div>
                </section>

                {/* Team Section */}
                <section className="mb-16">
                    <div className="text-center mb-12">
                        <div className="inline-flex items-center gap-2 bg-primary-100 text-primary-700 px-4 py-2 rounded-full text-sm font-medium mb-4">
                            <Users className="w-4 h-4" />
                            The Team
                        </div>
                        <h2 className="text-3xl font-bold text-gray-900">Built by Developers, For Shoppers</h2>
                    </div>
                    <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center max-w-lg mx-auto">
                        <div className="w-20 h-20 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full mx-auto mb-4 flex items-center justify-center">
                            <span className="text-2xl font-bold text-white">MM</span>
                        </div>
                        <h3 className="text-xl font-semibold text-gray-900 mb-1">MarktMinder Team</h3>
                        <p className="text-gray-500 mb-4">Germany</p>
                        <p className="text-gray-600 mb-6">
                            A small team of developers passionate about helping people save money through smart technology.
                        </p>
                        <div className="flex justify-center gap-4">
                            <a href="#" className="text-gray-400 hover:text-gray-600 transition-colors">
                                <Github className="w-5 h-5" />
                            </a>
                            <a href="#" className="text-gray-400 hover:text-gray-600 transition-colors">
                                <Linkedin className="w-5 h-5" />
                            </a>
                            <a href="mailto:hello@marktminder.de" className="text-gray-400 hover:text-gray-600 transition-colors">
                                <Mail className="w-5 h-5" />
                            </a>
                        </div>
                    </div>
                </section>

                {/* Contact */}
                <section className="text-center">
                    <div className="inline-flex items-center gap-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-full text-sm font-medium mb-4">
                        <Globe className="w-4 h-4" />
                        Made in Germany
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">Have Questions?</h2>
                    <p className="text-gray-600 mb-6">
                        We'd love to hear from you. Reach out anytime.
                    </p>
                    <Link
                        href="/contact"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-primary-800 text-white rounded-xl font-semibold hover:bg-primary-700 transition-colors"
                    >
                        <Mail className="w-5 h-5" />
                        Contact Us
                    </Link>
                </section>
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
