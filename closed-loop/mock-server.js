// Simple local mock server for testing OTP functionality
// Run with: node mock-server.js

const http = require('http');
const url = require('url');

// In-memory storage for testing (like KV store)
const storage = new Map();
const rateLimits = new Map();

const server = http.createServer((req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const parsedUrl = url.parse(req.url, true);
  const path = parsedUrl.pathname;

  // Basic rate limiting (simplified)
  const clientIP = req.connection.remoteAddress;
  const now = Date.now();
  const rateLimitKey = `${clientIP}:${Math.floor(now / 60000)}`; // per minute
  
  const currentCount = rateLimits.get(rateLimitKey) || 0;
  if (currentCount > 10) {
    res.writeHead(429, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Rate limit exceeded' }));
    return;
  }
  rateLimits.set(rateLimitKey, currentCount + 1);

  if (path.startsWith('/temp/')) {
    const passcode = path.substring(6); // Remove '/temp/'
    
    if (req.method === 'POST') {
      // Store data
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        try {
          const data = JSON.parse(body);
          
          if (storage.has(passcode)) {
            res.writeHead(409, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Passcode already in use' }));
            return;
          }

          // Store with expiration
          storage.set(passcode, {
            ...data,
            timestamp: now,
            expiresAt: now + (15 * 60 * 1000) // 15 minutes
          });

          console.log(`📦 Stored data for passcode: ${passcode}`);
          
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            success: true, 
            expiresIn: 15 * 60 
          }));
        } catch (error) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid JSON' }));
        }
      });
      
    } else if (req.method === 'GET') {
      // Retrieve data
      const data = storage.get(passcode);
      
      if (!data) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Passcode not found or expired' }));
        return;
      }
      
      // Check expiration
      if (now > data.expiresAt) {
        storage.delete(passcode);
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Passcode expired' }));
        return;
      }
      
      // Return data and delete (one-time use)
      storage.delete(passcode);
      console.log(`📤 Retrieved and deleted data for passcode: ${passcode}`);
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        encryptedData: data.encryptedData,
        type: data.type,
        timestamp: data.timestamp
      }));
    }
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  }
});

// Clean up expired entries every minute
setInterval(() => {
  const now = Date.now();
  for (const [key, data] of storage.entries()) {
    if (now > data.expiresAt) {
      storage.delete(key);
      console.log(`🗑️ Cleaned up expired passcode: ${key}`);
    }
  }
  
  // Clean up old rate limit entries
  for (const [key] of rateLimits.entries()) {
    const [, timeWindow] = key.split(':');
    if (now - parseInt(timeWindow) * 60000 > 120000) { // 2 minutes old
      rateLimits.delete(key);
    }
  }
}, 60000);

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`🚀 Mock OTP server running on http://localhost:${PORT}`);
  console.log(`📋 Update script.js to use: http://localhost:${PORT}`);
});