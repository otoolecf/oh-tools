#!/usr/bin/env node

// Development server with proper headers for SharedArrayBuffer support
// Required for wasm-vips to work properly

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 8000;

// MIME type mapping
const mimeTypes = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.wasm': 'application/wasm',
    '.webp': 'image/webp'
};

function getMimeType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    return mimeTypes[ext] || 'application/octet-stream';
}

const server = http.createServer((req, res) => {
    // Basic CORS headers for all requests
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    const parsedUrl = url.parse(req.url);
    const pathname = parsedUrl.pathname;
    
    // Apply strict CORS headers for image-editor routes and node_modules
    if (pathname.startsWith('/image-editor') || pathname.startsWith('/node_modules')) {
        // CRITICAL: Headers required for SharedArrayBuffer/wasm-vips
        res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
        res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    }

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    let requestPath = pathname;

    // Handle directory requests - default to index.html
    if (requestPath === '/' || requestPath.endsWith('/')) {
        if (requestPath === '/') {
            requestPath = '/index.html';
        } else {
            // For subdirectories like /image-editor/, append index.html
            requestPath = requestPath + 'index.html';
        }
    }

    // Resolve file path
    const filePath = path.join(__dirname, requestPath);

    // Security check - prevent directory traversal
    if (!filePath.startsWith(__dirname)) {
        res.writeHead(403, { 'Content-Type': 'text/plain' });
        res.end('Forbidden');
        return;
    }

    // Check if file exists
    fs.access(filePath, fs.constants.F_OK, (err) => {
        if (err) {
            res.writeHead(404, { 'Content-Type': 'text/html' });
            res.end(`
                <!DOCTYPE html>
                <html>
                <head><title>404 Not Found</title></head>
                <body>
                    <h1>404 - File Not Found</h1>
                    <p>The requested file <code>${requestPath}</code> was not found.</p>
                    <p><a href="/">← Back to home</a></p>
                </body>
                </html>
            `);
            return;
        }

        // Read and serve file
        fs.readFile(filePath, (err, data) => {
            if (err) {
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('Internal Server Error');
                return;
            }

            const mimeType = getMimeType(filePath);
            res.setHeader('Content-Type', mimeType);
            
            // Disable caching completely for development
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');

            res.writeHead(200);
            res.end(data);
        });
    });
});

server.listen(PORT, () => {
    console.log('🚀 OToolebox Development Server');
    console.log(`📍 Server running at: http://localhost:${PORT}`);
    console.log('');
    console.log('✅ SharedArrayBuffer support enabled with headers:');
    console.log('   Cross-Origin-Embedder-Policy: require-corp');
    console.log('   Cross-Origin-Opener-Policy: same-origin');
    console.log('');
    console.log('🖼️  Image Editor with wasm-vips: http://localhost:' + PORT + '/image-editor/');
    console.log('');
    console.log('💡 For production deployment, ensure these headers are set on your web server.');
    console.log('   Nginx: add_header Cross-Origin-Embedder-Policy require-corp;');
    console.log('   Apache: Header always set Cross-Origin-Embedder-Policy require-corp');
    console.log('');
});

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n👋 Shutting down development server...');
    server.close(() => {
        console.log('Server closed.');
        process.exit(0);
    });
});

process.on('SIGTERM', () => {
    console.log('\n👋 Shutting down development server...');
    server.close(() => {
        console.log('Server closed.');
        process.exit(0);
    });
});