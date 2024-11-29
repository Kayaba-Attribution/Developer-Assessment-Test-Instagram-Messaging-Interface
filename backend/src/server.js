// src/server.js
require("dotenv").config();
const express = require("express");
const cors = require('cors');
const container = require("./container");
const cleanup = require("./utils/cleanup");
const configureExpress = require("./config/express.config");
const corsOptions = require("./api/v1/middleware/cors.middleware");

/**
 * Server initialization and route setup
 *
 * Flow:
 * 1. Initialize container (services, db, etc)
 * 2. Setup Express with middleware
 * 3. Initialize authentication
 * 4. Mount routes
 * 5. Start server
 */
async function startServer() {
  try {

    // Pre Hook Clear the debug screenshots
    await cleanup();

    // 1. Core initialization
    await container.initialize();
    const app = express();

    // Core middleware
    app.use(cors(corsOptions));
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    const logger = container.get("logger");

    // 2. Express and auth setup
    const passportInstance = require("./config/passport.config")(
      container.get("db"),
      logger
    );

    configureExpress(app, passportInstance);

    // 3. Route mounting
    mountRoutes(app);

    // 4. Start server
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
    });

    setupGracefulShutdown();
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

/**
 * Centralized route mounting
 * Keeps routes organized and prevents duplication
 */
function mountRoutes(app) {
  // Auth routes
  app.use("/api/v1/auth", require("./api/v1/routes/auth.routes"));

  app.use('/api/v1/mail', require('./api/v1/routes/mail.routes')); 

  // Instagram routes
  app.use(
    "/api/v1/instagram",
    require("./api/v1/routes/instagram.routes")({
      instagramController: container.get("instagramController"),
    })
  );
}

/**
 * Cleanup handlers for graceful shutdown
 */
function setupGracefulShutdown() {
  process.on("SIGINT", async () => {
    await container.cleanup();
    process.exit(0);
  });

  process.on("SIGTERM", async () => {
    await container.cleanup();
    process.exit(0);
  });
}

// Only start server if this file is run directly
if (require.main === module) {
  startServer();
}

module.exports = startServer; // Export for testing
