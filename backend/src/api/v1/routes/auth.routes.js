// src/api/v1/routes/auth.routes.js
const express = require("express");
const passport = require("passport");
const authController = require("../controllers/auth.controller");
const router = express.Router();

router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
    prompt: "select_account",
  })
);

router.get(
  "/google/callback",
  passport.authenticate("google", {
    failureRedirect: "http://localhost:5173/login",
    failureMessage: true,
    session: true,
  }),
  authController.googleCallback
);

router.get("/user", authController.getUser);

module.exports = router;
