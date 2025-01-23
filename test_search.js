const http = require('http');

const data = JSON.stringify({
  searchTerm: 'XXtra'
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/search',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, (res) => {
  let responseBody = '';

  res.on('data', (chunk) => {
    responseBody += chunk;
  });

  res.on('end', () => {
    console.log('Status Code:', res.statusCode);
    console.log('Headers:', JSON.stringify(res.headers));
    console.log('Response Body:', responseBody);
  });
});

req.on('error', (error) => {
  console.error('Error:', error);
});

req.write(data);
req.end();