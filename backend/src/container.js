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
const MessageService = require("./core/instagram/message.service");
const Redis = require('ioredis');
const {
  RegistrationStatusTracker,
} = require("./core/status/registration.status");
const RegistrationStatusController = require('./api/v1/controllers/registration-status.controller');


class Container {
  constructor() {
    this.services = new Map();
  }

  register(name, instance) {
    if(!instance) {
      throw new Error(`Instance for ${name} not found`);
    }
    this.services.set(name, instance);
  }

  get(name) {
    if (!this.services.has(name)) {
      throw new Error(`Service ${name} not found in container`);
    }
    return this.services.get(name);
  }

  async cleanup() {
    const redis = this.get('redis');
    await redis.quit();
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

    // Initialize Redis
    const redis = new Redis({
      host: config.REDIS_HOST || 'localhost',
      port: config.REDIS_PORT || 6379,
      db: config.REDIS_DB || 0
    });

    this.register('redis', redis);

    // Initialize status tracker
    const statusTracker = new RegistrationStatusTracker(redis);
    this.register('statusTracker', statusTracker);

    const registerService = new RegisterService(
      browserService,
      proxyService,
      sessionService,
      mailService,
      logger,
      config,
      statusTracker
    );

    this.register("loginService", loginService);
    this.register("registerService", registerService);

    // Add MessageService
    const messageService = new MessageService(
      browserService,
      proxyService,
      sessionService,
      logger,
      config
    );

    this.register("messageService", messageService);

    const instagramController = new InstagramController({
      loginService,
      registerService,
      messageService,
      sessionService,
      logger,
    });

    this.register("instagramController", instagramController);

    // Add RegistrationStatusController
    const registrationStatusController = new RegistrationStatusController(
      statusTracker,
      logger
    );
    this.register('registrationStatusController', registrationStatusController);

    logger.info("Container initialized");
  }
}

module.exports = new Container();
