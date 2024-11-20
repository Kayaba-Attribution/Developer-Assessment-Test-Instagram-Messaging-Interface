const express = require('express');
const { wrap, configure } = require('agentql');
const { chromium } = require('playwright');
const winston = require('winston');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

// Determine environment
const NODE_ENV = process.env.NODE_ENV || 'development';
const isDev = NODE_ENV === 'development';

// Configuration based on environment
const config = {
  development: {
    logLevel: 'debug',
    headless: false,
    saveScreenshots: true,
    cleanupOldFiles: true,
    cleanupThreshold: 24, // hours
    logFormat: winston.format.combine(
      winston.format.timestamp(),
      winston.format.colorize(),
      winston.format.simple()
    )
  },
  production: {
    logLevel: 'info',
    headless: true,
    saveScreenshots: false,
    cleanupOldFiles: true,
    cleanupThreshold: 72, // hours
    logFormat: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    )
  }
}[NODE_ENV];

// Initialize logger
const logger = winston.createLogger({
  level: config.logLevel,
  format: config.logFormat,
  transports: [
    new winston.transports.File({ 
      filename: 'error.log', 
      level: 'error',
      maxSize: '10m',
      maxFiles: 5
    }),
    new winston.transports.File({ 
      filename: 'combined.log',
      maxSize: '20m',
      maxFiles: 5
    }),
    new winston.transports.Console()
  ]
});

// Cleanup function
async function cleanup() {
  if (!config.cleanupOldFiles) return;

  const directories = ['debug_screenshots', 'sessions', 'logs'];
  for (const dir of directories) {
    try {
      if (!await fs.access(dir).then(() => true).catch(() => false)) continue;
      
      const files = await fs.readdir(dir);
      const now = Date.now();
      const threshold = config.cleanupThreshold * 60 * 60 * 1000;

      for (const file of files) {
        const filePath = path.join(dir, file);
        const stats = await fs.stat(filePath);
        const age = now - stats.mtime.getTime();

        if (age > threshold) {
          await fs.unlink(filePath);
          if (isDev) {
            logger.debug(`Cleaned up old file: ${file}`);
          }
        }
      }
    } catch (error) {
      logger.error(`Cleanup error in ${dir}:`, error);
    }
  }
}

// Modified screenshot function
async function takeScreenshot(page, name) {
  if (!config.saveScreenshots) return null;
  
  const screenshotPath = path.join('debug_screenshots', `${name}_${Date.now()}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: true });
  if (isDev) {
    logger.info(`Screenshot saved: ${screenshotPath}`);
  }
  return screenshotPath;
}

// Modified Instagram login function
async function instagramLogin(username, password) {
  let browser;
  let context;
  let page;

  try {
    if (isDev) {
      logger.info(`Starting login attempt for user: ${username}`);
    }

    configure({
      apiKey: process.env.AGENTQL_API_KEY,
    });

    browser = await chromium.launch({
      headless: config.headless,
      args: [
        '--disable-blink-features=AutomationControlled',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-web-security',
      ]
    });

    context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
      viewport: { width: 1280, height: 720 }
    });

    page = await wrap(await context.newPage());

    // Console logging only in development
    if (isDev) {
      page.on('console', msg => logger.debug('Browser console:', msg.text()));
    }

    await page.goto('https://www.instagram.com/accounts/login/', {
      waitUntil: 'networkidle'
    });

    await page.waitForTimeout(3000);
    await takeScreenshot(page, 'before_login');

    const loginForm = await page.queryElements(QUERIES.LOGIN_FORM);

    if (!loginForm?.login_form?.username_input) {
      const screenshot = await takeScreenshot(page, 'login_form_error');
      throw new Error(`Login form not found${screenshot ? `. Screenshot saved: ${screenshot}` : ''}`);
    }

    await loginForm.login_form.username_input.fill(username);
    await page.waitForTimeout(500);
    await loginForm.login_form.password_input.fill(password);
    await page.waitForTimeout(500);

    await loginForm.login_form.login_button.click();
    await page.waitForTimeout(5000);
    
    await takeScreenshot(page, 'after_login');

    const error = await checkForErrors(page);
    if (error) {
      throw new Error(`Login failed: ${error}`);
    }

    const currentUrl = page.url();
    const loginSuccess = !currentUrl.includes('accounts/login');
    
    if (!loginSuccess) {
      throw new Error('Login verification failed');
    }

    const sessionState = await context.storageState();

    if (isDev) {
      logger.debug('Session state:', {
        cookiesCount: sessionState.cookies.length,
        originsCount: sessionState.origins.length
      });
    }

    return {
      success: true,
      session: sessionState
    };

  } catch (error) {
    logger.error('Login error:', isDev ? {
      error: error.message,
      stack: error.stack
    } : error.message);

    return {
      success: false,
      error: error.message,
      ...(isDev && { details: error.stack })
    };

  } finally {
    if (config.saveScreenshots && page) {
      await takeScreenshot(page, 'final_state');
    }
    if (browser) await browser.close();
  }
}

// Initialize directories and cleanup
async function initialize() {
  // Create necessary directories
  const dirs = ['debug_screenshots', 'sessions', 'logs'];
  for (const dir of dirs) {
    await fs.mkdir(dir, { recursive: true });
  }

  // Run initial cleanup
  await cleanup();

  // Schedule periodic cleanup
  setInterval(cleanup, 60 * 60 * 1000); // Run every hour
}

// Start server
initialize()
  .then(() => {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT} in ${NODE_ENV} mode`);
    });
  })
  .catch(error => {
    logger.error('Server initialization failed:', error);
    process.exit(1);
  });