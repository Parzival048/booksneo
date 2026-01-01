/**
 * Test with new company - checking connection first
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

async function main() {
    // First check which company is active
    console.log('Step 1: Checking active company...\n');

    const checkXml = `<?xml version="1.0" encoding="UTF-8"?>
<ENVELOPE>
<HEADER>
<VERSION>1</VERSION>
<TALLYREQUEST>Export</TALLYREQUEST>
<TYPE>Collection</TYPE>
<ID>CompanyOnDisk</ID>
</HEADER>
<BODY>
<DESC>
<TDL>
<TDLMESSAGE>
<COLLECTION NAME="CompanyOnDisk" ISMODIFY="No">
<TYPE>Company</TYPE>
<FETCH>NAME</FETCH>
</COLLECTION>
</TDLMESSAGE>
</TDL>
</DESC>
</BODY>
</ENVELOPE>`;

    const checkResp = await sendToTally(checkXml);
    console.log('Companies response:', checkResp.substring(0, 500));

    // Now try the voucher
    console.log('\nStep 2: Testing voucher creation...\n');

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
<PARTYLEDGERNAME>Cash</PARTYLEDGERNAME>
<VOUCHERTYPENAME>Payment</VOUCHERTYPENAME>
<NARRATION>Test voucher from AI Tally Sync</NARRATION>
<ALLLEDGERENTRIES.LIST>
<LEDGERNAME>Cash</LEDGERNAME>
<ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
<AMOUNT>100</AMOUNT>
</ALLLEDGERENTRIES.LIST>
<ALLLEDGERENTRIES.LIST>
<LEDGERNAME>Profit and Loss A/c</LEDGERNAME>
<ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
<AMOUNT>-100</AMOUNT>
</ALLLEDGERENTRIES.LIST>
</VOUCHER>
</TALLYMESSAGE>
</REQUESTDATA>
</IMPORTDATA>
</BODY>
</ENVELOPE>`;

    const voucherResp = await sendToTally(voucherXml);
    console.log('Voucher response:', voucherResp);

    if (voucherResp.includes('<CREATED>1</CREATED>')) {
        console.log('\n✅ SUCCESS! Voucher created with Dec 26, 2025!');
    } else if (voucherResp.includes('LINEERROR')) {
        const error = voucherResp.match(/<LINEERROR>([^<]+)<\/LINEERROR>/i);
        console.log('\n❌ Error:', error ? error[1].replace(/&apos;/g, "'") : 'Unknown');
    }
}

main().catch(console.error);
