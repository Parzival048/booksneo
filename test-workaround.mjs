/**
 * Quick test with the workaround date (Dec 1, 2025)
 */

import http from 'http';

const TALLY_HOST = 'localhost';
const TALLY_PORT = 9000;

function sendToTally(xml) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: TALLY_HOST,
            port: TALLY_PORT,
            path: '/',
            method: 'POST',
            headers: {
                'Content-Type': 'application/xml',
                'Content-Length': Buffer.byteLength(xml)
            }
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(data));
        });

        req.on('error', reject);
        req.write(xml);
        req.end();
    });
}

async function main() {
    // Using Dec 1, 2025 - verified working date
    const date = '20251201';

    console.log('=== Testing with workaround date: 20251201 ===\n');

    const voucherXML = `<?xml version="1.0" encoding="UTF-8"?>
<ENVELOPE>
<HEADER>
<TALLYREQUEST>Import Data</TALLYREQUEST>
</HEADER>
<BODY>
<IMPORTDATA>
<REQUESTDESC>
<REPORTNAME>Vouchers</REPORTNAME>
<STATICVARIABLES>
<SVCURRENTCOMPANY>Test</SVCURRENTCOMPANY>
</STATICVARIABLES>
</REQUESTDESC>
<REQUESTDATA>
<TALLYMESSAGE xmlns:UDF="TallyUDF">
<VOUCHER VCHTYPE="Payment" ACTION="Create">
<DATE>${date}</DATE>
<PARTYLEDGERNAME>Sundry Creditors</PARTYLEDGERNAME>
<VOUCHERTYPENAME>Payment</VOUCHERTYPENAME>
<NARRATION>AI Tally Sync Test - Actual date: ${new Date().toISOString()}</NARRATION>
<ALLLEDGERENTRIES.LIST>
<LEDGERNAME>Sundry Creditors</LEDGERNAME>
<ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
<AMOUNT>500</AMOUNT>
</ALLLEDGERENTRIES.LIST>
<ALLLEDGERENTRIES.LIST>
<LEDGERNAME>Cash</LEDGERNAME>
<ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
<AMOUNT>-500</AMOUNT>
</ALLLEDGERENTRIES.LIST>
</VOUCHER>
</TALLYMESSAGE>
</REQUESTDATA>
</IMPORTDATA>
</BODY>
</ENVELOPE>`;

    const response = await sendToTally(voucherXML);

    if (response.includes('<CREATED>1</CREATED>')) {
        console.log('✅ SUCCESS! Voucher created with date 20251201');
        console.log('\n🎉 The workaround is working! Now refresh the browser and try Push to Tally.');
    } else if (response.includes('LINEERROR')) {
        const error = response.match(/<LINEERROR>([^<]+)<\/LINEERROR>/i);
        console.log('❌ Failed:', error ? error[1].replace(/&apos;/g, "'") : 'Unknown');
        console.log('\nResponse:', response.substring(0, 400));
    } else {
        console.log('Response:', response);
    }
}

main();
