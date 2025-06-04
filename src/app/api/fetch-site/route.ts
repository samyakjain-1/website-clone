import { NextRequest, NextResponse } from "next/server";
import { chromium } from "playwright";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { url, waitForLazyLoad = true, maxWaitTime = 30000 } = await req.json();
    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ 
      viewport: { width: 1280, height: 900 },
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });

    // Set additional headers to appear more like a real browser
    await page.setExtraHTTPHeaders({
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'DNT': '1',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
    });

    // Try networkidle first, fallback to domcontentloaded if it times out
    try {
      await page.goto(url, { waitUntil: "networkidle", timeout: maxWaitTime });
    } catch (error) {
      console.log(`NetworkIdle timeout, falling back to domcontentloaded: ${error}`);
      // Reload with less strict waiting condition
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: maxWaitTime });
      // Wait a bit for some resources to load
      await page.waitForTimeout(3000);
    }

    // Enhanced lazy loading handling
    if (waitForLazyLoad) {
      await handleLazyLoading(page);
    } else {
      // Fallback to original behavior
      await page.waitForTimeout(1000);
    }

    // Get full HTML
    let html = await page.content();

    if (!html || html.trim() === "") {
      await browser.close();
      return NextResponse.json({ error: "Page content is empty or failed to load." }, { status: 500 });
    }

    // Download all stylesheets
    const cssLinks = await page.$$eval('link[rel="stylesheet"]', links =>
      links.map(link => (link as HTMLLinkElement).href)
    );

    let combinedCss = "";
    for (let i = 0; i < cssLinks.length; i++) {
      const cssUrl = cssLinks[i];
      try {
        const response = await fetch(cssUrl);
        const cssText = await response.text();
        combinedCss += `\n/* ${cssUrl} */\n` + cssText + "\n";
        // Replace original CSS URL with a local reference in HTML
        html = html.replace(new RegExp(cssUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), "g"), `./style${i}.css`);
      } catch (err) {
        // If fetch fails, skip this stylesheet
      }
    }

    // Take full-page screenshot (base64)
    const screenshotBuffer = await page.screenshot({ fullPage: true, type: "png" });
    const screenshot = screenshotBuffer.toString("base64");

    // Extract layout/design elements
    const layout = await page.evaluate(() => {
      // Helper to get computed styles for an element
      function getStyles(el: Element) {
        const styles = window.getComputedStyle(el);
        return {
          color: styles.color,
          background: styles.background,
          fontSize: styles.fontSize,
          fontWeight: styles.fontWeight,
          fontFamily: styles.fontFamily,
          border: styles.border,
          margin: styles.margin,
          padding: styles.padding,
          display: styles.display,
        };
      }

      // Extract navs, sections, buttons, headings, text blocks
      const navs = Array.from(document.querySelectorAll("nav")).map(nav => ({
        tag: "nav",
        html: nav.outerHTML,
        styles: getStyles(nav),
      }));

      const sections = Array.from(document.querySelectorAll("section")).map(section => ({
        tag: "section",
        html: section.outerHTML,
        styles: getStyles(section),
      }));

      const buttons = Array.from(document.querySelectorAll("button, a[role=button], input[type=button], input[type=submit]")).map(btn => ({
        tag: btn.tagName.toLowerCase(),
        text: (btn as any).innerText || "",
        html: btn.outerHTML,
        styles: getStyles(btn),
      }));

      const headings = Array.from(document.querySelectorAll("h1, h2, h3, h4, h5, h6")).map(h => ({
        tag: h.tagName.toLowerCase(),
        text: (h as any).innerText || "",
        html: h.outerHTML,
        styles: getStyles(h),
      }));

      const textBlocks = Array.from(document.querySelectorAll("p, span, li")).map(el => ({
        tag: el.tagName.toLowerCase(),
        text: (el as any).innerText || "",
        html: el.outerHTML,
        styles: getStyles(el),
      }));

      return { navs, sections, buttons, headings, textBlocks };
    });

    await browser.close();

    return NextResponse.json({
      screenshot,
      html,
      css: combinedCss,
      layout,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to fetch site" }, { status: 500 });
  }
}

async function handleLazyLoading(page: any) {
  try {
    // Get the total height of the page
    const bodyHeight = await page.evaluate(() => document.body.scrollHeight);
    const viewportHeight = await page.evaluate(() => window.innerHeight);
    
    console.log(`Page height: ${bodyHeight}px, Viewport height: ${viewportHeight}px`);
  
  // Scroll through the page in chunks to trigger lazy loading
  const scrollStep = Math.floor(viewportHeight * 0.8); // Overlap for safety
  let currentPosition = 0;
  
  while (currentPosition < bodyHeight) {
    // Scroll to the current position
    await page.evaluate((pos: number) => {
      window.scrollTo(0, pos);
    }, currentPosition);
    
    // Wait for potential lazy loading to trigger
    await page.waitForTimeout(500);
    
    // Wait for any new network requests to complete
    try {
      await page.waitForLoadState('networkidle', { timeout: 2000 });
    } catch (e) {
      // Continue if network doesn't become idle within 2 seconds
    }
    
    currentPosition += scrollStep;
    
    // Update body height in case it changed due to lazy loading
    const newBodyHeight = await page.evaluate(() => document.body.scrollHeight);
    if (newBodyHeight > bodyHeight) {
      console.log(`Page height increased from ${bodyHeight}px to ${newBodyHeight}px`);
    }
  }
  
  // Scroll to the very bottom to ensure we've reached the end
  await page.evaluate(() => {
    window.scrollTo(0, document.body.scrollHeight);
  });
  
  // Wait for any final content to load
  await page.waitForTimeout(1000);
  
  // Wait for all images to finish loading
  await page.evaluate(async () => {
    const images = Array.from(document.querySelectorAll('img'));
    await Promise.all(
      images.map((img) => {
        if (img.complete) return Promise.resolve();
        return new Promise((resolve, reject) => {
          img.addEventListener('load', resolve);
          img.addEventListener('error', resolve); // Resolve even on error
          // Timeout after 5 seconds per image
          setTimeout(resolve, 5000);
        });
      })
    );
  });
  
  // Wait for any videos to load metadata
  await page.evaluate(async () => {
    const videos = Array.from(document.querySelectorAll('video'));
    await Promise.all(
      videos.map((video) => {
        if (video.readyState >= 1) return Promise.resolve(); // HAVE_METADATA or higher
        return new Promise((resolve) => {
          video.addEventListener('loadedmetadata', resolve);
          video.addEventListener('error', resolve);
          setTimeout(resolve, 3000); // Timeout after 3 seconds per video
        });
      })
    );
  });
  
  // Final wait for any remaining network activity
  try {
    await page.waitForLoadState('networkidle', { timeout: 3000 });
  } catch (e) {
    // Continue if network doesn't become idle
  }
  
  // Scroll back to top for a clean screenshot
  await page.evaluate(() => {
    window.scrollTo(0, 0);
  });
  
  // Wait for scroll to complete
  await page.waitForTimeout(500);
  
  console.log('Lazy loading handling completed');
  } catch (error) {
    console.log(`Error during lazy loading handling: ${error}`);
    // Continue with basic wait if lazy loading fails
    await page.waitForTimeout(2000);
  }
}
