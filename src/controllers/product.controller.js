const asyncHandler = require('../utils/asyncHandler');
const productService = require('../services/product.service');

/**
 * @desc    Create a new product
 * @route   POST /api/products
 * @access  Private
 */
const createProduct = asyncHandler(async (req, res) => {
  const product = await productService.createProduct(req.body);

  res.status(201).json({
    success: true,
    message: 'Product created successfully',
    data: product,
  });
});

/**
 * @desc    Get all products with filtering, search, and pagination
 * @route   GET /api/products
 * @access  Public
 */
const getProducts = asyncHandler(async (req, res) => {
  const result = await productService.getProducts(req.query);

  res.status(200).json({
    success: true,
    message: 'Products retrieved successfully',
    data: result.products,
    pagination: result.pagination,
  });
});

/**
 * @desc    Get single product by ID
 * @route   GET /api/products/:id
 * @access  Public
 */
const getProductById = asyncHandler(async (req, res) => {
  const product = await productService.getProductById(req.params.id);

  res.status(200).json({
    success: true,
    message: 'Product retrieved successfully',
    data: product,
  });
});

/**
 * @desc    Update product details
 * @route   PATCH /api/products/:id
 * @access  Private
 */
const updateProduct = asyncHandler(async (req, res) => {
  const product = await productService.updateProduct(req.params.id, req.body);

  res.status(200).json({
    success: true,
    message: 'Product updated successfully',
    data: product,
  });
});

/**
 * @desc    Delete a product
 * @route   DELETE /api/products/:id
 * @access  Private
 */
const deleteProduct = asyncHandler(async (req, res) => {
  const product = await productService.deleteProduct(req.params.id);

  res.status(200).json({
    success: true,
    message: 'Product deleted successfully',
    data: product,
  });
});

module.exports = {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
};
