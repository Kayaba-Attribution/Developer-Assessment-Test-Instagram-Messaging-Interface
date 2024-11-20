// src/config/index.js
const path = require("path");

const NODE_ENV = process.env.NODE_ENV || "development";
const isDev = NODE_ENV === "development";

const config = {
  development: {
    logLevel: "debug",
    headless: false,
    saveScreenshots: true,
    cleanupOldFiles: true,
    cleanupThreshold: 24, // hours
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
      maxSize: "20m",
      maxFiles: 5,
    },
  },
  production: {
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
