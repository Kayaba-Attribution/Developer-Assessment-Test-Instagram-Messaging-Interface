// src/api/v1/routes/instagram.routes.js
const express = require("express");
const { isAuthenticated } = require("../middleware/auth.middleware");

module.exports = ({ instagramController, registrationStatusController }) => {
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

  router.post("/login", instagramController.login.bind(instagramController));

  router.get(
    "/registration/:registrationId/status",
    registrationStatusController.getStatus.bind(registrationStatusController)
  );

  // Add new route to get user's Instagram accounts
  router.get(
    "/accounts",
    instagramController.getAccounts.bind(instagramController)
  );

  return router;
};
