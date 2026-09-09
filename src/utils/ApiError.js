/**
 * Custom operational API Error class with HTTP status code and standardized error details.
 */
class ApiError extends Error {
  constructor(statusCode, message, errorCode = 'ERROR', details = null) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message = 'Bad Request', errorCode = 'BAD_REQUEST', details = null) {
    return new ApiError(400, message, errorCode, details);
  }

  static unauthorized(message = 'Unauthorized', errorCode = 'UNAUTHORIZED', details = null) {
    return new ApiError(401, message, errorCode, details);
  }

  static forbidden(message = 'Forbidden', errorCode = 'FORBIDDEN', details = null) {
    return new ApiError(403, message, errorCode, details);
  }

  static notFound(message = 'Resource Not Found', errorCode = 'NOT_FOUND', details = null) {
    return new ApiError(404, message, errorCode, details);
  }

  static conflict(message = 'Conflict', errorCode = 'CONFLICT', details = null) {
    return new ApiError(409, message, errorCode, details);
  }

  static unprocessable(message = 'Unprocessable Entity', errorCode = 'VALIDATION_ERROR', details = null) {
    return new ApiError(422, message, errorCode, details);
  }

  static internal(message = 'Internal Server Error', errorCode = 'INTERNAL_ERROR', details = null) {
    return new ApiError(500, message, errorCode, details);
  }
}

module.exports = ApiError;
