// src/server.js
require("dotenv").config();
const express = require("express");
const fs = require("fs").promises;
const logger = require("./utils/logger");
const cleanup = require("./utils/cleanup");
const {
  instagramLogin,
  navigateAndSendMessage,
} = require("./services/instagram");
const { config, NODE_ENV } = require("./config");
const { DIRECTORIES } = require("./config/constants");
const db = require("./config/database");
const sessionService = require("./services/sessionService");

const app = express();
app.use(express.json());

// Initialize app
async function initialize() {
  try {
    // Connect to MongoDB
    await db.connect();

    // Create necessary directories
    for (const dir of DIRECTORIES) {
      const dirPath = config[`${dir.replace("debug_", "")}Dir`];
      await fs.mkdir(dirPath, { recursive: true });
    }

    // Run initial cleanup
    await cleanup();

    // Schedule periodic cleanups
    setInterval(cleanup, 60 * 60 * 1000); // Cleanup files every hour
    setInterval(
      () => sessionService.cleanupExpiredSessions(),
      6 * 60 * 60 * 1000
    ); // Cleanup sessions every 6 hours

    return true;
  } catch (error) {
    logger.error("Initialization failed:", error);
    throw error;
  }
}

// API Routes
app.post("/api/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: "Username and password are required",
      });
    }

    logger.info(`Login request received for user: ${username}`);
    const result = await instagramLogin(username, password);

    if (result.success) {
      // Save/update session in MongoDB
      await sessionService.createOrUpdateSession(
        username,
        password,
        result.session
      );
      logger.info("Login successful");
      res.json(result);
    } else {
      logger.warn("Login failed:", result.error);
      res.status(401).json(result);
    }
  } catch (error) {
    logger.error("API error:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
      details: error.message,
    });
  }
});

// Simple load saved session route
app.post("/api/session/load", async (req, res) => {
  try {
    const { username } = req.body;

    if (!username) {
      return res.status(400).json({
        success: false,
        error: "Username is required",
      });
    }

    logger.info(`Load session request received for user: ${username}`);

    // Check if session exists and is valid
    const isValid = await sessionService.validateSession(username);

    if (!isValid) {
      // Try to get stored credentials and login again
      const credentials = await sessionService.getStoredCredentials(username);
      if (credentials) {
        const result = await instagramLogin(
          credentials.username,
          credentials.password
        );
        if (result.success) {
          await sessionService.createOrUpdateSession(
            credentials.username,
            credentials.password,
            result.session
          );
          return res.json(result);
        }
      }

      return res.status(401).json({
        success: false,
        error: "Session expired or invalid",
      });
    }

    res.json({
      success: true,
      message: "Session is valid",
    });
  } catch (error) {
    logger.error("Session load error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to load session",
    });
  }
});

app.post("/api/messages/send", async (req, res) => {
  try {
    const { username, from_username, content } = req.body;

    if (!username || !from_username || !content) {
      return res.status(400).json({
        success: false,
        error: "Username, from_username and content are required",
      });
    }

    logger.info(`Attempting to send message to user: ${username}`);

    // First load the session
    const sessionValid = await sessionService.validateSession(from_username);
    if (!sessionValid) {
      return res.status(401).json({
        success: false,
        error: "No valid session found",
      });
    }

    // Get stored credentials
    const credentials = await sessionService.getStoredCredentials(
      from_username
    );
    if (!credentials?.session) {
      await sessionService.logMessage(
        from_username,
        username,
        content,
        "failed",
        "Session data not found"
      );
      return res.status(401).json({
        success: false,
        error: "Session data not found",
      });
    }

    // Try to send the message
    const result = await navigateAndSendMessage(
      username,
      content,
      user.session
    );

    if (result.success) {
      // Log successful message
      await sessionService.logMessage(from_username, username, content, "sent");
      logger.info(`Successfully sent message to ${username}`);
      res.json(result);
    } else {
      // Log failed message
      await sessionService.logMessage(
        from_username,
        username,
        content,
        "failed",
        result.error
      );
      logger.warn(`Failed to send message: ${result.error}`);
      res.status(result.error === "Session invalid" ? 401 : 404).json(result);
    }
  } catch (error) {
    logger.error("Message sending error:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
      details: error.message,
    });
  }
});

// Add a route to get message history
app.get("/api/messages/history/:username", async (req, res) => {
  try {
    const { username } = req.params;
    const { status, recipient } = req.query;

    const messages = await sessionService.getMessageHistory(username, {
      status,
      recipient,
    });

    res.json({
      success: true,
      data: messages,
    });
  } catch (error) {
    logger.error("Error fetching message history:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch message history",
    });
  }
});

// Graceful shutdown
process.on("SIGINT", async () => {
  try {
    await db.disconnect();
    process.exit(0);
  } catch (error) {
    process.exit(1);
  }
});

// Start server
async function startServer() {
  try {
    await initialize();

    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT} in ${NODE_ENV} mode`);
    });
  } catch (error) {
    logger.error("Server startup failed:", error);
    process.exit(1);
  }
}

// Only start the server if this file is run directly
if (require.main === module) {
  startServer();
}

module.exports = app; // Export for testing purposes
