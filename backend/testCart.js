const http = require('http');

async function testCartFlow() {
  // 1. Register a new test user
  const email = `testuser_${Date.now()}@test.com`;
  const registerRes = await new Promise((resolve) => {
    const req = http.request({ hostname: 'localhost', port: 5000, path: '/api/auth/register', method: 'POST', headers: { 'Content-Type': 'application/json' } }, res => {
      let data = ''; res.on('data', d => data += d); res.on('end', () => resolve(JSON.parse(data)));
    });
    req.write(JSON.stringify({ name: 'Test User', email, password: 'password123' }));
    req.end();
  });

  if (!registerRes.token) {
    console.log('Register failed', registerRes);
    return;
  }
  const token = registerRes.token;
  console.log('Registered successfully');

  // 2. Fetch products
  const productsRes = await new Promise((resolve) => {
    const req = http.request({ hostname: 'localhost', port: 5000, path: '/api/products', method: 'GET' }, res => {
      let data = ''; res.on('data', d => data += d); res.on('end', () => resolve(JSON.parse(data)));
    });
    req.end();
  });
  const product = productsRes.products[0];

  // 3. Add to cart
  const addRes = await new Promise((resolve) => {
    const req = http.request({ hostname: 'localhost', port: 5000, path: '/api/cart', method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` } }, res => {
      let data = ''; res.on('data', d => data += d); res.on('end', () => resolve(JSON.parse(data)));
    });
    req.write(JSON.stringify({ productId: product.id, size: 'M', colour: 'Black', qty: 1 }));
    req.end();
  });
  console.log('Add to cart result:', addRes);

  const cartItemId = addRes.items[0].cartItemId;
  console.log('Added item with cartItemId:', cartItemId);

  // 4. Delete from cart
  const delRes = await new Promise((resolve) => {
    const req = http.request({ hostname: 'localhost', port: 5000, path: `/api/cart/${cartItemId}`, method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } }, res => {
      let data = ''; res.on('data', d => data += d); res.on('end', () => resolve(JSON.parse(data)));
    });
    req.end();
  });
  console.log('Delete result:', delRes);
}

testCartFlow().catch(console.error);
