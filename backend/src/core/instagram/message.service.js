const { takeScreenshot } = require("../../utils/files");

class MessageService {
  constructor(browserService, proxyService, sessionService, logger, config) {
    this.browserService = browserService;
    this.proxyService = proxyService;
    this.sessionService = sessionService;
    this.logger = logger;
    this.config = config;

    this.messageSelectors = {
      messageInput: 'textarea[placeholder="Message..."]',
      sendButton: 'button[type="submit"]',
      errorMessage: 'div[role="alert"]',
      chatContainer: 'div[role="main"]'
    };
  }

  async sendMessage(username, content, sessionId) {
    let browser, page;

    try {
      // Get session data
      const session = await this.sessionService.getSession(sessionId);
      if (!session) {
        throw new Error("Invalid session");
      }

      // Get working proxy
      const proxy = await this.proxyService.getWorkingProxy();

      // Create browser page with session
      const browserInstance = await this.browserService.createPage(
        session.sessionData,
        proxy
      );
      browser = browserInstance.browser;
      page = browserInstance.page;

      // Verify session by visiting Instagram
      await this._verifySession(page);

      // Navigate to direct message URL
      await this._navigateToMessagePage(page, username);

      // Send the message
      await this._sendMessage(page, content);

      return {
        success: true,
        username,
        content,
        timestamp: Date.now()
      };

    } catch (error) {
      this.logger.error("Message sending failed:", error);
      return { success: false, error: error.message };
    } finally {
      if (browser) await browser.close();
    }
  }

  async _verifySession(page) {
    this.logger.debug("Verifying session");
    
    await page.goto("https://www.instagram.com/", {
      waitUntil: "networkidle",
      timeout: 30000
    });

    await takeScreenshot(page, "session_verification");

    const currentUrl = page.url();
    if (currentUrl.includes("accounts/login")) {
      throw new Error("Session invalid or expired");
    }
  }

  async _navigateToMessagePage(page, username) {
    this.logger.debug(`Navigating to message page for user: ${username}`);

    await page.goto(`https://instagram.com/direct/t/${username}`, {
      waitUntil: "networkidle",
      timeout: 30000
    });

    await takeScreenshot(page, `message_page_${username}`);

    // Check if user exists
    const content = await page.content();
    if (content.includes("Page Not Found") || content.includes("Sorry, this page isn't available")) {
      throw new Error("User not found or not accessible");
    }

    // Wait for chat container to be visible
    await page.waitForSelector(this.messageSelectors.chatContainer, {
      state: "visible",
      timeout: 10000
    });
  }

  async _sendMessage(page, content) {
    try {
      // Wait for message input
      await page.waitForSelector(this.messageSelectors.messageInput, {
        state: "visible",
        timeout: 10000
      });

      // Type message with human-like behavior
      await page.click(this.messageSelectors.messageInput);
      await this._randomDelay(300, 800);

      for (const char of content) {
        await page.type(this.messageSelectors.messageInput, char, {
          delay: Math.random() * 100 + 50
        });
      }

      await takeScreenshot(page, "message_typed");

      // Wait for send button to be enabled
      await page.waitForSelector(this.messageSelectors.sendButton, {
        state: "visible",
        timeout: 5000
      });

      // Click send button
      await page.click(this.messageSelectors.sendButton);

      // Wait for message to be sent
      await page.waitForTimeout(2000);

      // Check for error messages
      const errorElement = await page.$(this.messageSelectors.errorMessage);
      if (errorElement) {
        const errorText = await errorElement.textContent();
        throw new Error(`Message failed to send: ${errorText}`);
      }

      await takeScreenshot(page, "message_sent");

    } catch (error) {
      this.logger.error("Error sending message:", error);
      await takeScreenshot(page, "message_error");
      throw error;
    }
  }

  async _randomDelay(min, max) {
    const delay = Math.floor(Math.random() * (max - min) + min);
    await new Promise(resolve => setTimeout(resolve, delay));
  }
}

module.exports = MessageService;
