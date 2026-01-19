# MarktMinder DevOps Guide

This document provides comprehensive DevOps documentation for MarktMinder.

---

## 📁 Project Structure

```
MarktMinder/
├── .github/workflows/     # CI/CD pipelines
│   ├── ci.yml             # Main CI pipeline
│   └── release.yml        # Release automation
├── backend/               # Express.js API server
├── frontend/              # Next.js web application
├── scraper/               # Puppeteer scraping service
├── database/              # PostgreSQL migrations
├── extension/             # Browser extensions
├── docs/                  # Documentation
├── docker-compose.yml     # Local development stack
├── CHANGELOG.md           # Version history
├── FEATURES.md            # Feature tracking
└── DEVOPS.md              # This file
```

---

## 🚀 CI/CD Pipeline

### Pipeline Overview

```mermaid
graph LR
    A[Push/PR] --> B[Backend CI]
    A --> C[Frontend CI]
    A --> D[Scraper CI]
    B --> E[Security Scan]
    C --> E
    D --> E
    E --> F{Main Branch?}
    F -->|Yes| G[Docker Build]
    F -->|No| H[End]
    G --> I[Deploy]
```

### Triggers

| Event | Branches | Actions |
|-------|----------|---------|
| Push | main, develop | Full CI + Docker build |
| Pull Request | main, develop | CI only |
| Tag (v*.*.*) | - | Release + Deploy |

### Jobs

1. **Backend CI**: Lint → Type Check → Test → Build
2. **Frontend CI**: Lint → Type Check → Test → Build
3. **Scraper CI**: Lint → Type Check → Test → Build
4. **Security Scan**: npm audit for vulnerabilities
5. **Docker Build**: Build and push images (main only)
6. **Release**: Create GitHub release (tags only)

---

## 🐳 Docker Configuration

### Development

```bash
# Start all services
docker-compose up -d

# Start specific services
docker-compose up -d postgres redis

# View logs
docker-compose logs -f backend

# Rebuild after changes
docker-compose build --no-cache
```

### Production

```bash
# Build production images
docker build -t marktminder-backend:latest ./backend
docker build -t marktminder-frontend:latest ./frontend
docker build -t marktminder-scraper:latest ./scraper

# Run with production compose
docker-compose -f docker-compose.prod.yml up -d
```

---

## 🔐 Environment Variables

### Backend (.env)

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

# App
NODE_ENV=production
PORT=3001
FRONTEND_URL=https://marktminder.de
```

### Frontend (.env.local)

```env
NEXT_PUBLIC_API_URL=https://api.marktminder.de/api
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

### Scraper (.env)

```env
DATABASE_URL=postgresql://user:pass@localhost:5432/marktminder
REDIS_URL=redis://localhost:6379
SCRAPER_API_KEY=your-scraperapi-key
SCRAPER_API_ENABLED=true
```

---

## 📊 Monitoring

### Health Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /health` | Basic health check |
| `GET /health/ready` | Readiness (DB + Redis) |

### Recommended Tools

- **Logging**: Winston (built-in) → Loki/ELK
- **Metrics**: Prometheus + Grafana
- **APM**: Datadog, New Relic, or Sentry
- **Uptime**: UptimeRobot, Pingdom

---

## 🔄 Deployment Strategies

### Option 1: Docker Compose (VPS)

```bash
# On server
cd /opt/marktminder
git pull origin main
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d
```

### Option 2: Kubernetes

```yaml
# k8s/deployment.yml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: marktminder-backend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: marktminder-backend
  template:
    spec:
      containers:
        - name: backend
          image: marktminder-backend:latest
          ports:
            - containerPort: 3001
```

### Option 3: Vercel + Railway

- **Frontend**: Deploy to Vercel
- **Backend**: Deploy to Railway
- **Database**: Use managed PostgreSQL (Supabase, Neon)
- **Redis**: Use managed Redis (Upstash)

---

## 🔒 Security Checklist

- [ ] Enable HTTPS everywhere
- [ ] Configure CORS properly
- [ ] Set secure cookie flags
- [ ] Enable rate limiting
- [ ] Use secrets manager for credentials
- [ ] Regular dependency updates
- [ ] Database backups enabled
- [ ] Log sensitive data redaction

---

## 📋 Release Process

### 1. Update Version

```bash
# Update version in package.json files
npm version patch  # or minor, major

# Update CHANGELOG.md
# Update FEATURES.md if needed
```

### 2. Create Release

```bash
# Commit changes
git add .
git commit -m "chore: release v1.1.0"

# Tag the release
git tag -a v1.1.0 -m "Release v1.1.0"

# Push with tags
git push origin main --tags
```

### 3. Automated Actions

The GitHub Actions will:
1. Run full CI pipeline
2. Create GitHub release with changelog
3. Build Docker images
4. Deploy to production (if configured)

---

## 🛠️ Code Review & Branching Strategy

To maintain high code quality and stability, we follow a strict Pull Request (PR) workflow.

### Branching Model

| Branch Type | naming Convention | Target Branch |
|-------------|-------------------|---------------|
| **Features**| `feature/*` | `main` |
| **Bug Fixes**| `fix/*` | `main` |
| **Refactor** | `refactor/*` | `main` |
| **Hotfix**   | `hotfix/*` | `main` |

### Pull Request Guidelines

1. **Self-Review**: Before opening a PR, run `npm run lint` and `npm run build` locally.
2. **Linked Tasks**: Every PR must link to a task in `SPRINTS.md`.
3. **Automated Checks**: The `ci.yml` workflow MUST pass on all PRs.
4. **Documentation**: Update `CHANGELOG.md` for any user-facing changes.

---

## 🆘 Troubleshooting

### Common Issues

**CI fails on npm ci**
```bash
# Clear npm cache
npm cache clean --force
# Delete lock file and reinstall
rm package-lock.json && npm install
```

**Docker build fails**
```bash
# Prune Docker system
docker system prune -af
# Rebuild without cache
docker-compose build --no-cache
```

**Database connection issues**
```bash
# Check if PostgreSQL is running
docker-compose ps postgres
# Check logs
docker-compose logs postgres
```

---

## 📞 Support

For DevOps questions:
1. Check this documentation
2. Review GitHub Actions logs
3. Open an issue with `[DevOps]` prefix

---

*Last updated: 2026-01-19*
