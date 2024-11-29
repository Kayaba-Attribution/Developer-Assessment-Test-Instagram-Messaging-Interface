// src/core/browser/browser.service.js
const { chromium } = require("playwright");
const { wrap } = require("agentql");
const crypto = require("crypto");
const { BROWSER_CONFIG } = require("./browser.config");
const fetch = require('node-fetch');

class BrowserService {
  constructor(config, logger) {
    this.config = config;
    this.logger = logger;
    this.logger.info(
      "Browser service initialized",
      BROWSER_CONFIG.IGNORED_ARGS
    );
    this.browserConfig = BROWSER_CONFIG;
  }

  async createPageWithMode(mode = "default", sessionData = null, proxy = null) {
    // mode: default, no-proxy, adspower, brightdata
    this.logger.info(`Creating page with mode: ${mode}`);

    switch (mode) {
      case "no-proxy":
        return this.createPageNoProxy(sessionData);
      case "adspower":
        return this.createPageAdsPower(sessionData, true);
      case "brightdata":
        return this.createPageBrightdata(sessionData);
      case "default":
      default:
        return this.createPage(sessionData, proxy);
    }
  }

  generateFingerprint() {
    const location =
      this.browserConfig.LOCATIONS[
        Math.floor(Math.random() * this.browserConfig.LOCATIONS.length)
      ];

    return {
      userAgent:
        this.browserConfig.USER_AGENTS[
          Math.floor(Math.random() * this.browserConfig.USER_AGENTS.length)
        ],
      language:
        this.browserConfig.LANGUAGES[
          Math.floor(Math.random() * this.browserConfig.LANGUAGES.length)
        ],
      referer:
        this.browserConfig.REFERERS[
          Math.floor(Math.random() * this.browserConfig.REFERERS.length)
        ],
      viewport: {
        width:
          this.browserConfig.BROWSER_WIDTH +
          Math.floor(Math.random() * this.browserConfig.VIEWPORT_JITTER),
        height:
          this.browserConfig.BROWSER_HEIGHT +
          Math.floor(Math.random() * this.browserConfig.VIEWPORT_JITTER),
      },
      ...location,
      webGLVendor: "Google Inc. (Intel)",
      webGLRenderer:
        "ANGLE (Intel, Intel(R) UHD Graphics Direct3D11 vs_5_0 ps_5_0)",
      hardwareConcurrency: 8,
      deviceMemory: 8,
      platform: "Win32",
    };
  }

  // Helper functions
  async simulateHumanBehavior(page) {
    const moveCount = Math.floor(Math.random() * 3) + 2;
    for (let i = 0; i < moveCount; i++) {
      await page.mouse.move(Math.random() * 1920, Math.random() * 1080, {
        steps: 10,
      });
      await page.waitForTimeout(Math.random() * 200 + 100);
    }
  }

  async takeScreenshot(page, name) {
    if (!this.config.saveScreenshots) return null;
    const timestamp = Date.now();
    const randomSuffix = crypto.randomBytes(4).toString("hex");
    const path = `${this.config.screenshotsDir}/${name}_${timestamp}_${randomSuffix}.png`;
    await page.screenshot({ path });
    return path;
  }

  async verifyProxy(page) {
    try {
      // Check IP using multiple services for redundancy
      const ipChecks = [
        "https://api.ipify.org?format=json",
        "https://ifconfig.me/all.json",
        "https://ip.seeip.org/jsonip",
      ];

      for (const url of ipChecks) {
        try {
          const response = await page.evaluate(async (url) => {
            const res = await fetch(url);
            return res.json();
          }, url);

          this.logger.info(`[ProxyCheck] IP Details:`, response);
          return response;
        } catch (e) {
          continue; // Try next service if one fails
        }
      }

      throw new Error("All IP check services failed");
    } catch (error) {
      this.logger.error("[ProxyCheck] Failed to verify proxy:", error);
      return null;
    }
  }

  async createAdsProfile(useProxy = false) {

    if (useProxy) {
      this.logger.info("[BrowserService] Creating AdsPower profile with proxy");
    } else {
      this.logger.info("[BrowserService] Creating AdsPower profile without proxy");
    }
    try {
      const profileData = {
        name: `Profile_${Date.now()}`,
        group_id: this.config.ADS_POWER_GROUP_ID || "0",
        ...(useProxy 
          ? { proxyid: "1" }  // Use proxy ID 1 when useProxy is true
          : { user_proxy_config: { proxy_soft: "no_proxy" } }  // No proxy configuration
        ),
        fingerprint_config: {
          automatic_timezone: "1",
          language: ["en-US", "en"],
          flash: "block",
          webrtc: "disabled",
          ua: this.browserConfig.USER_AGENTS[
            Math.floor(Math.random() * this.browserConfig.USER_AGENTS.length)
          ],
          resolution: `${this.browserConfig.BROWSER_WIDTH}x${this.browserConfig.BROWSER_HEIGHT}`,
        }
      };

      const response = await fetch('http://local.adspower.net:50325/api/v1/user/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profileData)
      });

      const data = await response.json();
      
      if (data.code !== 0) {
        throw new Error(`Failed to create AdsPower profile: ${data.msg}`);
      }

      this.logger.info('[BrowserService] Created new AdsPower profile:', {
        id: data.data.id,
        useProxy: useProxy
      });
      return data.data.id;
    } catch (error) {
      this.logger.error('[BrowserService] Failed to create AdsPower profile:', error);
      throw error;
    }
  }

  async createPageAdsPower(sessionData = null, proxy = null) {
    try {
      // Create a new profile with proxy flag based on proxy parameter
      const userId = await this.createAdsProfile(!!proxy);
      
      // Delete cache (existing code)
      this.logger.info("[BrowserService] Attempting to delete AdsPower cache");
      const deleteCacheResponse = await fetch(
        "http://local.adspower.net:50325/api/v1/user/delete-cache",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const deleteCacheData = await deleteCacheResponse.json();
      if (deleteCacheData.code === 0) {
        this.logger.info(
          "[BrowserService] Successfully cleared AdsPower cache"
        );
      } else {
        this.logger.warn(
          "[BrowserService] Failed to clear cache:",
          deleteCacheData.msg
        );
        // Don't throw error here, continue with browser creation
      }

      // Continue with existing browser creation logic
      const adsPowerUrl = `http://local.adspower.net:50325/api/v1/browser/start?user_id=${userId}&open_tabs=1&delete_user_data=true&clear_cache_after_closing=1`;

      this.logger.info(
        "[BrowserService] Attempting to connect to AdsPower:",
        adsPowerUrl
      );

      const adsPowerResponse = await fetch(adsPowerUrl, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!adsPowerResponse.ok) {
        throw new Error(
          `AdsPower API returned status ${
            adsPowerResponse.status
          }: ${await adsPowerResponse.text()}`
        );
      }

      const responseData = await adsPowerResponse.json();
      if (responseData.code !== 0) {
        this.logger.error(
          "[BrowserService] Failed to start AdsPower browser:",
          responseData.msg
        );
        throw new Error(`AdsPower failed to start: ${responseData.msg}`);
      }

      // Use the puppeteer websocket URL directly
      const wsEndpoint = responseData.data.ws.puppeteer;
      this.logger.info("[BrowserService] Connecting to websocket:", wsEndpoint);

      const browser = await chromium.connectOverCDP(wsEndpoint);
      const context = browser.contexts()[0];
      const page = await wrap(await context.newPage());

      const ipInfo = await this.verifyProxy(page);
      if (!ipInfo) {
        this.logger.error("[BrowserService] Proxy verification failed!");
        throw new Error("Proxy verification failed");
      }

      await this.simulateHumanBehavior(page);

      return { browser, page, userId };
    } catch (error) {
      this.logger.error("[BrowserService] AdsPower connection failed:", error);
      throw new Error(`Failed to connect to AdsPower: ${error.message}`);
    }
  }

  async createPageNoProxy(sessionData = null) {
    const fingerprint = this.generateFingerprint();

    const browser = await chromium.launch({
      headless: this.config.headless,
      args: [...this.browserConfig.BROWSER_ARGS],
      ignoreDefaultArgs: this.browserConfig.IGNORED_ARGS,
    });

    const context = await browser.newContext({
      userAgent: fingerprint.userAgent,
      viewport: fingerprint.viewport,
      locale: fingerprint.language,
      timezoneId: fingerprint.timezone,
      geolocation: fingerprint.geolocation,
      permissions: ["geolocation", "notifications"],
      extraHTTPHeaders: {
        "Accept-Language": fingerprint.language,
        Referer: fingerprint.referer,
        DNT: Math.random() > 0.5 ? "1" : "0",
        "Sec-Ch-Ua": '"Chromium";v="119", "Google Chrome";v="119"',
        "Sec-Ch-Ua-Mobile": "?0",
        "Sec-Ch-Ua-Platform": '"Windows"',
      },
      ...(sessionData && { storageState: sessionData }),
    });

    const page = await wrap(await context.newPage());
    await this.simulateHumanBehavior(page);

    return { browser, page, fingerprint };
  }

  async createPage(sessionData = null, proxy = null) {
    const fingerprint = this.generateFingerprint();

    let proxyConfig = this.config.OXYLABS_PROXY;
    this.logger.info("[BrowserService] Attempting to use proxy:", {
      server: proxyConfig.server,
      username: proxyConfig.username,
    });

    const browser = await chromium.launch({
      headless: this.config.headless,
      args: [
        ...this.browserConfig.BROWSER_ARGS,
        ...(proxyConfig ? [`--proxy-server=${proxyConfig.server}`] : []),
      ],
      ignoreDefaultArgs: this.browserConfig.IGNORED_ARGS,
    });

    const context = await browser.newContext({
      userAgent: fingerprint.userAgent,
      viewport: fingerprint.viewport,
      locale: fingerprint.language,
      timezoneId: fingerprint.timezone,
      geolocation: fingerprint.geolocation,
      permissions: ["geolocation", "notifications"],
      extraHTTPHeaders: {
        "Accept-Language": fingerprint.language,
        Referer: fingerprint.referer,
        DNT: Math.random() > 0.5 ? "1" : "0",
        "Sec-Ch-Ua": '"Chromium";v="119", "Google Chrome";v="119"',
        "Sec-Ch-Ua-Mobile": "?0",
        "Sec-Ch-Ua-Platform": '"Windows"',
      },
      ...(sessionData && { storageState: sessionData }),
      ...(proxyConfig && {
        proxy: {
          server: proxyConfig.server,
          username: proxyConfig.username,
          password: proxyConfig.password,
        },
      }),
    });

    await context.addInitScript(() => {
      const originalQuery = window.navigator.permissions.query;
      window.navigator.permissions.query = (parameters) =>
        parameters.name === "notifications"
          ? Promise.resolve({ state: Notification.permission })
          : originalQuery(parameters);

      // Overwrite properties that might reveal automation
      Object.defineProperties(navigator, {
        webdriver: { get: () => undefined },
        languages: { get: () => ["en-US", "en"] },
        plugins: { get: () => [1, 2, 3, 4, 5] },
        permissions: {
          get: () => ({
            query: async () => ({ state: "granted" }),
          }),
        },
      });

      // Add Chrome runtime
      window.chrome = {
        runtime: {},
        app: {},
        csi: () => {},
        loadTimes: () => {},
      };

      // Mock canvas fingerprint
      const getContext = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (type) {
        const context = getContext.apply(this, arguments);
        if (type === "2d") {
          context.fillText = function () {
            arguments[0] = arguments[0].replace(/./g, args[0][0]);
            return context.__proto__.fillText.apply(context, arguments);
          };
        }
        return context;
      };
    });

    const page = await wrap(await context.newPage());

    const ipInfo = await this.verifyProxy(page);
    if (!ipInfo) {
      this.logger.error("[BrowserService] Proxy verification failed!");
      throw new Error("Proxy verification failed");
    }

    // Add mouse movement simulation
    await this.simulateHumanBehavior(page);

    return { browser, page, fingerprint };
  }

  async createPageBrightdata(sessionData = null) {
    try {
      // Validate configuration first
      this.validateBrightdataConfig();
      
      this.logger.info("[BrowserService] Attempting to connect to Brightdata browser", {
        wsEndpoint: this.config.BRIGHTDATA_CONFIG?.wsEndpoint
      });

      // Add connection timeout
      const connectPromise = chromium.connectOverCDP(this.config.BRIGHTDATA_CONFIG.wsEndpoint);
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Connection timeout after 30 seconds")), 30000);
      });

      const browser = await Promise.race([connectPromise, timeoutPromise])
        .catch(error => {
          this.logger.error("[BrowserService] Brightdata connection failed:", {
            error: error.message,
            stack: error.stack
          });
          throw new Error(`Failed to connect to Brightdata: ${error.message}`);
        });

      this.logger.info("[BrowserService] Connected to Brightdata browser, creating context");

      // Create browser context with more detailed error handling
      let context;
      try {
        context = await browser.newContext({
          userAgent: this.browserConfig.USER_AGENTS[
            Math.floor(Math.random() * this.browserConfig.USER_AGENTS.length)
          ],
          viewport: {
            width: this.browserConfig.BROWSER_WIDTH,
            height: this.browserConfig.BROWSER_HEIGHT
          },
          ...(sessionData && { storageState: sessionData }),
          // Add additional options to help with detection
          ignoreHTTPSErrors: true,
          bypassCSP: true,
          extraHTTPHeaders: {
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'sec-ch-ua': '"Google Chrome";v="119"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"Windows"'
          }
        });
      } catch (error) {
        this.logger.error("[BrowserService] Failed to create browser context:", {
          error: error.message,
          stack: error.stack
        });
        await browser.close().catch(e => this.logger.error("Failed to close browser after context creation error:", e));
        throw error;
      }

      this.logger.info("[BrowserService] Browser context created, creating new page");

      // Create page with error handling
      let page;
      try {
        page = await wrap(await context.newPage());
      } catch (error) {
        this.logger.error("[BrowserService] Failed to create new page:", {
          error: error.message,
          stack: error.stack
        });
        await context.close().catch(e => this.logger.error("Failed to close context after page creation error:", e));
        await browser.close().catch(e => this.logger.error("Failed to close browser after page creation error:", e));
        throw error;
      }

      // Test the connection with a simple navigation
      try {
        this.logger.info("[BrowserService] Testing Brightdata connection");
        await page.goto('https://api.ipify.org?format=json', {
          waitUntil: 'networkidle',
          timeout: 30000
        });
        
        const ipInfo = await this.verifyProxy(page);
        if (!ipInfo) {
          throw new Error("Failed to verify Brightdata connection");
        }
        
        this.logger.info("[BrowserService] Brightdata connection test successful", { ipInfo });
      } catch (error) {
        this.logger.error("[BrowserService] Brightdata connection test failed:", {
          error: error.message,
          stack: error.stack
        });
        await page.close().catch(e => this.logger.error("Failed to close page after connection test error:", e));
        await context.close().catch(e => this.logger.error("Failed to close context after connection test error:", e));
        await browser.close().catch(e => this.logger.error("Failed to close browser after connection test error:", e));
        throw error;
      }

      await this.simulateHumanBehavior(page);

      return { browser, page };
    } catch (error) {
      this.logger.error("[BrowserService] Brightdata browser creation failed:", {
        error: error.message,
        stack: error.stack,
        config: {
          ...this.config.BRIGHTDATA_CONFIG,
          wsEndpoint: '[REDACTED]' // Don't log credentials
        }
      });
      throw new Error(`Failed to create Brightdata browser: ${error.message}`);
    }
  }

  validateBrightdataConfig() {
    const config = this.config.BRIGHTDATA_CONFIG;
    
    if (!config) {
      throw new Error("Brightdata configuration is missing");
    }

    if (!config.wsEndpoint) {
      throw new Error("Brightdata websocket endpoint is missing");
    }

    if (!config.wsEndpoint.startsWith('wss://')) {
      throw new Error("Invalid Brightdata websocket endpoint format");
    }

    // Basic format validation for the endpoint
    const wsRegex = /^wss:\/\/brd-customer-[^:]+:[^@]+@brd\.superproxy\.io:\d+$/;
    if (!wsRegex.test(config.wsEndpoint)) {
      throw new Error("Invalid Brightdata websocket endpoint format");
    }

    return true;
  }
}

module.exports = BrowserService;
