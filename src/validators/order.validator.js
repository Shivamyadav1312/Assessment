const { body, param, query } = require('express-validator');

const validateCreateOrder = [
  body('products')
    .isArray({ min: 1 })
    .withMessage('Products must be a non-empty array of items'),

  body('products.*.productId')
    .notEmpty()
    .withMessage('Each item must have a productId')
    .isMongoId()
    .withMessage('Each item must have a valid productId format'),

  body('products.*.quantity')
    .notEmpty()
    .withMessage('Each item must have a quantity')
    .isInt({ min: 1 })
    .withMessage('Quantity must be an integer greater than or equal to 1'),
];

const validateOrderId = [
  param('id')
    .isMongoId()
    .withMessage('Invalid order ID format'),
];

const validateOrderQuery = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be an integer greater than or equal to 1'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be an integer between 1 and 100'),
];

module.exports = {
  validateCreateOrder,
  validateOrderId,
  validateOrderQuery,
};
