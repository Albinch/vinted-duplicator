# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a browser extension (Chrome/Firefox) for Vinted that allows users to duplicate listings quickly. The extension extracts product data from existing Vinted listings, saves them as templates, and can auto-fill the create listing form with that data.

## Architecture

### Chrome Extension Structure

The extension uses Manifest V3 and consists of:

1. **Popup UI** (React + Vite)
   - Entry: `index.html` → `src/main.jsx` → `src/App.jsx`
   - Displays saved templates and management interface
   - Detects Vinted context (item page, create page, etc.)
   - Communicates with content scripts via `chrome.tabs.sendMessage`

2. **Content Scripts** (vanilla JS injected into Vinted pages)
   - `src/content/content.js` - Main content script for extracting/filling data on create and item pages
   - `src/content/content-relist.js` - Injects "Relist" buttons on Vinted product listings (runs everywhere except `/items/new`)
   - `src/content/search.service.js` - Utility for simulating search interactions (currently not actively used)

3. **Background Script**
   - `src/background/background.js` - Minimal service worker (currently just logs)

### Multi-Domain Support

The extension works across 15 Vinted domains (FR, UK, DE, ES, IT, PL, BE, NL, AT, CZ, LT, LU, PT, SE, COM) via `host_permissions` and `content_scripts.matches` in `public/manifest.json`.

### Data Flow

**Saving a template:**
1. User clicks "Save template" in popup
2. Popup sends `extractTemplateData` message to content script
3. Content script (`content.js`) scrapes item page DOM for title, description, brand, size, category, condition, colors
4. Data returned to popup and saved to `chrome.storage.local`

**Using a template:**
1. User selects template from popup (must be on `/items/new` page)
2. Popup sends `fillTemplate` message to content script with template data
3. Content script (`content.js`) fills form fields and simulates clicks/searches to:
   - Fill text fields (title, description)
   - Search and select category via autocomplete
   - Search and select brand via autocomplete
   - Select size, condition, and colors from dropdown menus
4. Uses `setTimeout` chains to handle async UI updates (3s delay between category and brand)

**Relist feature:**
- `content-relist.js` injects "Relist" buttons on all Vinted product listings
- Fetches product data from Vinted API (`/api/v2/item_upload/items/{id}`)
- Transforms API data to template format and saves automatically
- Opens `/items/new` in new tab for immediate re-listing

## Build System

The project uses a **hybrid build system** (see `scripts/build.js`):
- **esbuild** for content scripts and background (bundles everything as self-contained IIFE)
- **Vite** for popup (React app with code splitting)

This ensures content scripts have no external dependencies, which Chrome extensions require.

### Build Commands

- **Dev**: `npm run dev` - starts Vite dev server (for popup UI development only)
- **Build**: `npm run build` - runs custom build script:
  1. esbuild bundles content scripts as IIFE → `dist/content.js`, `dist/contentRelist.js`, `dist/background.js`
  2. Vite builds React popup → `dist/index.html`, `dist/assets/popup.js`
  3. Copies `manifest.json` → `dist/manifest.json`

### Code Architecture

The codebase is modular with utilities in `src/utils/`:
- `dom.js` - DOM manipulation helpers (waitForElement, setInputValue, clickElement, etc.)
- `messaging.js` - Chrome extension messaging wrappers
- `storage.js` - Chrome storage API with template management
- `vinted-extractor.js` - Extract data from Vinted item pages
- `vinted-form-filler.js` - Fill Vinted create listing form

### Testing Extension Changes

After building:
1. `npm run build`
2. Load unpacked extension from `dist/` folder in Chrome
3. Refresh extension after each rebuild

## Key Implementation Details

### DOM Selectors

Vinted uses test IDs and itemprop attributes extensively:
- `[data-testid="item-page-summary-plugin"] h1` - product title
- `div[itemprop="description"]` - description
- `span[itemprop="name"]` - brand
- `div[itemprop="size"] > span` - size
- `div[itemprop="status"] > span` - condition
- `div[itemprop="color"]` - colors

### Form Filling Technique

To trigger React's onChange handlers on Vinted's form:
```javascript
const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
setter.call(input, value);
input.dispatchEvent(new Event('input', { bubbles: true }));
input.dispatchEvent(new Event('change', { bubbles: true }));
```

### Timing Considerations

- Content scripts use hardcoded `setTimeout` delays for Vinted's async UI updates
- Category search → brand search has 3000ms delay (`content.js:75`)
- Search result waits are typically 1500ms (`content.js:109`)
- Dropdown selections wait 500ms (`content.js:135`, `content.js:160`, `content.js:190`)

## Development Commands

```bash
npm install          # Install dependencies
npm run dev          # Start Vite dev server (not useful for extension)
npm run build        # Build extension to dist/
npm run lint         # Run ESLint
npm run preview      # Preview production build
```

## Error Handling

The refactored codebase includes comprehensive error handling:
- All async operations wrapped in try-catch blocks
- User-friendly error messages passed back through messaging system
- Partial success handling (e.g., form filling may skip some fields but still succeed)
- Detailed logging for debugging

## Important Notes

- Template data is stored in `chrome.storage.local` as an array under key `"templates"`
- Each template has: `id`, `name`, `data`, `createdAt`
- The extension uses `webextension-polyfill` as dependency but accesses Chrome APIs directly via `chrome.*`
- All UI text is in English
- Content scripts are bundled as IIFE (no ES6 imports) for Chrome extension compatibility
