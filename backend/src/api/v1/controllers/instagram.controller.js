// src/api/v1/controllers/instagram.controller.js
const crypto = require("crypto");

class InstagramController {
  constructor({ loginService, registerService, messageService, sessionService, logger }) {
    this.loginService = loginService;
    this.registerService = registerService;
    this.messageService = messageService;
    this.sessionService = sessionService;
    this.logger = logger;
  }

  async register(req, res) {
    try {
      const userId = req.user._id;
      const registrationId = crypto.randomBytes(16).toString('hex');
      
      // Start the registration process asynchronously
      this.registerService.register(userId, registrationId).catch(error => {
        this.logger.error("Registration failed:", error);
      });
      
      // Return immediately with the registrationId
      res.status(202).json({
        success: true,
        registrationId,
        message: 'Registration process started'
      });
    } catch (error) {
      this.logger.error("Failed to start registration:", error);
      res.status(500).json({ success: false, error: "Failed to start registration" });
    }
  }

  async login(req, res) {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res
          .status(400)
          .json({ success: false, error: "Missing credentials" });
      }

      const result = await this.loginService.login(username, password);
      res.status(result.success ? 200 : 401).json(result);
    } catch (error) {
      this.logger.error("Login failed:", error);
      res.status(500).json({ success: false, error: "Login failed" });
    }
  }

  async getRegistrationStatus(req, res) {
    try {
      const { username } = req.params;
      const status = await this.registerService.getStatus(username);
      if (!status) {
        return res.status(404).json({ success: false, error: "Not found" });
      }
      res.json({ success: true, data: status });
    } catch (error) {
      this.logger.error("Status check failed:", error);
      res.status(500).json({ success: false, error: "Status check failed" });
    }
  }

  async getAccounts(req, res) {
    try {
      const userId = req.user._id;
      const accounts = await this.sessionService.getInstagramAccounts(userId);
      
      // Map to return only necessary information
      const sanitizedAccounts = accounts.map(account => ({
        username: account.username,
        lastActivity: account.lastActivity,
        isSessionValid: account.session ? new Date(account.session.expiresAt) > new Date() : false
      }));

      res.json({ 
        success: true, 
        data: sanitizedAccounts 
      });
    } catch (error) {
      this.logger.error("Failed to fetch Instagram accounts:", error);
      res.status(500).json({ 
        success: false, 
        error: "Failed to fetch Instagram accounts" 
      });
    }
  }
}

// Factory function for easy instantiation
const createController = (services) => new InstagramController(services);

module.exports = { InstagramController, createController };
