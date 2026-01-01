/**
 * BooksNeo - Tally CORS Proxy Server
 * 
 * This proxy enables the cloud-hosted BooksNeo app to connect
 * to your local Tally Prime installation by handling CORS headers.
 * 
 * USAGE:
 * 1. Make sure Tally Prime is running with ODBC enabled on port 9000
 * 2. Double-click TallyProxy.exe to start
 * 3. Keep this window open while using BooksNeo
 * 4. Press Ctrl+C or close the window to stop
 * 
 * @author BooksNeo Team
 * @version 1.0.0
 */

import http from 'http';
import readline from 'readline';

const TALLY_HOST = 'localhost';
const TALLY_PORT = 9000;
const PROXY_PORT = 9001;

// CORS headers to allow cross-origin requests from BooksNeo
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Access-Control-Max-Age': '86400',
};

// Statistics
let stats = {
    requestsTotal: 0,
    requestsSuccess: 0,
    requestsFailed: 0,
    startTime: new Date()
};

// Clear console and show banner
console.clear();
console.log('\x1b[36m');
console.log('╔═══════════════════════════════════════════════════════════════════╗');
console.log('║                                                                   ║');
console.log('║               🔄 BOOKSNEO TALLY PROXY SERVER                      ║');
console.log('║                                                                   ║');
console.log('╚═══════════════════════════════════════════════════════════════════╝');
console.log('\x1b[0m');

// Create the proxy server
const server = http.createServer((req, res) => {
    const startTime = Date.now();
    stats.requestsTotal++;

    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        res.writeHead(200, corsHeaders);
        res.end();
        console.log('\x1b[90m[' + new Date().toLocaleTimeString() + '] OPTIONS preflight - OK\x1b[0m');
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

        const timestamp = new Date().toLocaleTimeString();
        console.log(`\x1b[33m[${timestamp}] → Sending request to Tally...\x1b[0m`);

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

                // Check success
                const isSuccess = responseData.includes('<ENVELOPE>') && !responseData.includes('ERROR');

                if (isSuccess) {
                    stats.requestsSuccess++;
                    console.log(`\x1b[32m[${timestamp}] ✓ Success (${duration}ms, ${responseData.length} bytes)\x1b[0m`);
                } else {
                    stats.requestsFailed++;
                    console.log(`\x1b[31m[${timestamp}] ✗ Response contains error (${duration}ms)\x1b[0m`);
                }
            });
        });

        // Handle connection errors
        proxyReq.on('error', (error) => {
            const duration = Date.now() - startTime;
            stats.requestsFailed++;

            console.log(`\x1b[31m[${timestamp}] ✗ Connection failed: ${error.message} (${duration}ms)\x1b[0m`);

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
    console.log('\x1b[31m');
    if (error.code === 'EADDRINUSE') {
        console.log('╔═══════════════════════════════════════════════════════════════════╗');
        console.log('║  ❌ ERROR: Port ' + PROXY_PORT + ' is already in use!                         ║');
        console.log('║                                                                   ║');
        console.log('║  Another instance of TallyProxy may already be running.          ║');
        console.log('║  Please close it first, then try again.                          ║');
        console.log('╚═══════════════════════════════════════════════════════════════════╝');
    } else {
        console.log('Server error:', error.message);
    }
    console.log('\x1b[0m');
    waitForKeyPress();
});

// Start the server
server.listen(PROXY_PORT, () => {
    console.log('\x1b[32m  ✓ Proxy server started successfully!\x1b[0m');
    console.log('');
    console.log('\x1b[36m  ┌─────────────────────────────────────────────────────────────────┐');
    console.log('  │                                                                 │');
    console.log('  │   Proxy URL:     \x1b[1mhttp://localhost:' + PROXY_PORT + '\x1b[0m\x1b[36m                       │');
    console.log('  │   Forwarding to: \x1b[1mhttp://' + TALLY_HOST + ':' + TALLY_PORT + '\x1b[0m\x1b[36m (Tally Prime)          │');
    console.log('  │                                                                 │');
    console.log('  └─────────────────────────────────────────────────────────────────┘\x1b[0m');
    console.log('');
    console.log('\x1b[33m  ⚠ REQUIREMENTS:\x1b[0m');
    console.log('     • Tally Prime must be running');
    console.log('     • ODBC Server must be enabled (F12 → Advanced Configuration)');
    console.log('     • Keep this window open while using BooksNeo');
    console.log('');
    console.log('\x1b[90m  Press Ctrl+C to stop the proxy\x1b[0m');
    console.log('');
    console.log('\x1b[36m  ─────────────────────────── Request Log ───────────────────────────\x1b[0m');
    console.log('');
});

// Function to wait for key press before closing
function waitForKeyPress() {
    console.log('');
    console.log('\x1b[33m  Press any key to exit...\x1b[0m');

    // Set up readline to wait for any key press
    if (process.stdin.isTTY) {
        process.stdin.setRawMode(true);
        process.stdin.resume();
        process.stdin.once('data', () => {
            process.exit(0);
        });
    } else {
        // Fallback: wait for Enter key
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        rl.question('', () => {
            rl.close();
            process.exit(0);
        });
    }
}

// Graceful shutdown with summary
function showSummaryAndExit() {
    const uptime = Math.round((new Date() - stats.startTime) / 1000);
    const uptimeStr = uptime >= 60 ? `${Math.floor(uptime / 60)}m ${uptime % 60}s` : `${uptime}s`;

    console.log('');
    console.log('\x1b[36m  ─────────────────────────── Session Summary ───────────────────────\x1b[0m');
    console.log('');
    console.log(`  📊 Total Requests:  ${stats.requestsTotal}`);
    console.log(`  \x1b[32m✓ Successful:       ${stats.requestsSuccess}\x1b[0m`);
    console.log(`  \x1b[31m✗ Failed:           ${stats.requestsFailed}\x1b[0m`);
    console.log(`  ⏱ Uptime:           ${uptimeStr}`);
    console.log('');
    console.log('\x1b[32m  🛑 Proxy stopped. Goodbye!\x1b[0m');
    console.log('');

    waitForKeyPress();
}

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
    server.close(() => {
        showSummaryAndExit();
    });
});

// Handle uncaught exceptions (keep window open)
process.on('uncaughtException', (error) => {
    console.log('\x1b[31m');
    console.log('  ❌ Unexpected Error:', error.message);
    console.log('\x1b[0m');
    waitForKeyPress();
});

// Keep process alive - important for the EXE
process.stdin.resume();
