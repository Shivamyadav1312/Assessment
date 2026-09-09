const express = require('express');
const router = express.Router();
const productController = require('../controllers/product.controller');
const authenticate = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const {
  validateCreateProduct,
  validateUpdateProduct,
  validateProductId,
  validateProductQuery,
} = require('../validators/product.validator');

// Public product routes
router.get('/', validateProductQuery, validate, productController.getProducts);
router.get('/:id', validateProductId, validate, productController.getProductById);

// Protected product routes
router.post('/', authenticate, validateCreateProduct, validate, productController.createProduct);
router.patch('/:id', authenticate, validateUpdateProduct, validate, productController.updateProduct);
router.delete('/:id', authenticate, validateProductId, validate, productController.deleteProduct);

module.exports = router;
