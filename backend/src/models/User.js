// src/models/User.js
const mongoose = require("mongoose");

const sessionSchema = new mongoose.Schema({
  sessionId: String,
  userId: String,
  csrfToken: String,
  rur: String,
  expiresAt: Date
});

const messageSchema = new mongoose.Schema({
  recipient: String,
  content: String,
  status: String,
  createdAt: { type: Date, default: Date.now },
  error: String
});

const instagramAccountSchema = new mongoose.Schema({
  username: { type: String, required: true },
  password: { type: String, required: true },
  session: sessionSchema,
  lastActivity: { type: Date, default: Date.now },
  messages: [messageSchema]
});

const userSchema = new mongoose.Schema({
  email: { type: String, required: true },
  name: String,
  googleId: String,
  createdAt: { type: Date, default: Date.now },
  lastActivity: { type: Date, default: Date.now },
  oauthProvider: String,
  instagramAccounts: [instagramAccountSchema]
});

module.exports = mongoose.model('User', userSchema);
