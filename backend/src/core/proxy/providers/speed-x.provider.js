// src/core/proxy/providers/speed-x.provider.js
const axios = require('axios');
const BaseProxyProvider = require("./base.provider");

class SpeedXProvider extends BaseProxyProvider {
  async getProxy() {
    try {
      const response = await axios.get(
        "https://raw.githubusercontent.com/TheSpeedX/SOCKS-List/master/http.txt",
        { timeout: 5000 }
      );

      const lines = response.data
        .split("\n")
        .map((line) => {
          const [host, port] = line.trim().split(":");
          return host && port
            ? {
                server: `http://${host}:${port}`,
                type: "http",
                source: "speedx",
              }
            : null;
        })
        .filter(Boolean);

      return lines;
    } catch (error) {
      this.logger.warn("SpeedX provider failed:", error.message);
      return [];
    }
  }
}

module.exports = SpeedXProvider;
