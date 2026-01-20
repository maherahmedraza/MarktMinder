const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

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

    private getCsrfTokenFromCookie(): string | null {
        // Read XSRF-TOKEN cookie
        const cookies = document.cookie.split(';');
        for (const cookie of cookies) {
            const [name, value] = cookie.trim().split('=');
            if (name === 'XSRF-TOKEN') {
                return decodeURIComponent(value);
            }
        }
        return null;
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

        // Add CSRF token from cookie for state-changing requests
        const method = options.method || 'GET';
        if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase())) {
            const csrfToken = this.getCsrfTokenFromCookie();
            if (csrfToken) {
                headers['x-csrf-token'] = csrfToken;
            }
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
        return this.request<{ message: string; isActive: boolean }>(`/alerts/${id}/toggle`, {
            method: 'POST',
        });
    }

    // Insights endpoints
    async getPriceDrops(limit: number = 5) {
        return this.request<{ priceDrops: PriceDrop[] }>(`/products/insights/price-drops?limit=${limit}`);
    }

    async getProductPrediction(id: string) {
        return this.request<Prediction>(`/products/${id}/predict`);
    }

    async getDeals(params?: { limit?: number; marketplace?: string; minDrop?: number }) {
        const query = new URLSearchParams();
        if (params?.limit) query.set('limit', params.limit.toString());
        if (params?.marketplace) query.set('marketplace', params.marketplace);
        if (params?.minDrop) query.set('minDrop', params.minDrop.toString());

        const queryString = query.toString();
        return this.request<{ deals: Deal[]; count: number }>(`/products/deals?${queryString}`);
    }

    async getDealStats() {
        return this.request<DealStats>('/products/deals/stats');
    }

    // Folders endpoints
    async getFolders() {
        return this.request<{ folders: Folder[] }>('/folders');
    }

    async createFolder(name: string) {
        return this.request<{ folder: Folder }>('/folders', {
            method: 'POST',
            body: { name },
        });
    }

    async moveProductToFolder(productId: string, folderId: string) {
        return this.request('/folders/products', {
            method: 'POST',
            body: { productId, folderId },
        });
    }

    async updateFolder(id: string, data: { name?: string; color?: string; icon?: string; isPublic?: boolean; description?: string }) {
        return this.request<{ folder: Folder }>(`/folders/${id}`, {
            method: 'PATCH',
            body: data,
        });
    }

    async deleteFolder(id: string) {
        return this.request(`/folders/${id}`, {
            method: 'DELETE',
        });
    }

    // Admin endpoints
    async getAdminStats(days?: string) {
        const query = days ? `?days=${days}` : '';
        return this.request<AdminStats>(`/admin/stats${query}`);
    }

    async getAdminProducts(params?: { page?: number; limit?: number; marketplace?: string; search?: string }) {
        const queryParams = new URLSearchParams();
        if (params?.page) queryParams.set('page', params.page.toString());
        if (params?.limit) queryParams.set('limit', params.limit.toString());
        if (params?.marketplace) queryParams.set('marketplace', params.marketplace);
        if (params?.search) queryParams.set('search', params.search);
        return this.request<{ products: AdminProduct[]; pagination: { page: number; totalPages: number; total: number } }>(`/admin/products?${queryParams.toString()}`);
    }

    async getAdminUsers(params?: { page?: number; limit?: number; search?: string }) {
        const queryParams = new URLSearchParams();
        if (params?.page) queryParams.set('page', params.page.toString());
        if (params?.limit) queryParams.set('limit', params.limit.toString());
        if (params?.search) queryParams.set('search', params.search);
        return this.request<{ users: AdminUser[]; pagination: { page: number; totalPages: number; total: number } }>(`/admin/users?${queryParams.toString()}`);
    }

    async deleteAdminUser(id: string) {
        return this.request(`/admin/users/${id}`, { method: 'DELETE' });
    }

    async bulkDeleteAdminUsers(userIds: string[]) {
        return this.request('/admin/users/bulk-delete', {
            method: 'POST',
            body: { userIds }
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
    role?: string;
    subscription_tier?: string;
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
    folder_id?: string;
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

export interface PriceDrop {
    id: string;
    title: string;
    image_url: string;
    marketplace: string;
    url: string;
    current_price: number;
    old_price: number;
    drop_percentage: number;
    savings: number;
}

export interface Prediction {
    trend: 'rising' | 'falling' | 'stable';
    trendStrength: number;
    confidence: number;
    analysis: {
        recommendation: string;
    };
}

export interface Folder {
    id: string;
    name: string;
    userId: string;
    createdAt: string;
    color?: string;
    icon?: string;
    is_public?: boolean; // API uses underscore based on previous fetch usage? Or camelCase?
    isPublic?: boolean; // Handling both potential cases
    description?: string;
    product_count?: number;
    count?: number;
}

export interface Deal {
    id: string;
    title: string;
    image_url: string;
    marketplace: 'amazon' | 'etsy' | 'otto';
    current_price: number;
    currency: string;
    score: number;
    original_price?: number;
    discount_percentage?: number;
    recommendation?: string;
    reason?: string;
}

export interface DealStats {
    totalDeals: number;
    averageSavings: number;
    byMarketplace: { marketplace: string; count: number }[];
}

export interface AdminStats {
    overview: {
        totalProducts: number;
        totalUsers: number;
        totalTracked: number;
        activeAlerts: number;
    };
    growth: {
        productsToday: number;
        productsWeek: number;
        productsMonth: number;
        usersWeek: number;
        priceRecordsToday: number;
    };
    marketplaceDistribution: Array<{ marketplace: string; count: string }>;
    charts: {
        dailyProducts: Array<{ date: string; count: string }>;
        dailyUsers: Array<{ date: string; count: string }>;
    };
    topTracked: Array<{
        id: string;
        title: string;
        image_url: string;
        current_price: number;
        marketplace: string;
        tracker_count: string;
    }>;
    recentDrops: Array<{
        id: string;
        title: string;
        image_url: string;
        current_price: number;
        marketplace: string;
        old_price: number;
        new_price: number;
        drop_percentage: number;
        savings: number;
    }>;
}

export interface AdminProduct {
    id: string;
    title: string;
    image_url: string;
    marketplace: string;
    current_price: number;
    currency: string;
    url: string;
    tracker_count: number;
    history_count: number;
    created_at: string;
    last_scraped_at: string;
}

export interface AdminUser {
    id: string;
    email: string;
    name: string;
    email_verified: boolean;
    created_at: string;
    last_login_at: string;
    role?: string;
    products_count: number;
    alerts_count: number;
}

export const api = new ApiClient();
export default api;
