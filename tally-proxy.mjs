/**
 * Tally CORS Proxy Server
 * 
 * This proxy server allows the Netlify-hosted BooksNeo app to connect
 * to your local Tally Prime instance by handling CORS headers.
 * 
 * How it works:
 * 1. Your Netlify app connects to this proxy (localhost:9001)
 * 2. The proxy forwards requests to Tally Prime (localhost:9000)
 * 3. The proxy adds CORS headers so browsers allow the connection
 * 
 * USAGE:
 * 1. Make sure Tally Prime is running with ODBC enabled on port 9000
 * 2. Run this script: node tally-proxy.mjs
 * 3. The proxy will start on port 9001
 * 4. Update your app to connect to localhost:9001
 * 
 * @author BooksNeo Team
 */

import http from 'http';

const TALLY_HOST = 'localhost';
const TALLY_PORT = 9000;
const PROXY_PORT = 9001;

// CORS headers to allow cross-origin requests
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Access-Control-Max-Age': '86400',
};

// Create the proxy server
const server = http.createServer((req, res) => {
    const startTime = Date.now();

    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        res.writeHead(200, corsHeaders);
        res.end();
        console.log(`[${new Date().toISOString()}] OPTIONS preflight - OK`);
        return;
    }

    // Collect request body
    let body = '';
    req.on('data', chunk => {
        body += chunk.toString();
    });

    req.on('end', () => {
        // Create request options for Tally
        const options = {
            hostname: TALLY_HOST,
            port: TALLY_PORT,
            path: req.url,
            method: req.method,
            headers: {
                'Content-Type': 'text/xml',
                'Content-Length': Buffer.byteLength(body),
            },
        };

        console.log(`[${new Date().toISOString()}] ${req.method} -> Tally:${TALLY_PORT}${req.url}`);

        // Forward request to Tally
        const proxyReq = http.request(options, (proxyRes) => {
            let responseData = '';

            proxyRes.on('data', chunk => {
                responseData += chunk.toString();
            });

            proxyRes.on('end', () => {
                const duration = Date.now() - startTime;

                // Send response with CORS headers
                res.writeHead(proxyRes.statusCode, {
                    ...corsHeaders,
                    'Content-Type': 'text/xml',
                });
                res.end(responseData);

                // Log success
                const isSuccess = responseData.includes('<ENVELOPE>') && !responseData.includes('ERROR');
                const status = isSuccess ? '✓' : '✗';
                console.log(`  ${status} Response: ${proxyRes.statusCode} (${duration}ms, ${responseData.length} bytes)`);
            });
        });

        // Handle connection errors
        proxyReq.on('error', (error) => {
            const duration = Date.now() - startTime;
            console.error(`  ✗ Error: ${error.message} (${duration}ms)`);

            // Send error response with CORS headers
            res.writeHead(502, {
                ...corsHeaders,
                'Content-Type': 'application/json',
            });
            res.end(JSON.stringify({
                error: 'Tally connection failed',
                message: error.message,
                hint: 'Make sure Tally Prime is running with ODBC enabled on port 9000'
            }));
        });

        // Send the request body to Tally
        proxyReq.write(body);
        proxyReq.end();
    });
});

// Handle server errors
server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
        console.error(`\n❌ Port ${PROXY_PORT} is already in use.`);
        console.error(`   Please close any other application using this port.\n`);
    } else {
        console.error('Server error:', error);
    }
    process.exit(1);
});

// Start the server
server.listen(PROXY_PORT, () => {
    console.log(`
╔═══════════════════════════════════════════════════════════════════╗
║                    🔄 TALLY CORS PROXY SERVER                      ║
╠═══════════════════════════════════════════════════════════════════╣
║                                                                   ║
║  Proxy running on:    http://localhost:${PROXY_PORT}                     ║
║  Forwarding to:       http://${TALLY_HOST}:${TALLY_PORT}                     ║
║                                                                   ║
║  ✅ Ready to accept requests from BooksNeo (Netlify)              ║
║                                                                   ║
╠═══════════════════════════════════════════════════════════════════╣
║  REQUIREMENTS:                                                    ║
║  • Tally Prime must be running with ODBC enabled on port 9000     ║
║  • Keep this terminal open while using BooksNeo                   ║
║                                                                   ║
║  Press Ctrl+C to stop the proxy                                   ║
╚═══════════════════════════════════════════════════════════════════╝
`);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n\n🛑 Shutting down proxy server...');
    server.close(() => {
        console.log('   Proxy stopped. Goodbye!\n');
        process.exit(0);
    });
});
