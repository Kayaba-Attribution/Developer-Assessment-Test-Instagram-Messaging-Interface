// src/models/User.js
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    googleId: String,
    email: String,
    name: String,
    createdAt: { type: Date, default: Date.now },
    instagram_username: {
      type: String,
      required: true,
      unique: true,
    },
    session: {
      // Essential cookies only
      sessionId: String,
      userId: String,
      csrfToken: String,
      rur: String,
      expiresAt: {
        type: Date,
        required: true,
      },
    },
    messages: [
      {
        recipient: String,
        content: String,
        status: {
          type: String,
          enum: ["sent", "failed"],
          default: "sent",
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    lastActivity: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Method to check if session is valid
userSchema.methods.isSessionValid = function () {
  return this.session && this.session.expiresAt > new Date();
};

// Method to update session
userSchema.methods.updateSession = function (sessionData) {
  this.session = {
    sessionId: sessionData.cookies.find((c) => c.name === "sessionid")?.value,
    userId: sessionData.cookies.find((c) => c.name === "ds_user_id")?.value,
    csrfToken: sessionData.cookies.find((c) => c.name === "csrftoken")?.value,
    rur: sessionData.cookies.find((c) => c.name === "rur")?.value,
    // Set expiration to 24 hours from now
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  };
  this.lastActivity = new Date();
};

const User = mongoose.model("User", userSchema);
module.exports = User;
