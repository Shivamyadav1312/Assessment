const { body, param, query } = require('express-validator');

const validateCreateProduct = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Product name is required')
    .isLength({ min: 2, max: 200 })
    .withMessage('Product name must be between 2 and 200 characters'),

  body('description')
    .trim()
    .notEmpty()
    .withMessage('Product description is required')
    .isLength({ max: 2000 })
    .withMessage('Product description cannot exceed 2000 characters'),

  body('price')
    .notEmpty()
    .withMessage('Price is required')
    .isFloat({ gt: 0 })
    .withMessage('Price must be a number greater than 0'),

  body('stockQuantity')
    .notEmpty()
    .withMessage('Stock quantity is required')
    .isInt({ min: 0 })
    .withMessage('Stock quantity must be an integer greater than or equal to 0'),

  body('category')
    .trim()
    .notEmpty()
    .withMessage('Category is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Category must be between 2 and 100 characters'),
];

const validateUpdateProduct = [
  param('id')
    .isMongoId()
    .withMessage('Invalid product ID format'),

  body('name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Product name cannot be empty')
    .isLength({ min: 2, max: 200 })
    .withMessage('Product name must be between 2 and 200 characters'),

  body('description')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Product description cannot be empty')
    .isLength({ max: 2000 })
    .withMessage('Product description cannot exceed 2000 characters'),

  body('price')
    .optional()
    .isFloat({ gt: 0 })
    .withMessage('Price must be a number greater than 0'),

  body('stockQuantity')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Stock quantity must be an integer greater than or equal to 0'),

  body('category')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Category cannot be empty')
    .isLength({ min: 2, max: 100 })
    .withMessage('Category must be between 2 and 100 characters'),
];

const validateProductId = [
  param('id')
    .isMongoId()
    .withMessage('Invalid product ID format'),
];

const validateProductQuery = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be an integer greater than or equal to 1'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be an integer between 1 and 100'),

  query('inStock')
    .optional()
    .isIn(['true', 'false'])
    .withMessage('inStock must be either "true" or "false"'),

  query('search')
    .optional()
    .trim(),

  query('category')
    .optional()
    .trim(),
];

module.exports = {
  validateCreateProduct,
  validateUpdateProduct,
  validateProductId,
  validateProductQuery,
};
