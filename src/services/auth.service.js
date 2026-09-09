const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const { generateToken } = require('../utils/jwt');

/**
 * Register a new user account.
 *
 * @param {Object} userData - { name, email, password }
 * @returns {Promise<{ user: Object, token: string }>}
 */
const register = async ({ name, email, password }) => {
  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    throw ApiError.conflict('An account with this email address already exists', 'EMAIL_ALREADY_EXISTS');
  }

  const user = await User.create({
    name,
    email: email.toLowerCase(),
    password,
  });

  const token = generateToken({
    userId: user._id,
    email: user.email,
  });

  return {
    user,
    token,
  };
};

/**
 * Authenticate user with email and password.
 *
 * @param {Object} credentials - { email, password }
 * @returns {Promise<{ user: Object, token: string }>}
 */
const login = async ({ email, password }) => {
  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

  if (!user) {
    throw ApiError.unauthorized('Invalid email or password', 'INVALID_CREDENTIALS');
  }

  const isPasswordMatch = await user.comparePassword(password);
  if (!isPasswordMatch) {
    throw ApiError.unauthorized('Invalid email or password', 'INVALID_CREDENTIALS');
  }

  const token = generateToken({
    userId: user._id,
    email: user.email,
  });

  return {
    user: user.toJSON(),
    token,
  };
};

module.exports = {
  register,
  login,
};
