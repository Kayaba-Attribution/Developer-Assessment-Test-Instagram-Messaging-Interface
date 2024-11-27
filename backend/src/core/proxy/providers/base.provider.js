// src/core/proxy/providers/base.provider.js

// Will be extended with the getProxy method
class BaseProxyProvider {
  constructor(logger) {
    this.logger = logger;
  }

  async getProxy() {
    throw new Error("getProxy must be implemented");
  }
}

module.exports = BaseProxyProvider;
