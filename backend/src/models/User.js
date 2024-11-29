// src/models/User.js
const mongoose = require("mongoose");

const instagramAccountSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
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
  messages: [{
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
  }],
  lastActivity: {
    type: Date,
    default: Date.now,
  }
});

const userSchema = new mongoose.Schema(
  {
    googleId: String,
    email: String,
    name: String,
    createdAt: { type: Date, default: Date.now },
    instagramAccounts: [instagramAccountSchema],
    lastLogin: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Method to check if session is valid for a specific Instagram account
userSchema.methods.isSessionValid = function (instagramUsername) {
  const account = this.instagramAccounts.find(acc => acc.username === instagramUsername);
  return account && account.session && account.session.expiresAt > new Date();
};

// Method to update session for a specific Instagram account
userSchema.methods.updateSession = function (instagramUsername, sessionData) {
  const account = this.instagramAccounts.find(acc => acc.username === instagramUsername);
  if (!account) {
    // Create new account if it doesn't exist
    this.instagramAccounts.push({
      username: instagramUsername,
      session: {
        sessionId: sessionData.cookies.find((c) => c.name === "sessionid")?.value,
        userId: sessionData.cookies.find((c) => c.name === "ds_user_id")?.value,
        csrfToken: sessionData.cookies.find((c) => c.name === "csrftoken")?.value,
        rur: sessionData.cookies.find((c) => c.name === "rur")?.value,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
      messages: [],
      lastActivity: new Date()
    });
  } else {
    account.session = {
      sessionId: sessionData.cookies.find((c) => c.name === "sessionid")?.value,
      userId: sessionData.cookies.find((c) => c.name === "ds_user_id")?.value,
      csrfToken: sessionData.cookies.find((c) => c.name === "csrftoken")?.value,
      rur: sessionData.cookies.find((c) => c.name === "rur")?.value,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    };
    account.lastActivity = new Date();
  }
};

// Helper method to add a message to a specific Instagram account
userSchema.methods.addMessage = function (instagramUsername, messageData) {
  const account = this.instagramAccounts.find(acc => acc.username === instagramUsername);
  if (account) {
    account.messages.push({
      recipient: messageData.recipient,
      content: messageData.content,
      status: messageData.status || "sent",
      createdAt: new Date()
    });
    account.lastActivity = new Date();
  }
};

const User = mongoose.model("User", userSchema);
module.exports = User;
