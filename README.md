# MarktMinder

> Price Tracker for Amazon, Etsy & Otto

A comprehensive price tracking platform that helps you monitor product prices across multiple marketplaces and get notified when prices drop.

## 🚀 Features

- **Multi-Marketplace Support**: Track prices on Amazon, Etsy, and Otto.de
- **Price History Charts**: View historical price data with customizable time ranges
- **Smart Alerts**: Get notified when prices drop to your target
- **Browser Extension**: Check prices directly on product pages
- **API Access**: Integrate with your own applications

## 📦 Project Structure

```
MarktMinder/
├── backend/          # Express API server
├── frontend/         # Next.js web application
├── extension/        # Chrome/Firefox browser extension
├── scraper/          # Price scraping service
├── database/         # Database migrations and seeds
└── infrastructure/   # Docker and deployment configs
```

## 🛠️ Tech Stack

- **Backend**: Node.js, Express, TypeScript
- **Database**: PostgreSQL + TimescaleDB
- **Cache**: Redis
- **Frontend**: Next.js 14, React, Tailwind CSS
- **Extension**: Chrome Manifest V3
- **Scraping**: Puppeteer, Cheerio

## 🏃 Quick Start

### Prerequisites

- Node.js 18+
- Docker & Docker Compose
- PostgreSQL 16+ (or use Docker)
- Redis 7+ (or use Docker)

### Using Docker (Recommended)

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f backend
```

### Manual Setup

1. **Database Setup**
```bash
# Start PostgreSQL and Redis
docker-compose up -d postgres redis

# Run migrations
cd backend
npm install
npm run migrate
```

2. **Backend**
```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

3. **Frontend** (coming soon)
```bash
cd frontend
npm install
npm run dev
```

## 🔗 API Endpoints

| Endpoint | Description |
|----------|-------------|
| `POST /api/auth/register` | Register new user |
| `POST /api/auth/login` | Login user |
| `GET /api/products` | Get tracked products |
| `POST /api/products` | Add product to track |
| `GET /api/products/:id` | Get product with price history |
| `GET /api/alerts` | Get user alerts |
| `POST /api/alerts` | Create price alert |

## 📖 Documentation

- [API Documentation](./docs/api.md)
- [Extension Guide](./extension/README.md)
- [Contributing](./CONTRIBUTING.md)

## 📄 License

MIT License - see [LICENSE](./LICENSE) for details.

---

**MarktMinder** - Made with ❤️ for smart shoppers
