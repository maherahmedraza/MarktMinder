/**
 * MarktMinder Extension - Background Service Worker
 * Handles authentication, notifications, and API communication
 */

const API_BASE_URL = 'http://localhost:3001/api';
const WEBSITE_URL = 'http://localhost:3000';

// ==========================================
// Authentication
// ==========================================

/**
 * Get stored auth token
 */
async function getAuthToken() {
    return new Promise((resolve) => {
        chrome.storage.local.get(['authToken', 'refreshToken', 'tokenExpiry'], (result) => {
            resolve({
                accessToken: result.authToken,
                refreshToken: result.refreshToken,
                expiry: result.tokenExpiry,
            });
        });
    });
}

/**
 * Store auth tokens
 */
async function storeTokens(accessToken, refreshToken, expiresIn) {
    const tokenExpiry = Date.now() + (expiresIn * 1000);

    await chrome.storage.local.set({
        authToken: accessToken,
        refreshToken: refreshToken,
        tokenExpiry: tokenExpiry,
    });
}

/**
 * Clear auth tokens (logout)
 */
async function clearTokens() {
    await chrome.storage.local.remove(['authToken', 'refreshToken', 'tokenExpiry']);
}

/**
 * Refresh access token if needed
 */
async function refreshTokenIfNeeded() {
    const tokens = await getAuthToken();

    if (!tokens.accessToken || !tokens.refreshToken) {
        return null;
    }

    // Check if token is about to expire (within 2 minutes)
    if (tokens.expiry && tokens.expiry > Date.now() + 120000) {
        return tokens.accessToken;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken: tokens.refreshToken }),
        });

        if (response.ok) {
            const data = await response.json();
            await storeTokens(
                data.tokens.accessToken,
                data.tokens.refreshToken,
                data.tokens.expiresIn
            );
            return data.tokens.accessToken;
        } else {
            // Refresh failed, clear tokens
            await clearTokens();
            return null;
        }
    } catch (error) {
        console.error('Token refresh failed:', error);
        return null;
    }
}

// ==========================================
// Notifications
// ==========================================

/**
 * Show price drop notification
 */
function showPriceDropNotification(product, oldPrice, newPrice) {
    const savings = ((oldPrice - newPrice) / oldPrice * 100).toFixed(0);

    chrome.notifications.create({
        type: 'basic',
        iconUrl: '../assets/icon-128.png',
        title: '💰 Price Drop Alert!',
        message: `${product.title}\n€${oldPrice.toFixed(2)} → €${newPrice.toFixed(2)} (-${savings}%)`,
        priority: 2,
        requireInteraction: true,
        buttons: [
            { title: 'View Product' },
            { title: 'Dismiss' },
        ],
    }, (notificationId) => {
        // Store notification data for handling clicks
        chrome.storage.local.set({
            [`notification_${notificationId}`]: {
                url: product.url,
                productId: product.id,
            },
        });
    });
}

// Handle notification clicks
chrome.notifications.onClicked.addListener(async (notificationId) => {
    const data = await chrome.storage.local.get([`notification_${notificationId}`]);
    const notification = data[`notification_${notificationId}`];

    if (notification?.url) {
        chrome.tabs.create({ url: notification.url });
    }

    chrome.notifications.clear(notificationId);
    chrome.storage.local.remove([`notification_${notificationId}`]);
});

chrome.notifications.onButtonClicked.addListener(async (notificationId, buttonIndex) => {
    if (buttonIndex === 0) {
        // View Product
        const data = await chrome.storage.local.get([`notification_${notificationId}`]);
        const notification = data[`notification_${notificationId}`];

        if (notification?.url) {
            chrome.tabs.create({ url: notification.url });
        }
    }

    chrome.notifications.clear(notificationId);
    chrome.storage.local.remove([`notification_${notificationId}`]);
});

// ==========================================
// Badge Updates
// ==========================================

/**
 * Update extension badge with tracked products count
 */
async function updateBadge() {
    const token = await refreshTokenIfNeeded();

    if (!token) {
        chrome.action.setBadgeText({ text: '' });
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/products?limit=1`, {
            headers: { 'Authorization': `Bearer ${token}` },
        });

        if (response.ok) {
            const data = await response.json();
            const count = data.pagination?.total || 0;

            if (count > 0) {
                chrome.action.setBadgeText({ text: count.toString() });
                chrome.action.setBadgeBackgroundColor({ color: '#1E40AF' });
            } else {
                chrome.action.setBadgeText({ text: '' });
            }
        }
    } catch (error) {
        console.error('Error updating badge:', error);
    }
}

// ==========================================
// Alarms (Periodic Tasks)
// ==========================================

// Set up periodic badge update
chrome.alarms.create('updateBadge', { periodInMinutes: 15 });

// Set up periodic alert check
chrome.alarms.create('checkAlerts', { periodInMinutes: 30 });

chrome.alarms.onAlarm.addListener(async (alarm) => {
    switch (alarm.name) {
        case 'updateBadge':
            await updateBadge();
            break;
        case 'checkAlerts':
            await checkTriggeredAlerts();
            break;
    }
});

/**
 * Check for triggered alerts
 */
async function checkTriggeredAlerts() {
    const token = await refreshTokenIfNeeded();
    if (!token) return;

    try {
        const response = await fetch(`${API_BASE_URL}/alerts/history?limit=5`, {
            headers: { 'Authorization': `Bearer ${token}` },
        });

        if (response.ok) {
            const data = await response.json();

            // Get last check time
            const lastCheck = await chrome.storage.local.get(['lastAlertCheck']);
            const lastCheckTime = lastCheck.lastAlertCheck || 0;

            // Show notifications for new alerts
            for (const alert of data.history) {
                const alertTime = new Date(alert.triggeredAt).getTime();

                if (alertTime > lastCheckTime && !alert.clicked) {
                    showPriceDropNotification(
                        alert.product,
                        alert.oldPrice,
                        alert.newPrice
                    );
                }
            }

            // Update last check time
            await chrome.storage.local.set({ lastAlertCheck: Date.now() });
        }
    } catch (error) {
        console.error('Error checking alerts:', error);
    }
}

// ==========================================
// Message Handling
// ==========================================

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    handleMessage(message, sender, sendResponse);
    return true; // Keep channel open for async response
});

async function handleMessage(message, sender, sendResponse) {
    switch (message.action) {
        case 'getAuthToken':
            const token = await refreshTokenIfNeeded();
            sendResponse({ token });
            break;

        case 'login':
            await storeTokens(
                message.accessToken,
                message.refreshToken,
                message.expiresIn
            );
            await updateBadge();
            sendResponse({ success: true });
            break;

        case 'logout':
            await clearTokens();
            chrome.action.setBadgeText({ text: '' });
            sendResponse({ success: true });
            break;

        case 'productTracked':
            await updateBadge();
            sendResponse({ success: true });
            break;

        case 'lookupProduct':
            try {
                const authToken = await refreshTokenIfNeeded();
                const response = await fetch(
                    `${API_BASE_URL}/products/lookup?url=${encodeURIComponent(message.url)}`,
                    {
                        headers: authToken ? { 'Authorization': `Bearer ${authToken}` } : {},
                    }
                );
                const data = await response.json();
                sendResponse(data);
            } catch (error) {
                sendResponse({ error: error.message });
            }
            break;

        default:
            sendResponse({ error: 'Unknown action' });
    }
}

// ==========================================
// Installation / Update
// ==========================================

chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
        // Open welcome page on first install
        chrome.tabs.create({ url: `${WEBSITE_URL}/welcome?source=extension` });
    } else if (details.reason === 'update') {
        // Handle update if needed
        console.log('MarktMinder updated to version', chrome.runtime.getManifest().version);
    }

    // Initial badge update
    updateBadge();
});

// ==========================================
// Context Menu
// ==========================================

chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: 'trackProduct',
        title: 'Track this product with MarktMinder',
        contexts: ['link'],
        targetUrlPatterns: [
            '*://*.amazon.com/*',
            '*://*.amazon.de/*',
            '*://*.amazon.co.uk/*',
            '*://*.etsy.com/*',
            '*://*.otto.de/*',
        ],
    });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId === 'trackProduct') {
        const token = await refreshTokenIfNeeded();

        if (!token) {
            chrome.tabs.create({ url: `${WEBSITE_URL}/login` });
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/products`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ url: info.linkUrl }),
            });

            if (response.ok) {
                chrome.notifications.create({
                    type: 'basic',
                    iconUrl: '../assets/icon-128.png',
                    title: 'Product Added!',
                    message: 'Product is now being tracked. You\'ll be notified of price changes.',
                });
                await updateBadge();
            }
        } catch (error) {
            console.error('Error tracking product:', error);
        }
    }
});

// Initial setup
updateBadge();
