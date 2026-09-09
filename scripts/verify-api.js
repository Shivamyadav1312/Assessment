const http = require('http');

const BASE_URL = 'http://localhost:5000/api';

function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE_URL + path);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        let parsed = data;
        try {
          parsed = JSON.parse(data);
        } catch (e) {}
        resolve({ status: res.statusCode, body: parsed });
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runLiveVerification() {
  console.log('==============================================');
  console.log('STARTING COMPLETE LIVE END-TO-END VERIFICATION');
  console.log('==============================================\n');

  try {
    // 1. Health Check
    console.log('1. Testing GET /api/health...');
    const health = await request('GET', '/health');
    console.log(`   Status: ${health.status} - ${health.body.message}`);
    if (health.status !== 200) throw new Error('Health check failed');

    // 2. Auth: Register
    const randomSuffix = Math.floor(Math.random() * 10000);
    const userEmail1 = `alice_${randomSuffix}@example.com`;
    console.log(`\n2. Testing POST /api/auth/register (${userEmail1})...`);
    const regRes = await request('POST', '/auth/register', {
      name: 'Alice Developer',
      email: userEmail1,
      password: 'Password123!',
    });
    console.log(`   Status: ${regRes.status}, Token received: ${Boolean(regRes.body.data?.token)}`);
    if (regRes.status !== 201) throw new Error('Registration failed');
    const token1 = regRes.body.data.token;

    // 3. Auth: Login
    console.log('\n3. Testing POST /api/auth/login...');
    const loginRes = await request('POST', '/auth/login', {
      email: userEmail1,
      password: 'Password123!',
    });
    console.log(`   Status: ${loginRes.status}, Login successful: ${loginRes.body.success}`);
    if (loginRes.status !== 200) throw new Error('Login failed');

    // 4. Product: Create Product
    console.log('\n4. Testing POST /api/products...');
    const createProdRes = await request(
      'POST',
      '/products',
      {
        name: `Sony WH-1000XM5 Headphones ${randomSuffix}`,
        description: 'Industry-leading noise cancelling wireless headphones',
        price: 349.99,
        stockQuantity: 10,
        category: 'audio',
      },
      token1
    );
    console.log(`   Status: ${createProdRes.status}, Product ID: ${createProdRes.body.data?._id}`);
    if (createProdRes.status !== 201) throw new Error('Product creation failed');
    const productId = createProdRes.body.data._id;

    // 5. Product: Get All, Search, Category Filter, Stock Filter
    console.log('\n5. Testing GET /api/products (Filtering & Search)...');
    const allProds = await request('GET', '/products?page=1&limit=5');
    console.log(`   Total products in DB: ${allProds.body.pagination?.total}`);

    const searchProds = await request('GET', '/products?search=headphones');
    console.log(`   Search for "headphones": found ${searchProds.body.data?.length} items`);

    const catProds = await request('GET', '/products?category=audio');
    console.log(`   Category "audio": found ${catProds.body.data?.length} items`);

    const inStockProds = await request('GET', '/products?inStock=true');
    console.log(`   inStock=true: found ${inStockProds.body.data?.length} items`);

    // 6. Product: Get by ID
    console.log(`\n6. Testing GET /api/products/${productId}...`);
    const singleProd = await request('GET', `/products/${productId}`);
    console.log(`   Status: ${singleProd.status}, Name: ${singleProd.body.data?.name}`);

    // 7. Product: Update Product (PATCH)
    console.log(`\n7. Testing PATCH /api/products/${productId}...`);
    const updateProd = await request(
      'PATCH',
      `/products/${productId}`,
      { price: 299.99, stockQuantity: 8 },
      token1
    );
    console.log(`   Status: ${updateProd.status}, Updated price: ${updateProd.body.data?.price}, Stock: ${updateProd.body.data?.stockQuantity}`);

    // 8. Create Second User for isolation test
    const userEmail2 = `bob_${randomSuffix}@example.com`;
    console.log(`\n8. Creating second user for isolation test (${userEmail2})...`);
    const regRes2 = await request('POST', '/auth/register', {
      name: 'Bob Tester',
      email: userEmail2,
      password: 'Password123!',
    });
    const token2 = regRes2.body.data.token;

    // 9. Order: Create Order
    console.log('\n9. Testing POST /api/orders (Placing order for 3 items)...');
    const createOrderRes = await request(
      'POST',
      '/orders',
      {
        products: [{ productId: productId, quantity: 3 }],
      },
      token1
    );
    console.log(`   Status: ${createOrderRes.status}, Order ID: ${createOrderRes.body.data?._id}`);
    console.log(`   Server Calculated Total: $${createOrderRes.body.data?.totalAmount}`);
    console.log(`   Snapshot Item Price: $${createOrderRes.body.data?.products[0]?.price}`);
    if (createOrderRes.status !== 201) throw new Error('Order creation failed');
    const orderId = createOrderRes.body.data._id;

    // 10. Verify Stock Reduction
    console.log('\n10. Verifying product stock decrement in DB...');
    const checkStock = await request('GET', `/products/${productId}`);
    console.log(`    Stock before order: 8, Stock after order (3 ordered): ${checkStock.body.data?.stockQuantity} (Expected: 5)`);
    if (checkStock.body.data?.stockQuantity !== 5) throw new Error('Stock was not decremented accurately');

    // 11. Test Insufficient Stock Rejection
    console.log('\n11. Testing Insufficient Stock Rejection (Ordering 50 units)...');
    const failedOrderRes = await request(
      'POST',
      '/orders',
      {
        products: [{ productId: productId, quantity: 50 }],
      },
      token1
    );
    console.log(`    Status: ${failedOrderRes.status}, Error code: ${failedOrderRes.body.error?.code}`);
    if (failedOrderRes.status !== 400) throw new Error('Excessive order should return 400 Bad Request');

    // 12. Order: Get My Orders
    console.log('\n12. Testing GET /api/orders (User 1 Orders)...');
    const user1Orders = await request('GET', '/orders', null, token1);
    console.log(`    User 1 orders count: ${user1Orders.body.data?.length}`);

    // 13. Order: Get Order by ID
    console.log(`\n13. Testing GET /api/orders/${orderId} (Owner access)...`);
    const ownerOrder = await request('GET', `/orders/${orderId}`, null, token1);
    console.log(`    Status: ${ownerOrder.status}, Owner ID matches: ${ownerOrder.body.data?._id === orderId}`);

    // 14. Order Isolation: User 2 cannot access User 1's order
    console.log(`\n14. Testing User Isolation (User 2 attempting to access User 1's order)...`);
    const unauthorizedOrderAccess = await request('GET', `/orders/${orderId}`, null, token2);
    console.log(`    Status: ${unauthorizedOrderAccess.status}, Error Code: ${unauthorizedOrderAccess.body.error?.code} (Expected: 404 for isolation)`);
    if (unauthorizedOrderAccess.status !== 404) throw new Error('Order isolation failed: User 2 accessed User 1 order');

    // 15. Product: Delete Product
    console.log(`\n15. Testing DELETE /api/products/${productId}...`);
    const deleteRes = await request('DELETE', `/products/${productId}`, null, token1);
    console.log(`    Status: ${deleteRes.status}, Message: ${deleteRes.body.message}`);

    console.log('\n==============================================');
    console.log('ALL LIVE END-TO-END VERIFICATION CHECKS PASSED!');
    console.log('==============================================\n');
  } catch (err) {
    console.error('\nVerification Error:', err.message);
    process.exit(1);
  }
}

runLiveVerification();
