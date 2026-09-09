const express = require('express');
const router = express.Router();
const orderController = require('../controllers/order.controller');
const authenticate = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const {
  validateCreateOrder,
  validateOrderId,
  validateOrderQuery,
} = require('../validators/order.validator');

// All order routes require authentication
router.use(authenticate);

router.post('/', validateCreateOrder, validate, orderController.createOrder);
router.get('/', validateOrderQuery, validate, orderController.getUserOrders);
router.get('/:id', validateOrderId, validate, orderController.getOrderById);

module.exports = router;
