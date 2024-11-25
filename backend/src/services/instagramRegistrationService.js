const tempMailService = require("./tempMail");
const logger = require("../utils/logger");
const crypto = require("crypto");
const { wrap, configure } = require("agentql");
const { config, isDev } = require("../config");
const { chromium } = require("playwright");

const {
  takeScreenshot,
  saveSessionToFile,
  loadSessionFromFile,
} = require("../utils/files");

class InstagramRegistrationService {
  constructor() {
    this.registrationAttempts = new Map();
    logger.info("Instagram Registration Service initialized");
  }

  async register() {
    let browser;
    try {
      // Generate registration data
      const registrationData = this.prepareRegistrationData();
      logger.info(
        `Prepared registration data for ${registrationData.username}`
      );

      browser = await chromium.launch({
        headless: config.headless,
        args: config.browserOptions.args,
      });

      const context = await browser.newContext({
        userAgent:
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
        viewport: { width: 1280, height: 720 },
      });

      const page = await wrap(await context.newPage());
      logger.info("Browser and context initialized");

      // Navigate to signup page
      await page.goto("https://www.instagram.com/accounts/emailsignup/", {
        waitUntil: "networkidle",
      });

      await page.waitForTimeout(2000);
      logger.info("Navigated to signup page");

      // Using AgentQL query format for better readability and maintainability
      const SIGNUP_QUERY = {
        form: {
          email: 'input[name="emailOrPhone"]',
          fullName: 'input[name="fullName"]',
          username: 'input[name="username"]',
          password: 'input[name="password"]',
          birthdayMonth: 'select[title="Month:"]',
          birthdayDay: 'select[title="Day:"]',
          birthdayYear: 'select[title="Year:"]',
          submit: 'button[type="submit"]',
        },
      };

      // Fill form using AgentQL approach
      await this.fillRegistrationForm(page, SIGNUP_QUERY, registrationData);
      logger.info("Form filled successfully");

      // Take screenshot of filled form
      await takeScreenshot(
        page,
        `registration_form_${registrationData.username}`
      );

      // Update registration status
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
      logger.error("Registration error:", error);
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

  async fillRegistrationForm(page, query, data) {
    logger.error(`FORM DATA: ${JSON.stringify(data, null, 2)}`);
    // Wait for and fill email
    await page.waitForSelector(query.form.email);
    await page.fill(query.form.email, data.email);
    await page.waitForTimeout(500);

    // Wait for and fill full name
    await page.waitForSelector(query.form.fullName);
    await page.fill(query.form.fullName, data.fullName);
    await page.waitForTimeout(500);

    // Wait for and fill username
    await page.waitForSelector(query.form.username);
    await page.fill(query.form.username, data.username);
    await page.waitForTimeout(500);

    // Wait for and fill password
    await page.waitForSelector(query.form.password);
    await page.fill(query.form.password, data.password);
    await page.waitForTimeout(500);

    // Click on signup button
    await page.click(query.form.submit);
    await page.waitForTimeout(2000);

    // Set birthday
    await page.selectOption(
      query.form.birthdayMonth,
      data.birthday.month.toString()
    );
    await page.selectOption(
      query.form.birthdayDay,
      data.birthday.day.toString()
    );
    await page.selectOption(
      query.form.birthdayYear,
      data.birthday.year.toString()
    );
    await page.waitForTimeout(1000);

    // Click on next button
    await page.click(query.form.submit);
    await page.waitForTimeout(2000);

    const nextButton = await page.queryElements(
      `{
        nextButton: 'button[type="submit"]'
        }`
    );

    if (nextButton.nextButton) {
      await page.click(nextButton.nextButton);
      await page.waitForTimeout(2000);
    }
  }

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

  getRegistrationStatus(username) {
    return this.registrationAttempts.get(username);
  }
}

module.exports = new InstagramRegistrationService();
