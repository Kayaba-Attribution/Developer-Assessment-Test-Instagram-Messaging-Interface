// src/services/register.service.js
const crypto = require("crypto");
const { takeScreenshot } = require("../../utils/files");

class RegisterService {
  constructor(
    browserService,
    proxyService,
    sessionService,
    emailService,
    logger,
    config
  ) {
    this.browserService = browserService;
    this.proxyService = proxyService;
    this.sessionService = sessionService;
    this.emailService = emailService;
    this.logger = logger;
    this.config = config;

    this.registrationAttempts = new Map();
    this.formSelectors = {
      email: 'input[name="emailOrPhone"]',
      fullName: 'input[name="fullName"]',
      username: 'input[name="username"]',
      password: 'input[name="password"]',
      signupButton: 'button[type="submit"]',
      birthdayMonth: 'select[title="Month:"]',
      birthdayDay: 'select[title="Day:"]',
      birthdayYear: 'select[title="Year:"]',
      next: 'button[type="button"]:has-text("Next")',
      signUpLink: 'a[href="/accounts/emailsignup/"]',
      verificationCode: 'input[name="email_confirmation_code"]',
      nextButton: 'div[role="button"]:has-text("Next")',
    };
  }

  async register() {
    let browser, page, proxy;

    try {
      proxy = await this.proxyService.getWorkingProxy();
      const registrationData = this._prepareRegistrationData();
      // ! PROXY IS NOT USED HERE
      const { browser, page } = await this.browserService.createPage(
        null,
        null
      );

      await this._navigateToSignup(page);
      await this._fillRegistrationForm(page, registrationData);

      registrationData.status = "FORM_FILLED";
      this.registrationAttempts.set(
        registrationData.username,
        registrationData
      );

      this.logger.debug(
        "Registration form filled, waiting for verification code"
      );

      await page.waitForTimeout(6000);

      const verificationCode = await this._getVerificationCode(
        registrationData.emailHash
      );

      if (!verificationCode) {
        throw new Error("Verification code not found");
      }

      this.logger.debug(`Verification code received: ${verificationCode}`);

      await this._enterVerificationCode(page, verificationCode);

      await page.waitForTimeout(50000);
      
      const sessionState = await browser.contexts()[0].storageState();
      const session = await this.sessionService.createInstagramSession({
        username: registrationData.username,
        sessionData: sessionState,
        proxy: proxy?.server,
      });

      return { success: true, data: { ...registrationData, session } };
    } catch (error) {
      this.logger.error("Registration failed:", error);
      return { success: false, error: error.message };
    } finally {
      if (browser) await browser.close();
    }
  }

  async _navigateToSignup(page) {
    this.logger.debug("Navigating to Instagram signup page");
    await page.goto("https://www.instagram.com/", {
      waitUntil: "networkidle",
      timeout: 30000,
    });
    await takeScreenshot(page, `nav_to_instagram`);
    this.logger.info(
      "Navigated to Instagram homepage, navigating to signup page"
    );

    try {
      // Wait for selector with timeout
      await page.waitForSelector(this.formSelectors.signUpLink, {
        timeout: 5000,
      });

      // Ensure element is visible and clickable
      const signUpLink = await page.$(this.formSelectors.signUpLink);
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
      this.logger.error("Form submission failed:", error.message);
      await takeScreenshot(page, "registration_nav_error");
      throw error;
    }
  }

  async _fillRegistrationForm(page, data) {
    this.logger.debug(
      `Filling form with data: ${JSON.stringify(data, null, 2)}`
    );
    const fields = [
      { selector: this.formSelectors.email, value: data.email },
      { selector: this.formSelectors.fullName, value: data.fullName },
      { selector: this.formSelectors.username, value: data.username },
      { selector: this.formSelectors.password, value: data.password },
    ];

    for (const field of fields) {
      await page.waitForSelector(field.selector);
      await page.fill(field.selector, field.value);
      await page.waitForTimeout(Math.random() * 200 + 300);
    }

    // Take screenshot before submission
    await takeScreenshot(page, "registration_form_filled");

    await page.click(this.formSelectors.signupButton);
    this.logger.debug("Init Form submitted, waiting for next step");
    await this._setBirthday(page, data.birthday);
  }

  async _setBirthday(page, birthday) {
    await page.selectOption(
      this.formSelectors.birthdayMonth,
      birthday.month.toString()
    );
    await page.waitForTimeout(Math.random() * 100 + 100);
    await page.selectOption(
      this.formSelectors.birthdayDay,
      birthday.day.toString()
    );
    await page.waitForTimeout(Math.random() * 100 + 100);
    await page.selectOption(
      this.formSelectors.birthdayYear,
      birthday.year.toString()
    );
    await page.waitForTimeout(Math.random() * 100 + 100);
    await takeScreenshot(page, "birthday_set");
    this.logger.debug("Birthday set, clicking next");
    await page.click(this.formSelectors.next);
  }

  async _enterVerificationCode(page, code) {
    await page.waitForSelector(this.formSelectors.verificationCode);
    await page.fill(this.formSelectors.verificationCode, code);
    await page.click(this.formSelectors.nextButton);
    await page.waitForTimeout(3000);
  }

  async _getVerificationCode(emailHash) {
    const maxAttempts = 5;
    let attempt = 0;

    while (attempt < maxAttempts) {
      try {
        const code = await this.emailService.getVerificationCode(emailHash);
        if (code) return code;
        await new Promise((resolve) => setTimeout(resolve, 5000));
        attempt++;
      } catch (error) {
        this.logger.warn(
          `Attempt ${attempt + 1} failed to get verification code:`,
          error
        );
        attempt++;
      }
    }
    return null;
  }

  _prepareRegistrationData() {
    const emailData = this.emailService.generateEmail();
    const emailPrefix = emailData.email.split("@")[0];

    return {
      email: emailData.email,
      emailHash: emailData.hash,
      username: `${emailPrefix}_${Date.now().toString().slice(-4)}`,
      fullName: this._generateFullName(),
      password: this._generateSecurePassword(),
      birthday: this._generateBirthday(),
      status: "INITIALIZED",
      timestamp: Date.now(),
    };
  }

  _generateSecurePassword() {
    return `${crypto.randomBytes(8).toString("hex")}!1A`;
  }

  _generateBirthday() {
    return {
      year: 1990 + Math.floor(Math.random() * 15),
      month: 1 + Math.floor(Math.random() * 12),
      day: 1 + Math.floor(Math.random() * 28),
    };
  }

  _generateFullName() {
    return this.emailService.generateFullName();
  }

  getRegistrationStatus(username) {
    return this.registrationAttempts.get(username);
  }
}

module.exports = RegisterService;
