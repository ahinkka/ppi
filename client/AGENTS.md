# PPI client agent instructions

**Purpose**: React frontend for visualizing radar weather data (PPI) on an interactive map using OpenLayers.

**Task Completion**: See [Task Completion](#task-completion) for required commands.

## Directory Structure
```
client/
├── src/               # TypeScript/React source
├── www/               # HTML templates
├── css/               # Stylesheets
├── test/              # Jest tests
└── build/             # Build output
```

## Core Components
- **ObserverApp**: Root component (animation, layout)
- **Map**: OpenLayers-based radar visualization
- **ProductLoader**: Loads/caches radar products
- **CatalogProvider**: Fetches product catalog
- **UrlStateAdapter**: Syncs state with URL

## Development
- See `package.json` for dependencies; npm run **IS NOT USED** for build tasks.
- See `Makefile` for build/test commands.

## Task Completion
Ensure the following commands pass before considering a task done:
- `make lint`
- `make test`
- `make build-prod`
