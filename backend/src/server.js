// src/server.js
require("dotenv").config();
const express = require("express");
const fs = require("fs").promises;
const logger = require("./utils/logger");
const cleanup = require("./utils/cleanup");
const { instagramLogin, loadSavedSession } = require("./services/instagram");
const { config, NODE_ENV } = require("./config");
const { DIRECTORIES } = require("./config/constants");

const app = express();
app.use(express.json());

// Initialize directories and cleanup
async function initialize() {
  // Create necessary directories
  for (const dir of DIRECTORIES) {
    const dirPath = config[`${dir.replace("debug_", "")}Dir`];
    await fs.mkdir(dirPath, { recursive: true });
  }

  // Run initial cleanup
  await cleanup();

  // Schedule periodic cleanup
  setInterval(cleanup, 60 * 60 * 1000); // Run every hour
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
    const result = await loadSavedSession();
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to load session",
    });
  }
});

// Start server
initialize()
  .then(() => {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT} in ${NODE_ENV} mode`);
    });
  })
  .catch((error) => {
    logger.error("Server initialization failed:", error);
    process.exit(1);
  });
