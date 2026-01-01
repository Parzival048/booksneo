/**
 * Parse and extract voucher data properly
 */
import http from 'http';
import { writeFileSync } from 'fs';

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
    console.log('=== Fetch Payment Vouchers ===\n');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<ENVELOPE>
<HEADER>
<TALLYREQUEST>Export Data</TALLYREQUEST>
</HEADER>
<BODY>
<EXPORTDATA>
<REQUESTDESC>
<REPORTNAME>Payment Vouchers</REPORTNAME>
<STATICVARIABLES>
<SVCURRENTCOMPANY>AI Sync Company</SVCURRENTCOMPANY>
</STATICVARIABLES>
</REQUESTDESC>
</EXPORTDATA>
</BODY>
</ENVELOPE>`;

    const resp = await sendToTally(xml);

    // Save full response for analysis
    writeFileSync('voucher-response.xml', resp);
    console.log('Saved full response to voucher-response.xml');

    // Find all VOUCHER elements with attributes
    const voucherMatches = resp.match(/<VOUCHER[^>]+>/g) || [];
    console.log('Voucher tags found:', voucherMatches.length);

    if (voucherMatches.length > 0) {
        console.log('\nFirst few voucher tag attributes:');
        voucherMatches.slice(0, 3).forEach((v, i) => console.log(`  ${i + 1}. ${v}`));
    }

    // Find DATE, PARTYLEDGERNAME, NARRATION, AMOUNT
    const dates = resp.match(/<DATE>([^<]+)<\/DATE>/g) || [];
    const parties = resp.match(/<PARTYLEDGERNAME>([^<]+)<\/PARTYLEDGERNAME>/g) || [];
    const narrations = resp.match(/<NARRATION>([^<]+)<\/NARRATION>/g) || [];
    const ledgers = resp.match(/<LEDGERNAME>([^<]+)<\/LEDGERNAME>/g) || [];
    const amounts = resp.match(/<AMOUNT>([^<]+)<\/AMOUNT>/g) || [];

    console.log('\nData found:');
    console.log('  DATES:', dates.length);
    console.log('  PARTYLEDGERNAME:', parties.length);
    console.log('  NARRATION:', narrations.length);
    console.log('  LEDGERNAME:', ledgers.length);
    console.log('  AMOUNT:', amounts.length);

    // Show samples
    if (dates.length > 0) console.log('\nSample DATE:', dates[0]);
    if (parties.length > 0) console.log('Sample PARTYLEDGERNAME:', parties[0]);
    if (narrations.length > 0) console.log('Sample NARRATION:', narrations.slice(0, 2));
    if (ledgers.length > 0) console.log('Sample LEDGERNAME:', ledgers.slice(0, 3));
    if (amounts.length > 0) console.log('Sample AMOUNT:', amounts.slice(0, 3));

    // Also get Receipt vouchers
    console.log('\n=== Fetch Receipt Vouchers ===');
    const xml2 = xml.replace('Payment Vouchers', 'Receipt Vouchers');
    const resp2 = await sendToTally(xml2);
    const receiptCount = (resp2.match(/<VOUCHER[^>]+>/g) || []).length;
    console.log('Receipt vouchers found:', receiptCount);
}

main().catch(console.error);
