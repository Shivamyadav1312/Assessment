const request = require('supertest');
const app = require('../src/app');
require('./setup');

describe('Order API Endpoints', () => {
  let user1Token;
  let user2Token;
  let product1;
  let product2;

  beforeEach(async () => {
    // Register user 1
    const user1Res = await request(app).post('/api/auth/register').send({
      name: 'User One',
      email: 'user1@example.com',
      password: 'Password123',
    });
    user1Token = user1Res.body.data.token;

    // Register user 2
    const user2Res = await request(app).post('/api/auth/register').send({
      name: 'User Two',
      email: 'user2@example.com',
      password: 'Password123',
    });
    user2Token = user2Res.body.data.token;

    // Create test products
    const p1Res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({
        name: 'Gaming Laptop',
        description: 'High performance laptop',
        price: 1500,
        stockQuantity: 5,
        category: 'computers',
      });
    product1 = p1Res.body.data;

    const p2Res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({
        name: 'Wireless Mouse',
        description: 'Ergonomic optical mouse',
        price: 50,
        stockQuantity: 10,
        category: 'accessories',
      });
    product2 = p2Res.body.data;
  });

  describe('POST /api/orders', () => {
    it('should successfully create an order and reduce product stock accordingly (201 Created)', async () => {
      const orderPayload = {
        products: [
          { productId: product1._id, quantity: 2 },
          { productId: product2._id, quantity: 3 },
        ],
      };

      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${user1Token}`)
        .send(orderPayload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('_id');
      expect(res.body.data.products.length).toBe(2);

      // Verify server-side total calculation: (1500 * 2) + (50 * 3) = 3000 + 150 = 3150
      expect(res.body.data.totalAmount).toBe(3150);

      // Verify snapshots saved
      expect(res.body.data.products[0].name).toBe('Gaming Laptop');
      expect(res.body.data.products[0].price).toBe(1500);
      expect(res.body.data.products[0].quantity).toBe(2);
      expect(res.body.data.products[0].subtotal).toBe(3000);

      // Verify stock was reduced in database
      const p1Check = await request(app).get(`/api/products/${product1._id}`);
      expect(p1Check.body.data.stockQuantity).toBe(3); // 5 - 2 = 3

      const p2Check = await request(app).get(`/api/products/${product2._id}`);
      expect(p2Check.body.data.stockQuantity).toBe(7); // 10 - 3 = 7
    });

    it('should reject order if requested quantity exceeds available stock (400)', async () => {
      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          products: [{ productId: product1._id, quantity: 10 }], // only 5 in stock
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INSUFFICIENT_STOCK');

      // Ensure stock remained unchanged
      const p1Check = await request(app).get(`/api/products/${product1._id}`);
      expect(p1Check.body.data.stockQuantity).toBe(5);
    });

    it('should fail entire multi-product order without partial stock deduction if one item fails', async () => {
      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          products: [
            { productId: product1._id, quantity: 2 }, // available (5)
            { productId: product2._id, quantity: 50 }, // unavailable (only 10)
          ],
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INSUFFICIENT_STOCK');

      // Verify product 1 stock was NOT reduced
      const p1Check = await request(app).get(`/api/products/${product1._id}`);
      expect(p1Check.body.data.stockQuantity).toBe(5);

      const p2Check = await request(app).get(`/api/products/${product2._id}`);
      expect(p2Check.body.data.stockQuantity).toBe(10);
    });

    it('should reject order if product does not exist (404)', async () => {
      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          products: [{ productId: '507f1f77bcf86cd799439011', quantity: 1 }],
        });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('PRODUCT_NOT_FOUND');
    });

    it('should reject order with empty products array (400)', async () => {
      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ products: [] });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject order with zero or negative quantity (400)', async () => {
      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          products: [{ productId: product1._id, quantity: 0 }],
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should handle concurrent orders safely and ensure stock never becomes negative', async () => {
      // Create product with only 1 unit in stock
      const limitedProductRes = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          name: 'Limited Collector Item',
          description: 'Only 1 unit available in stock',
          price: 999,
          stockQuantity: 1,
          category: 'collectibles',
        });
      const limitedProduct = limitedProductRes.body.data;

      // Both user 1 and user 2 attempt to buy the 1 unit simultaneously
      const [orderRes1, orderRes2] = await Promise.all([
        request(app)
          .post('/api/orders')
          .set('Authorization', `Bearer ${user1Token}`)
          .send({
            products: [{ productId: limitedProduct._id, quantity: 1 }],
          }),
        request(app)
          .post('/api/orders')
          .set('Authorization', `Bearer ${user2Token}`)
          .send({
            products: [{ productId: limitedProduct._id, quantity: 1 }],
          }),
      ]);

      const statusCodes = [orderRes1.status, orderRes2.status].sort();

      // Exactly ONE request must succeed (201) and ONE must fail with insufficient stock (400)
      expect(statusCodes).toEqual([201, 400]);

      // Check remaining stock is exactly 0 (never negative)
      const stockCheck = await request(app).get(`/api/products/${limitedProduct._id}`);
      expect(stockCheck.body.data.stockQuantity).toBe(0);
    });
  });

  describe('GET /api/orders', () => {
    beforeEach(async () => {
      // User 1 creates an order
      await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          products: [{ productId: product1._id, quantity: 1 }],
        });

      // User 2 creates an order
      await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${user2Token}`)
        .send({
          products: [{ productId: product2._id, quantity: 2 }],
        });
    });

    it('should return only orders belonging to the authenticated user', async () => {
      const user1OrdersRes = await request(app)
        .get('/api/orders')
        .set('Authorization', `Bearer ${user1Token}`);

      expect(user1OrdersRes.status).toBe(200);
      expect(user1OrdersRes.body.data.length).toBe(1);
      expect(user1OrdersRes.body.data[0].products[0].name).toBe('Gaming Laptop');

      const user2OrdersRes = await request(app)
        .get('/api/orders')
        .set('Authorization', `Bearer ${user2Token}`);

      expect(user2OrdersRes.status).toBe(200);
      expect(user2OrdersRes.body.data.length).toBe(1);
      expect(user2OrdersRes.body.data[0].products[0].name).toBe('Wireless Mouse');
    });
  });

  describe('GET /api/orders/:id', () => {
    let user1OrderId;

    beforeEach(async () => {
      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          products: [{ productId: product1._id, quantity: 1 }],
        });
      user1OrderId = res.body.data._id;
    });

    it('should return order details for the owner (200 OK)', async () => {
      const res = await request(app)
        .get(`/api/orders/${user1OrderId}`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data._id).toBe(user1OrderId);
    });

    it('should NOT allow another user to access the order (returns 404 for isolation)', async () => {
      const res = await request(app)
        .get(`/api/orders/${user1OrderId}`)
        .set('Authorization', `Bearer ${user2Token}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('ORDER_NOT_FOUND');
    });

    it('should return 404 for non-existent order ID', async () => {
      const res = await request(app)
        .get('/api/orders/507f1f77bcf86cd799439011')
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('ORDER_NOT_FOUND');
    });
  });
});
