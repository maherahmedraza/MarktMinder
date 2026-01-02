import logger from '../logger.js';
import config from '../config.js';

/**
 * ScraperAPI Integration
 * 
 * ScraperAPI handles:
 * - Proxy rotation
 * - CAPTCHA solving
 * - JavaScript rendering
 * - Retries
 * 
 * Free tier: 5,000 API calls/month
 * Get API key: https://www.scraperapi.com/
 */

export interface ScraperApiOptions {
    render?: boolean;        // Enable JavaScript rendering
    country?: string;        // Country code (us, de, uk, etc.)
    premium?: boolean;       // Use premium proxies
    sessionNumber?: number;  // Sticky session for multi-page scraping
}

export class ScraperApiClient {
    private apiKey: string;
    private baseUrl = 'https://api.scraperapi.com';
    private enabled: boolean;

    constructor() {
        this.apiKey = config.scraperApi.apiKey;
        this.enabled = config.scraperApi.enabled && !!this.apiKey;

        if (this.enabled) {
            logger.info('ScraperAPI enabled');
        }
    }

    /**
     * Check if ScraperAPI is available
     */
    isEnabled(): boolean {
        return this.enabled;
    }

    /**
     * Check if should use ScraperAPI for a marketplace
     */
    shouldUseFor(marketplace: string): boolean {
        if (!this.enabled) return false;

        if (marketplace === 'amazon' && config.scraperApi.useForAmazon) {
            return true;
        }

        return false;
    }

    /**
     * Get URL through ScraperAPI
     */
    buildUrl(targetUrl: string, options: ScraperApiOptions = {}): string {
        const params = new URLSearchParams({
            api_key: this.apiKey,
            url: targetUrl,
        });

        if (options.render) {
            params.append('render', 'true');
        }

        if (options.country) {
            params.append('country_code', options.country);
        }

        if (options.premium) {
            params.append('premium', 'true');
        }

        if (options.sessionNumber) {
            params.append('session_number', options.sessionNumber.toString());
        }

        return `${this.baseUrl}/?${params.toString()}`;
    }

    /**
     * Fetch URL content through ScraperAPI
     */
    async fetch(targetUrl: string, options: ScraperApiOptions = {}): Promise<{
        success: boolean;
        html?: string;
        error?: string;
        statusCode?: number;
    }> {
        const apiUrl = this.buildUrl(targetUrl, options);

        try {
            logger.debug(`ScraperAPI: Fetching ${targetUrl}`);

            const response = await fetch(apiUrl, {
                method: 'GET',
                headers: {
                    'Accept': 'text/html',
                },
            });

            if (!response.ok) {
                const errorText = await response.text();
                logger.warn(`ScraperAPI error: ${response.status} - ${errorText}`);

                return {
                    success: false,
                    error: `ScraperAPI returned ${response.status}`,
                    statusCode: response.status,
                };
            }

            const html = await response.text();

            logger.debug(`ScraperAPI: Successfully fetched ${targetUrl} (${html.length} bytes)`);

            return {
                success: true,
                html,
                statusCode: response.status,
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger.error(`ScraperAPI fetch error: ${errorMessage}`);

            return {
                success: false,
                error: errorMessage,
            };
        }
    }

    /**
     * Get account info (credits remaining, etc.)
     */
    async getAccountInfo(): Promise<{
        requestLimit: number;
        requestCount: number;
        concurrencyLimit: number;
    } | null> {
        try {
            const response = await fetch(
                `${this.baseUrl}/account?api_key=${this.apiKey}`
            );

            if (!response.ok) {
                return null;
            }

            return await response.json();
        } catch {
            return null;
        }
    }
}

// Singleton
export const scraperApi = new ScraperApiClient();
export default scraperApi;
