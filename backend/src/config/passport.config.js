// src/config/passport.config.js
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const { ObjectId } = require("mongodb");

module.exports = (db, logger) => {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL:
          process.env.GOOGLE_CALLBACK_URL ||
          "http://localhost:3000/api/v1/auth/google/callback",
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const users = await db.getCollection("users");
          const user = await users.findOneAndUpdate(
            { googleId: profile.id },
            {
              $set: {
                email:
                  profile.emails?.[0]?.value || `${profile.id}@placeholder.com`,
                name: profile.displayName || "Anonymous",
                lastLogin: new Date(),
              },
              $setOnInsert: { createdAt: new Date() },
            },
            { upsert: true, returnDocument: "after" }
          );

          return done(null, user);
        } catch (error) {
          logger.error("Google auth error:", error);
          return done(error, null);
        }
      }
    )
  );

  passport.serializeUser((user, done) => {
    done(null, user._id.toString());
  });

  passport.deserializeUser(async (id, done) => {
    try {
      const users = await db.getCollection("users");
      const user = await users.findOne({ _id: new ObjectId(id) });
      if (!user) {
        return done(new Error("User not found"), null);
      }
      done(null, user);
    } catch (error) {
      logger.error("Deserialize error:", error);
      done(error, null);
    }
  });

  return passport;
};