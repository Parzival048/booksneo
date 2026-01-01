/**
 * Create ledgers and test voucher in AI Sync Company
 */
import http from 'http';

function sendToTally(xml) {
    return new Promise((resolve, reject) => {
        const req = http.request({
            hostname: 'localhost',
            port: 9000,
            path: '/',
            method: 'POST',
            headers: {
                'Content-Type': 'text/xml',
                'Content-Length': Buffer.byteLength(xml, 'utf8')
            }
        }, res => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(data));
        });
        req.on('error', reject);
        req.write(xml, 'utf8');
        req.end();
    });
}

function createLedgerXml(name, parent) {
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
<SVCURRENTCOMPANY>AI Sync Company</SVCURRENTCOMPANY>
</STATICVARIABLES>
</REQUESTDESC>
<REQUESTDATA>
<TALLYMESSAGE xmlns:UDF="TallyUDF">
<LEDGER NAME="${name}" ACTION="Create">
<NAME>${name}</NAME>
<PARENT>${parent}</PARENT>
</LEDGER>
</TALLYMESSAGE>
</REQUESTDATA>
</IMPORTDATA>
</BODY>
</ENVELOPE>`;
}

async function main() {
    console.log('=== Setting up AI Sync Company ===\n');

    // Create required ledgers
    const ledgers = [
        { name: 'Bank Account', parent: 'Bank Accounts' },
        { name: 'Sundry Creditors', parent: 'Sundry Creditors' },
        { name: 'Sundry Debtors', parent: 'Sundry Debtors' },
        { name: 'Expenses', parent: 'Indirect Expenses' }
    ];

    console.log('Creating ledgers...');
    for (const ledger of ledgers) {
        const resp = await sendToTally(createLedgerXml(ledger.name, ledger.parent));
        if (resp.includes('<CREATED>1') || resp.includes('ALTERED')) {
            console.log(`  ✅ ${ledger.name}`);
        } else {
            console.log(`  ⚠️  ${ledger.name} - may already exist`);
        }
    }

    // Now test voucher creation with today's date
    console.log('\nTesting voucher with Dec 26, 2025...');

    const voucherXml = `<?xml version="1.0" encoding="UTF-8"?>
<ENVELOPE>
<HEADER>
<TALLYREQUEST>Import Data</TALLYREQUEST>
</HEADER>
<BODY>
<IMPORTDATA>
<REQUESTDESC>
<REPORTNAME>Vouchers</REPORTNAME>
<STATICVARIABLES>
<SVCURRENTCOMPANY>AI Sync Company</SVCURRENTCOMPANY>
</STATICVARIABLES>
</REQUESTDESC>
<REQUESTDATA>
<TALLYMESSAGE xmlns:UDF="TallyUDF">
<VOUCHER VCHTYPE="Payment" ACTION="Create">
<DATE>20251226</DATE>
<PARTYLEDGERNAME>Sundry Creditors</PARTYLEDGERNAME>
<VOUCHERTYPENAME>Payment</VOUCHERTYPENAME>
<NARRATION>Test voucher from AI Tally Sync - SUCCESS!</NARRATION>
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
        console.log('\n✅ SUCCESS! Voucher created with December 26, 2025!');
        console.log('\n🎉 The new company "AI Sync Company" works perfectly!');
        console.log('\n📌 Next: Update the app to use "AI Sync Company" and refresh browser.');
    } else {
        const error = resp.match(/<LINEERROR>([^<]+)<\/LINEERROR>/i);
        console.log('\n❌ Error:', error ? error[1].replace(/&apos;/g, "'") : 'Unknown');
        console.log('\nResponse:', resp.substring(0, 400));
    }
}

main().catch(console.error);
