const request = require('supertest');
const app = require('../src/app');
require('./setup');

describe('Authentication API Endpoints', () => {
  const validUser = {
    name: 'John Doe',
    email: 'john@example.com',
    password: 'Password123',
  };

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully and return 201 with token', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send(validUser);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('token');
      expect(res.body.data.user).toHaveProperty('email', 'john@example.com');
      expect(res.body.data.user).toHaveProperty('name', 'John Doe');
      expect(res.body.data.user).not.toHaveProperty('password');
    });

    it('should reject duplicate email registration with 409 Conflict', async () => {
      // First registration
      await request(app).post('/api/auth/register').send(validUser);

      // Duplicate registration attempt
      const res = await request(app)
        .post('/api/auth/register')
        .send(validUser);

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('EMAIL_ALREADY_EXISTS');
    });

    it('should reject registration with invalid email format', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Jane Doe',
          email: 'not-an-email',
          password: 'Password123',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject registration with weak/short password (< 6 chars)', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Jane Doe',
          email: 'jane@example.com',
          password: '123',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject registration with missing name', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'jane@example.com',
          password: 'Password123',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      // Create user before each login test
      await request(app).post('/api/auth/register').send(validUser);
    });

    it('should login successfully with valid credentials and return 200 with token', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: validUser.email,
          password: validUser.password,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('token');
      expect(res.body.data.user).toHaveProperty('email', validUser.email);
      expect(res.body.data.user).not.toHaveProperty('password');
    });

    it('should reject login with wrong password (401 Unauthorized)', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: validUser.email,
          password: 'WrongPassword123',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('should reject login for non-existent email (401 Unauthorized)', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'Password123',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('should reject login with empty fields (400 Bad Request)', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });
});
