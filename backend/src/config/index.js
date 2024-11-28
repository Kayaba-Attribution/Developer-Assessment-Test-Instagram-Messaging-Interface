// src/config/index.js
const path = require("path");
// load .env file
require('dotenv').config();

const NODE_ENV = process.env.NODE_ENV || "development";
const isDev = NODE_ENV === "development";


const config = {
  development: {
    FAST_MODE: false,
    BROWSER_MODE: 'adspower', // 'adspower' or 'default' or 'no-proxy'
    ADS_POWER_USER: 'kqhbqo5',
    OXYLABS_PROXY: {
      server: "http://pr.oxylabs.io:7777",
      username: process.env.OXYLABS_USERNAME,
      password: process.env.OXYLABS_PASSWORD,
    },
    logLevel: "debug",
    headless: false,
    saveScreenshots: true,
    cleanupOldFiles: true,
    cleanupThreshold: 0, // hours
    screenshotsDir: path.join(process.cwd(), "debug_screenshots"),
    sessionsDir: path.join(process.cwd(), "sessions"),
    logsDir: path.join(process.cwd(), "logs"),
    browserOptions: {
      args: [
        "--disable-web-security",
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-infobars',
        '--disable-dev-shm-usage',
        '--disable-blink-features=AutomationControlled',
        '--ignore-certificate-errors',
        '--no-first-run',
        '--no-service-autorun',
        '--password-store=basic',
        '--no-zygote',
        '--window-size=1280,720',
        '--start-maximized'
      ],
    },
    logRetention: {
      maxSize: "20m",
      maxFiles: 5,
    },
  },
  production: {
    BROWSER_MODE: 'default',
    logLevel: "info",
    headless: true,
    saveScreenshots: false,
    cleanupOldFiles: true,
    cleanupThreshold: 72,
    screenshotsDir: path.join(process.cwd(), "debug_screenshots"),
    sessionsDir: path.join(process.cwd(), "sessions"),
    logsDir: path.join(process.cwd(), "logs"),
    browserOptions: {
      args: [
        "--disable-blink-features=AutomationControlled",
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-web-security",
      ],
    },
    logRetention: {
      maxSize: "50m",
      maxFiles: 10,
    },
  },
}[NODE_ENV];

module.exports = {
  config,
  isDev,
  NODE_ENV,
};
