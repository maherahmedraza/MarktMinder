/**
 * MarktMinder Content Script - Etsy
 * Injects price history chart on Etsy listing pages
 */

(function () {
    'use strict';

    // Check if we're on a listing page
    const listingMatch = window.location.href.match(/\/listing\/(\d+)/);
    if (!listingMatch) return;

    const listingId = listingMatch[1];
    let chartInjected = false;

    /**
     * Extract product info from page
     */
    function extractProductInfo() {
        const title =
            document.querySelector('h1[data-buy-box-listing-title]')?.textContent?.trim() ||
            document.querySelector('[data-selector="listing-page-title"]')?.textContent?.trim() ||
            document.querySelector('h1')?.textContent?.trim();

        let priceText =
            document.querySelector('[data-selector="price-only"] .wt-text-title-larger')?.textContent ||
            document.querySelector('.wt-text-title-larger.lc-price')?.textContent;

        let price = null;
        if (priceText) {
            const match = priceText.replace(/[^\d,.-]/g, '').match(/[\d,.]+/);
            if (match) {
                price = parseFloat(match[0].replace(',', '.'));
            }
        }

        const imageUrl =
            document.querySelector('.wt-max-width-full.wt-horizontal-center img')?.src ||
            document.querySelector('[data-carousel-pagination] img')?.src;

        const sellerName =
            document.querySelector('[data-shop-name-link]')?.textContent?.trim() ||
            document.querySelector('a[href*="/shop/"]')?.textContent?.trim();

        return {
            marketplace: 'etsy',
            marketplaceId: listingId,
            title,
            currentPrice: price,
            imageUrl,
            sellerName,
            url: window.location.href,
        };
    }

    /**
     * Create widget
     */
    function createWidget(data) {
        document.getElementById('marktminder-widget')?.remove();

        const widget = document.createElement('div');
        widget.id = 'marktminder-widget';
        widget.className = 'mm-widget mm-etsy';

        const isTracking = data?.isTracking || false;
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
              <span class="mm-stat-label">Average</span>
              <span class="mm-stat-value">€${stats.avgPrice.toFixed(2)}</span>
            </div>
          </div>
        ` : '<p class="mm-no-data">No price history yet</p>'}
        
        <div class="mm-chart-container">
          <canvas id="mm-chart" height="60"></canvas>
        </div>
        
        <div class="mm-actions">
          <button class="mm-btn mm-btn-primary ${isTracking ? 'mm-tracking' : ''}" id="mm-track-btn">
            ${isTracking ? '✓ Tracking' : '+ Track'}
          </button>
          <button class="mm-btn mm-btn-secondary" id="mm-alert-btn">🔔 Alert</button>
        </div>
      </div>
    `;

        return widget;
    }

    /**
     * Inject widget
     */
    function injectWidget() {
        const buyBox = document.querySelector('[data-buy-box-listing-id]');
        if (!buyBox) return;

        chrome.runtime.sendMessage(
            { action: 'lookupProduct', url: window.location.href },
            (response) => {
                if (chrome.runtime.lastError) return;

                const widget = createWidget(response);
                buyBox.parentNode.insertBefore(widget, buyBox.nextSibling);

                if (response?.priceHistory?.length > 0) {
                    renderMiniChart(response.priceHistory);
                }

                setupWidgetEvents();
                chartInjected = true;
            }
        );
    }

    /**
     * Render mini chart
     */
    function renderMiniChart(priceHistory) {
        const canvas = document.getElementById('mm-chart');
        if (!canvas || !priceHistory.length) return;

        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;

        ctx.clearRect(0, 0, width, height);

        const prices = priceHistory.map(p => p.price);
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        const range = maxPrice - minPrice || 1;

        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, 'rgba(245, 100, 0, 0.2)');
        gradient.addColorStop(1, 'rgba(245, 100, 0, 0)');

        ctx.beginPath();
        ctx.moveTo(0, height);

        priceHistory.forEach((point, i) => {
            const x = (i / (priceHistory.length - 1)) * width;
            const y = height - ((point.price - minPrice) / range * height * 0.8) - height * 0.1;
            ctx.lineTo(x, y);
        });

        ctx.lineTo(width, height);
        ctx.closePath();
        ctx.fillStyle = gradient;
        ctx.fill();

        ctx.beginPath();
        priceHistory.forEach((point, i) => {
            const x = (i / (priceHistory.length - 1)) * width;
            const y = height - ((point.price - minPrice) / range * height * 0.8) - height * 0.1;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.strokeStyle = '#F56400';
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    /**
     * Set up events
     */
    function setupWidgetEvents() {
        document.getElementById('mm-close')?.addEventListener('click', () => {
            document.getElementById('marktminder-widget')?.remove();
        });

        document.getElementById('mm-track-btn')?.addEventListener('click', () => {
            chrome.runtime.sendMessage({ action: 'getAuthToken' }, async (response) => {
                if (!response?.token) {
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
                        const btn = document.getElementById('mm-track-btn');
                        btn.textContent = '✓ Tracking';
                        btn.classList.add('mm-tracking');
                    }
                } catch (error) {
                    console.error('MarktMinder:', error);
                }
            });
        });
    }

    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.action === 'getProductInfo') {
            sendResponse({ product: extractProductInfo() });
        }
        return true;
    });

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => setTimeout(injectWidget, 1500));
    } else {
        setTimeout(injectWidget, 1500);
    }
})();
