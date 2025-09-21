# Fix Instructions

## Critical Documentation Bug: Missing Playwright Installation

### Problem Description

The README.md file is missing a critical setup step that causes the application to crash for new users. While Playwright is listed as a dependency in `package.json`, the browser binaries are not automatically installed, causing scraping functionality to fail.

### Current Issue

**What happens now:**

1. User clones repo ✅
2. User runs `pnpm install` ✅
3. User runs `pnpm dev` ✅
4. User tries to scrape a website ❌ **CRASH**
5. Error: `Executable doesn't exist at /path/to/node_modules/playwright/.local-browsers/chromium-xxx/chrome-linux/chrome`

**Root cause:** Playwright npm package is installed, but browser binaries (Chromium, Firefox, WebKit) are not.

### Proposed Solutions

#### Option 1: Update README Setup Instructions

Modify the README.md "Quick Start" section step 1:

````markdown
1. **Clone and install:**

```bash
git clone https://github.com/yourusername/website-rag-agent.git
cd website-rag-agent
pnpm install
npx playwright install
```
````

````

#### Option 2: Add Postinstall Script (Recommended)

Add to `package.json` scripts section:

```json
{
  "scripts": {
    "dev": "next dev --turbopack",
    "build": "next build --turbopack",
    "start": "next start",
    "postinstall": "npx playwright install",
    // ... existing scripts
  }
}
````

#### Option 3: Update Prerequisites Section

Add to the README.md Prerequisites section:

```markdown
### Prerequisites

- **Node.js** 18.17 or later
- **pnpm** 8.0 or later
- **OpenAI API Key** with GPT-4 access
- **Playwright browsers** (installed automatically via `npx playwright install`)
```

### Recommended Fix (Option 2 + 3 Combined)

**Step 1:** Add postinstall script to `package.json`:

```json
"postinstall": "npx playwright install"
```

**Step 2:** Update README.md Prerequisites section:

```markdown
### Prerequisites

- **Node.js** 18.17 or later
- **pnpm** 8.0 or later
- **OpenAI API Key** with GPT-4 access
```

**Step 3:** Add note in Tech Stack section:

```markdown
- **Web Scraping**: Playwright + native fetch API (browsers auto-installed)
```

### Why This Fix is Important

- **User Experience**: Eliminates confusing crashes for new users
- **Onboarding**: Makes setup process smooth and reliable
- **Documentation**: Aligns documentation with actual requirements
- **Standard Practice**: Many projects use postinstall scripts for browser automation tools

### Implementation Priority

**HIGH PRIORITY** - This affects every new user and breaks core functionality.

### Testing the Fix

After implementing:

1. Clone repo in fresh directory
2. Run `pnpm install`
3. Verify Playwright browsers are installed
4. Run `pnpm dev`
5. Test scraping functionality works without errors

### Related Files

- `README.md` - Prerequisites and setup instructions
- `package.json` - Scripts and dependencies
- `lib/scraper-playwright.ts` - Playwright implementation
- `lib/tools/scrape-tool.ts` - Tool that uses Playwright
