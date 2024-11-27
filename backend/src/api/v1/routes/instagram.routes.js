// src/api/v1/routes/instagram.routes.js
const express = require('express');
const instagramController = require('../controllers/instagram.controller');
const { validateLogin, validateRegistration } = require('../validators/instagram.validator');
const router = express.Router();

router.post('/register', validateRegistration, instagramController.register);
router.get('/register/status/:username', instagramController.getRegistrationStatus);
router.post('/login', validateLogin, instagramController.login);
router.post('/login/force', validateLogin, instagramController.forceLogin);

module.exports = router;