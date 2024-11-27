// src/core/proxy/proxy.validator.js
class ProxyValidator {
    constructor(logger) {
      this.logger = logger;
      this.testUrls = [
        "https://api.ipify.org?format=json",
        "https://www.google.com"
      ];
    }
  
    async validate(proxy) {
      const results = await Promise.all(
        this.testUrls.map(url => this.testUrl(proxy, url))
      );
      
      const successRate = results.filter(Boolean).length / results.length;
      return successRate >= 0.5;
    }
  
    async testUrl(proxy, url) {
      try {
        const [host, port] = proxy.server.split("://")[1].split(":");
        const response = await axios.get(url, {
          proxy: { host, port, protocol: 'http' },
          timeout: 5000
        });
        return response.status === 200;
      } catch {
        return false;
      }
    }
  }

module.exports = ProxyValidator;