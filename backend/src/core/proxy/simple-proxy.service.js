// src/core/proxy/simple-proxy.service.js
const axios = require("axios");
const fs = require("fs").promises;
const path = require("path");

class SimpleProxyService {
  constructor(logger) {
    this.logger = logger;
    this.knownProxies = [];
    this.proxyStats = new Map();
    this.proxyFile = path.join(__dirname, "../../../working-proxies.json");
    this.initialized = false;
  }

  async init() {
    if (this.initialized) return;

    try {
      const data = await fs.readFile(this.proxyFile, "utf8");
      this.knownProxies = JSON.parse(data);
      this.logger.info(
        `[ProxyService] Loaded ${this.knownProxies.length} known proxies`
      );
    } catch (error) {
      this.logger.warn(
        "[ProxyService] No existing proxies found, starting fresh"
      );
      this.knownProxies = [];
    }

    this.initialized = true;
  }

  async getWorkingProxy() {
    if (!this.initialized) {
      await this.init();
    }

    // Try known working proxies first
    for (const proxy of this.knownProxies) {
      this.logger.debug(`[ProxyService] Testing known proxy: ${proxy.server}`);
      const isWorking = await this.verifyProxy(proxy);

      if (isWorking) {
        this.logger.debug(`[ProxyService] Using known proxy: ${proxy.server}`);
        this.updateProxyStats(proxy.server, true);
        return proxy;
      }

      this.updateProxyStats(proxy.server, false);
    }

    // If no known proxies work, try getting new ones
    return this.findNewWorkingProxy();
  }

  async verifyProxy(proxy) {
    const testUrls = [
      "https://api.ipify.org?format=json",
      "https://www.google.com",
    ];

    for (const url of testUrls) {
      try {
        const [host, port] = proxy.server.split("://")[1].split(":");
        const response = await axios.get(url, {
          proxy: {
            host,
            port,
            protocol: proxy.server.split(":")[0],
          },
          timeout: 5000,
        });

        if (response.status !== 200) return false;
      } catch (error) {
        return false;
      }
    }

    return true;
  }

  async findNewWorkingProxy() {
    const sources = [
      this.fetchProxyList.bind(this),
      this.fetchGimmeProxy.bind(this),
      this.fetchPubProxy.bind(this),
    ];

    for (const fetchSource of sources) {
      try {
        const proxies = await fetchSource();

        for (const proxy of proxies) {
          this.logger.debug(
            `[ProxyService] Testing new proxy: ${proxy.server}`
          );
          const isWorking = await this.verifyProxy(proxy);

          if (isWorking) {
            await this.addToKnownProxies(proxy);
            return proxy;
          }
        }
      } catch (error) {
        this.logger.error(`[ProxyService] Source error: ${error.message}`);
      }
    }

    throw new Error("No working proxies found");
  }

  async addToKnownProxies(proxy) {
    if (!this.knownProxies.some((p) => p.server === proxy.server)) {
      this.knownProxies.push(proxy);
      await this.saveKnownProxies();
    }
  }

  async saveKnownProxies() {
    try {
      await fs.writeFile(
        this.proxyFile,
        JSON.stringify(this.knownProxies, null, 2)
      );
      this.logger.info(`Saved ${this.knownProxies.length} proxies to file`);
    } catch (error) {
      this.logger.error(`Error saving proxies: ${error.message}`);
    }
  }

  // Proxy source methods remain similar but return promises
  async fetchProxyList() {
    try {
      const response = await axios.get(
        "https://raw.githubusercontent.com/TheSpeedX/SOCKS-List/master/http.txt",
        { timeout: 5000 }
      );

      return response.data
        .split("\n")
        .map((line) => {
          const [host, port] = line.trim().split(":");
          return host && port
            ? {
                server: `http://${host}:${port}`,
                type: "http",
                isKnown: false,
              }
            : null;
        })
        .filter(Boolean);
    } catch (error) {
      this.logger.warn("Error fetching from ProxyList:", error.message);
      return [];
    }
  }

  async fetchGimmeProxy() {
    try {
      const response = await axios.get(
        "https://gimmeproxy.com/api/getProxy?protocol=http",
        { timeout: 5000 }
      );

      return response.data.ip && response.data.port
        ? [
            {
              server: `http://${response.data.ip}:${response.data.port}`,
              type: "http",
              isKnown: false,
            },
          ]
        : [];
    } catch (error) {
      this.logger.warn("Error fetching from GimmeProxy:", error.message);
      return [];
    }
  }

  async fetchPubProxy() {
    try {
      const response = await axios.get(
        "http://pubproxy.com/api/proxy?format=json&type=http",
        { timeout: 5000 }
      );

      const proxy = response.data?.data?.[0];
      return proxy?.ip && proxy?.port
        ? [
            {
              server: `http://${proxy.ip}:${proxy.port}`,
              type: "http",
              isKnown: false,
            },
          ]
        : [];
    } catch (error) {
      this.logger.warn("Error fetching from PubProxy:", error.message);
      return [];
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
  }

  getProxyStats() {
    return Object.fromEntries(this.proxyStats);
  }
}

module.exports = SimpleProxyService;
