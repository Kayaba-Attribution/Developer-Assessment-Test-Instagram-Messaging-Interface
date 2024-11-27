// src/services/login.service.js
const { configure } = require("agentql");

class LoginService {
  constructor(browserService, proxyService, sessionService, logger, config, queries) {
    this.browserService = browserService;
    this.proxyService = proxyService;
    this.sessionService = sessionService;
    this.logger = logger;
    this.config = config;
    this.queries = queries;

    configure({ apiKey: process.env.AGENTQL_API_KEY });
  }

  async login(username, password, useProxy = true) {
    let browser, page, proxy;

    try {
      // Check if we have a valid session already
      const existingSession = await this.sessionService.getInstagramSession(
        username
      );
      
      if (existingSession?.isValid) {
        return { success: true, session: existingSession };
      }

      // Get proxy if needed
      if (useProxy) {
        proxy = await this.proxyService.getProxy();
      }

      // Initialize browser with proxy
      const browserInstance = await this.browserService.createPage(null, proxy);
      browser = browserInstance.browser;
      page = browserInstance.page;

      // Perform login
      const loginResult = await this._performLogin(page, username, password);
      if (!loginResult.success) {
        throw new Error(loginResult.error);
      }

      // Get session state
      const sessionState = await browser.contexts()[0].storageState();

      // Create session
      // const session = await this.sessionService.createInstagramSession({
      //   username,
      //   sessionData: sessionState,
      //   proxy: proxy?.server,
      // });

      return { success: true, session };
    } catch (error) {
      this.logger.error("Login failed:", { username, error: error.message });
      return {
        success: false,
        error: this.config.isDev ? error.stack : error.message,
      };
    } finally {
      if (browser) await browser.close();
    }
  }

  async _performLogin(page, username, password) {
    try {
      await page.goto("https://www.instagram.com/accounts/login/", {
        waitUntil: "networkidle",
      });

      const loginForm = await page.queryElements(this.queries.LOGIN_FORM);
      if (!loginForm?.login_form?.username_input) {
        throw new Error("Login form not found");
      }

      // Fill form with random delays
      await loginForm.login_form.username_input.fill(username);
      await page.waitForTimeout(Math.random() * 200 + 100);

      await loginForm.login_form.password_input.fill(password);
      await page.waitForTimeout(Math.random() * 200 + 100);

      await loginForm.login_form.login_button.click();
      await page.waitForTimeout(5000);

      // Verify login success
      const currentUrl = page.url();
      if (currentUrl.includes("accounts/login")) {
        return { success: false, error: "Login verification failed" };
      }

      return { success: true };
    } catch (error) {
      this.logger.error("Login process failed:", error);
      return { success: false, error: error.message };
    }
  }

  async validateSession(username) {
    try {
      const session = await this.sessionService.getInstagramSession(username);
      if (!session) return false;

      // You could add additional validation here like:
      // - Check if session is expired
      // - Verify session still works with Instagram
      // - Rate limiting checks

      return true;
    } catch (error) {
      this.logger.error("Session validation failed:", error);
      return false;
    }
  }
}

module.exports = LoginService;
