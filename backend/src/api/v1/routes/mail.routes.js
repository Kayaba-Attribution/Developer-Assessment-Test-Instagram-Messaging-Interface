// src/api/v1/routes/mail.routes.js
const express = require("express");
const router = express.Router();

const container = require("../../../container");
const MailController = require("../controllers/mail.controller");

const mailController = new MailController({
  mailService: container.get("mailService"),
  logger: container.get("logger"),
});

// Routes
router.post("/generate", (req, res) => mailController.generateEmail(req, res));
router.get("/check/:hash", (req, res) => mailController.checkEmails(req, res));
router.get("/code/:hash", (req, res) => mailController.getVerificationCode(req, res));

module.exports = router;
