const jwt = require('jsonwebtoken');

/**
 * Generate a signed JWT token for a given user payload.
 *
 * @param {Object} payload - Data to embed in token (e.g. { userId, email })
 * @returns {string} Signed JWT token
 */
const generateToken = (payload) => {
  const secret = process.env.JWT_SECRET;
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';

  if (!secret) {
    throw new Error('JWT_SECRET environment variable is missing');
  }

  return jwt.sign(payload, secret, {
    algorithm: 'HS256',
    expiresIn,
  });
};

/**
 * Verify a JWT token and extract its decoded payload.
 *
 * @param {string} token - The JWT string
 * @returns {Object} Decoded payload
 */
const verifyToken = (token) => {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error('JWT_SECRET environment variable is missing');
  }

  return jwt.verify(token, secret, {
    algorithms: ['HS256'],
  });
};

module.exports = {
  generateToken,
  verifyToken,
};
