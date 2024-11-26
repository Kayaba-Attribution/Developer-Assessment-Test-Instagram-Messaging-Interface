// freeProxyService.js
const axios = require("axios");
const logger = require("../utils/logger");

class FreeProxyService {
  constructor() {
    // Known working proxies
    this.knownProxies = [
      { server: "http://8.213.128.90:8192", type: "http", isKnown: true },
      { server: "http://47.91.29.151:9098", type: "http", isKnown: true },
      { server: "http://8.213.195.191:3333", type: "http", isKnown: true },
      { server: "http://59.124.71.14:80", type: "http", isKnown: true },
    ];

    this.proxyList = [...this.knownProxies];
    this.lastFetch = 0;
    this.fetchInterval = 15 * 60 * 1000; // 15 minutes
    this.proxyStats = new Map(); // Track proxy performance

    // Configure retry attempts
    this.maxRetries = 3;
    this.retryDelay = 1000; // 1 second

    logger.info(`Initialized with ${this.knownProxies.length} known proxies`);
  }

  async getProxy() {
    try {
      // First try known proxies
      const workingKnownProxy = await this.findWorkingKnownProxy();
      if (workingKnownProxy) {
        return workingKnownProxy;
      }

      // If no known proxies work, update and try other proxies
      await this.updateProxyListIfNeeded();
      return await this.findWorkingProxy();
    } catch (error) {
      logger.error("Error getting proxy:", error);
      throw error;
    }
  }

  async findWorkingKnownProxy() {
    for (const proxy of this.knownProxies) {
      try {
        logger.info(`Testing known proxy: ${proxy.server}`);
        if (await this.verifyProxy(proxy)) {
          this.updateProxyStats(proxy.server, true);
          return proxy;
        }
        this.updateProxyStats(proxy.server, false);
      } catch (error) {
        logger.warn(`Known proxy ${proxy.server} failed:`, error.message);
        this.updateProxyStats(proxy.server, false);
      }
    }
    return null;
  }

  async findWorkingProxy() {
    const maxAttempts = 5;
    for (let i = 0; i < maxAttempts; i++) {
      const proxy = this.getRandomProxy();
      try {
        logger.info(`Testing proxy ${i + 1}/${maxAttempts}: ${proxy.server}`);
        if (await this.verifyProxy(proxy)) {
          this.updateProxyStats(proxy.server, true);
          return proxy;
        }
        this.updateProxyStats(proxy.server, false);
      } catch (error) {
        logger.warn(`Proxy ${proxy.server} failed:`, error.message);
        this.updateProxyStats(proxy.server, false);
      }
    }
    throw new Error("No working proxies found");
  }

  async updateProxyListIfNeeded() {
    const now = Date.now();
    if (
      this.proxyList.length === 0 ||
      now - this.lastFetch > this.fetchInterval
    ) {
      await this.fetchProxies();
    }
  }

  async fetchProxies() {
    try {
      const proxies = await Promise.all([
        this.fetchWithRetry(() => this.fetchProxyList()),
        this.fetchWithRetry(() => this.fetchGimmeProxy()),
        this.fetchWithRetry(() => this.fetchPubProxy()),
      ]);

      const newProxies = proxies.flat().filter(Boolean);
      this.proxyList = [...this.knownProxies, ...newProxies];
      this.lastFetch = Date.now();

      logger.info(
        `Fetched ${newProxies.length} new proxies, total: ${this.proxyList.length}`
      );
    } catch (error) {
      logger.error("Error fetching proxies:", error);
      // Fall back to known proxies if fetch fails
      this.proxyList = [...this.knownProxies];
    }
  }

  async fetchWithRetry(fetchFn) {
    for (let i = 0; i < this.maxRetries; i++) {
      try {
        return await fetchFn();
      } catch (error) {
        if (i === this.maxRetries - 1) throw error;
        await new Promise((resolve) =>
          setTimeout(resolve, this.retryDelay * (i + 1))
        );
      }
    }
  }

  async fetchProxyList() {
    try {
      const response = await axios.get(
        "https://raw.githubusercontent.com/TheSpeedX/SOCKS-List/master/http.txt",
        { timeout: 5000 }
      );
      const lines = response.data.split("\n");

      return lines
        .map((line) => {
          const [host, port] = line.trim().split(":");
          if (host && port) {
            return {
              server: `http://${host}:${port}`,
              type: "http",
              isKnown: false,
            };
          }
          return null;
        })
        .filter(Boolean);
    } catch (error) {
      logger.warn("Error fetching from ProxyList:", error);
      return [];
    }
  }

  async fetchGimmeProxy() {
    try {
      const response = await axios.get(
        "https://gimmeproxy.com/api/getProxy?protocol=http",
        { timeout: 5000 }
      );
      if (response.data.ip && response.data.port) {
        return [
          {
            server: `http://${response.data.ip}:${response.data.port}`,
            type: "http",
            isKnown: false,
          },
        ];
      }
      return [];
    } catch (error) {
      logger.warn("Error fetching from GimmeProxy:", error);
      return [];
    }
  }

  async fetchPubProxy() {
    try {
      const response = await axios.get(
        "http://pubproxy.com/api/proxy?format=json&type=http",
        { timeout: 5000 }
      );
      if (response.data.data?.[0]?.ip && response.data.data[0]?.port) {
        return [
          {
            server: `http://${response.data.data[0].ip}:${response.data.data[0].port}`,
            type: "http",
            isKnown: false,
          },
        ];
      }
      return [];
    } catch (error) {
      logger.warn("Error fetching from PubProxy:", error);
      return [];
    }
  }

  getRandomProxy() {
    // Prioritize proxies with better success rates
    const workingProxies = this.proxyList.filter((proxy) => {
      const stats = this.proxyStats.get(proxy.server);
      return !stats || stats.successRate > 0.3; // 30% success rate threshold
    });

    if (workingProxies.length === 0) {
      throw new Error("No suitable proxies available");
    }

    return workingProxies[Math.floor(Math.random() * workingProxies.length)];
  }

  async verifyProxy(proxy) {
    try {
      const response = await axios.get("https://api.ipify.org?format=json", {
        proxy: {
          host: proxy.server.split("://")[1].split(":")[0],
          port: proxy.server.split(":")[2],
          protocol: proxy.server.split(":")[0],
        },
        timeout: 5000,
      });
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }

  updateProxyStats(proxyServer, success) {
    const stats = this.proxyStats.get(proxyServer) || {
      successes: 0,
      failures: 0,
      successRate: 1,
    };

    if (success) {
      stats.successes++;
    } else {
      stats.failures++;
    }

    stats.successRate = stats.successes / (stats.successes + stats.failures);
    this.proxyStats.set(proxyServer, stats);

    logger.debug(`Proxy ${proxyServer} stats: ${JSON.stringify(stats)}`);
  }

  getProxyStats() {
    return Object.fromEntries(this.proxyStats);
  }
}

module.exports = new FreeProxyService();
