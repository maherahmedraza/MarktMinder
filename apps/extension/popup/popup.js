/**
 * MarktMinder Extension - Popup Script
 */

// API Configuration
const API_BASE_URL = 'http://localhost:3001/api';

// Chart.js instance
let priceChart = null;

// Current product data
let currentProduct = null;
let isTracking = false;

// DOM Elements
const elements = {
    loading: document.getElementById('loading'),
    notProduct: document.getElementById('not-product'),
    productView: document.getElementById('product-view'),
    loginRequired: document.getElementById('login-required'),

    // Product info
    productImage: document.getElementById('product-image'),
    productTitle: document.getElementById('product-title'),
    productMarketplace: document.getElementById('product-marketplace'),

    // Prices
    currentPrice: document.getElementById('current-price'),
    lowestPrice: document.getElementById('lowest-price'),
    highestPrice: document.getElementById('highest-price'),
    averagePrice: document.getElementById('average-price'),
    priceChange: document.getElementById('price-change'),
    changeIcon: document.getElementById('change-icon'),
    changeText: document.getElementById('change-text'),

    // Actions
    trackBtn: document.getElementById('track-btn'),
    trackBtnText: document.getElementById('track-btn-text'),
    alertBtn: document.getElementById('alert-btn'),

    // Alert modal
    alertModal: document.getElementById('alert-modal'),
    alertPrice: document.getElementById('alert-price'),
    alertEmail: document.getElementById('alert-email'),
    cancelAlert: document.getElementById('cancel-alert'),
    saveAlert: document.getElementById('save-alert'),

    // Chart
    chartCanvas: document.getElementById('price-chart'),
    rangeButtons: document.querySelectorAll('.range-btn'),

    // Other
    settingsBtn: document.getElementById('settings-btn'),
    openDashboard: document.getElementById('open-dashboard'),
    viewAllLink: document.getElementById('view-all-link'),
    loginBtn: document.getElementById('login-btn'),
};

/**
 * Initialize popup
 */
async function init() {
    // Get current tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab?.url) {
        showState('not-product');
        return;
    }

    // Check if we're on a supported product page
    const productInfo = parseProductUrl(tab.url);

    if (!productInfo) {
        showState('not-product');
        return;
    }

    // Fetch product data from API
    await loadProductData(tab.url, productInfo);

    // Set up event listeners
    setupEventListeners();
}

/**
 * Parse product URL to extract marketplace info
 */
function parseProductUrl(url) {
    try {
        const urlObj = new URL(url);
        const hostname = urlObj.hostname.toLowerCase();

        // Amazon
        if (hostname.includes('amazon')) {
            const asinMatch = url.match(/\/(?:dp|gp\/product|gp\/aw\/d)\/([A-Z0-9]{10})/i);
            if (asinMatch) {
                let region = 'us';
                if (hostname.includes('amazon.de')) region = 'de';
                else if (hostname.includes('amazon.co.uk')) region = 'uk';
                else if (hostname.includes('amazon.fr')) region = 'fr';
                else if (hostname.includes('amazon.it')) region = 'it';
                else if (hostname.includes('amazon.es')) region = 'es';

                return {
                    marketplace: 'amazon',
                    marketplaceId: asinMatch[1].toUpperCase(),
                    region,
                };
            }
        }

        // Etsy
        if (hostname.includes('etsy.com')) {
            const listingMatch = url.match(/\/listing\/(\d+)/);
            if (listingMatch) {
                return {
                    marketplace: 'etsy',
                    marketplaceId: listingMatch[1],
                };
            }
        }

        // Otto
        if (hostname.includes('otto.de')) {
            const productMatch = url.match(/\/p\/([^\/\?#]+)/);
            if (productMatch) {
                return {
                    marketplace: 'otto',
                    marketplaceId: productMatch[1],
                    region: 'de',
                };
            }
        }

        return null;
    } catch {
        return null;
    }
}

/**
 * Load product data from API
 */
async function loadProductData(url, productInfo) {
    try {
        // Get auth token
        const token = await getAuthToken();

        // Make API request
        const response = await fetch(`${API_BASE_URL}/products/lookup?url=${encodeURIComponent(url)}`, {
            headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        });

        if (!response.ok) {
            if (response.status === 401) {
                showState('login-required');
                return;
            }
            throw new Error('Failed to fetch product data');
        }

        const data = await response.json();

        if (!data.found) {
            // Product not in database yet - show basic info from page
            await loadProductFromPage(productInfo);
            return;
        }

        // Store current product
        currentProduct = data.product;
        isTracking = data.isTracking || false;

        // Update UI
        renderProduct(data.product, data.priceHistory, data.stats);
        showState('product');

    } catch (error) {
        console.error('Error loading product:', error);
        // Try to load from page content
        await loadProductFromPage(productInfo);
    }
}

/**
 * Load product info from page via content script
 */
async function loadProductFromPage(productInfo) {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

        // Request product info from content script
        const response = await chrome.tabs.sendMessage(tab.id, { action: 'getProductInfo' });

        if (response?.product) {
            currentProduct = {
                ...productInfo,
                ...response.product,
                url: tab.url,
            };

            renderProduct(currentProduct, [], null);
            showState('product');
        } else {
            showState('not-product');
        }
    } catch (error) {
        console.error('Error getting product from page:', error);
        showState('not-product');
    }
}

/**
 * Render product data
 */
function renderProduct(product, priceHistory = [], stats = null) {
    // Product info
    if (product.imageUrl) {
        elements.productImage.src = product.imageUrl;
    }
    elements.productTitle.textContent = product.title || 'Unknown Product';

    // Marketplace badge
    elements.productMarketplace.textContent = product.marketplace;
    elements.productMarketplace.className = `marketplace-badge ${product.marketplace}`;

    // Prices
    const currency = product.currency || 'EUR';
    const currencySymbol = currency === 'EUR' ? '€' : currency === 'USD' ? '$' : currency === 'GBP' ? '£' : currency;

    elements.currentPrice.textContent = product.currentPrice
        ? `${currencySymbol}${product.currentPrice.toFixed(2)}`
        : '--';

    if (stats) {
        elements.lowestPrice.textContent = `${currencySymbol}${stats.minPrice?.toFixed(2) || '--'}`;
        elements.highestPrice.textContent = `${currencySymbol}${stats.maxPrice?.toFixed(2) || '--'}`;
        elements.averagePrice.textContent = `${currencySymbol}${stats.avgPrice?.toFixed(2) || '--'}`;

        // Price change indicator
        if (stats.priceChange30d) {
            const change = stats.priceChange30d;
            elements.priceChange.classList.remove('hidden', 'up', 'down');

            if (change > 0) {
                elements.priceChange.classList.add('up');
                elements.changeIcon.textContent = '📈';
                elements.changeText.textContent = `+${change.toFixed(1)}% vs 30 days ago`;
            } else {
                elements.priceChange.classList.add('down');
                elements.changeIcon.textContent = '📉';
                elements.changeText.textContent = `${change.toFixed(1)}% vs 30 days ago`;
            }
        }
    }

    // Update track button
    updateTrackButton();

    // Set suggested alert price (10% below current)
    if (product.currentPrice) {
        elements.alertPrice.value = (product.currentPrice * 0.9).toFixed(2);
    }

    // Render chart
    renderChart(priceHistory);
}

/**
 * Render price chart
 */
function renderChart(priceHistory) {
    const ctx = elements.chartCanvas.getContext('2d');

    // Destroy existing chart
    if (priceChart) {
        priceChart.destroy();
    }

    if (!priceHistory || priceHistory.length === 0) {
        // No data - show empty state
        ctx.font = '12px Inter';
        ctx.fillStyle = '#9CA3AF';
        ctx.textAlign = 'center';
        ctx.fillText('No price history yet', elements.chartCanvas.width / 2, 60);
        return;
    }

    // Prepare chart data
    const labels = priceHistory.map(p => new Date(p.time).toLocaleDateString());
    const prices = priceHistory.map(p => p.price);

    // Create gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, 120);
    gradient.addColorStop(0, 'rgba(30, 64, 175, 0.3)');
    gradient.addColorStop(1, 'rgba(30, 64, 175, 0)');

    priceChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                data: prices,
                borderColor: '#1E40AF',
                backgroundColor: gradient,
                borderWidth: 2,
                fill: true,
                tension: 0.3,
                pointRadius: 0,
                pointHoverRadius: 4,
            }],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#1F2937',
                    titleFont: { size: 11 },
                    bodyFont: { size: 12, weight: 'bold' },
                    padding: 8,
                    displayColors: false,
                    callbacks: {
                        label: (context) => `€${context.parsed.y.toFixed(2)}`,
                    },
                },
            },
            scales: {
                x: { display: false },
                y: {
                    display: true,
                    grid: { color: '#E5E7EB' },
                    ticks: {
                        font: { size: 10 },
                        color: '#9CA3AF',
                        callback: (value) => `€${value}`,
                    },
                },
            },
            interaction: {
                intersect: false,
                mode: 'index',
            },
        },
    });
}

/**
 * Update track button state
 */
function updateTrackButton() {
    if (isTracking) {
        elements.trackBtn.classList.add('tracking');
        elements.trackBtnText.textContent = 'Tracking ✓';
    } else {
        elements.trackBtn.classList.remove('tracking');
        elements.trackBtnText.textContent = 'Track Product';
    }
}

/**
 * Show/hide states
 */
function showState(state) {
    elements.loading.classList.add('hidden');
    elements.notProduct.classList.add('hidden');
    elements.productView.classList.add('hidden');
    elements.loginRequired.classList.add('hidden');

    switch (state) {
        case 'loading':
            elements.loading.classList.remove('hidden');
            break;
        case 'not-product':
            elements.notProduct.classList.remove('hidden');
            break;
        case 'product':
            elements.productView.classList.remove('hidden');
            break;
        case 'login-required':
            elements.loginRequired.classList.remove('hidden');
            break;
    }
}

/**
 * Get auth token from storage
 */
async function getAuthToken() {
    return new Promise((resolve) => {
        chrome.storage.local.get(['authToken'], (result) => {
            resolve(result.authToken || null);
        });
    });
}

/**
 * Set up event listeners
 */
function setupEventListeners() {
    // Track button
    elements.trackBtn.addEventListener('click', handleTrackProduct);

    // Alert button
    elements.alertBtn.addEventListener('click', () => {
        elements.alertModal.classList.remove('hidden');
    });

    // Alert modal
    elements.cancelAlert.addEventListener('click', () => {
        elements.alertModal.classList.add('hidden');
    });

    elements.saveAlert.addEventListener('click', handleCreateAlert);

    // Chart range buttons
    elements.rangeButtons.forEach(btn => {
        btn.addEventListener('click', async (e) => {
            // Update active state
            elements.rangeButtons.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');

            // Reload chart with new range
            const range = e.target.dataset.range;
            await loadChartData(range);
        });
    });

    // Settings
    elements.settingsBtn.addEventListener('click', () => {
        chrome.runtime.openOptionsPage();
    });

    // Dashboard link
    elements.openDashboard?.addEventListener('click', (e) => {
        e.preventDefault();
        chrome.tabs.create({ url: 'http://localhost:3000/dashboard' });
    });

    elements.viewAllLink?.addEventListener('click', (e) => {
        e.preventDefault();
        chrome.tabs.create({ url: 'http://localhost:3000/dashboard' });
    });

    // Login
    elements.loginBtn?.addEventListener('click', () => {
        chrome.tabs.create({ url: 'http://localhost:3000/login' });
    });
}

/**
 * Handle track product click
 */
async function handleTrackProduct() {
    if (!currentProduct) return;

    const token = await getAuthToken();
    if (!token) {
        showState('login-required');
        return;
    }

    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

        const response = await fetch(`${API_BASE_URL}/products`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ url: tab.url }),
        });

        if (response.ok) {
            isTracking = true;
            updateTrackButton();

            // Notify background script
            chrome.runtime.sendMessage({ action: 'productTracked', product: currentProduct });
        } else if (response.status === 400) {
            // Already tracking
            isTracking = true;
            updateTrackButton();
        }
    } catch (error) {
        console.error('Error tracking product:', error);
    }
}

/**
 * Handle create alert
 */
async function handleCreateAlert() {
    if (!currentProduct) return;

    const token = await getAuthToken();
    if (!token) {
        showState('login-required');
        return;
    }

    const targetPrice = parseFloat(elements.alertPrice.value);
    if (isNaN(targetPrice) || targetPrice <= 0) {
        alert('Please enter a valid price');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/alerts`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
                productId: currentProduct.id,
                alertType: 'price_below',
                targetPrice,
                notifyEmail: elements.alertEmail.checked,
            }),
        });

        if (response.ok) {
            elements.alertModal.classList.add('hidden');
            alert('Alert created successfully!');
        } else {
            const error = await response.json();
            alert(error.error?.message || 'Failed to create alert');
        }
    } catch (error) {
        console.error('Error creating alert:', error);
        alert('Failed to create alert');
    }
}

/**
 * Load chart data for specific range
 */
async function loadChartData(range) {
    if (!currentProduct?.id) return;

    try {
        const token = await getAuthToken();
        const response = await fetch(
            `${API_BASE_URL}/products/${currentProduct.id}?range=${range}`,
            {
                headers: token ? { 'Authorization': `Bearer ${token}` } : {},
            }
        );

        if (response.ok) {
            const data = await response.json();
            renderChart(data.priceHistory);
        }
    } catch (error) {
        console.error('Error loading chart data:', error);
    }
}

// Initialize popup
document.addEventListener('DOMContentLoaded', init);
