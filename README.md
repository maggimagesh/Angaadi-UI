# Angaadi UI - E-Commerce Platform

A modern, accessible, and cross-browser compatible e-commerce web application for shopping in India.

## Features

- 🛒 Familiar large-retailer storefront UI — navy chrome, grey ground, white cards
- 🌐 Cross-browser compatible (Chrome, Firefox, Safari, Edge, IE11)
- 📱 Fully responsive (320px to desktop)
- ♿ WCAG 2.1 AA accessible
- ⚡ Optimized performance with code splitting
- 🔒 Type-safe with TypeScript

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

The development server runs at `http://localhost:3000`

## Technology Stack

- **React 19** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **React Router** - Client-side routing
- **Zustand** - State management
- **PostCSS + Autoprefixer** - CSS processing

## Browser Support

- Chrome/Firefox/Safari/Edge (latest 2 versions)
- Internet Explorer 11 (with polyfills)
- iOS Safari & Android Chrome (latest 2 versions)
- Mobile-optimized for 320px+ screens

## Project Structure

```
src/
├── api/           # API integration
├── components/    # Reusable components
├── pages/         # Page components
├── store/         # State management
├── styles/        # Global styles and tokens
├── types/         # TypeScript definitions
└── utils/         # Utility functions
```

## Design system

The look is modelled on a large Indian retail storefront. Everything is driven
by the tokens in `src/styles/design-system.css` — retune that file and the whole
app follows.

| Role | Token | Value |
| --- | --- | --- |
| Header belt, footer base | `--color-navy` | `#131921` |
| Sub-nav, footer link farm | `--color-navy-2` | `#232f3e` |
| Page ground | `--color-bg` | `#eaeded` |
| Cards | `--color-surface-raised` | `#ffffff` |
| Body ink | `--color-text` | `#0f1111` |
| Links | `--color-accent` | `#007185` (rust `#c7511f` on hover) |
| Add to cart | `--color-gold` | `#ffd814` |
| Buy now | `--color-orange` | `#ffa41c` |
| Search button | `--color-tan` | `#febd69` |
| Prices | `--color-price` | `#b12704` |
| Rating stars | `--color-star` | `#de7921` |

The stylesheets layer in one direction only:

```
styles/design-system.css   tokens + component classes (.btn, .input, .card, .tag, .table, .dialog)
index.css                  app shell, content column, utilities
styles/app.css             the screens — header, footer, home, cards, listing, PDP, cart, checkout
styles/tokens.css          a bridge that maps legacy custom-property names onto the above
```

## Documentation

- **Architecture**: Mobile-first responsive design
- **Accessibility**: Keyboard navigation, screen reader support, ARIA labels

## Author

**Magesh Kumar A T**

---

Built with React + TypeScript + Vite 
