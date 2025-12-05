# Stock Analysis Robinhood Userscript

A modular Tampermonkey userscript for fetching stock ratings and fair value data from Robinhood API.

## Project Structure

```
├── src/
│   ├── config.js      # Configuration constants
│   ├── utils.js       # Utility functions
│   ├── ui.js          # UI creation and management
│   ├── auth.js        # Authentication token interception
│   ├── api.js         # API calls and data fetching
│   ├── data.js        # Data compilation
│   ├── excel.js       # Excel generation
│   └── main.js        # Main entry point
├── build/
│   └── script.js      # Generated userscript (after build)
├── build.js           # Build script
└── package.json       # Project dependencies

```

## Setup

1. Install dependencies:
```bash
npm install
```

2. Build the userscript:
```bash
npm run build
```

3. Build in watch mode (auto-rebuild on file changes):
```bash
npm run watch
```

The built userscript will be generated in `build/script.js` and can be installed in Tampermonkey.

## Development

The source code is split into modular components:

- **config.js**: API endpoints and constants
- **utils.js**: Helper functions for UI updates
- **ui.js**: UI creation and event handling
- **auth.js**: Intercepts and manages authentication tokens
- **api.js**: Makes API calls to Robinhood endpoints
- **data.js**: Compiles fetched data into structured format
- **excel.js**: Generates Excel files from compiled data
- **main.js**: Initializes and orchestrates all components

To modify the userscript, edit files in the `src/` directory and run `npm run build` to generate the final script.

