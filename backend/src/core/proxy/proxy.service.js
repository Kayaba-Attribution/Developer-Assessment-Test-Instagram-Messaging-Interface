// src/core/proxy/proxy.service.js
const ProxyPool = require('./proxy.pool');
const ProxyValidator = require('./proxy.validator');
const SpeedXProvider = require('./providers/speed-x.provider');

class ProxyService {
  constructor(logger) {
    this.logger = logger;
    this.pool = new ProxyPool(logger);
    this.validator = new ProxyValidator(logger);
    this.providers = [new SpeedXProvider(logger)];
  }

  async getWorkingProxy() {
    // First try pool
    const workingProxies = this.pool.getWorking();
    this.logger.info(`Found ${workingProxies.length} working proxies`);
    for (const proxy of workingProxies) {
      if (await this.validator.validate(proxy)) {
        this.pool.updateStatus(proxy, true);
        return proxy;
      }
      this.pool.updateStatus(proxy, false);
    }

    // Try getting new proxies
    for (const provider of this.providers) {
      const proxies = await provider.getProxy();
      this.logger.debug(`Found ${proxies.length} proxies from ${provider.constructor.name}`);
      for (const proxy of proxies) {
        this.logger.debug(`Validating proxy ${proxy.server}`);
        if (await this.validator.validate(proxy)) {
          this.pool.add(proxy, { success: true });
          return proxy;
        }
      }
    }

    throw new Error("No working proxy found");
  }
}

module.exports = ProxyService;
