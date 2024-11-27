// src/core/proxy/proxy.pool.js
class ProxyPool {
  constructor(logger) {
    this.logger = logger;
    this.proxies = new Map();
    this.successThreshold = 0.3;
    this.ttl = 15 * 60 * 1000; // 15 minutes
  }

  add(proxy, status = { success: true }) {
    this.proxies.set(proxy.server, {
      proxy,
      successes: status.success ? 1 : 0,
      failures: status.success ? 0 : 1,
      lastUsed: Date.now(),
    });
  }

  getWorking() {
    const now = Date.now();
    return Array.from(this.proxies.entries())
      .filter(([_, data]) => {
        const successRate = data.successes / (data.successes + data.failures);
        const isRecent = now - data.lastUsed < this.ttl;
        return successRate >= this.successThreshold && isRecent;
      })
      .map(([_, data]) => data.proxy);
  }

  updateStatus(proxy, success) {
    const data = this.proxies.get(proxy.server);
    if (data) {
      data.successes += success ? 1 : 0;
      data.failures += success ? 0 : 1;
      data.lastUsed = Date.now();
    }
  }
}

module.exports = ProxyPool;