// Test script for login endpoint
const http = require('http');

// Test data - using the SuperAdmin account that should exist
const loginData = JSON.stringify({
  email: process.env.SUPERADMIN_EMAIL || 'admin@eventsphere.com',
  password: process.env.SUPERADMIN_PASSWORD || 'Admin123!'
});

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(loginData)
  }
};

console.log('Testing POST /api/auth/login...');
console.log('Request:', loginData);

const req = http.request(options, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('\nResponse Status:', res.statusCode);
    console.log('Response Body:', JSON.parse(data));
    process.exit(res.statusCode === 200 ? 0 : 1);
  });
});

req.on('error', (error) => {
  console.error('Error:', error.message);
  process.exit(1);
});

req.write(loginData);
req.end();
