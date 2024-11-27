// src/core/browser/browser.service.js
const { chromium } = require("playwright");
const { wrap } = require("agentql");

class BrowserService {
  constructor(config, logger) {
    this.config = config;
    this.logger = logger;
  }

  async createPage(sessionData = null, proxy = null) {
    const browser = await chromium.launch({
      headless: this.config.headless,
      args: [...this.config.browserOptions.args],
    });

    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
      viewport: { width: 1280, height: 720 },
      ...(sessionData && { storageState: sessionData }),
      ...(proxy && { proxy }),
    });

    const page = await wrap(await context.newPage());
    return { browser, page };
  }

  async takeScreenshot(page, name) {
    if (!this.config.saveScreenshots) return null;
    const path = `${this.config.screenshotsDir}/${name}_${Date.now()}.png`;
    await page.screenshot({ path });
    return path;
  }
}
