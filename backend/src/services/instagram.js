// src/services/instagram.js
const { wrap, configure } = require("agentql");
const { chromium } = require("playwright");
const logger = require("../utils/logger");
const { config, isDev } = require("../config");
const { QUERIES } = require("../config/constants");
const { takeScreenshot, saveSessionToFile, loadSessionFromFile } = require("../utils/files");



async function checkForErrors(page) {
    try {
      const errorElements = await page.queryElements(QUERIES.ERROR_MESSAGE);
      if (errorElements?.error_message) {
        const errorText = await errorElements.error_message.textContent();
        logger.error("Login error message:", errorText);
        return errorText;
      }
      return null;
    } catch (error) {
      logger.error("Error checking for errors:", error);
      return "Unknown error occurred";
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
        return {
          success: false,
          error: error
        };
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
