# MarktMinder Browser Extension

Chrome/Firefox extension for tracking product prices on Amazon, Etsy, and Otto.de.

## Features

- 📊 **Price History** - View historical prices directly on product pages
- 🔔 **Price Alerts** - Get notified when prices drop to your target
- ➕ **Quick Tracking** - Add products to your watchlist with one click
- 🔄 **Real-time Sync** - Synced with your MarktMinder account

## Supported Marketplaces

- Amazon (US, DE, UK, FR, IT, ES, NL, CA)
- Etsy
- Otto.de

## Installation

### From Source (Development)

1. Clone this repository
2. Open Chrome and navigate to `chrome://extensions`
3. Enable "Developer mode" (toggle in top right)
4. Click "Load unpacked"
5. Select the `extension` folder

### From Chrome Web Store

Coming soon!

## Development

The extension is built with:
- Manifest V3 (Chrome's latest extension format)
- Vanilla JavaScript (no build step required)
- Chart.js for price charts

### Structure

```
extension/
├── manifest.json        # Extension manifest
├── popup/               # Popup UI
│   ├── popup.html
│   ├── popup.css
│   └── popup.js
├── background/          # Service worker
│   └── service-worker.js
├── content/             # Content scripts
│   ├── amazon.js
│   ├── etsy.js
│   ├── otto.js
│   └── styles.css
├── options/             # Settings page
│   ├── options.html
│   └── options.js
└── assets/              # Icons
    ├── icon-16.png
    ├── icon-48.png
    └── icon-128.png
```

## Permissions

- `storage` - Save settings and auth tokens
- `alarms` - Periodic badge updates
- `notifications` - Price drop alerts
- Host permissions - Access to supported marketplaces

## Privacy

- We only access product pages on supported marketplaces
- Your data is synced securely with your MarktMinder account
- We don't track browsing history or sell data

## License

MIT License
