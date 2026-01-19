# Changelog

All notable changes to MarktMinder will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **OAuth Authentication**: "Sign in with Google" via Passport.js configuration.
- **Push Notifications**: Web Push integration for immediate price alerts.
- **Settings Page**: Updated with "Push Notifications" toggle and scrollable tabs.
- Swagger/OpenAPI documentation at `/api/docs`
- Toast notification component for frontend
- CI/CD pipeline with GitHub Actions
- Comprehensive project documentation (FEATURES.md, DEVOPS.md)
- Dockerfiles for all services (backend, frontend, scraper)
- Brute force protection for login endpoint (rate limiting + IP blocking)
- Scraper retry mechanism with exponential backoff
- `llms.txt` for AI crawler guidance (ChatGPT, Perplexity, etc.)
- Schema.org structured data for LLM-friendly SEO
- Web Design Best Practices documentation (`WEB_DESIGN_BEST_PRACTICES.md`)
- QA Testing documentation (`TESTING.md`)
- **Email notification service** with Nodemailer
  - Welcome emails on registration
  - Price drop alert emails
  - Password reset emails
  - Professional HTML email templates
- Mobile hamburger menu for landing page header

### Changed
- Updated API info endpoint to include documentation link
- Login errors now show remaining attempts
- Golden Ratio typography system (1.618 scale)
- 8px grid spacing system for visual harmony
- Fluid typography with `clamp()` for responsive scaling
- Professional heading and body text styles
- Lazy loading for PriceChart (reduces initial bundle)
- Mobile-responsive Admin Users table (card layout)
- Mobile-responsive Alerts table (card layout)

### Security
- Rate limiting specifically for authentication endpoints
- Progressive slowdown after failed login attempts
- Temporary IP blocking after 5 failed attempts

---

## [1.1.0] - 2026-01-18

### Added
- `ConfirmationModal` component for consistent delete confirmations
- Duplicate alert prevention in backend (returns 409 Conflict)
- Human-readable alert type labels in UI

### Changed
- Alert toggle now correctly merges state instead of replacing
- `getAlertTypeLabel()` function expanded to cover all alert types:
  - `price_below` → "Price Target"
  - `price_above` → "Price Above Limit"
  - `price_drop_pct` → "Price Drop (%)"
  - `price_rise_pct` → "Price Increase (%)"
  - `back_in_stock` → "Back in Stock"
  - `all_time_low` → "All-Time Low"
  - `any_change` → "Any Price Change"

### Fixed
- **Critical**: Alert toggle crash (`Cannot read properties of undefined (reading 'product')`)
- **Critical**: Scraper `__name` polyfill now correctly returns target function
- Alert type API response type mismatch between frontend and backend
- Delete button not working due to missing confirmation logic

---

## [1.0.0] - 2025-12-31

### Added
- Initial release of MarktMinder
- Multi-marketplace price tracking (Amazon, Etsy, Otto)
- User authentication with JWT + refresh tokens
- Product management with price history
- Smart price alerts system
- AI-powered price predictions (Pro tier)
- Deal Radar feature (Power tier)
- Price DNA analysis (Power tier)
- Subscription management with Stripe
- Admin panel for user management
- Browser extension support
- PWA support with offline capabilities
- Real-time updates via WebSocket

### Security
- Rate limiting per API endpoint
- Helmet.js security headers
- CORS configuration
- Input validation with express-validator

---

## Version History

| Version | Date | Highlights |
|---------|------|------------|
| 1.1.0 | 2026-01-18 | Alert fixes, duplicate prevention, UI improvements |
| 1.0.0 | 2025-12-31 | Initial release |

[Unreleased]: https://github.com/maherahmedraza/MarktMinder/compare/v1.1.0...HEAD
[1.1.0]: https://github.com/maherahmedraza/MarktMinder/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/maherahmedraza/MarktMinder/releases/tag/v1.0.0
