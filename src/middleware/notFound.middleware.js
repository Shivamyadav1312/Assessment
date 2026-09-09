const ApiError = require('../utils/ApiError');

/**
 * Catch-all middleware for non-existent routes.
 */
const notFound = (req, res, next) => {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`, 'ROUTE_NOT_FOUND'));
};

module.exports = notFound;
