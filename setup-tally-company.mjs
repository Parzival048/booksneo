/**
 * Create new Tally company and setup for AI Tally Sync testing
 * Run: node setup-tally-company.mjs
 */

import http from 'http';

const TALLY_HOST = 'localhost';
const TALLY_PORT = 9000;

// Company configuration
const COMPANY_NAME = 'AI Sync Demo';
const FY_START = '20250401'; // April 1, 2025
const FY_END = '20260331';   // March 31, 2026

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

// Create company XML
const createCompanyXML = `<?xml version="1.0" encoding="UTF-8"?>
<ENVELOPE>
<HEADER>
<TALLYREQUEST>Import Data</TALLYREQUEST>
</HEADER>
<BODY>
<IMPORTDATA>
<REQUESTDESC>
<REPORTNAME>All Masters</REPORTNAME>
</REQUESTDESC>
<REQUESTDATA>
<TALLYMESSAGE xmlns:UDF="TallyUDF">
<COMPANY NAME="${COMPANY_NAME}" ACTION="Create">
<NAME>${COMPANY_NAME}</NAME>
<STARTINGFROM>${FY_START}</STARTINGFROM>
<ENDINGAT>${FY_END}</ENDINGAT>
<BOOKSFROM>${FY_START}</BOOKSFROM>
<CURRENCYNAME>INR</CURRENCYNAME>
<BASECURRENCYNAME>₹</BASECURRENCYNAME>
</COMPANY>
</TALLYMESSAGE>
</REQUESTDATA>
</IMPORTDATA>
</BODY>
</ENVELOPE>`;

// Create ledger XML
function createLedgerXML(ledgerName, parentGroup) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<ENVELOPE>
<HEADER>
<TALLYREQUEST>Import Data</TALLYREQUEST>
</HEADER>
<BODY>
<IMPORTDATA>
<REQUESTDESC>
<REPORTNAME>All Masters</REPORTNAME>
<STATICVARIABLES>
<SVCURRENTCOMPANY>${COMPANY_NAME}</SVCURRENTCOMPANY>
</STATICVARIABLES>
</REQUESTDESC>
<REQUESTDATA>
<TALLYMESSAGE xmlns:UDF="TallyUDF">
<LEDGER NAME="${ledgerName}" ACTION="Create">
<NAME>${ledgerName}</NAME>
<PARENT>${parentGroup}</PARENT>
</LEDGER>
</TALLYMESSAGE>
</REQUESTDATA>
</IMPORTDATA>
</BODY>
</ENVELOPE>`;
}

// Test voucher with today's date
const today = new Date();
const year = today.getFullYear();
const month = String(today.getMonth() + 1).padStart(2, '0');
const day = String(today.getDate()).padStart(2, '0');
const date = `${year}${month}${day}`;

const testVoucherXML = `<?xml version="1.0" encoding="UTF-8"?>
<ENVELOPE>
<HEADER>
<TALLYREQUEST>Import Data</TALLYREQUEST>
</HEADER>
<BODY>
<IMPORTDATA>
<REQUESTDESC>
<REPORTNAME>Vouchers</REPORTNAME>
<STATICVARIABLES>
<SVCURRENTCOMPANY>${COMPANY_NAME}</SVCURRENTCOMPANY>
</STATICVARIABLES>
</REQUESTDESC>
<REQUESTDATA>
<TALLYMESSAGE xmlns:UDF="TallyUDF">
<VOUCHER VCHTYPE="Payment" ACTION="Create">
<DATE>${date}</DATE>
<PARTYLEDGERNAME>Test Vendor</PARTYLEDGERNAME>
<VOUCHERTYPENAME>Payment</VOUCHERTYPENAME>
<NARRATION>Test payment from AI Tally Sync - ${new Date().toISOString()}</NARRATION>
<ALLLEDGERENTRIES.LIST>
<LEDGERNAME>Test Vendor</LEDGERNAME>
<ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
<AMOUNT>500</AMOUNT>
</ALLLEDGERENTRIES.LIST>
<ALLLEDGERENTRIES.LIST>
<LEDGERNAME>Test Bank</LEDGERNAME>
<ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
<AMOUNT>-500</AMOUNT>
</ALLLEDGERENTRIES.LIST>
</VOUCHER>
</TALLYMESSAGE>
</REQUESTDATA>
</IMPORTDATA>
</BODY>
</ENVELOPE>`;

async function main() {
    console.log('=== Setting up Tally Company for AI Tally Sync ===\n');
    console.log(`Company: ${COMPANY_NAME}`);
    console.log(`Financial Year: ${FY_START} to ${FY_END}`);
    console.log(`Today's Date: ${date}\n`);

    try {
        // Step 1: Create Company
        console.log('Step 1: Creating company...');
        const companyResp = await sendToTally(createCompanyXML);

        if (companyResp.includes('<CREATED>1</CREATED>') || companyResp.includes('CREATED')) {
            console.log('✅ Company created successfully');
        } else if (companyResp.includes('LINEERROR')) {
            const error = companyResp.match(/<LINEERROR>([^<]+)<\/LINEERROR>/i);
            console.log('⚠️  Company note:', error ? error[1].replace(/&apos;/g, "'") : 'May already exist');
        } else {
            console.log('ℹ️  Company response received');
        }

        // Step 2: Create essential ledgers
        console.log('\nStep 2: Creating ledgers...');

        const ledgers = [
            { name: 'Test Bank', parent: 'Bank Accounts' },
            { name: 'Test Vendor', parent: 'Sundry Creditors' },
            { name: 'Test Customer', parent: 'Sundry Debtors' },
            { name: 'Cash', parent: 'Cash-in-Hand' }
        ];

        for (const ledger of ledgers) {
            const ledgerXML = createLedgerXML(ledger.name, ledger.parent);
            const resp = await sendToTally(ledgerXML);

            if (resp.includes('<CREATED>1</CREATED>')) {
                console.log(`  ✅ Ledger "${ledger.name}" created`);
            } else {
                console.log(`  ⚠️  Ledger "${ledger.name}" - may already exist`);
            }
        }

        // Step 3: Test voucher creation with today's date
        console.log('\nStep 3: Testing voucher creation with today\'s date...');
        console.log(`  Date: ${date}`);

        const voucherResp = await sendToTally(testVoucherXML);

        if (voucherResp.includes('<CREATED>1</CREATED>')) {
            console.log('  ✅ VOUCHER CREATED SUCCESSFULLY!');
            console.log('\n🎉 SUCCESS! The new company works with today\'s date.');
            console.log(`\n📌 Use company name "${COMPANY_NAME}" in AI Tally Sync settings.`);
        } else if (voucherResp.includes('LINEERROR')) {
            const error = voucherResp.match(/<LINEERROR>([^<]+)<\/LINEERROR>/i);
            console.log('  ❌ Voucher failed:', error ? error[1].replace(/&apos;/g, "'") : 'Unknown error');
            console.log('\n  Full response:', voucherResp.substring(0, 500));
        } else {
            console.log('  ⚠️  Unknown response');
            console.log(voucherResp);
        }

    } catch (error) {
        console.error('Error:', error.message);
        if (error.code === 'ECONNREFUSED') {
            console.log('\n⚠️  Make sure Tally Prime is running on port 9000');
        }
    }
}

main();
