/**
 * MarktMinder Content Script - Otto.de
 * Injects price history chart on Otto product pages
 */

(function () {
    'use strict';

    // Check if we're on a product page
    const productMatch = window.location.href.match(/\/p\/([^\/\?#]+)/);
    if (!productMatch) return;

    const productSlug = productMatch[1];
    let chartInjected = false;

    /**
     * Extract product info from page
     */
    function extractProductInfo() {
        const title =
            document.querySelector('[data-qa="product-name"]')?.textContent?.trim() ||
            document.querySelector('.pdp_product-name')?.textContent?.trim() ||
            document.querySelector('h1')?.textContent?.trim();

        const brand =
            document.querySelector('[data-qa="brand-name"]')?.textContent?.trim() ||
            document.querySelector('.pdp_brand-name')?.textContent?.trim();

        let priceText =
            document.querySelector('[data-qa="product-price"]')?.textContent ||
            document.querySelector('.pdp_price__main')?.textContent ||
            document.querySelector('[data-qa="price"]')?.textContent;

        let price = null;
        if (priceText) {
            // German format: 1.234,56 €
            const match = priceText.replace(/[^\d,.-]/g, '').match(/[\d,.]+/);
            if (match) {
                // Convert German format to number
                price = parseFloat(match[0].replace('.', '').replace(',', '.'));
            }
        }

        const imageUrl =
            document.querySelector('[data-qa="product-image"] img')?.src ||
            document.querySelector('.pdp_gallery__main-image img')?.src;

        return {
            marketplace: 'otto',
            marketplaceId: productSlug,
            region: 'de',
            title,
            brand,
            currentPrice: price,
            imageUrl,
            currency: 'EUR',
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
        widget.className = 'mm-widget mm-otto';

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
              <span class="mm-stat-label">Tiefstpreis</span>
              <span class="mm-stat-value mm-lowest">${stats.minPrice.toFixed(2)} €</span>
            </div>
            <div class="mm-stat">
              <span class="mm-stat-label">Höchstpreis</span>
              <span class="mm-stat-value mm-highest">${stats.maxPrice.toFixed(2)} €</span>
            </div>
            <div class="mm-stat">
              <span class="mm-stat-label">Durchschnitt</span>
              <span class="mm-stat-value">${stats.avgPrice.toFixed(2)} €</span>
            </div>
          </div>
        ` : '<p class="mm-no-data">Noch keine Preisverlauf</p>'}
        
        <div class="mm-chart-container">
          <canvas id="mm-chart" height="60"></canvas>
        </div>
        
        <div class="mm-actions">
          <button class="mm-btn mm-btn-primary ${isTracking ? 'mm-tracking' : ''}" id="mm-track-btn">
            ${isTracking ? '✓ Wird verfolgt' : '+ Preis verfolgen'}
          </button>
          <button class="mm-btn mm-btn-secondary" id="mm-alert-btn">🔔 Alarm</button>
        </div>
      </div>
    `;

        return widget;
    }

    /**
     * Inject widget
     */
    function injectWidget() {
        // Find insertion point
        const buyBox =
            document.querySelector('[data-qa="buy-box"]') ||
            document.querySelector('.pdp_buybox') ||
            document.querySelector('[data-qa="product-price"]')?.parentElement;

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

        // Otto red gradient
        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, 'rgba(227, 6, 19, 0.2)');
        gradient.addColorStop(1, 'rgba(227, 6, 19, 0)');

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
        ctx.strokeStyle = '#E30613';
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
                        btn.textContent = '✓ Wird verfolgt';
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
