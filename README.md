<p align="center">
  <img src="frontend/public/icons/icon-192x192.png" alt="MarktMinder Logo" width="80" height="80">
</p>

<h1 align="center">MarktMinder</h1>

<p align="center">
  <strong>🛒 AI-Powered Price Tracking for Amazon, Etsy & Otto</strong>
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#demo">Demo</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#tech-stack">Tech Stack</a> •
  <a href="#subscription-tiers">Pricing</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js" alt="Next.js">
  <img src="https://img.shields.io/badge/TypeScript-5.0-blue?style=flat-square&logo=typescript" alt="TypeScript">
  <img src="https://img.shields.io/badge/PostgreSQL-16-336791?style=flat-square&logo=postgresql" alt="PostgreSQL">
  <img src="https://img.shields.io/badge/Stripe-Integrated-635BFF?style=flat-square&logo=stripe" alt="Stripe">
</p>

---

## ✨ Features

### 🎯 Core Features
- **Multi-Marketplace Tracking** - Monitor prices on Amazon.de, Etsy, and Otto.de
- **Price History Charts** - Interactive charts with 7d, 30d, 90d, and 1y views
- **Smart Alerts** - Get notified instantly when prices drop to your target
- **AI Price Predictions** - Machine learning predicts future price trends (Pro+)
- **Deal Radar** - AI-powered deal discovery across all marketplaces (Power+)
- **Price DNA** - Deep analysis of pricing patterns and best buy windows (Power+)

### 🔒 Subscription Tiers

| Feature | Free | Pro €4.99/mo | Power €9.99/mo | Business €29.99/mo |
|---------|:----:|:------------:|:--------------:|:------------------:|
| Tracked Products | 5 | 50 | 200 | Unlimited |
| Price Alerts | 3 | 25 | 100 | Unlimited |
| Price History | 30 days | Full | Full | Full |
| AI Predictions | ❌ | ✅ | ✅ | ✅ |
| Deal Radar | ❌ | ❌ | ✅ | ✅ |
| Price DNA | ❌ | ❌ | ✅ | ✅ |
| API Access | ❌ | 100/day | 1000/day | 10,000/day |
| Priority Scraping | ❌ | ❌ | ✅ | ✅ |

### 🧩 Browser Extension
- One-click price tracking from product pages
- Real-time price comparison
- Quick access to your watchlist

---

## 📦 Project Structure

```
MarktMinder/
├── 🖥️  frontend/         # Next.js 14 web application
├── ⚙️  backend/          # Express.js API server  
├── 🕷️  scraper/          # Price scraping service (Puppeteer)
├── 🧩  extension/        # Chrome/Firefox browser extension
├── 🗄️  database/         # PostgreSQL migrations & seeds
└── 📚  docs/             # API & architecture documentation
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 14, React 18, TailwindCSS, Recharts |
| **Backend** | Express.js, TypeScript, Node.js 20 |
| **Database** | PostgreSQL 16, Redis 7 |
| **Payments** | Stripe (Subscriptions + Checkout) |
| **Scraping** | Puppeteer, Cheerio, Anti-detection |
| **Auth** | JWT + Refresh Tokens |
| **Deployment** | Docker, Docker Compose |

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Docker & Docker Compose
- PostgreSQL 16+ (or use Docker)
- Redis 7+ (or use Docker)

### 1. Clone & Install

```bash
git clone https://github.com/maherahmedraza/MarktMinder.git
cd MarktMinder

# Install all dependencies
cd backend && npm install && cd ..
cd frontend && npm install && cd ..
cd scraper && npm install && cd ..
```

### 2. Environment Setup

```bash
# Backend
cp backend/.env.example backend/.env
# Edit backend/.env with your database credentials and Stripe keys

# Scraper
cp scraper/.env.example scraper/.env
```

### 3. Start with Docker (Recommended)

```bash
# Start PostgreSQL and Redis
docker-compose up -d postgres redis

# Run database migrations
cd backend && npm run migrate && cd ..

# Start all services
docker-compose up -d
```

### 4. Manual Development Mode

```bash
# Terminal 1: Backend
cd backend && npm run dev

# Terminal 2: Frontend
cd frontend && npm run dev

# Terminal 3: Scraper (optional)
cd scraper && npm run dev
```

### 5. Access the App

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **API Docs**: http://localhost:3001/api-docs (Swagger)

---

## 🔗 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login user |
| POST | `/api/auth/refresh` | Refresh access token |

### Products
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/products` | Get tracked products |
| POST | `/api/products` | Add product to track |
| GET | `/api/products/:id` | Get product with price history |
| GET | `/api/products/:id/predict` | Get AI price prediction (Pro+) |
| GET | `/api/products/:id/dna` | Get Price DNA analysis (Power+) |

### Deal Radar (Power+)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/products/deals` | Get top deals |
| GET | `/api/products/deals/personal` | Get personalized deals |
| GET | `/api/products/deals/stats` | Get deal statistics |

### Billing
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/billing/subscription` | Get current subscription |
| POST | `/api/billing/create-checkout` | Create Stripe checkout session |
| POST | `/api/billing/create-portal` | Create Stripe billing portal |

---

## 🔐 Environment Variables

### Backend (`backend/.env`)

```env
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/marktminder
REDIS_URL=redis://localhost:6379

# Auth
JWT_SECRET=your-super-secret-key
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_PRO_MONTHLY=price_...
STRIPE_PRICE_POWER_MONTHLY=price_...
STRIPE_PRICE_BUSINESS_MONTHLY=price_...

# Frontend URL
FRONTEND_URL=http://localhost:3000
```

---

## 📖 Documentation

- [API Documentation](./docs/API.md)
- [Architecture Overview](./docs/ARCHITECTURE.md)
- [Setup Guide](./docs/SETUP.md)
- [Extension Guide](./extension/README.md)

---

## 🤝 Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

MIT License - see [LICENSE](./LICENSE) for details.

---

<p align="center">
  <strong>MarktMinder</strong> - Made with ❤️ for smart shoppers
  <br>
  <sub>Built with Next.js, Express, PostgreSQL & Stripe</sub>
</p>
