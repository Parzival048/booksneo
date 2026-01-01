/**
 * Test with SVFROMDATE and SVTODATE explicitly set in XML
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
    const today = new Date();
    const date = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;

    console.log('=== Testing with explicit SVFROMDATE/SVTODATE ===');
    console.log(`Current date: ${date}\n`);

    // Add SVFROMDATE and SVTODATE to include today's date in the period
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
<SVFROMDATE>20250401</SVFROMDATE>
<SVTODATE>20260331</SVTODATE>
</STATICVARIABLES>
</REQUESTDESC>
<REQUESTDATA>
<TALLYMESSAGE xmlns:UDF="TallyUDF">
<VOUCHER VCHTYPE="Payment" ACTION="Create">
<DATE>${date}</DATE>
<PARTYLEDGERNAME>Sundry Creditors</PARTYLEDGERNAME>
<VOUCHERTYPENAME>Payment</VOUCHERTYPENAME>
<NARRATION>Test with explicit period - ${new Date().toISOString()}</NARRATION>
<ALLLEDGERENTRIES.LIST>
<LEDGERNAME>Sundry Creditors</LEDGERNAME>
<ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
<AMOUNT>200</AMOUNT>
</ALLLEDGERENTRIES.LIST>
<ALLLEDGERENTRIES.LIST>
<LEDGERNAME>Cash</LEDGERNAME>
<ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
<AMOUNT>-200</AMOUNT>
</ALLLEDGERENTRIES.LIST>
</VOUCHER>
</TALLYMESSAGE>
</REQUESTDATA>
</IMPORTDATA>
</BODY>
</ENVELOPE>`;

    console.log('XML with SVFROMDATE/SVTODATE:');
    console.log(voucherXML);

    const response = await sendToTally(voucherXML);
    console.log('\n=== Response ===');
    console.log(response);

    if (response.includes('<CREATED>1</CREATED>')) {
        console.log('\n✅ SUCCESS! Voucher created with explicit period dates!');
        console.log('\n📌 FIX: Need to add SVFROMDATE/SVTODATE to the tallyService.js');
    } else if (response.includes('LINEERROR')) {
        const error = response.match(/<LINEERROR>([^<]+)<\/LINEERROR>/i);
        console.log('\n❌ Still failed:', error ? error[1].replace(/&apos;/g, "'") : 'Unknown');

        console.log('\n📌 NEXT STEP: Need to manually set period in Tally:');
        console.log('   In Tally Prime, press F2 and set:');
        console.log('   From: 1-Apr-2025');
        console.log('   To: 31-Mar-2026');
    }
}

main();
