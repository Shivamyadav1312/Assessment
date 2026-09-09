/**
 * Simple higher-order function that catches errors in async Express middleware/controllers
 * and passes them to the next error-handling middleware.
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
