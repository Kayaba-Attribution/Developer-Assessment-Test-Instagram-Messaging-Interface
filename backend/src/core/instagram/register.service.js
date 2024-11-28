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

    this.DIRECT_SIGNUP_URL = "https://www.instagram.com/accounts/emailsignup/";
    this.fastMode = config.FAST_MODE || false;
  }

  async register() {
    let browser, page, proxy;

    try {
      proxy = await this.proxyService.getWorkingProxy();
      const registrationData = this._prepareRegistrationData();

      const { browser, page } = await this.browserService.createPage(
        null,
        null
      );

      await this._navigateToSignup(page);

      await page.waitForTimeout(10000);
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
    this.logger.debug("Attempting direct navigation to Instagram signup page");
    
    try {
      // Try direct navigation first
      const success = await this._directNavigateToSignup(page);
      if (success) {
        return true;
      }

      // If direct navigation fails, fall back to old method
      this.logger.info("Direct navigation failed, trying fallback method");
      return await this._fallbackNavigateToSignup(page);
    } catch (error) {
      this.logger.error("All navigation attempts failed:", error.message);
      await takeScreenshot(page, "navigation_all_methods_failed");
      throw error;
    }
  }

  async _directNavigateToSignup(page) {
    try {
      // Navigate directly to signup page
      await page.goto(this.DIRECT_SIGNUP_URL, {
        waitUntil: "networkidle",
        timeout: 30000,
      });
      
      await takeScreenshot(page, "direct_nav_to_signup");

      // Verify we're on the right page
      const currentUrl = page.url();
      const isSignupPage = currentUrl.includes("/accounts/emailsignup/");
      
      if (!isSignupPage) {
        this.logger.warn("Direct navigation: Not on signup page");
        return false;
      }

      // Verify the form is present
      const formVisible = await page
        .waitForSelector(this.formSelectors.email, {
          state: "visible",
          timeout: 5000,
        })
        .then(() => true)
        .catch(() => false);

      if (!formVisible) {
        this.logger.warn("Direct navigation: Form not visible");
        return false;
      }

      this.logger.info("Direct navigation to signup page successful");
      return true;
    } catch (error) {
      this.logger.warn("Direct navigation failed:", error.message);
      await takeScreenshot(page, "direct_nav_failed");
      return false;
    }
  }

  async _fallbackNavigateToSignup(page) {
    this.logger.debug("Using fallback navigation method");
    
    try {
      await page.goto("https://www.instagram.com/", {
        waitUntil: "networkidle",
        timeout: 30000,
      });
      await takeScreenshot(page, "nav_to_instagram");
      
      this.logger.info("Navigated to Instagram homepage, looking for signup link");

      // Wait for selector with timeout
      await page.waitForSelector(this.formSelectors.signUpLink, {
        timeout: 5000,
      });

      // Ensure element is visible and clickable
      const signUpLink = await page.$(this.formSelectors.signUpLink);
      if (!signUpLink) {
        throw new Error("Signup button not found");
      }

      // Check visibility
      const isVisible = await signUpLink.isVisible();
      if (!isVisible) {
        throw new Error("Sign up link is not visible");
      }

      // Click the button
      await signUpLink.click();
      await page.waitForTimeout(500);

      // Wait for navigation or next state
      await Promise.race([
        page
          .waitForNavigation({ waitUntil: "networkidle0", timeout: 5000 })
          .catch((error) => {
            this.logger.warn('Navigation timeout or error:', error.message);
          }),
        page.waitForTimeout(2000),
      ]);

      // check url to ensure navigation
      if (!page.url().includes("/accounts/emailsignup/")) {
        throw new Error("Failed to navigate to registration page");
      }

      await takeScreenshot(page, "fallback_nav_success");
      this.logger.info("Fallback navigation successful");
      
      return true;
    } catch (error) {
      this.logger.error("Fallback navigation failed:", error.message);
      await takeScreenshot(page, "fallback_nav_error");
      throw error;
    }
  }

  async _fillRegistrationForm(page, data) {
    this.logger.debug(`Starting form fill with ${this.fastMode ? 'fast' : 'human-like'} behavior`);
    await page.waitForTimeout(10000);

    const fields = [
      { selector: this.formSelectors.email, value: data.email },
      { selector: this.formSelectors.fullName, value: data.fullName },
      { selector: this.formSelectors.username, value: data.username },
      { selector: this.formSelectors.password, value: data.password },
    ];

    for (const field of fields) {
      await page.waitForSelector(field.selector, {
        state: "visible",
        timeout: 10000,
      });

      await page.click(field.selector);
      await this._randomDelay(300, 800);

      if (this.fastMode) {
        // Fast mode: type all at once
        await page.type(field.selector, field.value);
      } else {
        // Normal mode: type character by character
        for (const char of field.value) {
          await page.type(field.selector, char, {
            delay: Math.random() * 200 + 100,
          });
          await this._randomDelay(50, 150);
        }
      }

      await this._randomDelay(500, 1500);
    }

    this.logger.debug("Form filled, clicking signup button");

    await takeScreenshot(page, "pre_signup_click");

    // Wait for the button to be ready
    await page.waitForSelector(this.formSelectors.signupButton, {
      state: "visible",
      timeout: 10000,
    });

    // Ensure button is both visible and enabled
    const button = await page.$(this.formSelectors.signupButton);
    const isDisabled = await button.evaluate((el) => el.disabled);

    if (!button) {
      this.logger.error("Signup button not found");
      throw new Error("Signup button not found");
    }

    if (isDisabled) {
      this.logger.error("Signup button is disabled");
      throw new Error("Signup button is disabled - form validation failed");
    }

    // Click the button
    await this._attemptSignupClick(page, button);

    // Proceed with birthday selection
    await this._setBirthday(page, data.birthday);
  }

  async _setBirthday(page, birthday) {
    try {
      // Wait for all birthday selectors to be visible
      await Promise.all([
        page.waitForSelector(this.formSelectors.birthdayMonth, {
          state: "visible",
          timeout: 15000,
        }),
        page.waitForSelector(this.formSelectors.birthdayDay, {
          state: "visible",
          timeout: 15000,
        }),
        page.waitForSelector(this.formSelectors.birthdayYear, {
          state: "visible",
          timeout: 15000,
        }),
      ]);

      await this._randomDelay(500, 1000);
      await page.selectOption(this.formSelectors.birthdayMonth, birthday.month.toString());

      if (!this.fastMode) {
        await this._randomDelay(300, 800);
      }
      await page.selectOption(this.formSelectors.birthdayDay, birthday.day.toString());

      if (!this.fastMode) {
        await this._randomDelay(300, 800);
      }
      await page.selectOption(this.formSelectors.birthdayYear, birthday.year.toString());

      await takeScreenshot(page, "birthday_set");

      // Wait for next button and ensure it's clickable
      await page.waitForSelector(this.formSelectors.next, {
        state: "visible",
        timeout: 10000,
      });
      await this._randomDelay(500, 1000);

      await page.click(this.formSelectors.next);
    } catch (error) {
      this.logger.error("Birthday selection failed:", error);
      await takeScreenshot(page, "birthday_selection_error");
      throw new Error(`Birthday selection failed: ${error.message}`);
    }
  }

  async _attemptSignupClick(page, button, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      this.logger.debug(`Signup click attempt ${attempt}/${maxRetries}`);

      try {
        // First check if button is still valid
        const isVisible = await button.isVisible().catch(() => false);
        if (!isVisible) {
          this.logger.warn('Button no longer visible, getting fresh reference');
          button = await page.$(this.formSelectors.signupButton);
          if (!button) {
            throw new Error('Could not find signup button');
          }
        }

        // Click with more options for stability
        await button.click({
          force: true,
          timeout: 5000,
          delay: 100
        });
        
        // Wait longer for response
        await this._randomDelay(3000, 4000);

        // Check if we reached birthday page
        const birthdayVisible = await page
          .waitForSelector(this.formSelectors.birthdayMonth, {
            timeout: 5000,
            state: 'visible'
          })
          .then(() => true)
          .catch(() => false);

        if (birthdayVisible) {
          this.logger.debug("Successfully reached birthday page");
          return true;
        }

        this.logger.warn(`Birthday fields not visible after attempt ${attempt}`);
        await takeScreenshot(page, `signup_click_attempt_${attempt}`);
        
      } catch (error) {
        this.logger.warn(`Click attempt ${attempt} failed: ${error.message}`);
        await takeScreenshot(page, `signup_click_error_${attempt}`);
      }

      // Longer wait between retries
      if (attempt < maxRetries) {
        await this._randomDelay(2000, 3000);
      }
    }

    throw new Error(`Failed to reach birthday page after ${maxRetries} attempts`);
  }

  async _randomDelay(min, max) {
    if (this.fastMode) {
      await new Promise(resolve => setTimeout(resolve, 50)); // Minimal delay in fast mode
      return;
    }
    const delay = Math.floor(Math.random() * (max - min) + min);
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  async _enterVerificationCode(page, code) {
    try {
      // Wait for verification input with proper timeout
      await page.waitForSelector(this.formSelectors.verificationCode, {
        state: "visible",
        timeout: 15000,
      });

      // Click field first (human behavior)
      await page.click(this.formSelectors.verificationCode);
      await this._randomDelay(300, 600);

      // Type code character by character
      for (const char of code) {
        await page.type(this.formSelectors.verificationCode, char, {
          delay: Math.random() * 100 + 50,
        });
      }

      // Screenshot for debugging
      await takeScreenshot(page, "verification_code_entered");

      // Wait and verify next button
      const nextButton = await page.waitForSelector(
        this.formSelectors.nextButton,
        {
          state: "visible",
          timeout: 10000,
        }
      );

      await this._randomDelay(500, 1000);

      // wait 40 seconds
      await page.waitForTimeout(40000);
      await nextButton.click();

      // Wait for navigation or success state
      await page.waitForLoadState("networkidle", { timeout: 30000 });

      await takeScreenshot(page, "registration_complete");
    } catch (error) {
      this.logger.error("Verification code entry failed:", error);
      await takeScreenshot(page, "verification_error");
      throw error;
    }
  }

  async _getVerificationCode(emailHash) {
    const maxAttempts = 5;
    let attempt = 0;

    while (attempt < maxAttempts) {
      try {
        const code = await this.emailService.getVerificationCode(emailHash);
        if (code) return code;
        this.logger.debug("Verification code not found, retrying");
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
