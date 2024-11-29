// src/api/v1/controllers/instagram.controller.js
class InstagramController {
  constructor({ loginService, registerService, messageService, logger }) {
    this.loginService = loginService;
    this.registerService = registerService;
    this.messageService = messageService;
    this.logger = logger;
  }

  async register(req, res) {
    try {
      const userId = req.user._id;
      const result = await this.registerService.register(userId);
      res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      this.logger.error("Registration failed:", error);
      res.status(500).json({ success: false, error: "Registration failed" });
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
}

// Factory function for easy instantiation
const createController = (services) => new InstagramController(services);

module.exports = { InstagramController, createController };
