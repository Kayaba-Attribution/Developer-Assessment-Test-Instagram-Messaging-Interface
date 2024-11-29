// src/services/sessionService.js
const bcrypt = require("bcrypt");
const { ObjectId } = require("mongodb");

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
  async createOrUpdateSession(userId, username, password, sessionData) {
    try {
      const users = await this.getCollection();

      // Extract session info from cookies
      const sessionInfo = {
        sessionId: sessionData.cookies.find((c) => c.name === "sessionid")
          ?.value,
        userId: sessionData.cookies.find((c) => c.name === "ds_user_id")?.value,
        csrfToken: sessionData.cookies.find((c) => c.name === "csrftoken")
          ?.value,
        rur: sessionData.cookies.find((c) => c.name === "rur")?.value,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
      };

      const hashedPassword = await this.hashPassword(password);

      // Create Instagram account object
      const instagramAccount = {
        username: username,
        password: hashedPassword,
        session: sessionInfo,
        lastActivity: new Date(),
        messages: [], // Initialize empty message history
      };

      // Update user document with new Instagram account
      const result = await users.findOneAndUpdate(
        { 
          _id: new ObjectId(userId),
          "instagramAccounts.username": { $ne: username } // Prevent duplicates
        },
        {
          $push: { instagramAccounts: instagramAccount },
          $set: { lastActivity: new Date() }
        },
        { returnDocument: "after" }
      );

      if (!result.value) {
        // If account already exists, update it
        await users.updateOne(
          { 
            _id: new ObjectId(userId),
            "instagramAccounts.username": username 
          },
          {
            $set: {
              "instagramAccounts.$": instagramAccount,
              lastActivity: new Date()
            }
          }
        );
      }

      this.logger.info(
        `Session saved/updated for Instagram account: ${username} (User: ${userId})`
      );
      return instagramAccount;
    } catch (error) {
      this.logger.error("Session update error:", error);
      throw error;
    }
  }

  // Check if a session is valid
  async getInstagramSession(username) {
    try {
      const users = await this.getCollection();
      const user = await users.findOne({
        "instagramAccounts.username": username,
      });

      if (!user) {
        this.logger.debug(`No user found with Instagram account ${username}`);
        return false;
      }

      const account = user.instagramAccounts.find(
        (acc) => acc.username === username
      );
      if (!account?.session?.expiresAt) {
        this.logger.debug(`No session found for ${username}`);
        return false;
      }

      const isValid = new Date(account.session.expiresAt) > new Date();
      this.logger.debug(`Session validation for ${username}: ${isValid}`);
      return isValid;
    } catch (error) {
      this.logger.error("Session validation error:", error);
      return false;
    }
  }

  async getStoredCredentials(username) {
    try {
      const users = await this.getCollection();
      const user = await users.findOne({
        "instagramAccounts.username": username,
      });

      if (!user) {
        this.logger.debug(`No user found with Instagram account ${username}`);
        return null;
      }

      const account = user.instagramAccounts.find(
        (acc) => acc.username === username
      );
      if (!account?.session) {
        this.logger.debug(`No credentials found for ${username}`);
        return null;
      }

      const isValid = new Date(account.session.expiresAt) > new Date();
      if (!isValid) {
        this.logger.debug(`Expired session found for ${username}`);
        return null;
      }

      return {
        session: account.session,
      };
    } catch (error) {
      this.logger.error("Error getting stored credentials:", error);
      return null;
    }
  }

  async logMessage(fromUsername, recipient, content, status, error = null) {
    try {
      const users = await this.getCollection();
      const messageLog = {
        recipient,
        content,
        status,
        createdAt: new Date(),
        ...(error && { error: error.toString() }),
      };

      const result = await users.updateOne(
        { "instagramAccounts.username": fromUsername },
        {
          $push: { "instagramAccounts.$.messages": messageLog },
          $set: {
            "instagramAccounts.$.lastActivity": new Date(),
            lastActivity: new Date(),
          },
        }
      );

      if (result.matchedCount === 0) {
        throw new Error("Instagram account not found");
      }

      this.logger.info(
        `Message logged for Instagram account ${fromUsername} to ${recipient}`
      );
      return messageLog;
    } catch (error) {
      this.logger.error("Error logging message:", error);
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

  async getInstagramAccounts(userId) {
    try {
      const users = await this.getCollection();
      const user = await users.findOne({ _id: new ObjectId(userId) });

      if (!user || !user.instagramAccounts) {
        return [];
      }

      return user.instagramAccounts;
    } catch (error) {
      this.logger.error("Error fetching Instagram accounts:", error);
      throw error;
    }
  }
}

module.exports = SessionService;
