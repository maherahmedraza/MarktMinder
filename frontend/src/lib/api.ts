const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

interface ApiOptions {
    method?: string;
    body?: any;
    headers?: Record<string, string>;
}

class ApiClient {
    private accessToken: string | null = null;
    private isRefreshing: boolean = false;
    private refreshPromise: Promise<boolean> | null = null;

    setToken(token: string | null) {
        this.accessToken = token;
    }

    private async tryRefreshToken(): Promise<boolean> {
        // If already refreshing, wait for it
        if (this.isRefreshing && this.refreshPromise) {
            return this.refreshPromise;
        }

        this.isRefreshing = true;
        this.refreshPromise = (async () => {
            try {
                // Dynamic import to avoid circular dependency
                const Cookies = (await import('js-cookie')).default;
                const refreshToken = Cookies.get('refreshToken');

                if (!refreshToken) {
                    return false;
                }

                const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ refreshToken }),
                });

                if (!response.ok) {
                    return false;
                }

                const data = await response.json();
                const accessTokenDays = Math.max(data.tokens.expiresIn / (24 * 60 * 60), 1 / 24);

                Cookies.set('accessToken', data.tokens.accessToken, {
                    expires: accessTokenDays, path: '/', sameSite: 'lax'
                });
                Cookies.set('refreshToken', data.tokens.refreshToken, {
                    expires: 30, path: '/', sameSite: 'lax'
                });

                this.accessToken = data.tokens.accessToken;
                return true;
            } catch {
                return false;
            } finally {
                this.isRefreshing = false;
                this.refreshPromise = null;
            }
        })();

        return this.refreshPromise;
    }

    async request<T>(endpoint: string, options: ApiOptions = {}, _retried = false): Promise<T> {
        const url = `${API_BASE_URL}${endpoint}`;

        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            ...options.headers,
        };

        if (this.accessToken) {
            headers['Authorization'] = `Bearer ${this.accessToken}`;
        }

        const response = await fetch(url, {
            method: options.method || 'GET',
            headers,
            body: options.body ? JSON.stringify(options.body) : undefined,
        });

        const data = await response.json();

        // Handle 401 with automatic retry after token refresh
        if (response.status === 401 && !_retried) {
            const refreshed = await this.tryRefreshToken();
            if (refreshed) {
                return this.request<T>(endpoint, options, true);
            }
        }

        if (!response.ok) {
            throw new ApiError(
                data.error?.message || data.error || 'Request failed',
                response.status,
                data.error?.code
            );
        }

        return data;
    }

    // Auth endpoints
    async register(email: string, password: string, name: string) {
        return this.request<{ user: User; tokens: Tokens }>('/auth/register', {
            method: 'POST',
            body: { email, password, name },
        });
    }

    async login(email: string, password: string) {
        return this.request<{ user: User; tokens: Tokens }>('/auth/login', {
            method: 'POST',
            body: { email, password },
        });
    }

    async logout(refreshToken: string) {
        return this.request('/auth/logout', {
            method: 'POST',
            body: { refreshToken },
        });
    }

    async refreshToken(refreshToken: string) {
        return this.request<{ tokens: Tokens }>('/auth/refresh', {
            method: 'POST',
            body: { refreshToken },
        });
    }

    async getProfile() {
        return this.request<{ user: User }>('/auth/me');
    }

    // Products endpoints
    async getProducts(params?: { page?: number; limit?: number; marketplace?: string }) {
        const query = new URLSearchParams();
        if (params?.page) query.set('page', params.page.toString());
        if (params?.limit) query.set('limit', params.limit.toString());
        if (params?.marketplace) query.set('marketplace', params.marketplace);

        const queryString = query.toString();
        return this.request<{ products: Product[]; pagination: Pagination }>(
            `/products${queryString ? `?${queryString}` : ''}`
        );
    }

    async getProduct(id: string, range?: string) {
        const query = range ? `?range=${range}` : '';
        return this.request<{ product: Product; priceHistory: PricePoint[]; stats: PriceStats }>(
            `/products/${id}${query}`
        );
    }

    async addProduct(url: string, notes?: string) {
        return this.request<{ product: Product }>('/products', {
            method: 'POST',
            body: { url, notes },
        });
    }

    async removeProduct(id: string) {
        return this.request(`/products/${id}`, {
            method: 'DELETE',
        });
    }

    // Alerts endpoints
    async getAlerts() {
        return this.request<{ alerts: Alert[] }>('/alerts');
    }

    async createAlert(productId: string, alertType: string, targetPrice?: number) {
        return this.request<{ alert: Alert }>('/alerts', {
            method: 'POST',
            body: { productId, alertType, targetPrice },
        });
    }

    async deleteAlert(id: string) {
        return this.request(`/alerts/${id}`, {
            method: 'DELETE',
        });
    }

    async toggleAlert(id: string) {
        return this.request<{ alert: Alert }>(`/alerts/${id}/toggle`, {
            method: 'POST',
        });
    }
}

export class ApiError extends Error {
    constructor(
        message: string,
        public status: number,
        public code?: string
    ) {
        super(message);
        this.name = 'ApiError';
    }
}

// Types
export interface User {
    id: string;
    email: string;
    name: string;
    createdAt: string;
}

export interface Tokens {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
}

export interface Product {
    id: string;
    url: string;
    marketplace: 'amazon' | 'etsy' | 'otto';
    marketplaceId: string;
    title: string;
    description?: string;
    imageUrl?: string;
    brand?: string;
    category?: string;
    currentPrice: number;
    currency: string;
    lowestPrice?: number;
    lowestPriceDate?: string;
    highestPrice?: number;
    availability?: string;
    lastScrapedAt?: string;
    isTracked?: boolean;
    notes?: string;
    createdAt: string;
}

export interface PricePoint {
    time: string;
    price: number;
    availability?: string;
}

export interface PriceStats {
    minPrice: number;
    maxPrice: number;
    avgPrice: number;
    currentPrice: number;
    priceChange30d?: number;
    priceChange24h?: number;
    priceChange7d?: number;
}

export interface Alert {
    id: string;
    productId: string;
    alertType: string;
    targetPrice?: number;
    isActive: boolean;
    isTriggered: boolean;
    lastTriggeredAt?: string;
    product?: Product;
}

export interface Pagination {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

export const api = new ApiClient();
export default api;
