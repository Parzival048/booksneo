/**
 * Verify vouchers created in AI Sync Company
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
    console.log('=== Verifying Vouchers in AI Sync Company ===\n');

    // Get voucher count and list
    const voucherListXml = `<?xml version="1.0" encoding="UTF-8"?>
<ENVELOPE>
<HEADER>
<VERSION>1</VERSION>
<TALLYREQUEST>Export</TALLYREQUEST>
<TYPE>Collection</TYPE>
<ID>VoucherList</ID>
</HEADER>
<BODY>
<DESC>
<STATICVARIABLES>
<SVCURRENTCOMPANY>AI Sync Company</SVCURRENTCOMPANY>
</STATICVARIABLES>
<TDL>
<TDLMESSAGE>
<COLLECTION NAME="VoucherList" ISMODIFY="No">
<TYPE>Voucher</TYPE>
<FETCH>DATE, VOUCHERTYPENAME, AMOUNT, NARRATION, PARTYLEDGERNAME</FETCH>
</COLLECTION>
</TDLMESSAGE>
</TDL>
</DESC>
</BODY>
</ENVELOPE>`;

    const response = await sendToTally(voucherListXml);

    // Count vouchers
    const voucherMatches = response.match(/<VOUCHER/gi);
    const voucherCount = voucherMatches ? voucherMatches.length : 0;

    console.log(`📊 Total Vouchers Found: ${voucherCount}`);

    // Extract voucher details
    const dateMatches = response.match(/<DATE[^>]*>([^<]+)<\/DATE>/gi);
    const typeMatches = response.match(/<VOUCHERTYPENAME[^>]*>([^<]+)<\/VOUCHERTYPENAME>/gi);
    const amountMatches = response.match(/<AMOUNT[^>]*>([^<]+)<\/AMOUNT>/gi);
    const narrationMatches = response.match(/<NARRATION[^>]*>([^<]+)<\/NARRATION>/gi);

    if (voucherCount > 0) {
        console.log('\n📋 Voucher Summary:');

        // Show first few vouchers
        const showCount = Math.min(voucherCount, 5);
        for (let i = 0; i < showCount; i++) {
            const date = dateMatches && dateMatches[i] ? dateMatches[i].replace(/<[^>]+>/g, '') : 'N/A';
            const type = typeMatches && typeMatches[i] ? typeMatches[i].replace(/<[^>]+>/g, '') : 'N/A';
            const amount = amountMatches && amountMatches[i] ? amountMatches[i].replace(/<[^>]+>/g, '') : 'N/A';
            console.log(`  ${i + 1}. ${type} | Date: ${date} | Amount: ₹${amount}`);
        }

        if (voucherCount > 5) {
            console.log(`  ... and ${voucherCount - 5} more vouchers`);
        }

        console.log('\n✅ SUCCESS! Vouchers are synced to Tally!');
    } else {
        console.log('\n⚠️  No vouchers found. Response preview:');
        console.log(response.substring(0, 500));
    }
}

main().catch(console.error);
