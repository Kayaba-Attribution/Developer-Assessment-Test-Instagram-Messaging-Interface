// src/services/sessionService.js
const bcrypt = require("bcrypt");
const db = require("../config/database");
const logger = require("../utils/logger");

class SessionService {
  // Get MongoDB collection
  async getCollection() {
    return await db.getCollection("users");
  }

  // Hash passwords before storing
  async hashPassword(password) {
    const salt = await bcrypt.genSalt(10);
    return await bcrypt.hash(password, salt);
  }

  // Core method: Create or update user session
  async createOrUpdateSession(username, password, sessionData) {
    try {
      const users = await this.getCollection();

      // Extract only the essential cookies we need
      const sessionInfo = {
        sessionId: sessionData.cookies.find((c) => c.name === "sessionid")
          ?.value,
        userId: sessionData.cookies.find((c) => c.name === "ds_user_id")?.value,
        csrfToken: sessionData.cookies.find((c) => c.name === "csrftoken")
          ?.value,
        rur: sessionData.cookies.find((c) => c.name === "rur")?.value,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hour expiration
      };

      const hashedPassword = await this.hashPassword(password);

      // Update if exists, create if doesn't (upsert)
      const result = await users.findOneAndUpdate(
        { instagram_username: username },
        {
          $set: {
            instagram_password: hashedPassword,
            session: sessionInfo,
            lastActivity: new Date(),
          },
        },
        {
          upsert: true,
          returnDocument: "after",
        }
      );

      return result.value;
    } catch (error) {
      logger.error("Session update error:", error);
      throw error;
    }
  }

  // Check if a session is valid
  async validateSession(username) {
    try {
      const users = await this.getCollection();
      const user = await users.findOne({ instagram_username: username });

      if (!user || !user.session) return false;

      const isValid = user.session.expiresAt > new Date();

      if (isValid) {
        // Update last activity if session is valid
        await users.updateOne(
          { instagram_username: username },
          { $set: { lastActivity: new Date() } }
        );
      }

      return isValid;
    } catch (error) {
      logger.error("Session validation error:", error);
      return false;
    }
  }

  // Get stored credentials for auto-login
  async getStoredCredentials(username) {
    try {
      const users = await this.getCollection();
      const user = await users.findOne(
        { instagram_username: username },
        { projection: { instagram_username: 1, instagram_password: 1 } }
      );

      return user
        ? {
            username: user.instagram_username,
            password: user.instagram_password,
          }
        : null;
    } catch (error) {
      logger.error("Get credentials error:", error);
      return null;
    }
  }

  // Cleanup expired sessions
  async cleanupExpiredSessions() {
    try {
      const users = await this.getCollection();
      await users.updateMany(
        { "session.expiresAt": { $lt: new Date() } },
        { $unset: { session: "" } }
      );
    } catch (error) {
      logger.error("Session cleanup error:", error);
    }
  }

  async cleanupExpiredSessions() {
    try {
      const users = await this.getCollection();
      await users.updateMany(
        { "session.expiresAt": { $lt: new Date() } },
        { $unset: { session: "" } }
      );
    } catch (error) {
      logger.error("Session cleanup error:", error);
    }
  }
}

module.exports = new SessionService();
