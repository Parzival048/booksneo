/**
 * Test to find valid date range for Tally company
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

async function testDate(date) {
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
<NARRATION>Test payment with date ${date}</NARRATION>
<ALLLEDGERENTRIES.LIST>
<LEDGERNAME>Sundry Creditors</LEDGERNAME>
<ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
<AMOUNT>100</AMOUNT>
</ALLLEDGERENTRIES.LIST>
<ALLLEDGERENTRIES.LIST>
<LEDGERNAME>Cash</LEDGERNAME>
<ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
<AMOUNT>-100</AMOUNT>
</ALLLEDGERENTRIES.LIST>
</VOUCHER>
</TALLYMESSAGE>
</REQUESTDATA>
</IMPORTDATA>
</BODY>
</ENVELOPE>`;

    const response = await sendToTally(voucherXML);
    const created = response.match(/<CREATED>(\d+)<\/CREATED>/);
    const error = response.match(/<LINEERROR>([^<]+)<\/LINEERROR>/i);

    if (created && created[1] === '1') {
        return { success: true, message: 'Created' };
    } else if (error) {
        return { success: false, message: error[1].replace(/&apos;/g, "'") };
    }
    return { success: false, message: 'Unknown' };
}

async function main() {
    console.log('=== Testing different dates to find valid range ===\n');

    // Test dates from most recent to older
    const dates = [
        '20251226', // Today
        '20251225', // Yesterday
        '20251224',
        '20251215',
        '20251201',
        '20251115',
        '20251101',
        '20251020',
        '20251001',
        '20250901',
        '20250801',
        '20250701',
        '20250601',
        '20250501',
        '20250401', // Indian FY start
        '20250301',
    ];

    for (const date of dates) {
        try {
            const result = await testDate(date);
            const icon = result.success ? '✅' : '❌';
            console.log(`${icon} ${date}: ${result.message}`);

            if (result.success) {
                console.log('\n🎉 Found a working date:', date);
                break;
            }
        } catch (error) {
            console.log(`❌ ${date}: ${error.message}`);
        }
    }
}

main();
