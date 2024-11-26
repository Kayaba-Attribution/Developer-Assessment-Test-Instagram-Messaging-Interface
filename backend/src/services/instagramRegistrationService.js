const tempMailService = require("./tempMail");
const logger = require("../utils/logger");
const crypto = require("crypto");
const { wrap } = require("agentql");
const { config } = require("../config");
const { chromium } = require("playwright");
const freeProxyService = require("./freeProxyService");
const proxyTester = require("./proxyTester");
const { takeScreenshot } = require("../utils/files");
const { log } = require("console");
const { init, move } = require("../server");
const { QUERIES } = require("../config/constants");

class InstagramRegistrationService {
  constructor() {
    this.registrationAttempts = new Map();
    this.maxRetries = 1;
    this.browserConfig = this.initBrowserConfig();
    this.formRegistrationSelectors = this.initFormSelectors();
    this.signUpSelector = `{
    signup_button
    }`;
    logger.info("Instagram Registration Service initialized");
  }

  // Browser Configuration
  initBrowserConfig() {
    return {
      contextOptions: {
        userAgent: this.getRandomUserAgent(),
        viewport: { width: 1280, height: 720 },
        deviceScaleFactor: 1,
        hasTouch: false,
        isMobile: false,
        locale: "en-US",
        timezoneId: "America/New_York",
        permissions: ["geolocation"],
      },
      stealthScript: () => {
        Object.defineProperty(navigator, "webdriver", { get: () => false });
        Object.defineProperty(navigator, "plugins", {
          get: () => [1, 2, 3, 4, 5],
        });

        // Add Chrome runtime
        window.chrome = {
          runtime: {},
          loadTimes: () => {},
          csi: () => {},
          app: {},
        };

        // Override permissions
        const originalQuery = window.navigator.permissions.query;
        window.navigator.permissions.query = async (parameters) => {
          if (parameters.name === "notifications") {
            return { state: Notification.permission };
          }
          return originalQuery(parameters);
        };

        // Add custom navigator properties
        Object.defineProperty(navigator, "platform", { get: () => "Win32" });
        Object.defineProperty(navigator, "language", { get: () => "en-US" });
      },
    };
  }

  // Form Selectors
  initFormSelectors() {
    return `
    `
  }


  // Main Registration Flow
  async register() {
    let attempt = 0;
    let lastError = null;

    while (attempt < this.maxRetries) {
      let browser;
      let proxy;

      try {
        attempt++;
        logger.info(`Registration attempt ${attempt} of ${this.maxRetries}`);

        proxy = await this.getVerifiedProxy();
        const registrationData = this.prepareRegistrationData();
        browser = await chromium.launch({
          headless: config.headless,
          args: config.browserOptions.args,
        });
        const page = await this.setupPage(browser);

        const result = await this.performRegistration(page, registrationData);
        if (result.success) {
          return result;
        }

        lastError = new Error(result.error);
      } catch (error) {
        logger.error("Registration error:", error);
        lastError = error;
      } finally {
        if (browser) {
          await browser.close();
        }
      }

      if (attempt === this.maxRetries) {
        return {
          success: false,
          error: lastError.message,
        };
      }
    }
  }

  // Proxy Handling
  async getVerifiedProxy() {
    while (true) {
      const proxy = await freeProxyService.getProxy();
      logger.info(`Testing proxy: ${proxy.server}`);

      const isValid = await proxyTester.testProxy(proxy);
      if (isValid) {
        logger.info(`Found working proxy: ${proxy.server}`);
        return proxy;
      }

      logger.warn(`Proxy ${proxy.server} failed testing, trying another...`);
    }
  }

  // Browser Setup
  async initBrowser() {
    const browser = await chromium.launch({
      headless: config.headless,
      args: config.browserOptions.args,
    });

    return browser;
  }

  async setupPage(browser) {
    const context = await browser.newContext(this.browserConfig.contextOptions);
    await context.addInitScript(this.browserConfig.stealthScript);

    const page = await wrap(await context.newPage());

    // Random mouse movements and delays
    await this.simulateHumanBehavior(page);
    logger.info("Browser and context initialized");

    return page;
  }
  

  // Registration Process
  async performRegistration(page, registrationData) {
    try {
      await this.navigateToSignup(page);
      await this.fillRegistrationForm(
        page,
        this.formRegistrationSelectors,
        registrationData
      );

      registrationData.status = "FORM_FILLED";
      this.registrationAttempts.set(
        registrationData.username,
        registrationData
      );

      return {
        success: true,
        data: registrationData,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async navigateToSignup(page) {
    logger.info("Navigating to Instagram signup page");
    await page.goto("https://www.instagram.com/", {
      waitUntil: "networkidle",
      timeout: 30000,
    });
    await takeScreenshot(page, `nav_to_instagram`);
    await page.waitForTimeout(2000);
    logger.info("Navigated to Instagram homepage, navigating to signup page");

    // Click on Sign Up button
    const loginForm = await page.queryElements(QUERIES.LOGIN_FORM);

    if (!loginForm?.login_form?.username_input) {
      const screenshot = await takeScreenshot(page, "login_form_error");
      throw new Error(
        `Login form not found${
          screenshot ? `. Screenshot saved: ${screenshot}` : ""
        }`
      );
    }
    
    await loginForm.login_form.signup_button.click();
    await page.waitForTimeout(2000);
    await takeScreenshot(page, `move_to_registration`);

    // await page.goto("https://www.instagram.com/accounts/emailsignup/", {
    //   waitUntil: "networkidle",
    // });
    // await page.waitForTimeout(2000);
    // await takeScreenshot(page, `nav_to_signin`);
    // logger.info("Navigated to signup page");
  }


  // Form Handling
  async fillRegistrationForm(page, query, data) {
    logger.info(`Filling form with data: ${JSON.stringify(data, null, 2)}`);

    await this.fillBasicInfo(page, query, data);
    await this.setBirthday(page, query, data.birthday);
    await this.submitForm(page, query);
  }

  async fillBasicInfo(page, query, data) {
    const fields = [
      { selector: query.form.email, value: data.email },
      { selector: query.form.fullName, value: data.fullName },
      { selector: query.form.username, value: data.username },
      { selector: query.form.password, value: data.password },
    ];

    for (const field of fields) {
      await page.waitForSelector(field.selector);
      await page.fill(field.selector, field.value);
      await page.waitForTimeout(500);
    }
  }

  getRandomUserAgent() {
    const userAgents = [
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36",
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/119.0",
    ];
    return userAgents[Math.floor(Math.random() * userAgents.length)];
  }

  async simulateHumanBehavior(page) {
    await page.mouse.move(Math.random() * 1920, Math.random() * 1080, {
      steps: 10,
    });
    await page.waitForTimeout(Math.random() * 1000 + 500);
  }

  async setBirthday(page, query, birthday) {
    await page.selectOption(
      query.form.birthdayMonth,
      birthday.month.toString()
    );
    await page.selectOption(query.form.birthdayDay, birthday.day.toString());
    await page.selectOption(query.form.birthdayYear, birthday.year.toString());
    await page.waitForTimeout(1000);
  }

  async submitForm(page, query) {
    await page.click(query.form.submit);
    await page.waitForTimeout(2000);
    await takeScreenshot(page, `registration_form_submitted`);
  }

  // Data Generation
  prepareRegistrationData() {
    const emailData = tempMailService.generateEmail();
    const emailPrefix = emailData.email.split("@")[0];

    return {
      email: emailData.email,
      emailHash: emailData.hash,
      username: `${emailPrefix}_${Date.now().toString().slice(-4)}`,
      fullName: this.generateFullName(),
      password: this.generateSecurePassword(),
      birthday: this.generateBirthday(),
      status: "INITIALIZED",
      timestamp: Date.now(),
    };
  }

  generateFullName() {
    const firstName =
      tempMailService.firstNames[
        Math.floor(Math.random() * tempMailService.firstNames.length)
      ];
    const lastName =
      tempMailService.lastNames[
        Math.floor(Math.random() * tempMailService.lastNames.length)
      ];
    return `${firstName} ${lastName}`;
  }

  generateSecurePassword() {
    return `${crypto.randomBytes(8).toString("hex")}!1A`;
  }

  generateBirthday() {
    const year = 1990 + Math.floor(Math.random() * 15);
    const month = 1 + Math.floor(Math.random() * 12);
    const day = 1 + Math.floor(Math.random() * 28);
    return { year, month, day };
  }

  // Status Management
  getRegistrationStatus(username) {
    return this.registrationAttempts.get(username);
  }
}

module.exports = new InstagramRegistrationService();
