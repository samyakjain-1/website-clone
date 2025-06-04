# Web Cloner

A Next.js tool that lets you input any website URL and:
- Fetches the site's HTML and all linked stylesheets using Playwright.
- Takes a full-page screenshot.
- Extracts a structural layout summary (navs, sections, buttons, headings, text blocks, and their styles).
- Optionally uses OpenAI's GPT-4o to generate a "clean" HTML/CSS clone based on the screenshot and layout.
- Displays the screenshot, layout summary, and both the real and LLM-generated code side-by-side.
- Lets you download the cloned HTML/CSS for reuse.

---

## Table of Contents

- [Features](#features)
- [How It Works](#how-it-works)
- [Setup & Prerequisites](#setup--prerequisites)
- [Usage](#usage)
- [Project Structure](#project-structure)
- [Detailed Workflow](#detailed-workflow)
  - [1. URL Input & Fetch](#1-url-input--fetch)
  - [2. Playwright Backend](#2-playwright-backend)
  - [3. Layout Summary Extraction](#3-layout-summary-extraction)
  - [4. LLM Code Generation (Optional)](#4-llm-code-generation-optional)
  - [5. Frontend Display & Download](#5-frontend-display--download)
- [Extending the Project](#extending-the-project)
- [Limitations](#limitations)
- [License](#license)

---

## Features

- **Direct HTML/CSS Cloning:** Fetches the actual HTML and all stylesheets from any public website.
- **Screenshot & Layout Extraction:** Uses Playwright to take a full-page screenshot and extract a summary of the site's structure and design.
- **LLM-Powered Cloning:** Optionally uses OpenAI GPT-4o to generate a semantic, minimal HTML/CSS clone based on the screenshot and layout.
- **Side-by-Side Display:** Shows screenshot, layout summary, and both real and LLM-generated code.
- **Downloadable Output:** Download the cloned HTML/CSS as a single file.

---

## How It Works

1. **User enters a website URL and (optionally) an OpenAI API key.**
2. **Backend (Playwright) fetches the page:**
   - Gets the HTML.
   - Downloads all linked stylesheets.
   - Takes a full-page screenshot.
   - Extracts a layout summary (structure and styles).
3. **Frontend displays:**
   - Screenshot.
   - Layout summary (JSON).
   - Real HTML/CSS (from the site).
   - LLM-generated HTML/CSS (if API key provided).
4. **User can download the cloned code.**

---

## Setup & Prerequisites

### Prerequisites

- Node.js 18+
- npm
- (Optional) OpenAI API key for LLM-based code generation

### Installation

```bash
cd web-cloner
npm install
npx playwright install
```

### Running the App

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) in your browser.

---

## Usage

1. **Enter a website URL** (e.g., `https://example.com`).
2. **(Optional) Enter your OpenAI API key** to enable LLM-based code generation.
3. Click **Fetch**.
4. View the screenshot, layout summary, and both real and LLM-generated code.
5. Use the **Download** button to save the cloned HTML/CSS.

---

## Project Structure

```
web-cloner/
  ├── src/
  │   └── app/
  │       ├── page.tsx                # Main frontend UI
  │       ├── api/
  │       │   ├── fetch-site/         # Playwright backend API
  │       │   │   └── route.ts
  │       │   └── generate-clone/     # LLM backend API
  │       │       └── route.ts
  │       └── ...
  ├── public/                         # Static assets
  ├── package.json
  ├── README.md
  └── ...
```

---

## Detailed Workflow

### 1. URL Input & Fetch

- The user enters a URL and (optionally) an OpenAI API key in the UI.
- On submit, the frontend sends a POST request to `/api/fetch-site` with the URL.

### 2. Playwright Backend

- The backend launches a headless Chromium browser using Playwright.
- Navigates to the target URL and waits for the page to fully load.
- **HTML Extraction:** Grabs the full HTML of the page.
- **Stylesheet Download:** Finds all `<link rel="stylesheet">` tags, downloads each CSS file, and combines them.
- **Screenshot:** Takes a full-page PNG screenshot (base64-encoded).

### 3. Layout Summary Extraction

- In the browser context, Playwright runs a script to extract:
  - All `<nav>`, `<section>`, `<button>`, `<a role="button">`, `<input type="button|submit">`, `<h1>`–`<h6>`, `<p>`, `<span>`, `<li>`.
  - For each element: tag, outer HTML, visible text, and computed styles (color, background, font, border, margin, padding, display).
- Returns a JSON summary with arrays for each type.

### 4. LLM Code Generation (Optional)

- If an OpenAI API key is provided, the backend sends the screenshot and layout summary to OpenAI GPT-4o.
- The LLM is prompted to generate clean, semantic HTML and CSS that mimics the site's layout and style.
- The LLM's output is parsed and displayed alongside the real code.

### 5. Frontend Display & Download

- The UI shows:
  - **Screenshot:** Visual preview of the site.
  - **Layout Summary:** JSON structure of the page.
  - **Cloned Site Code:** The actual HTML and combined CSS fetched from the site.
  - **LLM-Generated Code:** (If API key provided) The LLM's HTML/CSS output.
- **Download:** The user can download the cloned code as a single HTML file with inlined CSS.

---

## Extending the Project

- **Add More Extraction:** Extend the layout summary to include more element types or deeper style analysis.
- **Improve LLM Prompting:** Refine the prompt for better semantic code generation.
- **Support for JS/Assets:** Add logic to fetch scripts or images for more complete clones.
- **Authentication:** Add support for sites requiring login (with user-provided cookies or credentials).
- **Batch Processing:** Allow cloning multiple URLs at once.

---

## Limitations

- **Dynamic/JS-heavy Sites:** Some sites may not render fully in a headless browser or may require user interaction.
- **External Assets:** Only CSS is fetched; images, fonts, and scripts are not downloaded or inlined.
- **LLM Output:** The LLM-generated code is an interpretation and may not be a pixel-perfect clone.
- **Legal/Ethical:** Cloning websites may violate terms of service or copyright; use responsibly.

---

## License

MIT License. See [LICENSE](LICENSE) for details.

---

## Credits

- [Next.js](https://nextjs.org/)
- [Playwright](https://playwright.dev/)
- [OpenAI GPT-4o](https://platform.openai.com/docs/guides/vision)
