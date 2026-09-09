const Product = require('../models/Product');
const ApiError = require('../utils/ApiError');

/**
 * Create a new product.
 *
 * @param {Object} productData
 * @returns {Promise<Object>}
 */
const createProduct = async (productData) => {
  const { name, description, price, stockQuantity, category } = productData;

  const product = await Product.create({
    name: name.trim(),
    description: description.trim(),
    price: Number(price),
    stockQuantity: Number(stockQuantity),
    category: category.trim().toLowerCase(),
  });

  return product;
};

/**
 * Get products with search, category filter, stock availability, and pagination.
 *
 * @param {Object} options - { search, category, inStock, page, limit }
 * @returns {Promise<{ products: Array, pagination: Object }>}
 */
const getProducts = async ({ search, category, inStock, page = 1, limit = 10 }) => {
  const parsedPage = Math.max(parseInt(page, 10) || 1, 1);
  const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 100);
  const skip = (parsedPage - 1) * parsedLimit;

  const query = {};

  // Case-insensitive search by product name or description
  if (search && search.trim() !== '') {
    const searchRegex = new RegExp(search.trim(), 'i');
    query.$or = [
      { name: { $regex: searchRegex } },
      { description: { $regex: searchRegex } },
    ];
  }

  // Filter by category (case-insensitive)
  if (category && category.trim() !== '') {
    query.category = category.trim().toLowerCase();
  }

  // Filter by availability
  if (inStock === 'true' || inStock === true) {
    query.stockQuantity = { $gt: 0 };
  } else if (inStock === 'false' || inStock === false) {
    query.stockQuantity = 0;
  }

  const [total, products] = await Promise.all([
    Product.countDocuments(query),
    Product.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parsedLimit),
  ]);

  const totalPages = Math.ceil(total / parsedLimit) || 1;

  return {
    products,
    pagination: {
      page: parsedPage,
      limit: parsedLimit,
      total,
      totalPages,
    },
  };
};

/**
 * Get a single product by its ObjectId.
 *
 * @param {string} id
 * @returns {Promise<Object>}
 */
const getProductById = async (id) => {
  const product = await Product.findById(id);
  if (!product) {
    throw ApiError.notFound('Product not found', 'PRODUCT_NOT_FOUND');
  }
  return product;
};

/**
 * Update an existing product.
 *
 * @param {string} id
 * @param {Object} updateData
 * @returns {Promise<Object>}
 */
const updateProduct = async (id, updateData) => {
  // Normalize fields if supplied
  const fieldsToUpdate = {};
  if (updateData.name !== undefined) fieldsToUpdate.name = updateData.name.trim();
  if (updateData.description !== undefined) fieldsToUpdate.description = updateData.description.trim();
  if (updateData.price !== undefined) fieldsToUpdate.price = Number(updateData.price);
  if (updateData.stockQuantity !== undefined) fieldsToUpdate.stockQuantity = Number(updateData.stockQuantity);
  if (updateData.category !== undefined) fieldsToUpdate.category = updateData.category.trim().toLowerCase();

  const product = await Product.findByIdAndUpdate(id, fieldsToUpdate, {
    new: true,
    runValidators: true,
  });

  if (!product) {
    throw ApiError.notFound('Product not found', 'PRODUCT_NOT_FOUND');
  }

  return product;
};

/**
 * Delete a product by its ObjectId.
 *
 * @param {string} id
 * @returns {Promise<Object>}
 */
const deleteProduct = async (id) => {
  const product = await Product.findByIdAndDelete(id);
  if (!product) {
    throw ApiError.notFound('Product not found', 'PRODUCT_NOT_FOUND');
  }
  return product;
};

module.exports = {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
};
