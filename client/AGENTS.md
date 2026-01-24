# PPI Client - Software Structure Guide

## Project Overview

This is a **React-based frontend web application** for visualizing radar
weather data (PPI - Plan Position Indicator). It displays animated radar
products on an interactive map using OpenLayers.

## Technology Stack

### Core Framework
- **TypeScript 5.x** - Strict type checking enabled
- **React 18.x** - UI framework
- **Redux 5.x** + React Redux 9.x - State management

### Key Libraries
- **OpenLayers 10.x** - Interactive mapping
- **proj4 2.x** - Coordinate projections
- **fp-ts 2.x** - Functional programming utilities
- **optics-ts 2.x** - Lens-based state manipulation
- **Bootstrap 5.x** + React Bootstrap 2.x - UI components
- **pako 2.x** - GZIP compression for radar data
- **moment 2.x** - Date/time handling

### Build Tools
- **esbuild 0.27.x** - Fast bundler
- **Sass 1.x** - CSS preprocessing
- **Jest 29.x** - Testing
- **ESLint 9.x** - Linting

## Directory Structure

```
client/
├── src/                   # TypeScript/React source code
│   ├── main.tsx           # Application entry point
│   ├── state.ts           # Redux store and reducers
│   ├── catalog.ts         # Data catalog management
│   ├── product_loader.ts  # Async product loading
│   ├── reprojection.ts    # Geographic projections
│   └── components/        # React components
│       ├── app.tsx        # Root ObserverApp component
│       ├── map.tsx        # OpenLayers map component
│       └── ...            # UI components
├── www/                   # HTML templates
│   └── index.html         # Main page template
├── css/                   # Stylesheets
│   └── ppi.sass           # Main styles
├── test/                  # Jest test files
├── build/                 # Build output directory
│   ├── js/                # Bundled JavaScript
│   ├── css/               # Compiled CSS
│   └── index.html         # Final HTML
└── node_modules/          # Dependencies
```

## Main Components

### Entry Point
- `src/main.tsx` - Bootstraps the application, creates Redux store, renders ObserverApp

### Core Components
- **ObserverApp** (`src/components/app.tsx`) - Root component managing animation and layout
- **Map** (`src/components/map.tsx`) - OpenLayers-based radar visualization
- **ProductLoader** (`src/product_loader.ts`) - Loads and caches radar products
- **CatalogProvider** (`src/catalog.ts`) - Fetches product catalog every 30 seconds
- **UrlStateAdapter** (`src/components/url_state_adapter.ts`) - Syncs state with URL

### State Management
- Redux-based with optics for immutable updates
- Manages: catalog (site/product selection, map position, animation state, loaded products

Catalog defines what sites, products, flavors and times are available for visualization.

## Development Commands

### Building & Watching
```bash
make watch          # Build and watch with live reload (http://localhost:8000)
make build-prod     # Production build (runs lint, test, bundle, styles)
```

### Testing
```bash
make test           # Run Jest tests once
make test-watch     # Run tests continuously
```

### Linting
```bash
make lint           # Run TypeScript type check and ESLint
make lint-watch     # Run linting continuously
make fix-lint       # Auto-fix linting issues
```

### Other Commands
```bash
make clean          # Clean build directory
```

## Development Workflow

1. **Start development server:**
   ```bash
   make watch
   ```
   Navigate to http://localhost:8000/

2. **Run tests before committing:**
   ```bash
   make test
   ```

3. **Check and fix linting issues:**
   ```bash
   make lint
   make fix-lint  # if needed
   ```

4. **Build for production:**
   ```bash
   make build-prod
   ```

## Build Process Details

- **Bundler:** esbuild bundles `src/main.tsx` → `build/js/ppi.js`
- **Styles:** Sass compiles `css/ppi.sass` → `build/css/ppi.css` (includes Bootstrap/OpenLayers CSS)
- **HTML:** Copies `www/index.html` → `build/index.html`
- **Dev Server:** esbuild serves on port 8000 with hot reload

## Configuration Files

- `tsconfig.json` - TypeScript compiler options (strict mode)
- `eslint.config.js` - ESLint rules (React + TypeScript)
- `jest.config.js` - Jest test configuration
- `package.json` - Dependencies and project metadata
- `Makefile` - Build automation
