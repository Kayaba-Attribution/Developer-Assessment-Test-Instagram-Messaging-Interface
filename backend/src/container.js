// src/container.js
const { config } = require("./config");
const logger = require("./utils/logger");
const { QUERIES } = require("./config/constants");
const Database = require("./config/database");
const BrowserService = require("./core/browser/browser.service");
const ProxyService = require("./core/proxy/proxy.service");
const SimpleProxyService = require("./core/proxy/simple-proxy.service");
const MailService = require("./core/mail/temp-mail.service");

const SessionService = require("./core/instagram/session.service");
const LoginService = require("./core/instagram/login.service");
const RegisterService = require("./core/instagram/register.service");
const {
  InstagramController,
} = require("./api/v1/controllers/instagram.controller");


class Container {
  constructor() {
    this.services = new Map();
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
    const browserService = new BrowserService(config, logger);
    // const proxyService = new ProxyService(logger);
    const proxyService = new SimpleProxyService(logger);
    await proxyService.init();

    this.register("browserService", browserService);
    this.register("proxyService", proxyService);

    // Business services
    const sessionService = new SessionService(logger, db);
    const mailService = new MailService(logger);

    this.register("mailService", mailService);
    this.register("sessionService", sessionService);

    // Instagram
    const loginService = new LoginService(
      browserService,
      proxyService,
      sessionService,
      logger,
      config,
      QUERIES
    );

    const registerService = new RegisterService(
      browserService,
      proxyService,
      sessionService,
      mailService,
      logger,
      config
    );

    this.register("loginService", loginService);
    this.register("registerService", registerService);

    const instagramController = new InstagramController({
      loginService,
      registerService,
      null: null, // message
      logger,
    });

    this.register("instagramController", instagramController);

    logger.info("Container initialized");
  }
}

module.exports = new Container();
