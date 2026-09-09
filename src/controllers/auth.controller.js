const asyncHandler = require('../utils/asyncHandler');
const authService = require('../services/auth.service');

/**
 * @desc    Register a new user
 * @route   POST /api/auth/register
 * @access  Public
 */
const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  const result = await authService.register({ name, email, password });

  res.status(201).json({
    success: true,
    message: 'User registered successfully',
    data: result,
  });
});

/**
 * @desc    Login user & get JWT token
 * @route   POST /api/auth/login
 * @access  Public
 */
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const result = await authService.login({ email, password });

  res.status(200).json({
    success: true,
    message: 'Login successful',
    data: result,
  });
});

module.exports = {
  register,
  login,
};
