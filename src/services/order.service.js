const mongoose = require('mongoose');
const Order = require('../models/Order');
const Product = require('../models/Product');
const ApiError = require('../utils/ApiError');

/**
 * Helper to check if transactions are supported by the connected MongoDB server.
 * MongoDB Atlas and replica sets support transactions; standalone instances do not.
 */
const areTransactionsSupported = () => {
  const isReplicaSet = mongoose.connection?.client?.topology?.description?.type?.includes('ReplicaSet');
  return Boolean(isReplicaSet);
};

/**
 * Create a new order with atomic stock reduction and historical snapshots.
 *
 * @param {string} userId - ID of the authenticated user
 * @param {Array<{ productId: string, quantity: number }>} items - Order items
 * @returns {Promise<Object>} Created Order document
 */
const createOrder = async (userId, items) => {
  if (!items || !Array.isArray(items) || items.length === 0) {
    throw ApiError.badRequest('Order must contain at least one product', 'EMPTY_ORDER');
  }

  // Aggregate quantities if the same productId is passed multiple times in the request
  const aggregatedItemsMap = new Map();
  for (const item of items) {
    const pId = item.productId.toString();
    const qty = Number(item.quantity);
    if (!Number.isInteger(qty) || qty <= 0) {
      throw ApiError.badRequest(`Invalid quantity '${item.quantity}'. Quantity must be a positive integer`, 'INVALID_QUANTITY');
    }
    aggregatedItemsMap.set(pId, (aggregatedItemsMap.get(pId) || 0) + qty);
  }

  const uniqueProductIds = Array.from(aggregatedItemsMap.keys());

  // 1. Fetch all requested products from database
  const products = await Product.find({ _id: { $in: uniqueProductIds } });

  if (products.length !== uniqueProductIds.length) {
    const foundIds = new Set(products.map((p) => p._id.toString()));
    const missingIds = uniqueProductIds.filter((id) => !foundIds.has(id));
    throw ApiError.notFound(
      `One or more products do not exist: ${missingIds.join(', ')}`,
      'PRODUCT_NOT_FOUND'
    );
  }

  // 2. Preliminary stock check and snapshot preparation
  const orderItemsSnapshots = [];
  let totalAmount = 0;

  for (const product of products) {
    const requestedQty = aggregatedItemsMap.get(product._id.toString());

    if (product.stockQuantity < requestedQty) {
      throw ApiError.badRequest(
        `Insufficient stock for product '${product.name}'. Available: ${product.stockQuantity}, requested: ${requestedQty}`,
        'INSUFFICIENT_STOCK',
        {
          productId: product._id,
          productName: product.name,
          availableStock: product.stockQuantity,
          requestedQuantity: requestedQty,
        }
      );
    }

    const subtotal = Number((product.price * requestedQty).toFixed(2));
    totalAmount += subtotal;

    orderItemsSnapshots.push({
      product: product._id,
      name: product.name,
      price: product.price,
      quantity: requestedQty,
      subtotal,
    });
  }

  totalAmount = Number(totalAmount.toFixed(2));

  // 3. Atomic stock reduction & Order creation
  // Check if replica set / MongoDB Atlas transactions are supported
  let session = null;
  let useTransactions = false;

  try {
    const topologyType = mongoose.connection?.client?.topology?.description?.type;
    if (topologyType && (topologyType.includes('ReplicaSet') || topologyType.includes('Sharded'))) {
      session = await mongoose.startSession();
      session.startTransaction();
      useTransactions = true;
    }
  } catch (err) {
    if (session) {
      try {
        session.endSession();
      } catch (e) {}
    }
    session = null;
    useTransactions = false;
  }

  if (useTransactions && session) {
    try {
      // Atomically decrement stock for each item using conditional updates within the session
      for (const item of orderItemsSnapshots) {
        const updatedProduct = await Product.findOneAndUpdate(
          {
            _id: item.product,
            stockQuantity: { $gte: item.quantity },
          },
          {
            $inc: { stockQuantity: -item.quantity },
          },
          { session, new: true }
        );

        if (!updatedProduct) {
          throw ApiError.badRequest(
            `Insufficient stock for product '${item.name}' during atomic deduction`,
            'INSUFFICIENT_STOCK',
            { productId: item.product, productName: item.name }
          );
        }
      }

      // Create order document inside the transaction
      const [order] = await Order.create(
        [
          {
            user: userId,
            products: orderItemsSnapshots,
            totalAmount,
            status: 'confirmed',
          },
        ],
        { session }
      );

      await session.commitTransaction();
      return order;
    } catch (error) {
      if (session.inTransaction()) {
        await session.abortTransaction();
      }
      throw error;
    } finally {
      session.endSession();
    }
  } else {
    // Atomic conditional decrement with compensation rollback (works on all MongoDB environments)
    const decrementedProducts = [];

    try {
      for (const item of orderItemsSnapshots) {
        const updatedProduct = await Product.findOneAndUpdate(
          {
            _id: item.product,
            stockQuantity: { $gte: item.quantity },
          },
          {
            $inc: { stockQuantity: -item.quantity },
          },
          { new: true }
        );

        if (!updatedProduct) {
          throw ApiError.badRequest(
            `Insufficient stock for product '${item.name}' during atomic deduction`,
            'INSUFFICIENT_STOCK',
            { productId: item.product, productName: item.name }
          );
        }

        decrementedProducts.push({
          productId: item.product,
          quantity: item.quantity,
        });
      }

      // Create order document
      const order = await Order.create({
        user: userId,
        products: orderItemsSnapshots,
        totalAmount,
        status: 'confirmed',
      });

      return order;
    } catch (error) {
      // Rollback any successfully decremented stocks
      for (const rollbackItem of decrementedProducts) {
        await Product.findByIdAndUpdate(rollbackItem.productId, {
          $inc: { stockQuantity: rollbackItem.quantity },
        });
      }
      throw error;
    }
  }
};

/**
 * Get all orders belonging to the authenticated user with pagination.
 *
 * @param {string} userId
 * @param {Object} options - { page, limit }
 * @returns {Promise<{ orders: Array, pagination: Object }>}
 */
const getUserOrders = async (userId, { page = 1, limit = 10 }) => {
  const parsedPage = Math.max(parseInt(page, 10) || 1, 1);
  const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 100);
  const skip = (parsedPage - 1) * parsedLimit;

  const query = { user: userId };

  const [total, orders] = await Promise.all([
    Order.countDocuments(query),
    Order.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parsedLimit),
  ]);

  const totalPages = Math.ceil(total / parsedLimit) || 1;

  return {
    orders,
    pagination: {
      page: parsedPage,
      limit: parsedLimit,
      total,
      totalPages,
    },
  };
};

/**
 * Get a single order by ID for the authenticated user.
 *
 * @param {string} userId
 * @param {string} orderId
 * @returns {Promise<Object>}
 */
const getOrderById = async (userId, orderId) => {
  const order = await Order.findById(orderId);

  // Return 404 if order does not exist OR if it belongs to another user
  // This prevents information leakage about the existence of orders
  if (!order || order.user.toString() !== userId.toString()) {
    throw ApiError.notFound('Order not found', 'ORDER_NOT_FOUND');
  }

  return order;
};

module.exports = {
  createOrder,
  getUserOrders,
  getOrderById,
};
