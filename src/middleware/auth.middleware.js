const { verifyToken } = require('../utils/jwt');
const ApiError = require('../utils/ApiError');
const User = require('../models/User');

/**
 * Middleware to authenticate requests using JWT Bearer token.
 * Attaches the authenticated user document to req.user.
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return next(ApiError.unauthorized('Authorization header is missing', 'MISSING_AUTH_HEADER'));
    }

    if (!authHeader.startsWith('Bearer ')) {
      return next(
        ApiError.unauthorized('Invalid authorization format. Format must be: Bearer <token>', 'MALFORMED_AUTH_HEADER')
      );
    }

    const token = authHeader.split(' ')[1];
    if (!token || token.trim() === '') {
      return next(ApiError.unauthorized('Authentication token is missing', 'MISSING_TOKEN'));
    }

    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return next(ApiError.unauthorized('Authentication token has expired', 'TOKEN_EXPIRED'));
      }
      return next(ApiError.unauthorized('Invalid authentication token', 'INVALID_TOKEN'));
    }

    const user = await User.findById(decoded.userId);
    if (!user) {
      return next(ApiError.unauthorized('User associated with this token no longer exists', 'USER_NOT_FOUND'));
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = authenticate;
