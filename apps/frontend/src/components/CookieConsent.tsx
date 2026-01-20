'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { X, Cookie, Shield, Settings } from 'lucide-react';

interface ConsentSettings {
    necessary: boolean;
    analytics: boolean;
    marketing: boolean;
    preferences: boolean;
}

const CONSENT_STORAGE_KEY = 'marktminder_gdpr_consent';
const CONSENT_VERSION = '1.0';

export default function CookieConsent() {
    const [mounted, setMounted] = useState(false);
    const [isVisible, setIsVisible] = useState(false);
    const [showDetails, setShowDetails] = useState(false);
    const [settings, setSettings] = useState<ConsentSettings>({
        necessary: true, // Always true, cannot be disabled
        analytics: false,
        marketing: false,
        preferences: false,
    });

    useEffect(() => {
        setMounted(true);

        // Check if user has already consented
        const stored = localStorage.getItem(CONSENT_STORAGE_KEY);
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                if (parsed.version === CONSENT_VERSION) {
                    // Consent already given
                    return;
                }
            } catch (e) {
                // Invalid stored consent, show banner
            }
        }
        // Show consent banner
        setIsVisible(true);
    }, []);

    function handleAcceptAll() {
        const consent: ConsentSettings = {
            necessary: true,
            analytics: true,
            marketing: true,
            preferences: true,
        };
        saveConsent(consent);
    }

    function handleAcceptNecessary() {
        const consent: ConsentSettings = {
            necessary: true,
            analytics: false,
            marketing: false,
            preferences: false,
        };
        saveConsent(consent);
    }

    function handleSaveSettings() {
        saveConsent(settings);
    }

    function saveConsent(consent: ConsentSettings) {
        const data = {
            version: CONSENT_VERSION,
            consent,
            timestamp: new Date().toISOString(),
        };
        localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(data));
        setIsVisible(false);

        // Emit event for analytics to pick up
        window.dispatchEvent(new CustomEvent('gdpr-consent-updated', { detail: consent }));
    }

    // Don't render on server or before hydration
    if (!mounted || !isVisible) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-end justify-center p-4 sm:items-center">
            {/* Backdrop */}
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />

            {/* Modal */}
            <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-primary-800 to-primary-700 px-6 py-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                            <Cookie className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white">Cookie-Einstellungen</h2>
                            <p className="text-primary-100 text-sm">Wir respektieren Ihre Privatsphäre</p>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto max-h-[60vh]">
                    <p className="text-gray-600 mb-4">
                        Wir verwenden Cookies und ähnliche Technologien, um Ihnen ein optimales Nutzungserlebnis zu bieten.
                        Einige Cookies sind technisch notwendig, während andere uns helfen, unsere Website zu verbessern und
                        Ihnen personalisierte Inhalte anzuzeigen.
                    </p>

                    {/* Quick Info */}
                    <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                        <Shield className="w-5 h-5 text-blue-600 flex-shrink-0" />
                        <p className="text-sm text-blue-800">
                            Ihre Daten werden gemäß der <strong>DSGVO</strong> und des <strong>TTDSG</strong> verarbeitet.
                            Sie können Ihre Einstellungen jederzeit ändern.
                        </p>
                    </div>

                    {/* Detailed Settings */}
                    {showDetails && (
                        <div className="space-y-4 mb-6">
                            <CookieCategory
                                title="Notwendige Cookies"
                                description="Diese Cookies sind für die Grundfunktionen der Website erforderlich und können nicht deaktiviert werden."
                                checked={settings.necessary}
                                disabled={true}
                                onChange={() => { }}
                            />
                            <CookieCategory
                                title="Analyse-Cookies"
                                description="Helfen uns zu verstehen, wie Besucher unsere Website nutzen. Alle Daten werden anonymisiert."
                                checked={settings.analytics}
                                onChange={(checked) => setSettings({ ...settings, analytics: checked })}
                            />
                            <CookieCategory
                                title="Marketing-Cookies"
                                description="Werden verwendet, um Ihnen relevante Werbung zu zeigen. Diese teilen wir mit Dritten."
                                checked={settings.marketing}
                                onChange={(checked) => setSettings({ ...settings, marketing: checked })}
                            />
                            <CookieCategory
                                title="Präferenz-Cookies"
                                description="Speichern Ihre Einstellungen und Präferenzen für ein besseres Nutzungserlebnis."
                                checked={settings.preferences}
                                onChange={(checked) => setSettings({ ...settings, preferences: checked })}
                            />
                        </div>
                    )}

                    {/* Links */}
                    <div className="flex flex-wrap gap-4 text-sm">
                        <Link href="/privacy" className="text-primary-600 hover:underline">
                            Datenschutzerklärung
                        </Link>
                        <Link href="/impressum" className="text-primary-600 hover:underline">
                            Impressum
                        </Link>
                        <Link href="/terms" className="text-primary-600 hover:underline">
                            AGB
                        </Link>
                    </div>
                </div>

                {/* Footer */}
                <div className="border-t border-gray-200 bg-gray-50 px-6 py-4">
                    <div className="flex flex-col sm:flex-row gap-3">
                        {!showDetails ? (
                            <>
                                <button
                                    onClick={() => setShowDetails(true)}
                                    className="flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
                                >
                                    <Settings className="w-4 h-4" />
                                    Einstellungen
                                </button>
                                <button
                                    onClick={handleAcceptNecessary}
                                    className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
                                >
                                    Nur Notwendige
                                </button>
                                <button
                                    onClick={handleAcceptAll}
                                    className="flex-1 px-4 py-2.5 bg-primary-800 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
                                >
                                    Alle akzeptieren
                                </button>
                            </>
                        ) : (
                            <>
                                <button
                                    onClick={() => setShowDetails(false)}
                                    className="px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
                                >
                                    Zurück
                                </button>
                                <button
                                    onClick={handleAcceptNecessary}
                                    className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
                                >
                                    Nur Notwendige
                                </button>
                                <button
                                    onClick={handleSaveSettings}
                                    className="flex-1 px-4 py-2.5 bg-primary-800 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
                                >
                                    Auswahl speichern
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function CookieCategory({
    title,
    description,
    checked,
    disabled,
    onChange,
}: {
    title: string;
    description: string;
    checked: boolean;
    disabled?: boolean;
    onChange: (checked: boolean) => void;
}) {
    return (
        <label className={`flex items-start gap-4 p-4 border rounded-lg cursor-pointer transition-colors ${disabled ? 'bg-gray-50 border-gray-200' : 'bg-white border-gray-200 hover:border-primary-300'
            }`}>
            <input
                type="checkbox"
                checked={checked}
                disabled={disabled}
                onChange={(e) => onChange(e.target.checked)}
                className="mt-1 w-5 h-5 text-primary-600 rounded focus:ring-primary-500 disabled:opacity-50"
            />
            <div className="flex-1">
                <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">{title}</span>
                    {disabled && (
                        <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded">Erforderlich</span>
                    )}
                </div>
                <p className="text-sm text-gray-500 mt-1">{description}</p>
            </div>
        </label>
    );
}

// Export utility to check consent status
export function getConsentSettings(): ConsentSettings | null {
    if (typeof window === 'undefined') return null;

    const stored = localStorage.getItem(CONSENT_STORAGE_KEY);
    if (!stored) return null;

    try {
        const parsed = JSON.parse(stored);
        if (parsed.version === CONSENT_VERSION) {
            return parsed.consent;
        }
    } catch (e) {
        return null;
    }
    return null;
}

// Export utility to reset consent (for settings page)
export function resetConsent() {
    if (typeof window !== 'undefined') {
        localStorage.removeItem(CONSENT_STORAGE_KEY);
        window.location.reload();
    }
}
