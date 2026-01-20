# Observability Infrastructure

This document outlines the observability stack for MarktMinder, including logging, error monitoring, and performance tracking.

## Components

### 1. Structured Logging (Winston)

**Location**: `apps/backend/src/utils/logger.ts`, `apps/scraper/src/utils/logger.ts`

**Features**:
- JSON format for production (machine-readable)
- Human-readable format for development
- Log levels: error, warn, info, http, verbose, debug
- Request ID correlation for distributed tracing
- Performance timing utilities

**Usage**:
```typescript
import { logger } from './utils/logger';

logger.info('User logged in', { userId: '123', email: 'user@example.com' });
logger.error('Payment failed', { error: err.message, userId: '123' });
```

---

### 2. Log Aggregation (Grafana Loki)

**Components**:
- **Loki**: Log storage and indexing
- **Promtail**: Log shipping from Docker containers
- **Grafana**: Visualization and dashboards

**Access**:
- Grafana: http://localhost:3030
- Default credentials: `admin` / `admin`

**Common Queries**:
```logql
# All backend logs
{container_name="marktminder-backend"}

# Error logs only
{container_name="marktminder-backend"} |= "error"

# API request logs
{container_name="marktminder-backend"} | json | level="http"

# Logs for specific request
{container_name="marktminder-backend"} | json | requestId="abc-123"

# Rate of errors in last 5 minutes
rate({container_name="marktminder-backend"} |= "error" [5m])
```

**Log Retention**: 30 days

---

### 3. Error Monitoring (Sentry)

**Setup**:
- Backend: `apps/backend/src/config/sentry.ts`
- Frontend: `apps/frontend/sentry.{client,server}.config.ts`

**Features**:
- Automatic error tracking
- Performance monitoring (10% sample rate in production)
- Session replay for frontend errors
- Request context capture

**Configuration**:
```bash
# Backend
SENTRY_DSN=https://your-key@sentry.io/project-id

# Frontend
NEXT_PUBLIC_SENTRY_DSN=https://your-key@sentry.io/project-id
```

---

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────┐
│   Backend   │────▶│   Promtail   │────▶│  Loki   │
│  (Winston)  │     │ (Log Shipper)│     │ (Store) │
└─────────────┘     └──────────────┘     └────┬────┘
                                               │
┌─────────────┐                                │
│   Scraper   │────▶                            │
│  (Winston)  │                                 │
└─────────────┘                                 │
                                                ▼
                                          ┌──────────┐
                                          │ Grafana  │
                                          │(Visualize)│
                                          └──────────┘
```

---

## Getting Started

### Start the Observability Stack

```bash
# Start all services including logging
docker-compose up -d

# Check service health
docker-compose ps

# View Loki logs
docker-compose logs -f loki

# View Promtail logs
docker-compose logs -f promtail
```

### Access Grafana

1. Open http://localhost:3030
2. Login with `admin` / `admin`
3. Navigate to **Explore** (left sidebar)
4. Select **Loki** data source
5. Run a query: `{container_name="marktminder-backend"}`

### Create a Dashboard

1. Click **Dashboards** → **New** → **New Dashboard**
2. Add a panel with LogQL query
3. Configure visualization (logs, time series, etc.)
4. Save the dashboard

---

## Troubleshooting

### Logs Not Appearing in Grafana

**Check Promtail is running**:
```bash
docker-compose ps promtail
docker-compose logs promtail
```

**Verify Loki is reachable**:
```bash
curl http://localhost:3100/ready
```

**Check Promtail positions file**:
```bash
docker exec marktminder-promtail cat /tmp/positions.yaml
```

### High Memory Usage

**Loki memory limits** can be adjusted in `loki-config.yml`:
```yaml
limits_config:
  max_query_length: 721h
  max_query_lookback: 720h
```

**Adjust retention period** (default 30 days):
```yaml
limits_config:
  retention_period: 168h  # 7 days
```

### Missing Request IDs

Ensure `requestIdMiddleware` is added **before** route handlers in `server.ts`:
```typescript
app.use(requestIdMiddleware);
app.use(requestLoggerMiddleware);
```

---

## Performance Tips

1. **Use labels sparingly**: Only add essential labels (container, level, requestId)
2. **Filter early**: Apply `|= "pattern"` before JSON parsing
3. **Limit time range**: Query shorter time windows for better performance
4. **Use metrics for aggregations**: Convert logs to metrics for long-term trends

---

## Further Reading

- [Loki LogQL Documentation](https://grafana.com/docs/loki/latest/logql/)
- [Winston Documentation](https://github.com/winstonjs/winston)
- [Sentry Node.js Documentation](https://docs.sentry.io/platforms/node/)
