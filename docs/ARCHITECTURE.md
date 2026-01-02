# MarktMinder Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend                                 │
│                      (Next.js 14)                               │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐   │
│  │Dashboard│ │Products │ │ Alerts  │ │  Admin  │ │  Auth   │   │
│  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘   │
└───────┼──────────┼──────────┼──────────┼──────────┼────────────┘
        │          │          │          │          │
        └──────────┴──────────┴──────────┴──────────┘
                              │
                         HTTP/REST
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         Backend                                  │
│                      (Express.js)                               │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐               │
│  │  Auth   │ │Products │ │ Alerts  │ │  Admin  │               │
│  │ Routes  │ │ Routes  │ │ Routes  │ │ Routes  │               │
│  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘               │
│       └──────────┴──────────┴──────────┘                        │
│                         │                                        │
│              ┌──────────┴───────────┐                           │
│              ▼                      ▼                           │
│       ┌──────────┐          ┌──────────┐                        │
│       │PostgreSQL│          │  Redis   │                        │
│       │   Pool   │          │  Client  │                        │
│       └──────────┘          └──────────┘                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         Scraper                                  │
│                      (Puppeteer)                                │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐                           │
│  │ Amazon  │ │  Etsy   │ │  Otto   │                           │
│  │Scraper  │ │ Scraper │ │ Scraper │                           │
│  └────┬────┘ └────┬────┘ └────┬────┘                           │
│       └──────────┬──────────┘                                   │
│                  ▼                                               │
│           ┌──────────┐                                          │
│           │ BullMQ   │ ◄── Job Queue                            │
│           │  Worker  │                                          │
│           └──────────┘                                          │
└─────────────────────────────────────────────────────────────────┘
```

## Components

### Frontend (Next.js 14)
- **Location**: `/frontend`
- **Port**: 3000
- **Tech**: React 18, TailwindCSS, Chart.js
- **Features**:
  - Server-side rendering
  - App Router
  - Responsive design
  - GDPR-compliant cookie consent

### Backend (Express.js)
- **Location**: `/backend`
- **Port**: 3001
- **Tech**: TypeScript, Express, PostgreSQL, Redis
- **Features**:
  - JWT authentication
  - Rate limiting
  - Request validation (Zod + Express Validator)
  - Error handling middleware

### Scraper (Puppeteer)
- **Location**: `/scraper`
- **Tech**: Puppeteer Extra with Stealth, BullMQ, Cheerio
- **Features**:
  - Smart scheduling (ScraperAPI integration for Amazon)
  - Anti-bot detection bypass (Proxies + User-Agent rotation)
  - Resource blocking for efficiency
  - Proxy support (ScraperAPI + Free Proxy Fallback)

### Database (PostgreSQL)
- **Port**: 5432
- **Key Tables**:
  - `users` - User accounts
  - `products` - Tracked products
  - `user_products` - User-product relationships
  - `price_history` - Price data (TimescaleDB compatible)
  - `alerts` - Price alert configurations
  - `refresh_tokens` - JWT refresh tokens

### Cache (Redis)
- **Port**: 6379
- **Uses**:
  - Session caching
  - Rate limiting
  - Job queue (BullMQ)

## Data Flow

### Adding a Product
1. User pastes product URL in frontend
2. Frontend sends POST to `/api/products`
3. Backend parses URL, extracts marketplace ID
4. Product is created/found in database
5. Product added to user's tracked products
6. Scraper job queued for initial price fetch

### Price Scraping
1. Smart Scheduler checks for products due for update
2. Jobs queued in BullMQ
3. Worker processes jobs concurrently
4. Puppeteer navigates to product page
5. Price extracted using marketplace-specific selectors
6. Price saved to price_history table
7. Alerts checked and triggered if conditions met

### Price Alerts
1. User sets alert with target price
2. Alert saved to database
3. After each price scrape, alerts are checked
4. If condition met, alert is triggered
5. Notification sent (email/push)
6. Alert history recorded

### AI Price Prediction
The prediction service uses linear regression and statistical analysis on price history.

**Algorithm:**
1. **Data Collection**: Fetches last 30 days of price history (minimum 5 data points required)
2. **Linear Regression**: Calculates trend slope and R² confidence
3. **Volatility Analysis**: Standard deviation / mean as percentage
4. **Prediction Generation**: Extrapolates 1-7 days with confidence bounds

**Output Includes:**
- **Trend**: `rising`, `falling`, or `stable`
- **Trend Strength**: 0-100% based on slope significance
- **Confidence Score**: Based on R², data quantity, and stability
- **Price Range**: 7-day forecast with upper/lower bounds
- **Smart Recommendation**: Context-aware buy/wait advice

**Recommendation Logic:**
| Condition | Recommendation |
|-----------|----------------|
| Falling trend > 30% | "Consider waiting for better deal" |
| Rising trend > 30% | "Buy soon to avoid higher prices" |
| Current ≈ Lowest | "Good time to buy!" |
| Current ≈ Highest | "Wait for price drop" |
| Stable | "Set an alert for target price" |

**Location**: `backend/src/services/prediction.service.ts`

## Security

- **Authentication**: JWT with access/refresh tokens
- **Password**: bcrypt hashing
- **Rate Limiting**: 1000 requests per 15 minutes
- **Validation**: All inputs validated with Zod/Express Validator
- **Headers**: Helmet.js for security headers
- **CORS**: Configured for frontend origin

## Environment Variables

See `docs/SETUP.md` for complete list.
