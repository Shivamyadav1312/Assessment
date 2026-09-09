const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { validateRegister, validateLogin } = require('../validators/auth.validator');
const validate = require('../middleware/validate.middleware');

// Public authentication routes
router.post('/register', validateRegister, validate, authController.register);
router.post('/login', validateLogin, validate, authController.login);

module.exports = router;
