/**
 * Direct test script for Tally XML voucher import
 * Run with: node test-tally-xml.js
 */

const http = require('http');

const TALLY_HOST = 'localhost';
const TALLY_PORT = 9000;

// Test voucher data with today's date
const today = new Date();
const year = today.getFullYear();
const month = String(today.getMonth() + 1).padStart(2, '0');
const day = String(today.getDate()).padStart(2, '0');
const date = `${year}${month}${day}`;

console.log('Testing Tally XML with date:', date);

// First, get the company name from Tally
const getCompanyXML = `<?xml version="1.0" encoding="UTF-8"?>
<ENVELOPE>
<HEADER>
<VERSION>1</VERSION>
<TALLYREQUEST>Export</TALLYREQUEST>
<TYPE>Data</TYPE>
<ID>List of Companies</ID>
</HEADER>
<BODY>
<DESC>
<STATICVARIABLES>
<SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
</STATICVARIABLES>
</DESC>
</BODY>
</ENVELOPE>`;

// Payment voucher XML (official Tally format from https://help.tallysolutions.com/sample-xml/)
const voucherXML = `<?xml version="1.0" encoding="UTF-8"?>
<ENVELOPE>
<HEADER>
<VERSION>1</VERSION>
<TALLYREQUEST>Import</TALLYREQUEST>
<TYPE>Data</TYPE>
<ID>Vouchers</ID>
</HEADER>
<BODY>
<DESC>
<STATICVARIABLES>
<SVCURRENTCOMPANY>##COMPANY##</SVCURRENTCOMPANY>
</STATICVARIABLES>
</DESC>
<DATA>
<TALLYMESSAGE>
<VOUCHER>
<DATE>${date}</DATE>
<VOUCHERTYPENAME>Payment</VOUCHERTYPENAME>
<PERSISTEDVIEW>Accounting Voucher View</PERSISTEDVIEW>
<NARRATION>Test payment from AI Tally Sync</NARRATION>
<LEDGERENTRIES.LIST>
<LEDGERNAME>Sundry Creditors</LEDGERNAME>
<ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
<ISPARTYLEDGER>Yes</ISPARTYLEDGER>
<ISLASTDEEMEDPOSITIVE>No</ISLASTDEEMEDPOSITIVE>
<AMOUNT>100</AMOUNT>
</LEDGERENTRIES.LIST>
<LEDGERENTRIES.LIST>
<LEDGERNAME>Cash</LEDGERNAME>
<ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
<AMOUNT>-100</AMOUNT>
</LEDGERENTRIES.LIST>
</VOUCHER>
</TALLYMESSAGE>
</DATA>
</BODY>
</ENVELOPE>`;

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
    try {
        // Step 1: Get company name from Tally
        console.log('\n=== Step 1: Getting company from Tally ===');
        const companyResponse = await sendToTally(getCompanyXML);

        // Parse company name from response
        const companyMatch = companyResponse.match(/<SVCURRENTCOMPANY[^>]*>([^<]+)<\/SVCURRENTCOMPANY>/i) ||
            companyResponse.match(/<COMPANYNAME>([^<]+)<\/COMPANYNAME>/i) ||
            companyResponse.match(/<NAME>([^<]+)<\/NAME>/i);

        let companyName = companyMatch ? companyMatch[1] : null;

        if (!companyName) {
            console.log('Company response:', companyResponse.substring(0, 500));
            console.log('\nCould not find company name. Please enter manually:');
            // Just try with a blank company name to see the error
            companyName = 'Test Company';
        }

        console.log('Found company:', companyName);

        // Step 2: Send test voucher
        console.log('\n=== Step 2: Sending test voucher ===');
        const finalXML = voucherXML.replace('##COMPANY##', companyName);
        console.log('Sending XML:\n', finalXML);

        const voucherResponse = await sendToTally(finalXML);
        console.log('\n=== Tally Response ===');
        console.log(voucherResponse);

        // Check for success indicators
        if (voucherResponse.includes('<CREATED>') || voucherResponse.includes('Created')) {
            console.log('\n✅ SUCCESS: Voucher was created!');
        } else if (voucherResponse.includes('<LINEERROR>')) {
            const errorMatch = voucherResponse.match(/<LINEERROR>([^<]+)<\/LINEERROR>/i);
            console.log('\n❌ ERROR:', errorMatch ? errorMatch[1] : 'Unknown error');
        } else if (voucherResponse.includes('ERRORS')) {
            console.log('\n❌ ERRORS found in response');
        } else {
            console.log('\n⚠️ Unknown response - check above for details');
        }

    } catch (error) {
        console.error('Error:', error.message);
        if (error.code === 'ECONNREFUSED') {
            console.log('\n⚠️ Make sure Tally Prime is running and listening on port 9000');
        }
    }
}

main();
