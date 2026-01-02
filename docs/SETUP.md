# MarktMinder Setup Guide

## Prerequisites

- **Node.js** >= 18.0.0
- **Docker & Docker Compose** (for PostgreSQL and Redis)
- **npm** or **pnpm**

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/your-repo/marktminder.git
cd marktminder
```

### 2. Start Database Services

```bash
docker-compose up -d
```

This starts:
- PostgreSQL on port 5432
- Redis on port 6379

### 3. Setup Backend

```bash
cd backend
npm install
cp .env.example .env  # Configure your environment variables
npm run migrate       # Run database migrations
npm run dev          # Start development server on port 3001
```

### 4. Setup Frontend

```bash
cd frontend
npm install
npm run dev          # Start on port 3000
```

### 5. Setup Scraper (Optional)

The scraper requires additional system dependencies for Puppeteer.

#### Ubuntu/Debian (including WSL):
```bash
sudo apt-get update
sudo apt-get install -y \
  libnss3 \
  libnspr4 \
  libatk1.0-0 \
  libatk-bridge2.0-0 \
  libcups2 \
  libdrm2 \
  libxkbcommon0 \
  libxcomposite1 \
  libxdamage1 \
  libxfixes3 \
  libxrandr2 \
  libgbm1 \
  libasound2
```

#### After installing dependencies:
```bash
cd scraper
npm install
npm run dev
```

## Environment Variables

### Backend (.env)

| Variable | Description | Default |
|----------|-------------|---------|
| PORT | Server port | 3001 |
| DATABASE_URL | PostgreSQL connection string | postgresql://postgres:postgres@localhost:5432/marktminder |
| REDIS_URL | Redis connection string | redis://localhost:6379 |
| JWT_SECRET | Secret for JWT tokens | (required in production) |
| JWT_REFRESH_SECRET | Secret for refresh tokens | (required in production) |

### Scraper (.env)

| Variable | Description | Default |
|----------|-------------|---------|
| DATABASE_URL | PostgreSQL connection string | (same as backend) |
| REDIS_URL | Redis connection string | (same as backend) |
| SCRAPER_API_ENABLED | Enable ScraperAPI (true/false) | true |
| SCRAPER_API_KEY | ScraperAPI Key | (required if enabled) |
| USE_FREE_PROXIES | Fallback to free proxies | true |

## Default Credentials

For development, an admin account is seeded:
- **Email**: admin@marktminder.de
- **Password**: Admin123!

## Architecture

```
MarktMinder/
├── frontend/          # Next.js 14 React app
├── backend/           # Express.js API server
├── scraper/           # Puppeteer-based price scraper
├── database/          # Migrations and seeds
├── extension/         # Browser extension (Chrome)
└── docs/              # Documentation
```

## Common Issues

### Puppeteer fails to launch
Install the required system libraries (see "Setup Scraper" section above).

### Database connection refused
Make sure Docker containers are running: `docker ps`

### Port already in use
Check what's using the port: `lsof -i :3000` or `lsof -i :3001`
