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
    this.signUpSelector = 'a[href="/accounts/emailsignup/"]';
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
    return {
      email: 'input[name="emailOrPhone"]',
      fullName: 'input[name="fullName"]',
      username: 'input[name="username"]',
      password: 'input[name="password"]',
      signupButton: 'button[type="submit"]',
      birthdayMonth: 'select[title="Month:"]',
      birthdayDay: 'select[title="Day:"]',
      birthdayYear: 'select[title="Year:"]',
      next: 'button[type="button"]:has-text("Next")',
    };
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

        await browser.close();

        if (result.success) {
          return result;
        }

        lastError = new Error(result.error);
      } catch (error) {
        logger.error("Registration error:", error);
        lastError = error;
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
      
      logger.info("Registration form filled, waiting for verification code");
      await page.waitForTimeout(6000);
      const verificationCode = await this.getVerificationCode(
        registrationData.emailHash
      );
      
      if (!verificationCode) {
        logger.error("Verification code not found");
      }
      
      logger.info(`Verification code received: ${verificationCode}`);
      
      await page.waitForTimeout(200000);
      
      await this.enterVerificationCode(page, verificationCode);

      await page.waitForTimeout(50000);
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
    await page.waitForTimeout(1000);
    logger.info("Navigated to Instagram homepage, navigating to signup page");

    try {
      // Wait for selector with timeout
      await page.waitForSelector(this.signUpSelector, { timeout: 5000 });

      // Ensure element is visible and clickable
      const signUpLink = await page.$(this.signUpSelector);
      if (!signUpLink) {
        logger.error("Signup button not found");
      }

      // Check visibility
      const isVisible = await signUpLink.isVisible();
      if (!isVisible) {
        throw new Error("Sign up link is not visible");
      }

      // Click the button
      await signUpLink.click();

      // Wait for navigation or next state
      await Promise.race([
        page
          .waitForNavigation({ waitUntil: "networkidle0", timeout: 5000 })
          .catch(() => {}),
        page.waitForTimeout(2000),
      ]);

      // Take screenshot
      await takeScreenshot(page, "navigated_to_registration");

      return true;
    } catch (error) {
      logger.error("Form submission failed:", error.message);
      await takeScreenshot(page, "registration_nav_error");
      throw error;
    }
  }

  // Form Handling
  async fillRegistrationForm(page, query, data) {
    logger.info(`Filling form with data: ${JSON.stringify(data, null, 2)}`);

    await this.fillBasicInfo(page, query, data);
    await this.setBirthday(page, query, data.birthday);
    await this.submitAgeForm(page, query);
  }

  async fillBasicInfo(page, query, data) {
    const fields = [
      { selector: query.email, value: data.email },
      { selector: query.fullName, value: data.fullName },
      { selector: query.username, value: data.username },
      { selector: query.password, value: data.password },
    ];

    for (const field of fields) {
      await page.waitForSelector(field.selector);
      await page.fill(field.selector, field.value);
      await page.waitForTimeout(500);
    }

    // Take screenshot before submission
    await takeScreenshot(page, "registration_form_filled");

    // Click signup button
    await page.waitForSelector(query.signupButton);
    await page.click(query.signupButton);

    // Wait for 3 seconds after submission
    await page.waitForTimeout(3000);

    // Take screenshot after submission
    await takeScreenshot(page, "registration_submitted");

    logger.info("Form filled and submitted");
  }

  async enterVerificationCode(page, code) {
    try {
      logger.info("Entering verification code");

      // Updated selector for confirmation code input
      const codeInputSelector = 'input[name="email_confirmation_code"]';
      await page.waitForSelector(codeInputSelector, { timeout: 20000 });

      // Clear any existing value first
      await page.fill(codeInputSelector, "");

      // Type code with small delays between characters
      for (const digit of code.toString()) {
        await page.type(codeInputSelector, digit);
        await page.waitForTimeout(100);
      }

      // Take screenshot before clicking next
      await takeScreenshot(page, "verification_code_entered");

      // Updated selector for the Next button
      const nextButtonSelector = 'div[role="button"]:has-text("Next")';
      await page.waitForSelector(nextButtonSelector);
      await page.click(nextButtonSelector);

      // Wait for submission and potential navigation
      await Promise.race([
        page.waitForNavigation({ waitUntil: "networkidle0", timeout: 20000 }),
        page.waitForTimeout(20000),
      ]);

      await page.waitForTimeout(3000);

      await takeScreenshot(page, "verification_code_submitted");
      logger.info("Verification code submitted successfully");

      await page.waitForTimeout(40000);

    } catch (error) {
      logger.error("Error entering verification code:", error);
      await takeScreenshot(page, "verification_code_error");
      throw error;
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
    await page.selectOption(query.birthdayMonth, birthday.month.toString());
    await page.waitForTimeout(100);
    await page.selectOption(query.birthdayDay, birthday.day.toString());
    await page.waitForTimeout(100);
    await page.selectOption(query.birthdayYear, birthday.year.toString());
    await page.waitForTimeout(1000);
  }

  async submitAgeForm(page, query) {
    try {
      await page.waitForTimeout(1000);
      // Wait for selector with timeout
      await page.waitForSelector(query.next, { timeout: 5000 });

      // Ensure element is visible and clickable
      const nextBtn = await page.$(query.next);
      if (!nextBtn) {
        logger.error("Next button not found");
      }

      // Check if button is visible and enabled
      const isVisible = await nextBtn.isVisible();
      const isEnabled = await nextBtn.isEnabled();

      if (!isVisible || !isEnabled) {
        logger.error("Next button is not clickable");
      }

      // Click the button
      await nextBtn.click();

      // Wait for navigation or next state
      await Promise.race([
        page
          .waitForNavigation({ waitUntil: "networkidle0", timeout: 5000 })
          .catch(() => {}),
        page.waitForTimeout(2000),
      ]);

      // Take screenshot
      await takeScreenshot(page, "next_form_submission_submitted");

      return true;
    } catch (error) {
      logger.error("Form submission failed:", error.message);
      await takeScreenshot(page, "next_form_submission_error");
      throw error;
    }
  }

  async getVerificationCode(emailHash) {
    try {
      const emails = await tempMailService.getEmails(emailHash);

      const sortedEmails = emails.sort(
        (a, b) => b.mail_timestamp - a.mail_timestamp
      );

      // logger.debug("Emails received:", sortedEmails);

      for (const email of sortedEmails) {
        const code = tempMailService.extractVerificationCode(
          email.mail_subject
        );
        if (code) {
          return code;
        }
      }
    } catch (error) {
      logger.error("Error getting verification code:", error.message);
      throw error;
    }
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
