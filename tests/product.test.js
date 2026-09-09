const request = require('supertest');
const app = require('../src/app');
require('./setup');

describe('Product API Endpoints', () => {
  let authToken;

  const validProduct = {
    name: 'iPhone 15 Pro',
    description: 'Flagship Apple smartphone with Titanium design',
    price: 999.99,
    stockQuantity: 15,
    category: 'electronics',
  };

  beforeEach(async () => {
    // Register and get token
    const authRes = await request(app).post('/api/auth/register').send({
      name: 'Test Seller',
      email: 'seller@example.com',
      password: 'Password123',
    });
    authToken = authRes.body.data.token;
  });

  describe('POST /api/products', () => {
    it('should create a new product when authenticated (201 Created)', async () => {
      const res = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${authToken}`)
        .send(validProduct);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('_id');
      expect(res.body.data.name).toBe(validProduct.name);
      expect(res.body.data.price).toBe(validProduct.price);
      expect(res.body.data.stockQuantity).toBe(validProduct.stockQuantity);
      expect(res.body.data.category).toBe(validProduct.category.toLowerCase());
    });

    it('should reject product creation without authentication (401 Unauthorized)', async () => {
      const res = await request(app)
        .post('/api/products')
        .send(validProduct);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should reject product creation with negative price (400 Bad Request)', async () => {
      const res = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          ...validProduct,
          price: -50,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject product creation with negative stock (400 Bad Request)', async () => {
      const res = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          ...validProduct,
          stockQuantity: -5,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject product creation with decimal stock (400 Bad Request)', async () => {
      const res = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          ...validProduct,
          stockQuantity: 5.5,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/products', () => {
    beforeEach(async () => {
      // Seed sample products
      await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'iPhone 15',
          description: 'Apple phone',
          price: 799,
          stockQuantity: 10,
          category: 'electronics',
        });

      await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Samsung Galaxy S24',
          description: 'Android flagship smartphone',
          price: 899,
          stockQuantity: 0, // Out of stock
          category: 'electronics',
        });

      await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'MacBook Air M3',
          description: 'Lightweight Apple laptop',
          price: 1199,
          stockQuantity: 5,
          category: 'computers',
        });
    });

    it('should retrieve all products with pagination metadata', async () => {
      const res = await request(app).get('/api/products');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(3);
      expect(res.body.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 3,
        totalPages: 1,
      });
    });

    it('should search products by keyword (case-insensitive)', async () => {
      const res = await request(app).get('/api/products?search=apple');

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(2); // iPhone and MacBook
    });

    it('should filter products by category', async () => {
      const res = await request(app).get('/api/products?category=computers');

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].name).toBe('MacBook Air M3');
    });

    it('should filter products by inStock=true (stockQuantity > 0)', async () => {
      const res = await request(app).get('/api/products?inStock=true');

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(2);
      expect(res.body.data.every((p) => p.stockQuantity > 0)).toBe(true);
    });

    it('should filter products by inStock=false (stockQuantity = 0)', async () => {
      const res = await request(app).get('/api/products?inStock=false');

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].name).toBe('Samsung Galaxy S24');
    });

    it('should handle pagination correctly', async () => {
      const res = await request(app).get('/api/products?page=1&limit=2');

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(2);
      expect(res.body.pagination.page).toBe(1);
      expect(res.body.pagination.limit).toBe(2);
      expect(res.body.pagination.total).toBe(3);
      expect(res.body.pagination.totalPages).toBe(2);
    });
  });

  describe('GET /api/products/:id', () => {
    let createdProduct;

    beforeEach(async () => {
      const res = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${authToken}`)
        .send(validProduct);
      createdProduct = res.body.data;
    });

    it('should get a single product by ID (200 OK)', async () => {
      const res = await request(app).get(`/api/products/${createdProduct._id}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data._id).toBe(createdProduct._id);
      expect(res.body.data.name).toBe(validProduct.name);
    });

    it('should return 400 for invalid MongoDB ObjectId format', async () => {
      const res = await request(app).get('/api/products/invalid-id-format');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should return 404 for non-existent product ID', async () => {
      const res = await request(app).get('/api/products/507f1f77bcf86cd799439011');

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('PRODUCT_NOT_FOUND');
    });
  });

  describe('PATCH /api/products/:id', () => {
    let createdProduct;

    beforeEach(async () => {
      const res = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${authToken}`)
        .send(validProduct);
      createdProduct = res.body.data;
    });

    it('should partially update a product (200 OK)', async () => {
      const res = await request(app)
        .patch(`/api/products/${createdProduct._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          price: 899.99,
          stockQuantity: 25,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.price).toBe(899.99);
      expect(res.body.data.stockQuantity).toBe(25);
      expect(res.body.data.name).toBe(validProduct.name); // unchanged
    });

    it('should reject update without authentication (401)', async () => {
      const res = await request(app)
        .patch(`/api/products/${createdProduct._id}`)
        .send({ price: 500 });

      expect(res.status).toBe(401);
    });

    it('should reject update with negative price (400)', async () => {
      const res = await request(app)
        .patch(`/api/products/${createdProduct._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ price: -10 });

      expect(res.status).toBe(400);
    });
  });

  describe('DELETE /api/products/:id', () => {
    let createdProduct;

    beforeEach(async () => {
      const res = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${authToken}`)
        .send(validProduct);
      createdProduct = res.body.data;
    });

    it('should delete product when authenticated (200 OK)', async () => {
      const res = await request(app)
        .delete(`/api/products/${createdProduct._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify it's really gone
      const verifyRes = await request(app).get(`/api/products/${createdProduct._id}`);
      expect(verifyRes.status).toBe(404);
    });

    it('should return 404 when deleting non-existent product', async () => {
      const res = await request(app)
        .delete('/api/products/507f1f77bcf86cd799439011')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('PRODUCT_NOT_FOUND');
    });

    it('should reject deletion without token (401)', async () => {
      const res = await request(app).delete(`/api/products/${createdProduct._id}`);
      expect(res.status).toBe(401);
    });
  });
});
