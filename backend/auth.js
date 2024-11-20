const { wrap, configure } = require("agentql");
const { chromium } = require("playwright");
require("dotenv").config();

// Instagram selectors as AgentQL queries
const QUERIES = {
  LOGIN_FORM: `{
    login_form {
      username_input
      password_input
      login_button
    }
  }`,

  TWO_FACTOR: `{
    security_code_input
    submit_button
  }`,

  SAVE_INFO: `{
    not_now_button
  }`,

  NOTIFICATIONS: `{
    not_now_button
  }`,
};

async function instagramLogin(
  username,
  password,
  sessionPath = "instagram_session.json"
) {
  try {
    // Configure AgentQL
    configure({
      apiKey: process.env.AGENTQL_API_KEY,
    });

    // Launch browser
    const browser = await chromium.launch({
      headless: false, // Set to true in production
      slowMo: 50, // Helps with Instagram's anti-automation
    });

    // Create and wrap page
    const page = await wrap(await browser.newPage());

    // Navigate to Instagram login
    await page.goto("https://www.instagram.com/accounts/login/");
    await page.waitForLoadState("networkidle");

    // Handle login form
    console.log("Filling login form...");
    const loginForm = await page.queryElements(QUERIES.LOGIN_FORM);
    await loginForm.login_form.username_input.fill(username);
    await loginForm.login_form.password_input.fill(password);
    await loginForm.login_form.login_button.click();

    // Wait for navigation
    await page.waitForLoadState("networkidle");

    // Handle potential "Save Login Info" prompt
    try {
      const saveInfo = await page.queryElements(QUERIES.SAVE_INFO);
      if (saveInfo.not_now_button) {
        await saveInfo.not_now_button.click();
        await page.waitForLoadState("networkidle");
      }
    } catch (e) {
      console.log("No save info prompt found");
    }

    // Handle potential notifications prompt
    try {
      const notifications = await page.queryElements(QUERIES.NOTIFICATIONS);
      if (notifications.not_now_button) {
        await notifications.not_now_button.click();
        await page.waitForLoadState("networkidle");
      }
    } catch (e) {
      console.log("No notifications prompt found");
    }

    // Save session state
    console.log("Saving session state...");
    await page.context().storageState({ path: sessionPath });

    // Verify login success
    const currentUrl = page.url();
    const loginSuccess = !currentUrl.includes("accounts/login");

    if (loginSuccess) {
      console.log("Login successful!");
    } else {
      console.log("Login failed!");
    }

    await browser.close();
    return { success: loginSuccess, sessionPath };
  } catch (error) {
    console.error("Login error:", error);
    return { success: false, error: error.message };
  }
}

async function loadSession(sessionPath = "instagram_session.json") {
  try {
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext({ storageState: sessionPath });
    const page = await wrap(await context.newPage());

    await page.goto("https://www.instagram.com");
    await page.waitForLoadState("networkidle");

    // Verify session is valid
    const currentUrl = page.url();
    const sessionValid = !currentUrl.includes("accounts/login");

    if (sessionValid) {
      console.log("Session loaded successfully!");
    } else {
      console.log("Session expired or invalid");
    }

    return {
      success: sessionValid,
      page,
      browser,
      context,
    };
  } catch (error) {
    console.error("Session loading error:", error);
    return { success: false, error: error.message };
  }
}

// Example usage
async function test() {
  const username = process.env.INSTAGRAM_USERNAME;
  const password = process.env.INSTAGRAM_PASSWORD;

  // First time login
  const loginResult = await instagramLogin(username, password);
  console.log("Login result:", loginResult);

  // Wait a bit before trying to load session
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Load saved session
  const sessionResult = await loadSession();
  console.log("Session load result:", sessionResult);

  if (sessionResult.success) {
    // Wait a bit to see the logged-in state
    await new Promise((resolve) => setTimeout(resolve, 5000));
    await sessionResult.browser.close();
  }
}

// Run the test
test().catch(console.error);
