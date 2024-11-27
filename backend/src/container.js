// src/container.js
const { config } = require("./config");
const logger = require("./utils/logger");
const Database = require("./config/database");
const BrowserService = require("./core/browser/browser.service");
const ProxyService = require("./core/proxy/proxy.service");
const MailService = require("./core/mail/temp-mail.service");

// const SessionService = require("./core/session/session.service");
// const InstagramService = require("./core/instagram/instagram.service");

class Container {
  constructor() {
    this.services = new Map();
  }

  // Core infrastructure
  async initialize() {
    // Register singletons
    this.register("config", config);
    this.register("logger", logger);

    // Database setup
    const db = new Database(this.get("logger"));
    await db.connect();
    this.register("db", db);

    // Core services
    this.register("browserService", new BrowserService(config));
    this.register(
      "proxyService",
      new ProxyService(this.get("logger"), config.proxy)
    );
    
    this.register("mailService", new MailService(this.get("logger")));

    // this.register(
    //   "sessionService",
    //   new SessionService(this.get("db"), this.get("logger"))
    // );
    // // Business logic
    // this.register(
    //   "instagramService",
    //   new InstagramService(
    //     this.get("browserService"),
    //     this.get("proxyService"),
    //     this.get("sessionService"),
    //     this.get("mailService"),
    //     this.get("logger")
    //   )
    // );
  }

  register(name, instance) {
    this.services.set(name, instance);
  }

  get(name) {
    if (!this.services.has(name)) {
      throw new Error(`Service ${name} not found in container`);
    }
    return this.services.get(name);
  }

  async cleanup() {
    const db = this.get("db");
    await db.disconnect();
  }
}

module.exports = new Container();
