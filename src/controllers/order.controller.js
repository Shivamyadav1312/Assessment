const asyncHandler = require('../utils/asyncHandler');
const orderService = require('../services/order.service');

/**
 * @desc    Create a new order
 * @route   POST /api/orders
 * @access  Private
 */
const createOrder = asyncHandler(async (req, res) => {
  const order = await orderService.createOrder(req.user._id, req.body.products);

  res.status(201).json({
    success: true,
    message: 'Order created successfully',
    data: order,
  });
});

/**
 * @desc    Get logged-in user's orders
 * @route   GET /api/orders
 * @access  Private
 */
const getUserOrders = asyncHandler(async (req, res) => {
  const result = await orderService.getUserOrders(req.user._id, req.query);

  res.status(200).json({
    success: true,
    message: 'Orders retrieved successfully',
    data: result.orders,
    pagination: result.pagination,
  });
});

/**
 * @desc    Get order details by ID
 * @route   GET /api/orders/:id
 * @access  Private
 */
const getOrderById = asyncHandler(async (req, res) => {
  const order = await orderService.getOrderById(req.user._id, req.params.id);

  res.status(200).json({
    success: true,
    message: 'Order retrieved successfully',
    data: order,
  });
});

module.exports = {
  createOrder,
  getUserOrders,
  getOrderById,
};
