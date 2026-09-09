# Simple Inventory & Order API

A production-quality, modular, and interview-ready RESTful backend API for managing products, inventory, and customer orders built with **Node.js**, **Express.js**, and **MongoDB (Mongoose)**.

---

## Table of Contents
- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Architecture](#project-architecture)
- [Installation & Setup](#installation--setup)
- [Environment Configuration](#environment-configuration)
- [Running the Server](#running-the-server)
- [API Endpoints](#api-endpoints)
- [Authentication](#authentication)
- [Product Search, Filtering & Pagination](#product-search-filtering--pagination)
- [Order Business Logic & Concurrency Protection](#order-business-logic--concurrency-protection)
- [Concurrency Question & Answer](#concurrency-question--answer)
- [Postman Collection](#postman-collection)
- [Automated Testing](#automated-testing)
- [HTTP Status Codes](#http-status-codes)
- [AI Usage Disclosure](#ai-usage-disclosure)
- [Assumptions & Trade-offs](#assumptions--trade-offs)

---

## Overview

This project implements a clean and robust backend system that allows users to:
1. Register and authenticate securely with JWT tokens and hashed passwords.
2. Manage products with full CRUD operations, category filters, stock availability filters, text search, and pagination.
3. Place orders with atomic stock decrements, historical price/name snapshots, server-side subtotal & total calculations, and user data isolation.

The codebase adheres to clean architectural principles: **thin controllers**, **dedicated business logic services**, **centralized error handling**, and **declarative request validation**.

---

## Features

- **Authentication & Security**:
  - Secure password hashing with `bcryptjs`.
  - Stateless authentication with JSON Web Tokens (JWT).
  - Security headers with `Helmet` and cross-origin protection with `CORS`.
  - Passwords and internal versions (`__v`) are never leaked in responses.
- **Product Management**:
  - Create, view, update (partial update), and delete products.
  - Case-insensitive search by product name and description.
  - Category filtering and stock availability filtering (`inStock=true` / `inStock=false`).
  - Bounded pagination with metadata (`page`, `limit`, `total`, `totalPages`).
- **Order Management & Concurrency Safety**:
  - Multi-item order placement with atomic inventory deduction.
  - Server-calculated subtotals and total amounts (never trust client values).
  - Historical snapshots of product name and unit price at time of purchase.
  - Strict user isolation (users can only access their own orders).
  - Concurrency-safe atomic conditional updates and MongoDB session transactions.
- **Developer Experience**:
  - Centralized `ApiError` class and uniform JSON response envelopes.
  - Automated integration test suite using `Jest`, `Supertest`, and in-memory MongoDB.
  - Complete, ready-to-import Postman collection with automated test scripts and variable capture.

---

## Tech Stack

- **Runtime**: Node.js (v18+ recommended)
- **Framework**: Express.js
- **Database**: MongoDB (Atlas or Local) via Mongoose ODM
- **Authentication**: JWT (`jsonwebtoken`) & `bcryptjs`
- **Validation**: `express-validator`
- **Security**: `helmet`, `cors`
- **Testing**: `jest`, `supertest`, `mongodb-memory-server`

---

## Project Architecture

```
inventory-order-api/
│
├── src/
│   ├── config/
│   │   └── database.js             # MongoDB connection & graceful teardown
│   │
│   ├── controllers/
│   │   ├── auth.controller.js      # Request/response handling for auth
│   │   ├── product.controller.js   # Request/response handling for products
│   │   └── order.controller.js     # Request/response handling for orders
│   │
│   ├── middleware/
│   │   ├── auth.middleware.js      # JWT verification & req.user attachment
│   │   ├── error.middleware.js     # Centralized error handler & status mapper
│   │   ├── validate.middleware.js  # express-validator result processor
│   │   └── notFound.middleware.js  # Catch-all 404 handler
│   │
│   ├── models/
│   │   ├── User.js                 # User schema, password hashing hook
│   │   ├── Product.js              # Product schema, indexes, validations
│   │   └── Order.js                # Order schema with item snapshots
│   │
│   ├── routes/
│   │   ├── auth.routes.js          # /api/auth routes
│   │   ├── product.routes.js       # /api/products routes
│   │   └── order.routes.js         # /api/orders routes
│   │
│   ├── services/
│   │   ├── auth.service.js         # Registration & login business logic
│   │   ├── product.service.js      # Product CRUD, search & filtering logic
│   │   └── order.service.js        # Order processing & atomic inventory logic
│   │
│   ├── validators/
│   │   ├── auth.validator.js       # Auth input validation rules
│   │   ├── product.validator.js    # Product input validation rules
│   │   └── order.validator.js      # Order input validation rules
│   │
│   ├── utils/
│   │   ├── ApiError.js             # Standardized operational error class
│   │   ├── asyncHandler.js         # Async route wrapper
│   │   └── jwt.js                  # JWT sign and verify helpers
│   │
│   ├── app.js                      # Express application assembly
│   └── server.js                   # Application entrypoint & HTTP listener
│
├── tests/
│   ├── setup.js                    # In-memory Mongo setup for isolated tests
│   ├── auth.test.js                # Auth integration test suite
│   ├── product.test.js             # Product integration test suite
│   └── order.test.js               # Order & concurrency integration test suite
│
├── postman/
│   └── Inventory-Order-API.postman_collection.json # Complete Postman collection
│
├── .env.example                    # Environment template
├── .gitignore                      # Git ignored files
├── package.json                    # Project dependencies & npm scripts
└── README.md                       # Documentation
```

---

## Installation & Setup

1. **Clone or navigate to the project directory**:
   ```bash
   cd inventory-order-api
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

---

## Environment Configuration

Create a `.env` file in the root directory (copy from `.env.example`):

```bash
cp .env.example .env
```

### Environment Variables Explanation:

| Variable | Description | Example / Default |
| :--- | :--- | :--- |
| `PORT` | The port on which the Express server listens | `5000` |
| `NODE_ENV` | Application environment (`development`, `production`, `test`) | `development` |
| `MONGODB_URI` | MongoDB connection URI (Atlas or Local MongoDB) | `mongodb+srv://<user>:<pwd>@cluster0.mongodb.net/inventory_api` |
| `JWT_SECRET` | Secret key used to sign and verify JSON Web Tokens | `your_super_secret_jwt_key` |
| `JWT_EXPIRES_IN`| Expiration window for issued JWT tokens | `7d` |

> **Using MongoDB Atlas**: Simply paste your Atlas connection string into `MONGODB_URI` in `.env`. The database configuration automatically supports Atlas replica sets, automatic reconnects, and transaction sessions.

---

## Running the Server

### Development Mode (with automatic restart via `nodemon`):
```bash
npm run dev
```

### Production Mode:
```bash
npm start
```

Once started, test the health check endpoint:
```
GET http://localhost:5000/api/health
```

---

## API Endpoints

All endpoints are prefixed with `/api`.

| Method | Endpoint | Authentication | Description |
| :--- | :--- | :---: | :--- |
| **POST** | `/api/auth/register` | No | Register a new user and receive JWT token |
| **POST** | `/api/auth/login` | No | Authenticate user and receive JWT token |
| **POST** | `/api/products` | **Yes (Bearer)** | Create a new product |
| **GET** | `/api/products` | No | Get products (with search, category, stock filter, pagination) |
| **GET** | `/api/products/:id` | No | Get product details by ID |
| **PATCH**| `/api/products/:id` | **Yes (Bearer)** | Partially update product fields |
| **DELETE**| `/api/products/:id`| **Yes (Bearer)** | Delete a product |
| **POST** | `/api/orders` | **Yes (Bearer)** | Create a new order (with atomic stock deduction) |
| **GET** | `/api/orders` | **Yes (Bearer)** | Get all orders belonging to authenticated user |
| **GET** | `/api/orders/:id` | **Yes (Bearer)** | Get single order by ID (restricted to owner) |

---

## Authentication

Authentication is handled via JWT tokens. After registering (`/api/auth/register`) or logging in (`/api/auth/login`), the API returns a JWT token.

To access protected endpoints, supply the token in the `Authorization` request header:
```
Authorization: Bearer <your_jwt_token>
```

If the token is missing, expired, or malformed, the API returns a `401 Unauthorized` status.

---

## Product Search, Filtering & Pagination

The `GET /api/products` endpoint supports flexible query parameters:

### 1. Case-Insensitive Search:
Search across product name and description:
```
GET /api/products?search=iphone
```

### 2. Category Filter:
Filter products by exact category:
```
GET /api/products?category=electronics
```

### 3. Stock Availability Filter:
- `inStock=true` returns items with `stockQuantity > 0`
- `inStock=false` returns items with `stockQuantity = 0` (out of stock)
```
GET /api/products?inStock=true
```

### 4. Pagination:
Paginate results with `page` and `limit` (max limit: 100):
```
GET /api/products?page=1&limit=10
```

### Combined Example:
```
GET /api/products?category=electronics&inStock=true&page=1&limit=10
```

### Pagination Response Structure:
```json
{
  "success": true,
  "message": "Products retrieved successfully",
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "totalPages": 3
  }
}
```

---

## Order Business Logic & Concurrency Protection

When an order is created (`POST /api/orders`):

1. **Request Validation**: The request must supply a non-empty `products` array with valid Mongo ObjectIds and positive integer quantities (`quantity >= 1`).
2. **Product Existence**: Every requested product is queried. If any product is missing, the entire order fails immediately with `404 Not Found`.
3. **Historical Snapshots**: The product `name` and `price` at purchase time are permanently embedded inside the order item subdocuments. If the product is later modified or price changes, historical order records remain accurate.
4. **Server-Side Pricing**: Unit prices and `totalAmount` are calculated on the server. Client-provided totals are never trusted.
5. **Atomic Stock Deduction**:
   - The stock reduction uses atomic conditional queries:
     ```javascript
     Product.findOneAndUpdate(
       { _id: productId, stockQuantity: { $gte: requestedQuantity } },
       { $inc: { stockQuantity: -requestedQuantity } },
       { new: true }
     );
     ```
   - In MongoDB Atlas (replica sets), this executes within a multi-document **Mongoose Session Transaction** (`session.startTransaction()`), guaranteeing that either **all items** in the order are deducted and the order is placed, or the entire transaction **aborts cleanly**.
   - In standalone MongoDB environments, an atomic conditional decrement with compensation rollback is employed so no partial stock decrements can remain if an item fails.

---

## Concurrency Question & Answer

### Question:
> *"Imagine two users try to buy the last available item at the same time. How would you make sure the stock does not become negative or both orders get confirmed?"*

### Solution / Explanation:
To prevent race conditions and negative inventory, we never rely on in-memory JavaScript stock checks (e.g. `if (stock >= qty) { stock = stock - qty; save(); }`), because two concurrent requests could both read `stock = 1` before either writes back.

Instead, we use **atomic conditional updates at the database level**:

```javascript
const updatedProduct = await Product.findOneAndUpdate(
  {
    _id: productId,
    stockQuantity: { $gte: requestedQuantity } // Condition ensures stock is sufficient
  },
  {
    $inc: { stockQuantity: -requestedQuantity } // Atomic decrement
  },
  { new: true }
);
```

**Why this works:**
1. MongoDB executes document-level write operations atomically.
2. When two concurrent requests compete for the final unit (`stockQuantity: 1`), MongoDB evaluates the query filter `{ stockQuantity: { $gte: 1 } }` sequentially.
3. The first request matches, decrements `stockQuantity` from `1` to `0`, and receives the updated product document.
4. The second request immediately fails to match the filter because `stockQuantity` is now `0`. `findOneAndUpdate` returns `null`.
5. The application detects `null`, aborts order creation, and responds with `400 Bad Request` (`INSUFFICIENT_STOCK`).
6. For orders with multiple products, this operation runs inside a **MongoDB Transaction** (`session.startTransaction()`), ensuring all item decrements and the order creation commit or rollback together.

---

## Postman Collection

The project includes a ready-to-use Postman collection located at:
[`postman/Inventory-Order-API.postman_collection.json`](postman/Inventory-Order-API.postman_collection.json).

### How to Import & Use:
1. Open Postman.
2. Click **Import** (top left) and select `postman/Inventory-Order-API.postman_collection.json`.
3. The collection is pre-configured with collection variables:
   - `baseUrl` (default: `http://localhost:5000/api`)
   - `token` (auto-populated upon login/registration)
   - `productId` (auto-populated upon creating a product)
   - `orderId` (auto-populated upon creating an order)
4. **Step-by-step test flow**:
   - Run `Authentication -> Register User` or `Login User` (automatically saves `token`).
   - Run `Products -> Create Product` (automatically saves `productId`).
   - Run `Products -> Get All Products`, `Search Products`, `Filter Products By Category`, `Filter Products By Stock`.
   - Run `Products -> Update Product` and `Get Product By ID`.
   - Run `Orders -> Create Order` (automatically uses `productId` and saves `orderId`).
   - Run `Orders -> Get My Orders` and `Get Order By ID`.

---

## Automated Testing

The automated test suite uses **Jest** and **Supertest** along with **`mongodb-memory-server`**. This means tests run completely isolated in memory without requiring a live MongoDB connection or polluting production databases.

### Run All Tests:
```bash
npm test
```

### What is tested:
- **Authentication (`tests/auth.test.js`)**:
  - User registration & JWT generation
  - Duplicate email rejection (`409 Conflict`)
  - Password length and email format validation
  - Login with valid credentials
  - Invalid password rejection (`401`)
  - Non-existent user login rejection (`401`)
- **Products (`tests/product.test.js`)**:
  - Authenticated product creation (`201`)
  - Unauthenticated creation rejection (`401`)
  - Validation rules (negative prices, negative stock, decimal stock)
  - Case-insensitive search, category filtering, stock availability filtering
  - Bounded pagination
  - Get by ID, partial PATCH updates, DELETE operations
  - Non-existent product handling (`404`) and invalid ObjectId handling (`400`)
- **Orders (`tests/order.test.js`)**:
  - Successful order placement & inventory reduction
  - Server-calculated subtotals and total amounts
  - Product name and price historical snapshots
  - Insufficient stock rejection
  - Multi-product failure safety (no partial deduction if one item fails)
  - Non-existent product rejection
  - Strict user isolation (User A cannot access User B's order)

---

## HTTP Status Codes

| Code | Status | Usage in API |
| :--- | :--- | :--- |
| `200` | OK | Successful GET, PATCH, and DELETE operations; successful login |
| `201` | Created | Successful user registration, product creation, and order creation |
| `400` | Bad Request | Validation errors, invalid IDs, insufficient stock, invalid quantities |
| `401` | Unauthorized | Missing, expired, or invalid JWT token; invalid login credentials |
| `404` | Not Found | Product or order not found, or accessing another user's order |
| `409` | Conflict | Registration attempt with an email that is already registered |
| `500` | Internal Server Error | Unhandled exceptions (stack trace hidden in production) |

---

## AI Usage Disclosure

In accordance with assessment guidelines:
> *AI tools (Google Deepmind Antigravity Agent) were used to assist with project scaffolding, code generation, debugging, validation logic, documentation, and test-case generation. The final implementation was reviewed, verified, and tested manually end-to-end.*

---

## Assumptions & Trade-offs

1. **User Roles**: The assessment specifications focus on core authentication, product management, and customer orders. All registered users are authorized to create products and place orders. In an extended system, role-based access control (`admin` vs `customer`) can be layered onto the existing auth middleware.
2. **Order Status Lifecycle**: Orders are created with initial status `'confirmed'` upon successful atomic stock deduction. Cancelled order endpoints or refund flows can be added using the established service pattern.
3. **MongoDB Transactions**: Full ACID transactions are automatically utilized when connected to MongoDB Atlas (replica set). In standalone local development instances without replica sets, atomic conditional updates with compensation rollback ensure safe inventory adjustments.
