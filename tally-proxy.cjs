/**
 * BooksNeo - Tally CORS Proxy Server
 * Version 2.0 - Fixed for Windows EXE
 * 
 * CommonJS format for better pkg compatibility
 */

const http = require('http');

const TALLY_HOST = '127.0.0.1';
const TALLY_PORT = 9000;
const PROXY_PORT = 9001;

// CORS headers
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Access-Control-Max-Age': '86400',
};

// Stats
let stats = { total: 0, success: 0, failed: 0 };

// Colors for console
const colors = {
    reset: '\x1b[0m',
    cyan: '\x1b[36m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    gray: '\x1b[90m',
    bold: '\x1b[1m'
};

function log(color, message) {
    const time = new Date().toLocaleTimeString();
    console.log(`${colors.gray}[${time}]${colors.reset} ${color}${message}${colors.reset}`);
}

// Clear screen and show banner
console.clear();
console.log(`
${colors.cyan}╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║          ${colors.bold}🔄 BOOKSNEO TALLY PROXY SERVER v2.0${colors.cyan}              ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝${colors.reset}
`);

// Create server
const server = http.createServer((req, res) => {
    stats.total++;

    // Handle preflight
    if (req.method === 'OPTIONS') {
        res.writeHead(200, corsHeaders);
        res.end();
        log(colors.gray, 'OPTIONS preflight - OK');
        return;
    }

    let body = '';
    req.on('data', chunk => body += chunk);

    req.on('end', () => {
        log(colors.yellow, '→ Forwarding request to Tally...');

        const options = {
            hostname: TALLY_HOST,
            port: TALLY_PORT,
            path: '/',
            method: 'POST',
            headers: {
                'Content-Type': 'text/xml',
                'Content-Length': Buffer.byteLength(body)
            }
        };

        const proxyReq = http.request(options, (proxyRes) => {
            let data = '';
            proxyRes.on('data', chunk => data += chunk);
            proxyRes.on('end', () => {
                res.writeHead(proxyRes.statusCode || 200, {
                    ...corsHeaders,
                    'Content-Type': 'text/xml'
                });
                res.end(data);

                if (data.includes('<ENVELOPE>') && !data.includes('ERROR')) {
                    stats.success++;
                    log(colors.green, `✓ Success (${data.length} bytes)`);
                } else {
                    stats.failed++;
                    log(colors.red, '✗ Tally returned error');
                }
            });
        });

        proxyReq.on('error', (err) => {
            stats.failed++;
            log(colors.red, `✗ Connection failed: ${err.message}`);

            res.writeHead(502, { ...corsHeaders, 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                error: 'Cannot connect to Tally',
                message: err.message,
                solution: 'Make sure Tally Prime is running with ODBC enabled on port 9000'
            }));
        });

        proxyReq.write(body);
        proxyReq.end();
    });
});

// Handle server errors
server.on('error', (err) => {
    console.log(`\n${colors.red}❌ ERROR: ${err.message}${colors.reset}`);
    if (err.code === 'EADDRINUSE') {
        console.log(`\n   Port ${PROXY_PORT} is already in use.`);
        console.log('   Close any other TallyProxy instance first.\n');
    }
    waitAndExit();
});

// Start server
server.listen(PROXY_PORT, '0.0.0.0', () => {
    console.log(`${colors.green}  ✓ Proxy started successfully!${colors.reset}\n`);
    console.log(`${colors.cyan}  ┌────────────────────────────────────────────────────────────┐`);
    console.log(`  │                                                            │`);
    console.log(`  │   ${colors.bold}Proxy URL:${colors.cyan}      http://localhost:${PROXY_PORT}                   │`);
    console.log(`  │   ${colors.bold}Tally URL:${colors.cyan}      http://127.0.0.1:${TALLY_PORT}                   │`);
    console.log(`  │                                                            │`);
    console.log(`  └────────────────────────────────────────────────────────────┘${colors.reset}\n`);

    console.log(`${colors.yellow}  ⚠ CHECKLIST:${colors.reset}`);
    console.log('     ✓ Tally Prime must be running');
    console.log('     ✓ Open a company in Tally');
    console.log('     ✓ Enable ODBC: F12 → Advanced → Enable ODBC Server = Yes');
    console.log('     ✓ Keep this window open\n');

    console.log(`${colors.gray}  Press Ctrl+C to stop${colors.reset}\n`);
    console.log(`${colors.cyan}  ─────────────────── Request Log ───────────────────${colors.reset}\n`);
});

// Wait for key before exiting
function waitAndExit() {
    console.log(`\n${colors.yellow}  Press Enter to exit...${colors.reset}`);
    process.stdin.resume();
    process.stdin.once('data', () => process.exit(0));

    // Fallback timeout
    setTimeout(() => {
        console.log('\n  Auto-closing in 30 seconds...');
    }, 30000);
}

// Graceful shutdown
process.on('SIGINT', () => {
    console.log(`\n\n${colors.cyan}  ─────────────────── Session Summary ───────────────────${colors.reset}\n`);
    console.log(`  📊 Total Requests: ${stats.total}`);
    console.log(`  ${colors.green}✓ Successful: ${stats.success}${colors.reset}`);
    console.log(`  ${colors.red}✗ Failed: ${stats.failed}${colors.reset}\n`);
    console.log(`${colors.green}  🛑 Proxy stopped. Goodbye!${colors.reset}\n`);
    waitAndExit();
});

// Handle errors gracefully
process.on('uncaughtException', (err) => {
    console.log(`\n${colors.red}  ❌ Error: ${err.message}${colors.reset}`);
    waitAndExit();
});

// Keep alive
console.log(`${colors.gray}  [Waiting for connections...]${colors.reset}\n`);
