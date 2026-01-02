# MarktMinder API Documentation

Base URL: `http://localhost:3001/api`

## Authentication

All protected endpoints require a Bearer token in the Authorization header:
```
Authorization: Bearer <access_token>
```

---

## Auth Endpoints

### POST /auth/register
Register a new user.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "Password123",
  "name": "John Doe"
}
```

**Response:** `201 Created`
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "emailVerified": false
  },
  "tokens": {
    "accessToken": "jwt...",
    "refreshToken": "jwt...",
    "expiresIn": 900
  }
}
```

---

### POST /auth/login
Login user.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "Password123"
}
```

**Response:** `200 OK`
```json
{
  "user": { ... },
  "tokens": { ... }
}
```

---

### POST /auth/refresh
Refresh access token.

**Request Body:**
```json
{
  "refreshToken": "jwt..."
}
```

---

### POST /auth/logout
Logout user (revoke refresh token).

**Auth Required:** Yes

---

### GET /auth/me
Get current user profile.

**Auth Required:** Yes

---

### PATCH /auth/me
Update current user profile.

**Auth Required:** Yes

**Request Body:**
```json
{
  "name": "New Name",
  "notificationEmail": true,
  "notificationPush": false,
  "defaultCurrency": "EUR",
  "timezone": "Europe/Berlin"
}
```

---

## Products Endpoints

### POST /products
Add a product to track.

**Auth Required:** Yes

**Request Body:**
```json
{
  "url": "https://www.amazon.de/dp/B0CS5PDYMF",
  "customName": "My Product",
  "notes": "Birthday gift idea"
}
```

**Response:** `201 Created`
```json
{
  "message": "Product added to tracking",
  "product": {
    "id": "uuid",
    "marketplace": "amazon",
    "title": "Product Title",
    "currentPrice": 29.99,
    "currency": "EUR"
  }
}
```

---

### GET /products
Get user's tracked products.

**Auth Required:** Yes

**Query Parameters:**
- `marketplace` - Filter by marketplace (amazon, etsy, otto)
- `limit` - Number of results (default: 50, max: 100)
- `offset` - Pagination offset

**Response:**
```json
{
  "products": [...],
  "pagination": {
    "total": 25,
    "limit": 50,
    "offset": 0,
    "hasMore": false
  }
}
```

---

### GET /products/:id
Get a single product with price history.

**Auth Required:** Yes

**Query Parameters:**
- `range` - Time range for history (1d, 7d, 30d, 90d, 1y, all)

**Response:**
```json
{
  "product": { ... },
  "priceHistory": [
    { "time": "2026-01-01T12:00:00Z", "price": 29.99 }
  ],
  "stats": {
    "minPrice": 24.99,
    "maxPrice": 34.99,
    "avgPrice": 29.99,
    "priceChange30d": -5.2
  }
}
```

---

### DELETE /products/:id
Stop tracking a product.

**Auth Required:** Yes

---

### GET /products/:id/predict
Get AI-powered price prediction for a product.

**Auth Required:** Yes

**Query Parameters:**
- `days` - Number of days to predict (1-30, default: 7)

**Response:** `200 OK`
```json
{
  "predictions": [
    {
      "date": "2026-01-02",
      "predictedPrice": 1343.76,
      "lowerBound": 1337.36,
      "upperBound": 1350.17
    }
  ],
  "trend": "rising",
  "trendStrength": 83,
  "confidence": 83,
  "analysis": {
    "volatility": 5.1,
    "averagePrice": 1243.81,
    "priceRange": { "min": 1153.80, "max": 1381.87 },
    "recommendation": "⚡ Price is trending up. Buy soon to avoid higher prices."
  }
}
```

**Trend Values:** `rising` | `falling` | `stable`

**Error:** `422` if insufficient price history (minimum 5 data points required)

---

### GET /products/insights/price-drops
Get products with biggest price drops in the last 7 days.

**Auth Required:** Yes

**Query Parameters:**
- `limit` - Number of results (default: 5)

---

## Alerts Endpoints

### POST /alerts
Create a new price alert.

**Auth Required:** Yes

**Request Body:**
```json
{
  "productId": "uuid",
  "alertType": "price_below",
  "targetPrice": 24.99,
  "notifyEmail": true
}
```

**Alert Types:**
- `price_below` - Notify when price drops below target
- `price_above` - Notify when price rises above target
- `price_drop_pct` - Notify on percentage drop
- `any_change` - Notify on any price change
- `back_in_stock` - Notify when item is back in stock
- `all_time_low` - Notify on all-time low price

---

### GET /alerts
Get user's alerts.

**Auth Required:** Yes

---

### PATCH /alerts/:id
Update an alert.

**Auth Required:** Yes

---

### DELETE /alerts/:id
Delete an alert.

**Auth Required:** Yes

---

## Admin Endpoints

All admin endpoints require admin privileges.

### GET /admin/stats
Get dashboard statistics.

**Response:**
```json
{
  "overview": {
    "totalProducts": 100,
    "totalUsers": 50,
    "totalTracked": 200,
    "activeAlerts": 75
  },
  "marketplaceStats": [...],
  "topTracked": [...],
  "recentDrops": [...]
}
```

---

### GET /admin/products
Get all products with filters.

---

### GET /admin/users
Get all users.

---

### DELETE /admin/users/:id
Delete a user.

---

## Error Responses

All errors follow this format:
```json
{
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

**Common Status Codes:**
- `400` - Bad Request (validation error)
- `401` - Unauthorized (missing/invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `429` - Too Many Requests (rate limited)
- `500` - Internal Server Error
