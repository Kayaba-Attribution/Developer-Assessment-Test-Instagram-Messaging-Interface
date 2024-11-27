// src/server.js
require("dotenv").config();
const express = require("express");
const fs = require("fs").promises;
const cors = require("cors");
const logger = require("./utils/logger");
const cleanup = require("./utils/cleanup");
const MongoStore = require("connect-mongo");
const { ObjectId } = require("mongodb");

const {
  instagramLogin,
  navigateAndSendMessage,
  instagramRegister,
} = require("./services/instagram");
const { config, NODE_ENV } = require("./config");
const { DIRECTORIES } = require("./config/constants");
const db = require("./config/database");
const sessionService = require("./services/sessionService");

// Constants
const FRONTEND_URL = "http://localhost:5173";
const BACKEND_URL = "http://localhost:3000";

// Google Sign
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const session = require("express-session");

const app = express();
logger.info("Starting server... on port", process.env.PORT);
app.use(express.json());
// Simple CORS setup for development
app.use(
  cors({
    origin: FRONTEND_URL,
    credentials: true,
  })
);

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

    return true;
  } catch (error) {
    logger.error("Initialization failed:", error);
    throw error;
  }
}

// Add to initialization
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGODB_URI,
      dbName: process.env.DB_NAME || "instagram_messenger",
      collectionName: "sessions",
      ttl: 24 * 60 * 60, // 1 day
    }),
    cookie: {
      maxAge: 24 * 60 * 60 * 1000,
      secure: false, // set to true in production
      sameSite: "lax",
    },
  })
);

app.use(passport.initialize());
app.use(passport.session());

app.use((req, res, next) => {
  logger.info("Incoming request", {
    path: req.path,
    method: req.method,
    isAuthenticated: req.isAuthenticated?.(),
    sessionID: req.sessionID,
    hasSession: !!req.session,
    hasUser: !!req.user,
  });
  next();
});

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Credentials", "true");
  next();
});

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "http://localhost:3000/api/auth/google/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        logger.info("Google strategy executing", {
          profileId: profile.id,
          email: profile.emails?.[0]?.value || "no email",
          name: profile.displayName,
          // Log full profile for debugging
          profile: JSON.stringify(profile, null, 2),
        });

        const users = await db.getCollection("users");
        let user = await users.findOne({ googleId: profile.id });

        if (!user) {
          logger.info("Creating new user");
          // Safely get email
          const email =
            profile.emails?.[0]?.value || `${profile.id}@placeholder.com`;

          const result = await users.insertOne({
            googleId: profile.id,
            email: email,
            name: profile.displayName || "Anonymous",
            createdAt: new Date(),
          });

          user = await users.findOne({ _id: result.insertedId });
          logger.info("New user created", { userId: user._id });
        }

        logger.info("User found/created", {
          userId: user._id,
          googleId: user.googleId,
        });

        return done(null, user);
      } catch (error) {
        logger.error("Error in Google strategy", {
          message: error.message,
          stack: error.stack,
        });
        return done(error, null);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user._id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const users = await db.getCollection("users");
    const user = await users.findOne({ _id: new ObjectId(id) }); // Convert string to ObjectId
    done(null, user);
  } catch (error) {
    logger.error("Deserialize error", error);
    done(error, null);
  }
});
// Auth routes with enhanced logging
app.get(
  "/api/auth/google",
  (req, res, next) => {
    logger.info("Google auth initiated", {
      sessionID: req.sessionID,
      hasSession: !!req.session,
    });
    next();
  },
  passport.authenticate("google", {
    scope: ["profile", "email"],
    prompt: "select_account",
  })
);

// server.js
app.get(
  "/api/auth/google/callback",
  (req, res, next) => {
    logger.info("Google callback received", {
      sessionID: req.sessionID,
      hasSession: !!req.session,
      query: req.query,
      error: req.query.error,
    });
    next();
  },
  passport.authenticate("google", {
    failureRedirect: "http://localhost:5173/login",
    failureMessage: true,
    session: true, // explicitly enable session
  }),
  (req, res) => {
    logger.info("Google auth successful", {
      user: req.user?._id,
      sessionID: req.sessionID,
    });
    res.redirect("http://localhost:5173/messages");
  }
);

app.get("/api/auth/user", (req, res) => {
  logger.info("Auth check request", {
    isAuthenticated: req.isAuthenticated?.(),
    sessionID: req.sessionID,
    hasSession: !!req.session,
    hasUser: !!req.user,
    user: req.user?._id,
  });

  if (!req.isAuthenticated?.()) {
    logger.info("Auth check failed - not authenticated");
    return res.status(401).json({ user: null });
  }

  res.json({ user: req.user });
});

// ################################################
// ################# TEMP MAIL ####################
// ################################################

const tempMailService = require("./services/tempMail");

// Create new email address
app.post("/api/mail/create", (req, res) => {
  try {
    const { prefix } = req.body;
    const emailData = tempMailService.generateEmail(prefix);
    res.json(emailData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Similarly for other routes
app.get("/api/mail/messages/:hash", async (req, res) => {
  try {
    const { hash } = req.params;
    const emails = await tempMailService.getEmails(hash);

    const processedEmails = emails.map((email) => ({
      id: email.mail_id,
      from: email.mail_from,
      subject: email.mail_subject,
      timestamp: email.mail_timestamp,
      verificationCode: tempMailService.extractVerificationCode(
        email.mail_subject
      ),
    }));

    res.json(processedEmails);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get just the latest verification code
app.get("/api/mail/code/:hash", async (req, res) => {
  try {
    const { hash } = req.params;
    const emails = await tempMailService.getEmails(hash);

    const sortedEmails = emails.sort(
      (a, b) => b.mail_timestamp - a.mail_timestamp
    );

    for (const email of sortedEmails) {
      const code = tempMailService.extractVerificationCode(email.mail_subject);
      if (code) {
        return res.json({
          success: true,
          code,
          timestamp: email.mail_timestamp,
          from: email.mail_from,
        });
      }
    }

    res.json({
      success: false,
      error: "No verification code found",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});


// #########################################################
// ################# INSTAGRAM REGISTER ####################
// #########################################################

const instagramService = require("./services/instagramRegistrationService");

// Single API endpoint for registration
app.post("/api/instagram/register", async (req, res) => {
  try {
    const result = await instagramService.register();
    
    if (!result.success) {
      return res.status(400).json(result);
    }
    
    res.json(result);
  } catch (error) {
    logger.error("Registration error:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Status check endpoint
app.get("/api/instagram/register/status/:username", (req, res) => {
  try {
    const { username } = req.params;
    const status = instagramService.getRegistrationStatus(username);
    
    if (!status) {
      return res.status(404).json({
        success: false,
        error: "Registration not found"
      });
    }

    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    logger.error("Status check error:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Add after your routes
app.use((err, req, res, next) => {
  logger.error("Unhandled error", {
    error: err.message,
    stack: err.stack,
    path: req.path,
  });
  res.status(500).json({ error: "Internal server error" });
});

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

    // First check if there's a valid session
    const sessionValid = await sessionService.validateSession(username);
    if (sessionValid) {
      const credentials = await sessionService.getStoredCredentials(username);
      if (credentials?.session) {
        logger.info(`Valid session found for ${username}`);
        return res.json({
          success: true,
          session: credentials.session,
          message: "Using existing session",
        });
      }
    }

    // If no valid session exists, proceed with login
    logger.info(
      `No valid session found for ${username}, proceeding with login`
    );
    const result = await instagramLogin(username, password);

    if (result.success) {
      // Save/update session in MongoDB
      await sessionService.createOrUpdateSession(
        username,
        password,
        result.session
      );
      logger.info("New login successful");
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

app.post("/api/login/force", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: "Username and password are required",
      });
    }

    logger.info(`Forced login request received for user: ${username}`);
    const result = await instagramLogin(username, password);

    if (result.success) {
      await sessionService.createOrUpdateSession(
        username,
        password,
        result.session
      );
      logger.info("Forced login successful");
      res.json(result);
    } else {
      logger.warn("Forced login failed:", result.error);
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

app.post("/api/instagram/register", async (req, res) => {
  try {
    logger.info("Received registration request");

    // Attempt registration
    const result = await instagramRegister();

    if (result.success) {
      // Log successful registration
      logger.info(`Successfully registered Instagram account: ${result.data.username}`);
      
      // Store registration details if needed
      await sessionService.logRegistration(
        result.data.username,
        result.data.email,
        "completed"
      );

      res.json({
        success: true,
        data: {
          username: result.data.username,
          email: result.data.email
        }
      });
    } else {
      // Log failed registration
      logger.warn(`Registration failed: ${result.error}`);
      
      await sessionService.logRegistration(
        null,
        null,
        "failed",
        result.error
      );

      res.status(400).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    logger.error("Registration error:", error);
    

    res.status(500).json({
      success: false,
      error: "Internal server error",
      details: error.message
    });
  }
});

app.post("/api/instagram/register", async (req, res) => {
  try {
    logger.info("Received registration request");

    // Attempt registration
    const result = await instagramRegister();

    if (result.success) {
      // Log successful registration
      logger.info(`Successfully registered Instagram account: ${result.data.username}`);


      res.json({
        success: true,
        data: {
          username: result.data.username,
          email: result.data.email
        }
      });
    } else {
      // Log failed registration
      logger.warn(`Registration failed: ${result.error}`);

      res.status(400).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    logger.error("Registration error:", error);

    res.status(500).json({
      success: false,
      error: "Internal server error",
      details: error.message
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

    logger.info(`[/api/messages/send] Loaded credentials for ${from_username}`);
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
      credentials.session
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

// Route to send message with authentication THE ALL-MIGHTY ROUTE
app.post("/api/messages/send-with-auth", async (req, res) => {
  try {
    const { username, password, recipient, message } = req.body;

    // Validate request body
    if (!username || !password || !recipient || !message) {
      return res.status(400).json({
        success: false,
        error:
          "All fields are required: username, password, recipient, and message",
      });
    }

    logger.info(
      `Attempting to send message for user: ${username} to: ${recipient}`
    );

    // Check for existing valid session first
    const sessionValid = await sessionService.validateSession(username);
    let sessionData;

    if (!sessionValid) {
      // No valid session, attempt login
      logger.info(`No valid session found for ${username}, attempting login`);
      const loginResult = await instagramLogin(username, password);

      if (!loginResult.success) {
        logger.warn(`Login failed for ${username}: ${loginResult.error}`);
        return res.status(401).json({
          success: false,
          error: loginResult.error || "Authentication failed",
        });
      }

      // Store new session
      sessionData = loginResult.session;
      await sessionService.createOrUpdateSession(
        username,
        password,
        sessionData
      );
      logger.info(`New session created for ${username}`);

      // Use existing session
      logger.info(`Using existing session for ${username}`);
      const credentials = await sessionService.getStoredCredentials(username);
      sessionData = credentials?.session;
    } else {
      if (!sessionData) {
        // Edge case: session marked valid but data missing
        logger.warn(`Session marked valid but no data found for ${username}`);
        const loginResult = await instagramLogin(username, password);

        if (!loginResult.success) {
          return res.status(401).json({
            success: false,
            error: loginResult.error || "Authentication failed",
          });
        }

        sessionData = loginResult.session;
        await sessionService.createOrUpdateSession(
          username,
          password,
          sessionData
        );
      }
    }

    // Attempt to send the message using the session
    const messageResult = await navigateAndSendMessage(
      recipient,
      message,
      sessionData
    );

    if (messageResult.success) {
      // Log successful message
      await sessionService.logMessage(username, recipient, message, "sent");
      logger.info(`Successfully sent message from ${username} to ${recipient}`);

      res.json({
        success: true,
        message: "Message sent successfully",
      });
    } else {
      // If message sending failed, log the failure
      await sessionService.logMessage(
        username,
        recipient,
        message,
        "failed",
        messageResult.error
      );

      // Check if failure was due to invalid session
      if (messageResult.error === "Session invalid") {
        // Try one more time with a fresh login
        logger.info(`Retrying with fresh login for ${username}`);
        const retryLogin = await instagramLogin(username, password);

        if (retryLogin.success) {
          const retryMessage = await navigateAndSendMessage(
            recipient,
            message,
            retryLogin.session
          );

          if (retryMessage.success) {
            await sessionService.logMessage(
              username,
              recipient,
              message,
              "sent"
            );
            await sessionService.createOrUpdateSession(
              username,
              password,
              retryLogin.session
            );

            return res.json({
              success: true,
              message: "Message sent successfully after session refresh",
            });
          }
        }
      }

      logger.warn(`Failed to send message: ${messageResult.error}`);
      res.status(messageResult.error === "Session invalid" ? 401 : 404).json({
        success: false,
        error: messageResult.error || "Failed to send message",
      });
    }
  } catch (error) {
    logger.error("Error in send-with-auth:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
      details: error.message,
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
