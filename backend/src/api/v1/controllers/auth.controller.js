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
    
    // Sanitize user object to only return necessary fields
    const sanitizedUser = {
      _id: req.user._id,
      email: req.user.email,
      name: req.user.name
    };
    
    res.json({ user: sanitizedUser });
  }
}

module.exports = new AuthController();
