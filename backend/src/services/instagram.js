// src/services/instagram.js
const { wrap, configure } = require("agentql");
const { chromium } = require("playwright");
const path = require("path");
const logger = require("../utils/logger");
const { config, isDev } = require("../config");
const { QUERIES } = require("../config/constants");
const fs = require("fs").promises;

// Function to save session data to file (dev only)
async function saveSessionToFile(sessionData) {
  if (isDev) {
    try {
      const sessionFile = path.join(
        __dirname,
        "../../sessions/saved_session.json"
      );
      await fs.writeFile(sessionFile, JSON.stringify(sessionData, null, 2));
      logger.info("Session data saved to file");
    } catch (error) {
      logger.error("Error saving session to file:", error);
    }
  }
}

// Function to load session data from file
async function loadSessionFromFile() {
  try {
    const sessionFile = path.join(
      __dirname,
      "../../sessions/saved_session.json"
    );
    console.log(sessionFile);
    const data = await fs.readFile(sessionFile, "utf8");
    return JSON.parse(data);
  } catch (error) {
    logger.error("Error loading session from file:", error);
    throw new Error("Failed to load session data");
  }
}

async function takeScreenshot(page, name) {
  if (!config.saveScreenshots) return null;

  const screenshotPath = path.join(
    config.screenshotsDir,
    `${name}_${Date.now()}.png`
  );
  await page.screenshot({ path: screenshotPath, fullPage: true });
  if (isDev) {
    logger.info(`Screenshot saved: ${screenshotPath}`);
  }
  return screenshotPath;
}

async function checkForErrors(page) {
  try {
    const pageContent = await page.content();
    const currentUrl = page.url();

    if (isDev) {
      logger.debug("Current URL:", currentUrl);
    }

    const errorConditions = {
      suspicious_login: "Suspicious login detected",
      challenge_required: "Challenge required",
      checkpoint_required: "Checkpoint required",
    };

    for (const [condition, message] of Object.entries(errorConditions)) {
      if (pageContent.includes(condition)) {
        logger.error(message);
        return condition;
      }
    }

    if (currentUrl.includes("login")) {
      const errorElements = await page.queryElements(QUERIES.ERROR_MESSAGE);
      if (errorElements?.error_message) {
        const errorText = await errorElements.error_message.textContent();
        logger.error("Login error message:", errorText);
        return errorText;
      }
    }

    return null;
  } catch (error) {
    logger.error("Error checking for errors:", error);
    return "unknown_error";
  }
}

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
      args: config.browserOptions.args,
    });

    context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
      viewport: { width: 1280, height: 720 },
    });

    page = await wrap(await context.newPage());

    if (isDev) {
      page.on("console", (msg) => logger.debug("Browser console:", msg.text()));
    }

    await page.goto("https://www.instagram.com/accounts/login/", {
      waitUntil: "networkidle",
    });

    await page.waitForTimeout(3000);
    await takeScreenshot(page, "before_login");

    const loginForm = await page.queryElements(QUERIES.LOGIN_FORM);

    if (!loginForm?.login_form?.username_input) {
      const screenshot = await takeScreenshot(page, "login_form_error");
      throw new Error(
        `Login form not found${
          screenshot ? `. Screenshot saved: ${screenshot}` : ""
        }`
      );
    }

    await loginForm.login_form.username_input.fill(username);
    await page.waitForTimeout(100);
    await loginForm.login_form.password_input.fill(password);
    await page.waitForTimeout(100);

    await loginForm.login_form.login_button.click();
    await page.waitForTimeout(5000);

    await takeScreenshot(page, "after_login");

    const error = await checkForErrors(page);
    if (error) {
      throw new Error(`Login failed: ${error}`);
    }

    const currentUrl = page.url();
    const loginSuccess = !currentUrl.includes("accounts/login");

    if (!loginSuccess) {
      throw new Error("Login verification failed");
    }

    const sessionState = await context.storageState();

    if (isDev) {
      logger.debug("Session state:", {
        cookiesCount: sessionState.cookies.length,
        originsCount: sessionState.origins.length,
      });
      // Save session data if in dev mode
      await saveSessionToFile(sessionState);
    }

    return {
      success: true,
      session: sessionState,
    };
  } catch (error) {
    logger.error(
      "Login error:",
      isDev
        ? {
            error: error.message,
            stack: error.stack,
          }
        : error.message
    );

    return {
      success: false,
      error: error.message,
      ...(isDev && { details: error.stack }),
    };
  } finally {
    if (config.saveScreenshots && page) {
      await takeScreenshot(page, "final_state");
    }
    if (browser) await browser.close();
  }
}

async function loadSavedSession() {
  let browser;
  let context;
  let page;

  try {
    const sessionData = await loadSessionFromFile();

    browser = await chromium.launch({
      headless: config.headless,
      args: config.browserOptions.args,
    });

    context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
      viewport: { width: 1280, height: 720 },
      storageState: sessionData,
    });

    page = await wrap(await context.newPage());

    await page.goto("https://www.instagram.com/");
    await page.waitForTimeout(3000);

    const currentUrl = page.url();
    if (currentUrl.includes("accounts/login")) {
      throw new Error("Session invalid");
    }

    return {
      success: true,
      message: "Session loaded successfully",
    };
  } catch (error) {
    logger.error("Session loading error:", error.message);
    return {
      success: false,
      error: error.message,
    };
  } finally {
    if (browser) await browser.close();
  }
}

module.exports = {
  instagramLogin,
  loadSavedSession,
};
