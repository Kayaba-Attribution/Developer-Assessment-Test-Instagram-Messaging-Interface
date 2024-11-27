// src/server.js
require("dotenv").config();
const express = require("express");
const configureExpress = require("./config/express.config");
const configurePassport = require("./config/passport.config");
const db = require("./config/database");
const logger = require("./utils/logger");

// Import routes
const authRoutes = require("./api/v1/routes/auth.routes");

const app = express();

// Configure Express and Passport
configureExpress(app);
configurePassport();

// API routes
app.use("/api/v1/auth", authRoutes);

// Error handler
app.use((err, req, res, next) => {
  logger.error("Unhandled error", {
    error: err.message,
    stack: err.stack,
    path: req.path,
  });
  res.status(500).json({ error: "Internal server error" });
});

// Start server
async function startServer() {
  try {
    await db.connect();
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      logger.info(
        `Server running on port ${PORT} in ${process.env.NODE_ENV} mode`
      );
    });
  } catch (error) {
    logger.error("Server startup failed:", error);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = app;
