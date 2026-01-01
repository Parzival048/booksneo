/**
 * Test with Dec 1 date which works
 */
import http from 'http';

function sendToTally(xml) {
    return new Promise((resolve, reject) => {
        const req = http.request({
            hostname: 'localhost', port: 9000, path: '/', method: 'POST',
            headers: { 'Content-Type': 'text/xml', 'Content-Length': Buffer.byteLength(xml) }
        }, res => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => resolve(data));
        });
        req.on('error', reject);
        req.write(xml);
        req.end();
    });
}

async function main() {
    console.log('Testing with Dec 1, 2025 (known working date)...\n');

    const voucherXml = `<?xml version="1.0" encoding="UTF-8"?>
<ENVELOPE>
<HEADER><TALLYREQUEST>Import Data</TALLYREQUEST></HEADER>
<BODY>
<IMPORTDATA>
<REQUESTDESC>
<REPORTNAME>Vouchers</REPORTNAME>
<STATICVARIABLES><SVCURRENTCOMPANY>AI Sync Company</SVCURRENTCOMPANY></STATICVARIABLES>
</REQUESTDESC>
<REQUESTDATA>
<TALLYMESSAGE xmlns:UDF="TallyUDF">
<VOUCHER VCHTYPE="Payment" ACTION="Create">
<DATE>20251201</DATE>
<PARTYLEDGERNAME>Sundry Creditors</PARTYLEDGERNAME>
<VOUCHERTYPENAME>Payment</VOUCHERTYPENAME>
<NARRATION>SUCCESS TEST - Actual date Dec 26, 2025</NARRATION>
<ALLLEDGERENTRIES.LIST>
<LEDGERNAME>Sundry Creditors</LEDGERNAME>
<ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
<AMOUNT>500</AMOUNT>
</ALLLEDGERENTRIES.LIST>
<ALLLEDGERENTRIES.LIST>
<LEDGERNAME>Bank Account</LEDGERNAME>
<ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
<AMOUNT>-500</AMOUNT>
</ALLLEDGERENTRIES.LIST>
</VOUCHER>
</TALLYMESSAGE>
</REQUESTDATA>
</IMPORTDATA>
</BODY>
</ENVELOPE>`;

    const resp = await sendToTally(voucherXml);

    if (resp.includes('<CREATED>1</CREATED>')) {
        console.log('✅ SUCCESS! Voucher created with Dec 1, 2025!');
        console.log('\n📌 The workaround (using Dec 1st) will work for the app.');
        console.log('   Actual transaction dates are stored in the narration.');
    } else {
        const error = resp.match(/<LINEERROR>([^<]+)<\/LINEERROR>/i);
        console.log('❌ Error:', error ? error[1].replace(/&apos;/g, "'") : resp.substring(0, 300));
    }
}

main();
