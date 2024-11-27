// src/config/passport.config.js
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const { ObjectId } = require("mongodb");
const db = require("./database");
const logger = require("../utils/logger");

module.exports = () => {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: "http://localhost:3000/api/v1/auth/google/callback",
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const users = await db.getCollection("users");
          let user = await users.findOne({ googleId: profile.id });

          if (!user) {
            const email =
              profile.emails?.[0]?.value || `${profile.id}@placeholder.com`;
            const result = await users.insertOne({
              googleId: profile.id,
              email,
              name: profile.displayName || "Anonymous",
              createdAt: new Date(),
            });
            user = await users.findOne({ _id: result.insertedId });
          }

          return done(null, user);
        } catch (error) {
          return done(error, null);
        }
      }
    )
  );

  passport.serializeUser((user, done) => done(null, user._id));
  passport.deserializeUser(async (id, done) => {
    try {
      const users = await db.getCollection("users");
      const user = await users.findOne({ _id: new ObjectId(id) });
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  });
};
