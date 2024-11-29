// proxyTester.js
const axios = require("axios");
const logger = require("../utils/logger");

class ProxyTester {
  constructor() {
    this.testUrls = [
      "https://api.ipify.org?format=json",
      "http://ip-api.com/json",
      "https://www.google.com",
    ];
  }

  async testProxy(proxy) {
    const results = await Promise.all(
      this.testUrls.map((url) => this.testUrl(proxy, url))
    );

    const successRate = results.filter(Boolean).length / results.length;
    return successRate >= 0.5; // Proxy is good if at least 50% of tests pass
  }

  async testUrl(proxy, url) {
    try {
      const response = await axios.get(url, {
        proxy: {
          host: proxy.server.split("://")[1].split(":")[0],
          port: proxy.server.split(":")[2],
          protocol: proxy.server.split(":")[0],
        },
        timeout: 5000,
      });
      return response.status === 200;
    } catch (error) {
        logger.warn(`Error testing proxy ${proxy.server}: ${error.message}`);
      return false;
    }
  }

  async testSpeed(proxy) {
    const startTime = Date.now();
    const success = await this.testUrl(proxy, this.testUrls[0]);
    const endTime = Date.now();

    return {
      success,
      speed: endTime - startTime,
    };
  }
}

module.exports = new ProxyTester();
