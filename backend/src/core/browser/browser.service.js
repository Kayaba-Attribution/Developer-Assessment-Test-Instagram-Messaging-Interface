// src/core/browser/browser.service.js
const { chromium } = require("playwright");
const { wrap } = require("agentql");
const crypto = require("crypto");
const { BROWSER_CONFIG } = require("./browser.config");

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

  async createPage(sessionData = null, proxy = null) {
    const fingerprint = this.generateFingerprint();

    const proxyConfig = {
      server: "http://pr.oxylabs.io:7777",
      username: "customer-posty_oQQDk",
      password: "bv6sfaQedBJtdbt4D6Uc+",
    };

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
}

module.exports = BrowserService;
