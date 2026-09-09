const ApiError = require('../utils/ApiError');

/**
 * Centralized Express error-handling middleware.
 * Formats all errors into a standardized, clean API response.
 */
const errorHandler = (err, req, res, next) => {
  let error = err;

  // If not an instance of ApiError, convert standard errors
  if (!(error instanceof ApiError)) {
    // Mongoose bad ObjectId / CastError
    if (err.name === 'CastError') {
      const message = `Invalid ${err.path}: ${err.value}`;
      error = ApiError.badRequest(message, 'INVALID_ID_FORMAT');
    }
    // Mongoose duplicate key error (E11000)
    else if (err.code === 11000) {
      const field = Object.keys(err.keyValue || {})[0] || 'field';
      const value = err.keyValue ? err.keyValue[field] : '';
      const message = `Duplicate value '${value}' entered for ${field}. Please use another value.`;
      error = ApiError.conflict(message, 'DUPLICATE_RESOURCE', { field, value });
    }
    // Mongoose validation error
    else if (err.name === 'ValidationError') {
      const details = Object.values(err.errors || {}).map((e) => ({
        field: e.path,
        message: e.message,
      }));
      error = ApiError.badRequest(
        details[0]?.message || 'Validation error',
        'VALIDATION_ERROR',
        details
      );
    }
    // JWT signature / malformed error
    else if (err.name === 'JsonWebTokenError') {
      error = ApiError.unauthorized('Invalid authentication token', 'INVALID_TOKEN');
    }
    // JWT expiration error
    else if (err.name === 'TokenExpiredError') {
      error = ApiError.unauthorized('Authentication token has expired', 'TOKEN_EXPIRED');
    }
    // Generic fallback for unhandled exceptions
    else {
      const statusCode = err.statusCode || 500;
      const message = err.message || 'Internal Server Error';
      error = new ApiError(statusCode, message, 'INTERNAL_SERVER_ERROR');
    }
  }

  const response = {
    success: false,
    message: error.message,
    error: {
      code: error.errorCode || 'ERROR',
      ...(error.details && { details: error.details }),
    },
  };

  // Include stack trace only in development environment for internal debugging
  if (process.env.NODE_ENV === 'development' && error.statusCode === 500) {
    response.error.stack = error.stack;
  }

  res.status(error.statusCode || 500).json(response);
};

module.exports = errorHandler;
