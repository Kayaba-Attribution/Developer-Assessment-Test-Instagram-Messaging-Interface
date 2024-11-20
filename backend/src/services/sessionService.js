// src/services/sessionService.js
const bcrypt = require("bcrypt");
const db = require("../config/database");
const logger = require("../utils/logger");

class SessionService {
  async getCollection() {
    return await db.getCollection("users");
  }

  async hashPassword(password) {
    const salt = await bcrypt.genSalt(10);
    return await bcrypt.hash(password, salt);
  }

  async createOrUpdateSession(username, password, sessionData) {
    try {
      const users = await this.getCollection();

      // Extract essential cookies
      const sessionInfo = {
        sessionId: sessionData.cookies.find((c) => c.name === "sessionid")
          ?.value,
        userId: sessionData.cookies.find((c) => c.name === "ds_user_id")?.value,
        csrfToken: sessionData.cookies.find((c) => c.name === "csrftoken")
          ?.value,
        rur: sessionData.cookies.find((c) => c.name === "rur")?.value,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      };

      // Hash password
      const hashedPassword = await this.hashPassword(password);

      // Update or insert user
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

  async validateSession(username) {
    try {
      const users = await this.getCollection();
      const user = await users.findOne({ instagram_username: username });

      if (!user || !user.session) return false;

      const isValid = user.session.expiresAt > new Date();

      if (isValid) {
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
