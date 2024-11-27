// src/services/sessionService.js
const bcrypt = require("bcrypt");

// ! NEED TO MIGRATE MOST TO THE NEW MODEL

// getInstagramSession -> used by LoginService

class SessionService {
  constructor(logger, db) {
    this.logger = logger;
    this.db = db;

    this.logger.info("SessionService initialized");
  }

  // Get MongoDB collection
  async getCollection() {
    return await this.db.getCollection("users");
  }

  // Hash passwords before storing
  async hashPassword(password) {
    const salt = await bcrypt.genSalt(10);
    return await bcrypt.hash(password, salt);
  }

  // Add new methods for OAuth users
  async findOrCreateGoogleUser(profile) {
    try {
      const users = await this.getCollection();

      const existingUser = await users.findOne({
        googleId: profile.id,
      });

      if (existingUser) {
        return existingUser;
      }

      const newUser = await users.insertOne({
        googleId: profile.id,
        email: profile.emails[0].value,
        name: profile.displayName,
        createdAt: new Date(),
        lastActivity: new Date(),
        oauthProvider: "google",
        messages: [],
      });

      return newUser.ops[0];
    } catch (error) {
      logger.error("OAuth user creation error:", error);
      throw error;
    }
  }

  async getOAuthUser(googleId) {
    try {
      const users = await this.getCollection();
      return await users.findOne({ googleId });
    } catch (error) {
      logger.error("OAuth user fetch error:", error);
      return null;
    }
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
  async getInstagramSession(username) {
    try {
      const users = await this.getCollection();
      const user = await users.findOne({ instagram_username: username });

      if (!user?.session?.expiresAt) {
        logger.debug(`No session found for ${username}`);
        return false;
      }

      const isValid = new Date(user.session.expiresAt) > new Date();
      logger.debug(`Session validation for ${username}: ${isValid}`);
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
        { projection: { session: 1 } }
      );

      if (!user?.session) {
        logger.debug(`No credentials found for ${username}`);
        return null;
      }

      const isValid = new Date(user.session.expiresAt) > new Date();
      if (!isValid) {
        logger.debug(`Expired session found for ${username}`);
        return null;
      }

      return {
        session: user.session,
      };
    } catch (error) {
      logger.error("Error getting stored credentials:", error);
      return null;
    }
  }

  async logMessage(fromUsername, recipient, content, status, error = null) {
    try {
      const users = await this.getCollection();

      // Create the message object
      const messageLog = {
        recipient,
        content,
        status,
        createdAt: new Date(),
        ...(error && { error: error.toString() }),
      };

      // Update the document using MongoDB's $push operator
      const result = await users.updateOne(
        { instagram_username: fromUsername },
        {
          $push: { messages: messageLog },
          $set: { lastActivity: new Date() },
        }
      );

      if (result.matchedCount === 0) {
        throw new Error("User not found");
      }

      logger.info(`Message logged for user ${fromUsername} to ${recipient}`);
      return messageLog;
    } catch (error) {
      logger.error("Error logging message:", error);
      throw error;
    }
  }

  async getMessageHistory(username, options = {}) {
    try {
      const query = { instagram_username: username };
      const users = await this.getCollection();
      const user = await users.findOne(query);

      if (!user?.messages) {
        return [];
      }

      let messages = user.messages;

      // Apply filters
      if (options.status) {
        messages = messages.filter((msg) => msg.status === options.status);
      }
      if (options.recipient) {
        messages = messages.filter(
          (msg) => msg.recipient === options.recipient
        );
      }

      // Sort by date (newest first)
      messages.sort((a, b) => b.createdAt - a.createdAt);

      return messages;
    } catch (error) {
      logger.error("Error getting message history:", error);
      return [];
    }
  }
}

module.exports = SessionService;
