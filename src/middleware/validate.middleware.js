const { validationResult } = require('express-validator');
const ApiError = require('../utils/ApiError');

/**
 * Middleware that checks express-validator results.
 * If validation errors exist, formats them and passes an ApiError to the error handler.
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map((err) => ({
      field: err.path || err.param,
      message: err.msg,
      value: err.value,
    }));

    return next(
      new ApiError(
        400,
        formattedErrors[0].message || 'Validation failed',
        'VALIDATION_ERROR',
        formattedErrors
      )
    );
  }

  next();
};

module.exports = validate;
