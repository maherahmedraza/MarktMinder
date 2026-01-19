# Web Design Best Practices Guide

A comprehensive reference for creating professional, aesthetically pleasing, and high-performance websites based on expert recommendations and research.

---

## Table of Contents

1. [Typography](#typography)
2. [Visual Hierarchy](#visual-hierarchy)
3. [The Golden Ratio](#the-golden-ratio)
4. [Spacing & Proportions](#spacing--proportions)
5. [Color Theory](#color-theory)
6. [Performance Optimization](#performance-optimization)
7. [LLM-Friendly Design](#llm-friendly-design)
8. [Accessibility](#accessibility)
9. [Mobile-First Design](#mobile-first-design)
10. [Component Design](#component-design)

---

## Typography

Typography is fundamental to web design, directly impacting readability, user experience, and brand perception.

### Font Selection

| Use Case | Recommendation |
|----------|----------------|
| Body Text | Sans-serif (Inter, Roboto, Sora) for screens |
| Headings | Same family or complementary serif |
| Code | Monospace (JetBrains Mono, Fira Code) |
| Display | Variable fonts for flexibility |

### Type Scale (Golden Ratio 1.618)

Starting from 16px base:

```
xs:   10px (0.694rem)
sm:   13px (0.833rem)
base: 16px (1rem)
lg:   19px (1.2rem)
xl:   26px (1.44rem)
2xl:  32px (1.728rem)
3xl:  42px (2.074rem)
4xl:  52px (2.488rem)
5xl:  64px (2.986rem)
6xl:  80px (3.583rem)
```

### Line Height Guidelines

| Text Type | Line Height |
|-----------|-------------|
| Headings | 1.0 - 1.2 |
| Subheadings | 1.2 - 1.35 |
| Body text | 1.5 - 1.75 |
| Dense text | 1.3 - 1.5 |

### Optimal Line Length

Research shows **50-75 characters** per line is optimal for reading comfort. Longer lines cause eye fatigue; shorter lines interrupt reading flow.

```css
.prose {
  max-width: 65ch;
}
```

### Letter Spacing (Tracking)

| Element | Tracking |
|---------|----------|
| Large headings | -0.025em to -0.05em (tighter) |
| Body text | 0 (normal) |
| Uppercase text | 0.05em to 0.1em (wider) |
| Small text | 0.025em (slightly wider) |

### Contrast Requirements (WCAG)

| Text Size | Minimum Ratio |
|-----------|---------------|
| Normal text (< 18px) | 4.5:1 |
| Large text (≥ 18px bold, ≥ 24px) | 3:1 |
| Enhanced (AAA) | 7:1 / 4.5:1 |

---

## Visual Hierarchy

Visual hierarchy guides users through content by establishing clear importance levels.

### Methods to Establish Hierarchy

1. **Size**: Larger elements draw more attention
2. **Color**: Vibrant colors stand out from muted tones
3. **Contrast**: Dark on light (or vice versa)
4. **Spacing**: Whitespace isolates important elements
5. **Position**: Top-left to bottom-right reading pattern
6. **Typography**: Weight, style, and size variations

### F-Pattern and Z-Pattern

- **F-Pattern**: For text-heavy pages (users scan left-to-right, then down left side)
- **Z-Pattern**: For minimal pages (eye moves in Z shape across page)

### Above the Fold

Place the most critical content and CTAs in the initial viewport:

- Primary headline
- Value proposition
- Main call-to-action
- Trust signals

---

## The Golden Ratio

The Golden Ratio (φ = 1.618) creates naturally pleasing proportions.

### Applications

#### Typography Scale
```
Base font × 1.618 = Next size up
16px × 1.618 = 26px
26px × 1.618 = 42px
```

#### Layout Proportions
```
Sidebar : Content = 1 : 1.618
         (~38% : ~62%)
```

#### Spacing
```
Small gap × 1.618 = Medium gap
Medium gap × 1.618 = Large gap
```

#### Image Dimensions
```
Width : Height = 1.618 : 1
1200 × 742 pixels (approximately)
```

### Fibonacci Sequence Alternative

Similar effect: 8, 13, 21, 34, 55, 89, 144...

```css
/* Fibonacci-based spacing */
--space-sm: 8px;
--space-md: 13px;
--space-lg: 21px;
--space-xl: 34px;
--space-2xl: 55px;
```

---

## Spacing & Proportions

### 8px Grid System

All spacing should be multiples of 8px for visual harmony:

```
4px   - 0.5 unit (micro spacing)
8px   - 1 unit (base)
16px  - 2 units (small gaps)
24px  - 3 units (medium gaps)
32px  - 4 units (large gaps)
48px  - 6 units (section padding)
64px  - 8 units (major sections)
96px  - 12 units (hero spacing)
128px - 16 units (page sections)
```

### Component Spacing

| Component | Padding | Margin |
|-----------|---------|--------|
| Buttons | 8-12px vertical, 16-24px horizontal |
| Cards | 24-32px | 16-24px gap |
| Forms | 16px between fields | 24px sections |
| Sections | 64-96px vertical | - |

### Vertical Rhythm

Maintain consistent vertical spacing:

```css
h1 { margin-bottom: 24px; }
h2 { margin-top: 48px; margin-bottom: 16px; }
h3 { margin-top: 32px; margin-bottom: 12px; }
p  { margin-bottom: 24px; }
```

---

## Color Theory

### Color Harmony Models

1. **Monochromatic**: Single hue with varying lightness
2. **Complementary**: Opposite colors on wheel
3. **Analogous**: Adjacent colors on wheel
4. **Triadic**: Three evenly spaced colors

### 60-30-10 Rule

- **60%**: Dominant color (background, large areas)
- **30%**: Secondary color (sections, cards)
- **10%**: Accent color (CTAs, highlights)

### Dark Mode Considerations

- Don't simply invert colors
- Use slightly muted backgrounds (#121212 instead of pure black)
- Reduce contrast for large areas of white text
- Maintain consistent brand colors

---

## Performance Optimization

### Lazy Loading

```javascript
// Images
import Image from 'next/image';
<Image src="/photo.jpg" loading="lazy" />

// Components
const Chart = dynamic(() => import('./Chart'), {
  loading: () => <Skeleton />,
  ssr: false
});
```

### Image Optimization

| Format | Use Case |
|--------|----------|
| WebP | Primary choice, 30% smaller than JPEG |
| AVIF | Best compression, newer support |
| SVG | Icons, logos, illustrations |
| PNG | Transparency needed |

### Core Web Vitals Targets

| Metric | Good | Needs Improvement |
|--------|------|-------------------|
| LCP (Largest Contentful Paint) | < 2.5s | 2.5s - 4s |
| FID (First Input Delay) | < 100ms | 100ms - 300ms |
| CLS (Cumulative Layout Shift) | < 0.1 | 0.1 - 0.25 |

### Font Loading

```css
/* Use font-display for fast rendering */
@font-face {
  font-family: 'Sora';
  font-display: swap;
}
```

---

## LLM-Friendly Design

Optimize for AI search engines (ChatGPT, Perplexity, Google AI).

### llms.txt File

Place at `/llms.txt` in root:

```markdown
# Site Name

## About
Brief description of the site.

## Key Pages
- / - Homepage
- /pricing - Plans and pricing
- /features - Feature list

## API
API documentation location and key endpoints.
```

### Structured Data (JSON-LD)

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "App Name",
  "applicationCategory": "Category",
  "offers": {
    "@type": "Offer",
    "price": "9.99"
  }
}
</script>
```

### Content Structure

- Use semantic HTML (h1, h2, h3, article, section)
- Write fact-dense, quotable paragraphs
- Include FAQ sections with clear Q&A format
- Use descriptive, keyword-rich headings

---

## Accessibility

### WCAG 2.1 Guidelines

- **Perceivable**: Content available to all senses
- **Operable**: Interface usable by all
- **Understandable**: Content clear and predictable
- **Robust**: Works with assistive technologies

### Keyboard Navigation

```html
<!-- Ensure all interactive elements are focusable -->
<button>Click me</button>
<a href="/link">Link text</a>
<input type="text" />

<!-- Skip link for screen readers -->
<a href="#main-content" class="sr-only focus:not-sr-only">
  Skip to main content
</a>
```

### ARIA Labels

```html
<button aria-label="Close modal">×</button>
<nav aria-label="Main navigation">...</nav>
```

---

## Mobile-First Design

### Breakpoints

| Name | Min Width | Target |
|------|-----------|--------|
| sm | 640px | Large phones |
| md | 768px | Tablets |
| lg | 1024px | Laptops |
| xl | 1280px | Desktops |
| 2xl | 1536px | Large screens |

### Touch Targets

Minimum touch target: **44x44 pixels** (Apple) or **48x48 pixels** (Google)

### Mobile Patterns

- **Hamburger menu** for navigation
- **Bottom navigation** for primary actions
- **Cards** instead of tables
- **Stacked layouts** instead of columns

---

## Component Design

### Button Sizes

| Size | Padding | Font Size | Use Case |
|------|---------|-----------|----------|
| sm | 8px 16px | 14px | Inline actions |
| md | 12px 24px | 16px | Standard buttons |
| lg | 16px 32px | 18px | CTAs, hero sections |

### Card Anatomy

```
┌─────────────────────────────────────┐
│  [Image/Icon]                  24px │ <- padding
│                                     │
│  Heading (semibold)            16px │ <- gap
│  Subtext (muted)                    │
│                                     │
│  [Content area]                     │
│                                     │
│  [Action buttons]              24px │ <- padding
└─────────────────────────────────────┘
         ↑                        ↑
      12-16px                  12-16px
      radius                   radius
```

### Form Design

- **Labels**: Above inputs (not placeholder only!)
- **Field height**: 40-48px
- **Gap between fields**: 16-24px
- **Error messages**: Below field, red color
- **Success state**: Green checkmark

---

## Summary: Key Principles

1. **Establish clear hierarchy** through size, color, and spacing
2. **Use the Golden Ratio** (1.618) for proportions
3. **Implement 8px grid** for consistent spacing
4. **Prioritize performance** with lazy loading
5. **Design mobile-first** then enhance for desktop
6. **Ensure accessibility** (WCAG 2.1 compliance)
7. **Optimize for AI** with structured data and llms.txt
8. **Maintain consistency** across all components

---

*Document Version: 1.0*
*Last Updated: 2026-01-19*
*Based on research from web design experts and industry standards*
