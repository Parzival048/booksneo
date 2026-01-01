/**
 * Alter the books period for the existing "Test" company to include current date
 * OR list companies and find one that works
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

// Get all companies
const getCompaniesXML = `<?xml version="1.0" encoding="UTF-8"?>
<ENVELOPE>
<HEADER>
<VERSION>1</VERSION>
<TALLYREQUEST>Export</TALLYREQUEST>
<TYPE>Collection</TYPE>
<ID>CompanyList</ID>
</HEADER>
<BODY>
<DESC>
<TDL>
<TDLMESSAGE>
<COLLECTION NAME="CompanyList" ISMODIFY="No">
<TYPE>Company</TYPE>
<FETCH>NAME, STARTINGFROM, BOOKSFROM</FETCH>
</COLLECTION>
</TDLMESSAGE>
</TDL>
</DESC>
</BODY>
</ENVELOPE>`;

// Get current company info with period
const getCurrentCompanyXML = `<?xml version="1.0" encoding="UTF-8"?>
<ENVELOPE>
<HEADER>
<VERSION>1</VERSION>
<TALLYREQUEST>Export</TALLYREQUEST>
<TYPE>Data</TYPE>
<ID>Company</ID>
</HEADER>
<BODY>
<DESC>
<STATICVARIABLES>
<SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
</STATICVARIABLES>
</DESC>
</BODY>
</ENVELOPE>`;

// Alter company books period
const alterBooksFromXML = `<?xml version="1.0" encoding="UTF-8"?>
<ENVELOPE>
<HEADER>
<TALLYREQUEST>Import Data</TALLYREQUEST>
</HEADER>
<BODY>
<IMPORTDATA>
<REQUESTDESC>
<REPORTNAME>All Masters</REPORTNAME>
<STATICVARIABLES>
<SVCURRENTCOMPANY>Test</SVCURRENTCOMPANY>
</STATICVARIABLES>
</REQUESTDESC>
<REQUESTDATA>
<TALLYMESSAGE xmlns:UDF="TallyUDF">
<COMPANY NAME="Test" ACTION="Alter">
<NAME.LIST>
<NAME>Test</NAME>
</NAME.LIST>
<BOOKSFROM>20250401</BOOKSFROM>
<STARTINGFROM>20250401</STARTINGFROM>
</COMPANY>
</TALLYMESSAGE>
</REQUESTDATA>
</IMPORTDATA>
</BODY>
</ENVELOPE>`;

async function main() {
    console.log('=== Checking/Fixing Tally Company Period ===\n');

    try {
        // Check companies list
        console.log('Step 1: Getting company list...');
        const compListResp = await sendToTally(getCompaniesXML);
        console.log('Companies:', compListResp.substring(0, 800));

        // Extract company names and dates
        const companies = compListResp.match(/<COMPANY[^>]*NAME="([^"]+)"[^>]*>/gi);
        const booksFrom = compListResp.match(/<BOOKSFROM[^>]*>([^<]+)<\/BOOKSFROM>/gi);
        const startFrom = compListResp.match(/<STARTINGFROM[^>]*>([^<]+)<\/STARTINGFROM>/gi);

        if (companies) {
            console.log('\nFound companies:');
            companies.forEach((c, i) => {
                const name = c.match(/NAME="([^"]+)"/);
                console.log(`  ${i + 1}. ${name ? name[1] : 'Unknown'}`);
            });
        }

        if (booksFrom) console.log('\nBooks From:', booksFrom);
        if (startFrom) console.log('Starting From:', startFrom);

        // Step 2: Try to alter books from date
        console.log('\nStep 2: Attempting to alter "Test" company period...');
        const alterResp = await sendToTally(alterBooksFromXML);

        if (alterResp.includes('<ALTERED>1') || alterResp.includes('ALTERED')) {
            console.log('✅ Company period altered successfully!');
        } else if (alterResp.includes('LINEERROR')) {
            const error = alterResp.match(/<LINEERROR>([^<]+)<\/LINEERROR>/i);
            console.log('⚠️  Alter result:', error ? error[1].replace(/&apos;/g, "'") : 'Check response');
        } else {
            console.log('Response:', alterResp.substring(0, 400));
        }

        // Step 3: Test voucher again
        const today = new Date();
        const date = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;

        console.log(`\nStep 3: Testing voucher with date ${date}...`);

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
<NARRATION>Test after period fix - ${new Date().toISOString()}</NARRATION>
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

        const voucherResp = await sendToTally(voucherXML);

        if (voucherResp.includes('<CREATED>1</CREATED>')) {
            console.log('✅ VOUCHER CREATED SUCCESSFULLY!');
            console.log('\n🎉 The fix worked! Push to Tally should work now in the browser.');
        } else if (voucherResp.includes('LINEERROR')) {
            const error = voucherResp.match(/<LINEERROR>([^<]+)<\/LINEERROR>/i);
            console.log('❌ Voucher failed:', error ? error[1].replace(/&apos;/g, "'") : 'Unknown');
            console.log('\n📌 MANUAL FIX REQUIRED:');
            console.log('   1. In Tally Prime, press F2 (Period)');
            console.log('   2. Set the period to include current date (Dec 26, 2025)');
            console.log('   3. Or press Alt+F3 → Select/Alter Company → Change Books Beginning From');
        } else {
            console.log('Response:', voucherResp.substring(0, 400));
        }

    } catch (error) {
        console.error('Error:', error.message);
    }
}

main();
