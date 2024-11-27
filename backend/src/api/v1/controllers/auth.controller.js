// src/api/v1/controllers/auth.controller.js
const passport = require("passport");
const logger = require("../../../utils/logger");

class AuthController {
  async googleCallback(req, res) {
    logger.info("Google auth successful", {
      user: req.user?._id,
      sessionID: req.sessionID,
    });
    res.redirect("http://localhost:5173/messages");
  }

  async getUser(req, res) {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ user: null });
    }
    res.json({ user: req.user });
  }
}

module.exports = new AuthController();
