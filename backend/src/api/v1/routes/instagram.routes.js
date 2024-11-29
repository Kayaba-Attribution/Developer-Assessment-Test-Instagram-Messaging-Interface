// src/api/v1/routes/instagram.routes.js
const express = require("express");
const { isAuthenticated } = require("../middleware/auth.middleware");

module.exports = ({ instagramController }) => {
  const router = express.Router();

  // Protect all Instagram routes with authentication
  router.use(isAuthenticated);

  // Protected routes
  router.post(
    "/register",
    instagramController.register.bind(instagramController)
  );

  router.get(
    "/register/status/:username",
    instagramController.getRegistrationStatus.bind(instagramController)
  );

  router.post(
    "/login", 
    instagramController.login.bind(instagramController)
  );

  return router;
};
