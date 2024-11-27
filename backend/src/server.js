// src/server.js
require("dotenv").config();
const express = require("express");
const container = require("./container");
const configureExpress = require("./config/express.config");

async function startServer() {
  try {
    // Initialize DI container
    await container.initialize();

    const app = express();
    
    // Get services from container
    const db = container.get('db');
    const logger = container.get("logger");
    
    // Initialize passport with our db instance
    const passportInstance = require('./config/passport.config')(db, logger);
    
    configureExpress(app, passportInstance);

    // const instagramService = container.get("instagramService");
    // const sessionService = container.get("sessionService");

    // Setup routes with injected services
    // app.use(
    //   "/api/v1/instagram",
    //   require("./api/v1/routes/instagram.routes")(instagramService)
    // );
    app.use(
      "/api/v1/auth",
      require("./api/v1/routes/auth.routes")
    );

    // Start server
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
    });

    // Cleanup on shutdown
    process.on("SIGINT", async () => {
      await container.cleanup();
      process.exit(0);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}
