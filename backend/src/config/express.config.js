// src/config/express.config.js
const express = require("express");
const cors = require("cors");
const passport = require("passport");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const logger = require("../utils/logger");

const FRONTEND_URL = "http://localhost:5173";

module.exports = (app, passport) => {
  // Basic middleware
  app.use(express.json());
  app.use(
    cors({
      origin: FRONTEND_URL,
      credentials: true,
    })
  );

  // Session configuration
  app.use(
    session({
      secret: process.env.SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      store: MongoStore.create({
        mongoUrl: process.env.MONGODB_URI,
        dbName: process.env.DB_NAME || "instagram_messenger",
        collectionName: "sessions",
        ttl: 24 * 60 * 60,
      }),
      cookie: {
        maxAge: 24 * 60 * 60 * 1000,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
      },
    })
  );

  // Passport middleware
  app.use(passport.initialize());
  app.use(passport.session());

  // Logging middleware
  app.use((req, res, next) => {
    logger.info("Incoming request", {
      path: req.path,
      method: req.method,
      isAuthenticated: req.isAuthenticated?.(),
      sessionID: req.sessionID,
    });
    next();
  });
};
