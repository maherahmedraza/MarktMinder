import type { Metadata, Viewport } from 'next';
import { Sora, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/lib/auth';
import { SocketProvider } from '@/providers/SocketProvider';
import { Toaster } from 'sonner';
import CookieConsent from '@/components/CookieConsent';
import { ThemeProvider } from '@/components/ThemeProvider';
import Script from 'next/script';

const sora = Sora({
    subsets: ['latin'],
    variable: '--font-sora',
    display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
    subsets: ['latin'],
    variable: '--font-jetbrains',
    display: 'swap',
});

export const viewport: Viewport = {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 5,
    themeColor: [
        { media: '(prefers-color-scheme: light)', color: '#FFFFFF' },
        { media: '(prefers-color-scheme: dark)', color: '#0D0F1A' },
    ],
};

export const metadata: Metadata = {
    title: {
        default: 'MarktMinder - Price Tracker for Amazon, Etsy & Otto',
        template: '%s | MarktMinder',
    },
    description: 'Track product prices across Amazon, Etsy, and Otto.de. Get AI-powered predictions and instant alerts when prices drop to your target.',
    keywords: ['price tracker', 'amazon', 'etsy', 'otto', 'price history', 'deals', 'price alert', 'germany', 'preisvergleich'],
    authors: [{ name: 'MarktMinder' }],
    creator: 'MarktMinder',
    publisher: 'MarktMinder',
    manifest: '/manifest.json',
    appleWebApp: {
        capable: true,
        statusBarStyle: 'black-translucent',
        title: 'MarktMinder',
    },
    formatDetection: {
        telephone: false,
    },
    openGraph: {
        type: 'website',
        locale: 'de_DE',
        url: 'https://marktminder.de',
        siteName: 'MarktMinder',
        title: 'MarktMinder - Never Miss a Price Drop Again',
        description: 'Track prices across Amazon, Etsy, and Otto. Get instant alerts and AI predictions.',
        images: [
            {
                url: '/og-image.png',
                width: 1200,
                height: 630,
                alt: 'MarktMinder - Price Tracker',
            },
        ],
    },
    twitter: {
        card: 'summary_large_image',
        title: 'MarktMinder - Price Tracker',
        description: 'Track prices across Amazon, Etsy, and Otto. Get instant alerts when prices drop!',
        images: ['/og-image.png'],
    },
    robots: {
        index: true,
        follow: true,
        googleBot: {
            index: true,
            follow: true,
            'max-video-preview': -1,
            'max-image-preview': 'large',
            'max-snippet': -1,
        },
    },
    icons: {
        icon: [
            { url: '/icons/icon-32x32.png', sizes: '32x32', type: 'image/png' },
            { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
        ],
        apple: [
            { url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
        ],
    },
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="de" suppressHydrationWarning className={`${sora.variable} ${jetbrainsMono.variable}`}>
            <head>
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
            </head>
            <body className="font-sans antialiased" suppressHydrationWarning>
                <AuthProvider>
                    <SocketProvider>
                        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange={false}>
                            {children}
                            <Toaster
                                position="bottom-right"
                                toastOptions={{
                                    style: {
                                        background: 'var(--color-bg-elevated)',
                                        border: '1px solid var(--color-border-primary)',
                                        color: 'var(--color-text-primary)',
                                    },
                                }}
                            />
                            <CookieConsent />
                        </ThemeProvider>
                    </SocketProvider>
                </AuthProvider>

                {/* Service Worker Registration */}
                <Script id="sw-register" strategy="afterInteractive">
                    {`
                        if ('serviceWorker' in navigator) {
                            window.addEventListener('load', () => {
                                navigator.serviceWorker.register('/sw.js')
                                    .then((reg) => console.log('SW registered:', reg.scope))
                                    .catch((err) => console.log('SW registration failed:', err));
                            });
                        }
                    `}
                </Script>
            </body>
        </html>
    );
}
