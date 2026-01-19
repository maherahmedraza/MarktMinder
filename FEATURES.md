# MarktMinder Features

This document tracks all features in MarktMinder, their status, and planned enhancements.

---

## 📊 Feature Status Legend

| Status | Meaning |
|--------|---------|
| ✅ Released | Feature is live in production |
| 🚧 In Progress | Currently being developed |
| 📋 Planned | Approved for development |
| 💡 Proposed | Under consideration |
| ❌ Deprecated | Scheduled for removal |

---

## 🎯 Core Features

### Authentication & Users

| Feature | Status | Version | Tier |
|---------|--------|---------|------|
| Email/Password Registration | ✅ Released | 1.0.0 | Free |
| JWT Authentication | ✅ Released | 1.0.0 | Free |
| Refresh Token Support | ✅ Released | 1.0.0 | Free |
| Password Reset | ✅ Released | 1.0.0 | Free |
| Profile Management | ✅ Released | 1.0.0 | Free |
| Admin User Management | ✅ Released | 1.0.0 | Admin |
| OAuth (Google) | ✅ Released | 1.2.0 | Free |
| GitHub OAuth | 📋 Planned | 1.2.0 | Free |
| 2FA Support | 💡 Proposed | TBD | Pro |

### Product Tracking

| Feature | Status | Version | Tier |
|---------|--------|---------|------|
| Amazon.de Tracking | ✅ Released | 1.0.0 | Free |
| Etsy Tracking | ✅ Released | 1.0.0 | Free |
| Otto.de Tracking | ✅ Released | 1.0.0 | Free |
| Price History Charts | ✅ Released | 1.0.0 | Free |
| Product Notes | ✅ Released | 1.0.0 | Free |
| Bulk Product Import | 📋 Planned | 1.2.0 | Pro |
| Product Comparison | 💡 Proposed | TBD | Pro |
| eBay Tracking | 💡 Proposed | TBD | Pro |

### Price Alerts

| Feature | Status | Version | Tier |
|---------|--------|---------|------|
| Price Below Target | ✅ Released | 1.0.0 | Free |
| Price Above Limit | ✅ Released | 1.0.0 | Free |
| Percentage Drop Alert | ✅ Released | 1.0.0 | Pro |
| Back in Stock Alert | ✅ Released | 1.0.0 | Free |
| All-Time Low Alert | ✅ Released | 1.0.0 | Pro |
| Human-Readable Labels | ✅ Released | 1.1.0 | Free |
| Duplicate Prevention | ✅ Released | 1.1.0 | Free |
| Notification Toggle | ✅ Released | 1.2.0 | All |
| Email Notifications | ✅ Released | 1.2.0 | Free |
| Push Notifications | ✅ Released | 1.2.0 | Pro |
| SMS Notifications | 💡 Proposed | TBD | Business |

### AI Features

| Feature | Status | Version | Tier |
|---------|--------|---------|------|
| Price Predictions | ✅ Released | 1.0.0 | Pro |
| Deal Radar | ✅ Released | 1.0.0 | Power |
| Price DNA Analysis | ✅ Released | 1.0.0 | Power |
| Personalized Deals | ✅ Released | 1.0.0 | Power |
| Best Buy Windows | ✅ Released | 1.0.0 | Pro |
| ML Model Improvements | 📋 Planned | 1.3.0 | Pro |

### Subscription & Billing

| Feature | Status | Version | Tier |
|---------|--------|---------|------|
| Stripe Integration | ✅ Released | 1.0.0 | All |
| Monthly Subscriptions | ✅ Released | 1.0.0 | All |
| Yearly Subscriptions | ✅ Released | 1.0.0 | All |
| Customer Portal | ✅ Released | 1.0.0 | All |
| Usage Limits | ✅ Released | 1.0.0 | All |
| PayPal Support | 💡 Proposed | TBD | All |

### Browser Extension

| Feature | Status | Version | Tier |
|---------|--------|---------|------|
| Chrome Extension | ✅ Released | 1.0.0 | Free |
| Firefox Extension | ✅ Released | 1.0.0 | Free |
| One-Click Tracking | ✅ Released | 1.0.0 | Free |
| Price Overlay | 📋 Planned | 1.2.0 | Pro |
| Safari Extension | 💡 Proposed | TBD | Free |

---

## 🚀 Upcoming Releases

### Version 1.2.0 (Planned - Q1 2026)

**Theme: Notifications & Onboarding**

- [ ] Email notification service
- [ ] Push notification support
- [ ] Toast notifications in UI
- [ ] Improved onboarding flow
- [ ] Swagger API documentation
- [ ] OAuth authentication (Google)

### Version 1.3.0 (Planned - Q2 2026)

**Theme: AI Improvements & Mobile**

- [ ] Improved ML prediction models
- [ ] Mobile-responsive redesign
- [ ] Bulk operations (import/export)
- [ ] Webhook integrations
- [ ] API rate limiting per tier

---

## 📈 Feature Metrics

### Current Stats (v1.1.0)
- **Total Features**: 45
- **Released**: 38 (84%)
- **In Progress**: 0
- **Planned**: 7 (16%)

### Tier Distribution
| Tier | Features |
|------|----------|
| Free | 22 |
| Pro | 10 |
| Power | 4 |
| Business | 1 |
| Admin | 1 |

---

## 🔄 Feature Request Process

1. **Propose**: Open a GitHub issue with `[Feature Request]` prefix
2. **Discuss**: Community feedback and prioritization
3. **Plan**: Add to roadmap with target version
4. **Develop**: Implementation and testing
5. **Release**: Include in changelog and documentation

---

## 📝 Recently Added (v1.1.0)

### Human-Readable Alert Labels
- **Type**: UI Enhancement
- **Impact**: All users
- **Details**: Alert types now display as "Price Target" instead of `price_below`

### Duplicate Alert Prevention
- **Type**: Backend Logic
- **Impact**: All users
- **Details**: System prevents creating identical alerts, returns 409 Conflict

### Confirmation Modal Component
- **Type**: UI Component
- **Impact**: All users
- **Details**: Consistent modal for delete confirmations across the app

---

*Last updated: 2026-01-19*
