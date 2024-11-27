// src/api/v1/controllers/instagram.controller.js
const InstagramService = require("../../../core/instagram/instagram.service");
const logger = require("../../../utils/logger");

class InstagramController {
  async register(req, res) {
    try {
      const result = await InstagramService.register();

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.json(result);
    } catch (error) {
      logger.error("Registration error:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error",
        details: error.message,
      });
    }
  }

  async login(req, res) {
    try {
      const { username, password } = req.body;
      const result = await InstagramService.login(username, password);

      if (!result.success) {
        return res.status(401).json(result);
      }

      res.json(result);
    } catch (error) {
      logger.error("Login error:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error",
      });
    }
  }

  async forceLogin(req, res) {
    try {
      const { username, password } = req.body;
      const result = await InstagramService.login(username, password, {
        force: true,
      });

      if (!result.success) {
        return res.status(401).json(result);
      }

      res.json(result);
    } catch (error) {
      logger.error("Force login error:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error",
      });
    }
  }

  async getRegistrationStatus(req, res) {
    try {
      const { username } = req.params;
      const status = await InstagramService.getRegistrationStatus(username);

      if (!status) {
        return res.status(404).json({
          success: false,
          error: "Registration not found",
        });
      }

      res.json({
        success: true,
        data: status,
      });
    } catch (error) {
      logger.error("Status check error:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error",
      });
    }
  }
}

module.exports = new InstagramController();
