const http = require('http');

async function testLocation() {
  // Register
  const email = `loctest_${Date.now()}@test.com`;
  const regRes = await new Promise((resolve) => {
    const req = http.request({ hostname: 'localhost', port: 5000, path: '/api/auth/register', method: 'POST', headers: { 'Content-Type': 'application/json' } }, res => {
      let d = ''; res.on('data', c => d += c); res.on('end', () => resolve(JSON.parse(d)));
    });
    req.write(JSON.stringify({ name: 'Loc Test', email, password: 'test123' }));
    req.end();
  });
  const token = regRes.token;
  console.log('Registered, token:', token ? 'OK' : 'FAIL');

  // Save address + lat/lon
  const updateRes = await new Promise((resolve) => {
    const req = http.request({ hostname: 'localhost', port: 5000, path: '/api/auth/me', method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` } }, res => {
      let d = ''; res.on('data', c => d += c); res.on('end', () => resolve(JSON.parse(d)));
    });
    req.write(JSON.stringify({ address: '123 Main St, Chennai, Tamil Nadu', latitude: '13.0827', longitude: '80.2707' }));
    req.end();
  });
  console.log('Update location result:', updateRes.success ? 'SUCCESS' : 'FAIL', updateRes.user?.address);

  // Fetch profile
  const profileRes = await new Promise((resolve) => {
    const req = http.request({ hostname: 'localhost', port: 5000, path: '/api/auth/me', method: 'GET', headers: { 'Authorization': `Bearer ${token}` } }, res => {
      let d = ''; res.on('data', c => d += c); res.on('end', () => resolve(JSON.parse(d)));
    });
    req.end();
  });
  console.log('Persisted address:', profileRes.user?.address);
  console.log('Lat:', profileRes.user?.latitude, '| Lon:', profileRes.user?.longitude);
}

testLocation().catch(console.error);
