// src/core/browser/browser.config.js

const browerWidth = 1280;
const browserHeight = 720;

const BROWSER_CONFIG = {
  IGNORED_ARGS: ["--enable-automation", "--disable-extensions"],

  BROWSER_WIDTH: browerWidth,
  BROWSER_HEIGHT: browserHeight,

  BROWSER_ARGS: [
    "--disable-xss-auditor",
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-blink-features=AutomationControlled",
    "--disable-features=IsolateOrigins,site-per-process",
    "--disable-infobars",
    `--window-size=${browerWidth},${browserHeight}`,
    "--disable-dev-shm-usage",
    "--no-first-run",
    "--no-service-autorun",
    "--password-store=basic",
    "--use-fake-ui-for-media-stream",
    "--disable-sync",
    '--no-zygote',
  ],

  USER_AGENTS: [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/119.0",
  ],

  LOCATIONS: [
    {
      timezone: "America/New_York",
      geolocation: { longitude: -74.006, latitude: 40.7128 },
    },
    {
      timezone: "America/Chicago",
      geolocation: { longitude: -87.6298, latitude: 41.8781 },
    },
    {
      timezone: "America/Los_Angeles",
      geolocation: { longitude: -118.2437, latitude: 34.0522 },
    },
  ],

  LANGUAGES: ["en-US,en;q=0.9", "en-GB,en;q=0.8", "en-CA,en;q=0.7"],
  REFERERS: [
    "https://www.google.com",
    "https://www.bing.com",
    "https://duckduckgo.com",
  ],
  VIEWPORT_JITTER: 50, // pixels of random variation
  ADS_POWER_GROUP_ID: "1",
};

module.exports = { BROWSER_CONFIG };
