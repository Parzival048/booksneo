/**
 * BooksNeo - Tally CORS Proxy Server v2.1
 * Auto-kills existing process on port 9001
 */

const http = require('http');
const { exec } = require('child_process');

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

// Colors
const c = {
    reset: '\x1b[0m', cyan: '\x1b[36m', green: '\x1b[32m',
    yellow: '\x1b[33m', red: '\x1b[31m', gray: '\x1b[90m', bold: '\x1b[1m'
};

function log(color, msg) {
    console.log(`${c.gray}[${new Date().toLocaleTimeString()}]${c.reset} ${color}${msg}${c.reset}`);
}

// Kill process on port (Windows)
function killPort(port) {
    return new Promise((resolve) => {
        exec(`netstat -ano | findstr :${port}`, (err, stdout) => {
            if (err || !stdout) { resolve(); return; }

            const lines = stdout.trim().split('\n');
            const pids = new Set();

            lines.forEach(line => {
                const parts = line.trim().split(/\s+/);
                const pid = parts[parts.length - 1];
                if (pid && pid !== '0' && !isNaN(pid)) pids.add(pid);
            });

            if (pids.size === 0) { resolve(); return; }

            console.log(`${c.yellow}  ⚠ Killing existing process on port ${port}...${c.reset}`);

            let killed = 0;
            pids.forEach(pid => {
                exec(`taskkill /F /PID ${pid}`, (err2) => {
                    killed++;
                    if (killed === pids.size) {
                        setTimeout(resolve, 500); // Wait for port release
                    }
                });
            });
        });
    });
}

// Create server
function createServer() {
    const server = http.createServer((req, res) => {
        stats.total++;

        if (req.method === 'OPTIONS') {
            res.writeHead(200, corsHeaders);
            res.end();
            return;
        }

        let body = '';
        req.on('data', chunk => body += chunk);

        req.on('end', () => {
            log(c.yellow, '→ Forwarding to Tally...');

            const proxyReq = http.request({
                hostname: TALLY_HOST,
                port: TALLY_PORT,
                path: '/',
                method: 'POST',
                headers: { 'Content-Type': 'text/xml', 'Content-Length': Buffer.byteLength(body) }
            }, (proxyRes) => {
                let data = '';
                proxyRes.on('data', chunk => data += chunk);
                proxyRes.on('end', () => {
                    res.writeHead(proxyRes.statusCode || 200, { ...corsHeaders, 'Content-Type': 'text/xml' });
                    res.end(data);

                    if (data.includes('<ENVELOPE>') && !data.includes('ERROR')) {
                        stats.success++;
                        log(c.green, `✓ Success (${data.length} bytes)`);
                    } else {
                        stats.failed++;
                        log(c.red, '✗ Tally error');
                    }
                });
            });

            proxyReq.on('error', (err) => {
                stats.failed++;
                log(c.red, `✗ ${err.message}`);
                res.writeHead(502, { ...corsHeaders, 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Cannot connect to Tally', message: err.message }));
            });

            proxyReq.write(body);
            proxyReq.end();
        });
    });

    server.on('error', (err) => {
        console.log(`\n${c.red}❌ ERROR: ${err.message}${c.reset}\n`);
        waitExit();
    });

    server.listen(PROXY_PORT, '0.0.0.0', () => {
        console.log(`${c.green}  ✓ Proxy started on port ${PROXY_PORT}${c.reset}\n`);
        console.log(`${c.cyan}  ┌──────────────────────────────────────────────┐`);
        console.log(`  │  Proxy:  ${c.bold}http://localhost:${PROXY_PORT}${c.cyan}             │`);
        console.log(`  │  Tally:  ${c.bold}http://127.0.0.1:${TALLY_PORT}${c.cyan}             │`);
        console.log(`  └──────────────────────────────────────────────┘${c.reset}\n`);
        console.log(`${c.yellow}  Requirements:${c.reset}`);
        console.log('  • Tally Prime running with ODBC enabled');
        console.log('  • Company open in Tally\n');
        console.log(`${c.gray}  Press Ctrl+C to stop${c.reset}\n`);
        console.log(`${c.cyan}  ─────── Request Log ───────${c.reset}\n`);
    });

    process.on('SIGINT', () => {
        console.log(`\n\n${c.cyan}  ─── Summary ───${c.reset}`);
        console.log(`  Total: ${stats.total} | ${c.green}OK: ${stats.success}${c.reset} | ${c.red}Fail: ${stats.failed}${c.reset}\n`);
        waitExit();
    });
}

function waitExit() {
    console.log(`${c.yellow}  Press Enter to exit...${c.reset}`);
    process.stdin.resume();
    process.stdin.once('data', () => process.exit(0));
}

// Main
console.clear();
console.log(`
${c.cyan}╔══════════════════════════════════════════════════════╗
║     ${c.bold}🔄 BOOKSNEO TALLY PROXY v2.1${c.cyan}                    ║
╚══════════════════════════════════════════════════════╝${c.reset}
`);

console.log(`${c.gray}  Checking port ${PROXY_PORT}...${c.reset}`);

killPort(PROXY_PORT).then(() => {
    console.log(`${c.green}  ✓ Port ${PROXY_PORT} available${c.reset}\n`);
    createServer();
});

process.on('uncaughtException', (err) => {
    console.log(`\n${c.red}  Error: ${err.message}${c.reset}`);
    waitExit();
});
