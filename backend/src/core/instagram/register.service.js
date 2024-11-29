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
    this.browserMode = config.BROWSER_MODE || "default";
  }

  async register(userId) {
    let browser, page, proxy, adsProfileId;

    try {
      proxy =
        this.browserMode === "default"
          ? await this.proxyService.getWorkingProxy()
          : null;

      const registrationData = this._prepareRegistrationData();

      const { browser: newBrowser, page: newPage, userId: newUserId } =
        await this.browserService.createPageWithMode(
          this.browserMode,
          null,
          proxy
        );

      browser = newBrowser;
      page = newPage;
      adsProfileId = newUserId;

      const navigationResult = await this._navigateToSignup(page);

      if (
        navigationResult &&
        !navigationResult.success &&
        navigationResult.status === "SUSPENDED"
      ) {
        return navigationResult;
      }

      await this._fillRegistrationForm(page, registrationData);

      registrationData.status = "FORM_FILLED";
      this.registrationAttempts.set(
        registrationData.username,
        registrationData
      );

      this.logger.debug(
        "Registration form filled, waiting for verification code"
      );

      // ? Wait for mail service to get the email
      await page.waitForTimeout(6000);

      const verificationCode = await this._getVerificationCode(
        registrationData.emailHash
      );

      if (!verificationCode) {
        throw new Error("Verification code not found");
      }

      this.logger.debug(`Verification code received: ${verificationCode}`);

      try {
        await this._enterVerificationCode(page, verificationCode);
      } catch (error) {
        if (error.type === "SUSPENDED") {
          return {
            success: false,
            error: "ACCOUNT_SUSPENDED",
            status: "SUSPENDED",
            message: error.message,
          };
        }
        throw error; // Re-throw other errors
      }

      await takeScreenshot(page, "registration_complete");

      this.logger.info("Registration complete, saving session...");
      const context = browser.contexts()[0];
      const cookies = await context.cookies();
      const sessionState = {
        cookies,
        userId: registrationData.username, // Using username as userId for new accounts
      };

      // Create or update session with the new account
      const session = await this.sessionService.createOrUpdateSession(
        userId,
        registrationData.username,
        registrationData.password,
        sessionState
      );

      if (session) {
        this.logger.info(
          `Session saved for new account ${registrationData.username}`
        );
      } else {
        this.logger.error("Failed to save session");
      }

      if (browser) {
        if (this.browserMode === "adspower") {
          await this._closeAdsPowerBrowser(browser, adsProfileId);
        } else {
          await browser.close();
        }
      }

      return {
        success: true,
        data: {
          ...registrationData,
          session,
          proxy: this.browserMode === "default" ? proxy?.server : null,
        },
      };
    } catch (error) {
      this.logger.error("Registration failed:", error);
      return { success: false, error: error.message };
    } finally {
      if (browser) {
        if (this.browserMode === "adspower") {
          await this._closeAdsPowerBrowser(browser, adsProfileId);
        } else {
          await browser.close();
        }
      }
    }
  }

  async _navigateToSignup(page) {
    this.logger.debug("Attempting direct navigation to Instagram signup page");

    try {
      // Try direct navigation first
      const success = await this._directNavigateToSignup(page);

      // Check for suspension after navigation attempt
      if (this.browserMode === "adspower") {
        const currentUrl = page.url();
        if (currentUrl.includes("/accounts/suspended")) {
          this.logger.error("Account suspended detected on AdsPower browser");
          await takeScreenshot(page, "account_suspended");
          throw {
            type: "SUSPENDED",
            message: "Instagram account is suspended",
          };
        }
      }

      if (success) {
        return true;
      }

      // If direct navigation fails, fall back to old method
      this.logger.info("Direct navigation failed, trying fallback method");
      const fallbackSuccess = await this._fallbackNavigateToSignup(page);

      // Check for suspension after fallback attempt too
      if (this.browserMode === "adspower") {
        const currentUrl = page.url();
        if (currentUrl.includes("/accounts/suspended")) {
          this.logger.error("Account suspended detected on AdsPower browser");
          await takeScreenshot(page, "account_suspended");
          throw {
            type: "SUSPENDED",
            message: "Instagram account is suspended",
          };
        }
      }

      return fallbackSuccess;
    } catch (error) {
      if (error.type === "SUSPENDED") {
        return {
          success: false,
          error: "ACCOUNT_SUSPENDED",
          status: "SUSPENDED",
          message: error.message,
        };
      }

      this.logger.error("All navigation attempts failed:", error.message);
      await takeScreenshot(page, "navigation_all_methods_failed");
      throw error;
    }
  }

  async _directNavigateToSignup(page) {
    try {
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

      this.logger.info(
        "Navigated to Instagram homepage, looking for signup link"
      );

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
            this.logger.warn("Navigation timeout or error:", error.message);
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
    this.logger.debug(
      `Starting form fill with ${
        this.fastMode ? "fast" : "human-like"
      } behavior`
    );

    // Initial longer delay before starting form fill
    await this._randomDelay(2000, 4000);

    const fields = [
      { selector: this.formSelectors.email, value: data.email },
      { selector: this.formSelectors.fullName, value: data.fullName },
      { selector: this.formSelectors.username, value: data.username },
      { selector: this.formSelectors.password, value: data.password },
    ];

    for (const field of fields) {
      try {
        // Longer wait between fields to avoid rate limiting
        await this._randomDelay(1500, 3000);

        // Wait for selector with increased timeout
        await page.waitForSelector(field.selector, {
          state: "visible",
          timeout: 15000,
        });

        // Move mouse to element first (more human-like)
        await page.hover(field.selector);
        await this._randomDelay(300, 800);

        // Click with retry logic
        let clicked = false;
        for (let i = 0; i < 3 && !clicked; i++) {
          try {
            await page.click(field.selector);
            clicked = true;
          } catch (error) {
            this.logger.warn(
              `Click attempt ${i + 1} failed for ${field.selector}`
            );
            await this._randomDelay(1000, 2000);
          }
        }

        if (!clicked) {
          throw new Error(`Failed to click ${field.selector} after 3 attempts`);
        }

        await this._randomDelay(800, 1500);

        if (this.fastMode) {
          await page.type(field.selector, field.value, { delay: 50 });
        } else {
          // More random delays between characters
          for (const char of field.value) {
            await page.type(field.selector, char, {
              delay: Math.random() * 250 + 100,
            });
            await this._randomDelay(100, 300);
          }
        }

        // Longer delay after filling each field
        await this._randomDelay(1500, 3000);
      } catch (error) {
        this.logger.error(`Error filling field ${field.selector}:`, error);
        await takeScreenshot(page, `field_error_${field.selector}`);
        throw error;
      }
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
      await page.selectOption(
        this.formSelectors.birthdayMonth,
        birthday.month.toString()
      );

      if (!this.fastMode) {
        await this._randomDelay(300, 800);
      }
      await page.selectOption(
        this.formSelectors.birthdayDay,
        birthday.day.toString()
      );

      if (!this.fastMode) {
        await this._randomDelay(300, 800);
      }
      await page.selectOption(
        this.formSelectors.birthdayYear,
        birthday.year.toString()
      );

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
          this.logger.warn("Button no longer visible, getting fresh reference");
          button = await page.$(this.formSelectors.signupButton);
          if (!button) {
            throw new Error("Could not find signup button");
          }
        }

        // Click with more options for stability
        await button.click({
          force: true,
          timeout: 5000,
          delay: 100,
        });

        // Wait longer for response
        await this._randomDelay(3000, 4000);

        // Check if we reached birthday page
        const birthdayVisible = await page
          .waitForSelector(this.formSelectors.birthdayMonth, {
            timeout: 5000,
            state: "visible",
          })
          .then(() => true)
          .catch(() => false);

        if (birthdayVisible) {
          this.logger.debug("Successfully reached birthday page");
          return true;
        }

        this.logger.warn(
          `Birthday fields not visible after attempt ${attempt}`
        );
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

    throw new Error(
      `Failed to reach birthday page after ${maxRetries} attempts`
    );
  }

  async _randomDelay(min, max) {
    if (this.fastMode) {
      await new Promise((resolve) => setTimeout(resolve, 50)); // Minimal delay in fast mode
      return;
    }
    const delay = Math.floor(Math.random() * (max - min) + min);
    await new Promise((resolve) => setTimeout(resolve, delay));
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

      await nextButton.click();

      // Wait for navigation or success state
      await page.waitForLoadState("networkidle", { timeout: 30000 });

      // Check for suspension after verification
      const currentUrl = page.url();
      if (currentUrl.includes("/accounts/suspended")) {
        this.logger.error("Account suspended detected after verification");
        await takeScreenshot(page, "account_suspended_after_verification");
        throw {
          type: "SUSPENDED",
          message: "Instagram account was suspended upon creation",
        };
      }
    } catch (error) {
      if (error.type === "SUSPENDED") {
        throw error; // Re-throw suspension error to be handled by register method
      }
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
      fullName: emailData.fullName,
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

  getRegistrationStatus(username) {
    return this.registrationAttempts.get(username);
  }

  async _closeAdsPowerBrowser(browser, profileId) {
    try {
      if (!profileId) {
        this.logger.warn('No profile ID provided for AdsPower browser closure');
        return;
      }

      this.logger.debug(`Closing AdsPower browser for profile: ${profileId}`);

      // Close the browser instance with retries
      const maxRetries = 3;
      let closeSuccess = false;

      for (let i = 0; i < maxRetries && !closeSuccess; i++) {
        try {
          // First try to close the browser via Playwright
          await browser.close().catch(err => 
            this.logger.warn(`Failed to close browser via Playwright: ${err.message}`)
          );

          // Then stop the AdsPower browser
          const closeUrl = `http://local.adspower.net:50325/api/v1/browser/stop?user_id=${profileId}`;
          const closeResponse = await fetch(closeUrl);

          if (!closeResponse.ok) {
            throw new Error(`HTTP error! status: ${closeResponse.status}`);
          }

          const closeData = await closeResponse.json();
          if (closeData.code === 0) {
            closeSuccess = true;
            this.logger.debug(`Successfully closed AdsPower browser for profile: ${profileId}`);
          } else {
            throw new Error(`AdsPower close failed with code ${closeData.code}: ${closeData.msg}`);
          }
        } catch (error) {
          this.logger.warn(`Close attempt ${i + 1} failed: ${error.message}`);
          if (i < maxRetries - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1))); // Exponential backoff
          }
        }
      }

      // Delete the profile with retries
      let deleteSuccess = false;
      for (let i = 0; i < maxRetries && !deleteSuccess; i++) {
        try {
          const deleteUrl = 'http://local.adspower.net:50325/api/v1/user/delete';
          const deleteResponse = await fetch(deleteUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              user_ids: [profileId]
            })
          });

          if (!deleteResponse.ok) {
            throw new Error(`HTTP error! status: ${deleteResponse.status}`);
          }

          const deleteData = await deleteResponse.json();
          if (deleteData.code === 0) {
            deleteSuccess = true;
            this.logger.debug(`Successfully deleted AdsPower profile: ${profileId}`);
          } else {
            throw new Error(`AdsPower delete failed with code ${deleteData.code}: ${deleteData.msg}`);
          }
        } catch (error) {
          this.logger.warn(`Delete attempt ${i + 1} failed: ${error.message}`);
          if (i < maxRetries - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1))); // Exponential backoff
          }
        }
      }

      if (!closeSuccess) {
        this.logger.error(`Failed to close AdsPower browser after ${maxRetries} attempts`);
      }
      if (!deleteSuccess) {
        this.logger.error(`Failed to delete AdsPower profile after ${maxRetries} attempts`);
      }
    } catch (error) {
      this.logger.error('Failed to close AdsPower browser:', error);
    }
  }
}

module.exports = RegisterService;
