// src/api/v1/routes/instagram.routes.js
const express = require("express");

module.exports = ({ instagramController }) => {
  const router = express.Router();

  // Bind methods to maintain context
  router.post(
    "/register",
    instagramController.register.bind(instagramController)
  );
  router.get(
    "/register/status/:username",
    instagramController.getRegistrationStatus.bind(instagramController)
  );
  router.post("/login", instagramController.login.bind(instagramController));

  return router;
};
