// src/services/instagram.js
const { wrap, configure } = require("agentql");
const { chromium } = require("playwright");
const logger = require("../utils/logger");
const { config, isDev } = require("../config");
const { QUERIES } = require("../config/constants");

const {
  takeScreenshot,
  saveSessionToFile,
  loadSessionFromFile,
} = require("../utils/files");

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

    await page.waitForTimeout(2000);
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
        error: error,
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
    await page.waitForTimeout(2000);

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

async function instagramRegister() {
  let browser;
  try {
    browser = await chromium.launch({
      headless: config.headless,
      args: config.browserOptions.args,
    });
    logger.info("Browser launched");

    const context = await browser.newContext({
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
      viewport: { width: 1280, height: 720 },
    });

    const page = await wrap(await context.newPage());

    logger.info("Navigating to Instagram signup page");

    // Navigate to signup page
    await page.goto("https://www.instagram.com/accounts/emailsignup/", {
      waitUntil: "networkidle",
    });

    await page.waitForTimeout(2000);

    // Define the registration form selectors
    const SIGNUP_FIELDS = {
      email: 'input[name="emailOrPhone"]',
      fullName: 'input[name="fullName"]',
      username: 'input[name="username"]',
      password: 'input[name="password"]',
      signupButton: 'button[type="submit"]'
    };

    // Generate dummy data
    const dummyData = {
      email: `test${Date.now()}@example.com`,
      fullName: "Test User",
      username: `testuser${Date.now()}`,
      password: "TestPassword123!"
    };

    logger.info("Filling registration form");

    // Fill in the form fields
    await page.waitForSelector(SIGNUP_FIELDS.email);
    await page.fill(SIGNUP_FIELDS.email, dummyData.email);
    
    await page.waitForSelector(SIGNUP_FIELDS.fullName);
    await page.fill(SIGNUP_FIELDS.fullName, dummyData.fullName);
    
    await page.waitForSelector(SIGNUP_FIELDS.username);
    await page.fill(SIGNUP_FIELDS.username, dummyData.username);
    
    await page.waitForSelector(SIGNUP_FIELDS.password);
    await page.fill(SIGNUP_FIELDS.password, dummyData.password);

    // Take screenshot before submission
    await takeScreenshot(page, "registration_form_filled");

    // Click signup button
    await page.waitForSelector(SIGNUP_FIELDS.signupButton);
    await page.click(SIGNUP_FIELDS.signupButton);

    // Wait for 5 seconds after submission
    await page.waitForTimeout(5000);

    // Take screenshot after submission
    await takeScreenshot(page, "registration_submitted");

    return {
      success: true,
      data: {
        email: dummyData.email,
        username: dummyData.username
      }
    };

  } catch (error) {
    logger.error("Registration error:", error);
    return {
      success: false,
      error: error.message
    };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

async function navigateAndSendMessage(username, content, sessionData) {
  let browser;
  try {
    browser = await chromium.launch({
      headless: config.headless,
      args: config.browserOptions.args,
    });
    logger.info("Browser launched");

    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
      viewport: { width: 1280, height: 720 },
    });

    // Add session cookies
    await context.addCookies([
      {
        name: "sessionid",
        value: sessionData.sessionId,
        domain: ".instagram.com",
        path: "/",
      },
      {
        name: "ds_user_id",
        value: sessionData.userId,
        domain: ".instagram.com",
        path: "/",
      },
      {
        name: "csrftoken",
        value: sessionData.csrfToken,
        domain: ".instagram.com",
        path: "/",
      },
      {
        name: "rur",
        value: sessionData.rur,
        domain: ".instagram.com",
        path: "/",
      },
    ]);

    logger.info("Session cookies added");

    const page = await wrap(await context.newPage());

    logger.info("Navigating to Instagram message page");

    // First verify session
    await page.goto("https://www.instagram.com/", {
      waitUntil: "networkidle",
    });

    await page.waitForTimeout(2000);

    const currentUrl = page.url();
    if (currentUrl.includes("accounts/login")) {
      return {
        success: false,
        error: "Session invalid",
      };
    }

    // Navigate to message URL
    await page.goto(`https://instagram.com/m/${username}`, {
      waitUntil: "networkidle",
    });

    await page.waitForTimeout(2000);
    await takeScreenshot(page, `message_page_${username}`);

    const messageUrl = page.url();
    logger.debug("Message URL:", messageUrl);

    const pageContent = await page.content();
    const isPageNotFound =
      pageContent.includes("Page Not Found") ||
      pageContent.includes("Sorry, this page isn't available");

    if (isPageNotFound) {
      return {
        success: false,
        error: "User not found",
      };
    }

    // Wait for page to load
    await page.waitForTimeout(2000);

    // Find message input
    let messageElements = await page.queryElements(QUERIES.MESSAGE_BOX);

    if (!messageElements?.message_input) {
      const screenshot = await takeScreenshot(
        page,
        `message_box_error_${username}`
      );
      return {
        success: false,
        error: "Could not find message input elements",
      };
    }

    // Fill the message
    await messageElements.message_input.fill(content);
    await page.waitForTimeout(1000);

    // Re-query for the send button after filling the input
    messageElements = await page.queryElements(QUERIES.MESSAGE_BOX);

    if (!messageElements?.send_button) {
      const screenshot = await takeScreenshot(
        page,
        `send_button_error_${username}`
      );
      return {
        success: false,
        error: "Could not find send button after filling message",
      };
    }

    // Click the send button
    await messageElements.send_button.click();
    await page.waitForTimeout(2000);

    await takeScreenshot(page, `message_sent_${username}`);

    return {
      success: true,
      url: messageUrl,
      message: content,
    };
  } catch (error) {
    logger.error("Message sending error:", error);
    return {
      success: false,
      error: error.message,
    };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
module.exports = {
  instagramLogin,
  loadSavedSession,
  navigateAndSendMessage,
  instagramRegister
};
