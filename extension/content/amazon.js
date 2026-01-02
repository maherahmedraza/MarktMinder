/**
 * MarktMinder Content Script - Amazon
 * Injects price history chart and tracking UI on Amazon product pages
 */

(function () {
    'use strict';

    // Check if we're on a product page
    const asinMatch = window.location.href.match(/\/(?:dp|gp\/product|gp\/aw\/d)\/([A-Z0-9]{10})/i);
    if (!asinMatch) return;

    const ASIN = asinMatch[1].toUpperCase();
    let productData = null;
    let chartInjected = false;

    /**
     * Extract product info from page
     */
    function extractProductInfo() {
        const title = document.querySelector('#productTitle, #title, h1.a-size-large')?.textContent?.trim();

        // Price extraction
        let priceText =
            document.querySelector('.a-price .a-offscreen')?.textContent ||
            document.querySelector('#priceblock_ourprice')?.textContent ||
            document.querySelector('#priceblock_dealprice')?.textContent ||
            document.querySelector('#corePrice_feature_div .a-price .a-offscreen')?.textContent;

        let price = null;
        if (priceText) {
            const match = priceText.replace(/[^\d,.-]/g, '').match(/[\d,.]+/);
            if (match) {
                price = parseFloat(match[0].replace(',', '.'));
            }
        }

        const imageUrl =
            document.querySelector('#landingImage')?.src ||
            document.querySelector('#imgBlkFront')?.src ||
            document.querySelector('.a-dynamic-image')?.src;

        return {
            marketplace: 'amazon',
            marketplaceId: ASIN,
            title,
            currentPrice: price,
            imageUrl,
            url: window.location.href,
        };
    }

    /**
     * Create MarktMinder widget
     */
    function createWidget(data) {
        // Remove existing widget
        document.getElementById('marktminder-widget')?.remove();

        const widget = document.createElement('div');
        widget.id = 'marktminder-widget';
        widget.className = 'mm-widget';

        const isTracking = data?.isTracking || false;
        const priceHistory = data?.priceHistory || [];
        const stats = data?.stats || {};

        widget.innerHTML = `
      <div class="mm-header">
        <img src="${chrome.runtime.getURL('assets/icon-48.png')}" alt="MarktMinder" class="mm-logo">
        <span class="mm-title">MarktMinder</span>
        <button class="mm-close" id="mm-close">×</button>
      </div>
      
      <div class="mm-content">
        ${stats.minPrice ? `
          <div class="mm-stats">
            <div class="mm-stat">
              <span class="mm-stat-label">Lowest</span>
              <span class="mm-stat-value mm-lowest">€${stats.minPrice.toFixed(2)}</span>
            </div>
            <div class="mm-stat">
              <span class="mm-stat-label">Highest</span>
              <span class="mm-stat-value mm-highest">€${stats.maxPrice.toFixed(2)}</span>
            </div>
            <div class="mm-stat">
              <span class="mm-stat-label">Average</span>
              <span class="mm-stat-value">€${stats.avgPrice.toFixed(2)}</span>
            </div>
          </div>
        ` : ''}
        
        <div class="mm-chart-container">
          <canvas id="mm-chart" height="80"></canvas>
        </div>
        
        <div class="mm-actions">
          <button class="mm-btn mm-btn-primary" id="mm-track-btn">
            ${isTracking ? '✓ Tracking' : '+ Track Price'}
          </button>
          <button class="mm-btn mm-btn-secondary" id="mm-alert-btn">
            🔔 Set Alert
          </button>
        </div>
      </div>
    `;

        return widget;
    }

    /**
     * Inject widget into page
     */
    function injectWidget() {
        // Find insertion point (after price or buy box)
        const insertionPoints = [
            '#rightCol #buybox',
            '#rightCol',
            '#centerCol',
            '#dp-container',
        ];

        let targetElement = null;
        for (const selector of insertionPoints) {
            targetElement = document.querySelector(selector);
            if (targetElement) break;
        }

        if (!targetElement) return;

        // Fetch product data from API
        chrome.runtime.sendMessage(
            { action: 'lookupProduct', url: window.location.href },
            (response) => {
                if (chrome.runtime.lastError) {
                    console.error('MarktMinder:', chrome.runtime.lastError);
                    return;
                }

                productData = response;
                const widget = createWidget(response);

                // Insert widget
                if (targetElement.id === 'rightCol') {
                    targetElement.insertBefore(widget, targetElement.firstChild);
                } else {
                    targetElement.appendChild(widget);
                }

                // Render chart if data available
                if (response?.priceHistory?.length > 0) {
                    renderMiniChart(response.priceHistory);
                }

                // Set up event listeners
                setupWidgetEvents();

                chartInjected = true;
            }
        );
    }

    /**
     * Render mini price chart
     */
    function renderMiniChart(priceHistory) {
        const canvas = document.getElementById('mm-chart');
        if (!canvas || !priceHistory.length) return;

        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;

        // Clear canvas
        ctx.clearRect(0, 0, width, height);

        // Get price range
        const prices = priceHistory.map(p => p.price);
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        const range = maxPrice - minPrice || 1;

        // Draw gradient background
        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, 'rgba(30, 64, 175, 0.2)');
        gradient.addColorStop(1, 'rgba(30, 64, 175, 0)');

        // Draw line and fill
        ctx.beginPath();
        ctx.moveTo(0, height);

        priceHistory.forEach((point, i) => {
            const x = (i / (priceHistory.length - 1)) * width;
            const y = height - ((point.price - minPrice) / range * height * 0.8) - height * 0.1;

            if (i === 0) {
                ctx.lineTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });

        ctx.lineTo(width, height);
        ctx.closePath();
        ctx.fillStyle = gradient;
        ctx.fill();

        // Draw line
        ctx.beginPath();
        priceHistory.forEach((point, i) => {
            const x = (i / (priceHistory.length - 1)) * width;
            const y = height - ((point.price - minPrice) / range * height * 0.8) - height * 0.1;

            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        ctx.strokeStyle = '#1E40AF';
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    /**
     * Set up widget event listeners
     */
    function setupWidgetEvents() {
        // Close button
        document.getElementById('mm-close')?.addEventListener('click', () => {
            document.getElementById('marktminder-widget')?.remove();
        });

        // Track button
        document.getElementById('mm-track-btn')?.addEventListener('click', async () => {
            const btn = document.getElementById('mm-track-btn');

            chrome.runtime.sendMessage({ action: 'getAuthToken' }, async (response) => {
                if (!response?.token) {
                    // Not logged in - open login page
                    window.open('http://localhost:3000/login', '_blank');
                    return;
                }

                try {
                    const apiResponse = await fetch('http://localhost:3001/api/products', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${response.token}`,
                        },
                        body: JSON.stringify({ url: window.location.href }),
                    });

                    if (apiResponse.ok) {
                        btn.textContent = '✓ Tracking';
                        btn.classList.add('mm-tracking');
                    }
                } catch (error) {
                    console.error('MarktMinder:', error);
                }
            });
        });

        // Alert button
        document.getElementById('mm-alert-btn')?.addEventListener('click', () => {
            // Open popup to set alert
            chrome.runtime.sendMessage({ action: 'openPopup' });
        });
    }

    /**
     * Handle messages from popup
     */
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.action === 'getProductInfo') {
            const info = extractProductInfo();
            sendResponse({ product: info });
        }
        return true;
    });

    // Wait for page to load, then inject widget
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(injectWidget, 1000);
        });
    } else {
        setTimeout(injectWidget, 1000);
    }
})();
