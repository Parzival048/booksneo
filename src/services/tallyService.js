/**
 * AI Tally Sync - Tally Service
 * Integration with Tally Prime via XML HTTP API
 * 
 * CONNECTION MODES:
 * - Development: Uses Vite proxy at /api/tally to bypass CORS
 * - Production (Netlify): Connects to localhost:9001 (CORS proxy)
 *   The CORS proxy (tally-proxy.mjs) forwards requests to Tally on port 9000
 *   Note: User must run "node tally-proxy.mjs" alongside Tally Prime
 */

import logger from '../utils/logger';
import { retryWithBackoff } from '../utils/helpers';

// Tally connection configuration
const TALLY_HOST = import.meta.env.VITE_TALLY_HOST || 'localhost';
const TALLY_PORT = import.meta.env.VITE_TALLY_PORT || '9000';
const PROXY_PORT = '9001'; // CORS proxy port for production

// Detect if we're in development or production
const isDevelopment = import.meta.env.DEV;

// In development, use Vite proxy. In production, use CORS proxy on port 9001.
// The CORS proxy forwards requests to Tally and adds proper headers.
const TALLY_PROXY_URL = isDevelopment ? '/api/tally' : `http://${TALLY_HOST}:${PROXY_PORT}`;
const TALLY_DIRECT_URL = `http://${TALLY_HOST}:${TALLY_PORT}`;

// Mock mode - set to false for real Tally connection
let mockMode = false;

// Log connection mode
console.log(`[TallyService] Mode: ${isDevelopment ? 'Development (Vite proxy)' : `Production (CORS proxy on port ${PROXY_PORT})`}`);


/**
 * Check if Tally is connected
 * Note: This is expected to fail when Tally Prime isn't running - we handle it silently
 */
export const checkConnection = async () => {
  try {
    logger.tallyOperation('checkConnection', { url: TALLY_PROXY_URL });

    if (mockMode) {
      logger.info('Tally running in mock mode');
      return { connected: true, mock: true };
    }

    const response = await fetch(TALLY_PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/xml' },
      body: getCompanyListXML(),
      signal: AbortSignal.timeout(5000)
    });

    if (!response.ok) {
      // Tally not running is expected - return quietly without logging error
      return { connected: false, mock: false, error: `Status: ${response.status}` };
    }

    const xmlText = await response.text();

    if (xmlText.includes('<ENVELOPE>') || xmlText.includes('<COMPANY>')) {
      logger.info('Successfully connected to Tally Prime');
      return { connected: true, mock: false };
    }

    return { connected: false, mock: false, error: 'Invalid response' };
  } catch (error) {
    // Don't log as warning - Tally not connected is expected behavior
    return { connected: false, mock: false, error: error.message };
  }
};

export const setMockMode = (enabled) => {
  mockMode = enabled;
  logger.info('Tally mock mode', { enabled });
};

export const isMockMode = () => mockMode;

/**
 * Get XML request for company list
 */
const getCompanyListXML = () => {
  return `<?xml version="1.0" encoding="utf-8"?>
<ENVELOPE>
  <HEADER>
    <VERSION>1</VERSION>
    <TALLYREQUEST>Export</TALLYREQUEST>
    <TYPE>Collection</TYPE>
    <ID>CompanyCollection</ID>
  </HEADER>
  <BODY>
    <DESC>
      <STATICVARIABLES>
        <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
      </STATICVARIABLES>
      <TDL>
        <TDLMESSAGE>
          <COLLECTION NAME="CompanyCollection">
            <TYPE>Company</TYPE>
            <NATIVEMETHOD>Name</NATIVEMETHOD>
            <NATIVEMETHOD>StartingFrom</NATIVEMETHOD>
          </COLLECTION>
        </TDLMESSAGE>
      </TDL>
    </DESC>
  </BODY>
</ENVELOPE>`;
};

/**
 * Get list of companies from Tally
 */
export const getCompanies = async () => {
  try {
    logger.tallyOperation('getCompanies');

    if (mockMode) {
      return [
        { name: 'ABC Trading Co.', from: '01-Apr-2024' },
        { name: 'Demo Company', from: '01-Apr-2024' }
      ];
    }

    const response = await retryWithBackoff(
      () => fetch(TALLY_PROXY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/xml' },
        body: getCompanyListXML()
      }),
      3, 1000
    );

    const xmlText = await response.text();
    const companies = parseCompaniesFromXML(xmlText);
    logger.info('Fetched companies from Tally', { count: companies.length });
    return companies;
  } catch (error) {
    logger.error('Failed to get companies', error);
    throw error;
  }
};

const parseCompaniesFromXML = (xml) => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'text/xml');
  const companies = [];

  // Helper to validate company name
  const isValidCompanyName = (name) => {
    if (!name || typeof name !== 'string') return false;
    const trimmed = name.trim();
    // Reject empty strings, pure numbers, or very short names (less than 2 chars)
    if (trimmed.length < 2) return false;
    if (/^\d+$/.test(trimmed)) return false; // Reject pure numeric values like "0"
    return true;
  };

  const companyNodes = doc.querySelectorAll('COMPANY, ENVELOPE > BODY > DATA > COLLECTION > COMPANY');
  companyNodes.forEach(node => {
    const name = node.querySelector('NAME')?.textContent ||
      node.getAttribute('NAME') ||
      node.textContent?.trim();
    if (isValidCompanyName(name)) {
      companies.push({
        name: name.trim(),
        from: node.querySelector('STARTINGFROM')?.textContent || ''
      });
    }
  });

  if (companies.length === 0) {
    const nameNodes = doc.querySelectorAll('NAME');
    nameNodes.forEach(node => {
      if (node.parentElement?.tagName === 'COMPANY' || node.closest('COLLECTION')) {
        const name = node.textContent?.trim();
        if (isValidCompanyName(name)) {
          companies.push({ name: name, from: '' });
        }
      }
    });
  }

  return companies;
};

/**
 * Get ledger list from Tally
 * Uses a simpler Export Data query for better compatibility
 */
export const getLedgers = async (companyName) => {
  try {
    logger.tallyOperation('getLedgers', { company: companyName });

    if (mockMode) {
      return [
        { name: 'Bank Account', group: 'Bank Accounts' },
        { name: 'Cash', group: 'Cash-in-Hand' },
        { name: 'Sales Account', group: 'Sales Accounts' },
        { name: 'Sundry Debtors', group: 'Sundry Debtors' },
        { name: 'Sundry Creditors', group: 'Sundry Creditors' }
      ];
    }

    // Use simpler Export Data format for better Tally compatibility
    const xml = `<?xml version="1.0" encoding="utf-8"?>
<ENVELOPE>
<HEADER>
<TALLYREQUEST>Export Data</TALLYREQUEST>
</HEADER>
<BODY>
<EXPORTDATA>
<REQUESTDESC>
<REPORTNAME>List of Ledgers</REPORTNAME>
<STATICVARIABLES>
<SVCURRENTCOMPANY>${escapeXML(companyName)}</SVCURRENTCOMPANY>
<SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
</STATICVARIABLES>
</REQUESTDESC>
</EXPORTDATA>
</BODY>
</ENVELOPE>`;

    console.log('[TallyService] Fetching ledgers for company:', companyName);

    const response = await fetch(TALLY_PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/xml' },
      body: xml
    });

    const xmlText = await response.text();
    console.log('[TallyService] Ledger response length:', xmlText.length);

    const ledgers = parseLedgersFromXML(xmlText);
    console.log('[TallyService] Parsed ledgers count:', ledgers.length);
    logger.info('Fetched ledgers from Tally', { count: ledgers.length });
    return ledgers;
  } catch (error) {
    console.error('[TallyService] Failed to get ledgers:', error);
    logger.error('Failed to get ledgers', error);
    throw error;
  }
};

const parseLedgersFromXML = (xml) => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'text/xml');
  const ledgers = [];

  // Try multiple possible node names for ledger data
  const nodeSelectors = ['LEDGER', 'LEDGERNAME', 'DSPACCNAME', 'NAME'];

  // First try LEDGER nodes (most common)
  let ledgerNodes = doc.querySelectorAll('LEDGER');

  if (ledgerNodes.length > 0) {
    ledgerNodes.forEach(node => {
      // Try to get name from NAME child or NAME attribute
      let name = node.querySelector('NAME, LEDGERNAME, DSPACCNAME')?.textContent ||
        node.getAttribute('NAME') ||
        node.textContent;

      if (name && name.trim() && !name.includes('<')) {
        ledgers.push({
          name: name.trim(),
          group: node.querySelector('PARENT, LEDGERGROUP')?.textContent?.trim() ||
            node.getAttribute('PARENT') || ''
        });
      }
    });
  }

  // Also try TALLYMESSAGE > LEDGER pattern
  if (ledgers.length === 0) {
    const tallyMsgNodes = doc.querySelectorAll('TALLYMESSAGE LEDGER, REQUESTDATA LEDGER');
    tallyMsgNodes.forEach(node => {
      const name = node.getAttribute('NAME') || node.querySelector('NAME')?.textContent;
      if (name && name.trim()) {
        ledgers.push({
          name: name.trim(),
          group: node.querySelector('PARENT')?.textContent?.trim() || ''
        });
      }
    });
  }

  // Log for debugging
  if (ledgers.length === 0) {
    console.log('[TallyService] No ledgers found in response. Sample XML:', xml.substring(0, 1000));
  }

  return ledgers;
};

/**
 * Create a ledger in Tally
 * @param {string} ledgerName - Name of the ledger
 * @param {string} groupName - Parent group name
 * @param {string} companyName - Company name
 * @returns {Promise<Object>} Creation result
 */
export const createLedger = async (ledgerName, groupName, companyName) => {
  try {
    console.log(`Creating ledger: ${ledgerName} in group: ${groupName} for company: ${companyName}`);
    logger.tallyOperation('createLedger', { ledgerName, groupName, companyName });

    if (mockMode) {
      await new Promise(resolve => setTimeout(resolve, 300));
      return { success: true, message: `Ledger ${ledgerName} created (Mock)` };
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Import Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>All Masters</REPORTNAME>
        <STATICVARIABLES>
          <SVCURRENTCOMPANY>${escapeXML(companyName)}</SVCURRENTCOMPANY>
        </STATICVARIABLES>
      </REQUESTDESC>
      <REQUESTDATA>
        <TALLYMESSAGE xmlns:UDF="TallyUDF">
          <LEDGER NAME="${escapeXML(ledgerName)}" ACTION="Create">
            <NAME>${escapeXML(ledgerName)}</NAME>
            <PARENT>${escapeXML(groupName)}</PARENT>
            <ISBILLWISEON>No</ISBILLWISEON>
            <ISCOSTCENTRESON>No</ISCOSTCENTRESON>
          </LEDGER>
        </TALLYMESSAGE>
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`;

    const response = await fetch(TALLY_PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/xml' },
      body: xml
    });

    const result = await response.text();
    console.log(`Ledger creation response for "${ledgerName}":`, result.substring(0, 200));
    logger.debug('Create ledger response', { response: result.substring(0, 300) });

    // Check for specific error patterns - but ignore "already exists" type errors
    if (result.includes('LINEERROR') || result.includes('<ERROR>')) {
      const errorMatch = result.match(/<LINEERROR>(.*?)<\/LINEERROR>/s) ||
        result.match(/<ERROR>(.*?)<\/ERROR>/s);
      const errorMsg = errorMatch ? errorMatch[1].trim() : '';

      // Check if ledger already exists - this is actually success for our purposes
      if (errorMsg.includes('already exists') ||
        errorMsg.includes('duplicate') ||
        errorMsg.includes('Duplicate') ||
        errorMsg.includes('already used') ||
        result.includes('LASTVCHID')) {
        console.log(`Ledger "${ledgerName}" already exists - OK`);
        return { success: true, message: `Ledger "${ledgerName}" already exists`, existed: true };
      }

      throw new Error(errorMsg || 'Failed to create ledger');
    }

    // Check for success
    if (result.includes('CREATED') || result.includes('IMPORTED') ||
      (result.includes('<ENVELOPE>') && !result.includes('LINEERROR'))) {
      console.log(`Ledger "${ledgerName}" created successfully`);
      return { success: true, message: `Ledger "${ledgerName}" created in ${groupName}` };
    }

    // If we got a valid envelope response, assume success
    if (result.includes('<ENVELOPE>')) {
      console.log(`Ledger "${ledgerName}" - response received, assuming success`);
      return { success: true, message: `Ledger "${ledgerName}" sent to Tally` };
    }

    throw new Error('No success confirmation from Tally');
  } catch (error) {
    console.error(`Failed to create ledger "${ledgerName}":`, error.message);
    logger.error('Failed to create ledger', error);
    throw error;
  }
};

/**
 * Create multiple ledgers in Tally
 * @param {Array} ledgers - Array of {name, group} objects
 * @param {string} companyName - Company name
 * @returns {Promise<Object>} Batch result
 */
export const createMultipleLedgers = async (ledgers, companyName) => {
  const results = { success: 0, failed: 0, errors: [] };

  for (const ledger of ledgers) {
    try {
      await createLedger(ledger.name, ledger.group, companyName);
      results.success++;
    } catch (error) {
      results.failed++;
      results.errors.push({ name: ledger.name, error: error.message });
    }
  }

  logger.info('Batch ledger creation complete', results);
  return results;
};

/**
 * Ensure basic ledgers exist in Tally (auto-create if missing)
 * @param {string} companyName - Company name
 * @returns {Promise<Object>} Result
 */
export const ensureBasicLedgers = async (companyName) => {
  const basicLedgers = [
    { name: 'Bank Account', group: 'Bank Accounts' },
    { name: 'Sundry Debtors', group: 'Sundry Debtors' },
    { name: 'Sundry Creditors', group: 'Sundry Creditors' },
    { name: 'Cash', group: 'Cash-in-Hand' },
    { name: 'Sales Account', group: 'Sales Accounts' },
    { name: 'Purchase Account', group: 'Purchase Accounts' },
    { name: 'Miscellaneous Expenses', group: 'Indirect Expenses' },
    // GST Output Ledgers (for Sales)
    { name: 'Output CGST', group: 'Duties & Taxes' },
    { name: 'Output SGST', group: 'Duties & Taxes' },
    { name: 'Output IGST', group: 'Duties & Taxes' },
    // GST Input Ledgers (for Purchases)
    { name: 'Input CGST', group: 'Duties & Taxes' },
    { name: 'Input SGST', group: 'Duties & Taxes' },
    { name: 'Input IGST', group: 'Duties & Taxes' }
  ];

  try {
    // Get existing ledgers
    const existingLedgers = await getLedgers(companyName);
    const existingNames = new Set(existingLedgers.map(l => l.name.toLowerCase()));

    // Find missing ledgers
    const missingLedgers = basicLedgers.filter(l =>
      !existingNames.has(l.name.toLowerCase())
    );

    if (missingLedgers.length === 0) {
      return { success: true, message: 'All basic ledgers already exist', created: 0 };
    }

    // Create missing ledgers
    const result = await createMultipleLedgers(missingLedgers, companyName);

    return {
      success: true,
      message: `Created ${result.success} ledgers`,
      created: result.success,
      failed: result.failed,
      errors: result.errors
    };
  } catch (error) {
    logger.error('Failed to ensure basic ledgers', error);
    throw error;
  }
};

/**
 * Format date for Tally (YYYYMMDD)
 * Converts various date formats to Tally's required format
 * @param {string|Date} date - Date to format
 * @returns {string} Date in YYYYMMDD format
 */
const formatTallyDate = (date) => {
  if (!date) {
    // Default to today's date if no date provided
    const today = new Date();
    return today.toISOString().slice(0, 10).replace(/-/g, '');
  }

  try {
    // Handle string dates (YYYY-MM-DD format from HTML date input)
    if (typeof date === 'string') {
      // If already in YYYYMMDD format
      if (/^\d{8}$/.test(date)) {
        return date;
      }
      // If in YYYY-MM-DD format
      if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return date.replace(/-/g, '');
      }
      // Try parsing as date
      const parsed = new Date(date);
      if (!isNaN(parsed.getTime())) {
        return parsed.toISOString().slice(0, 10).replace(/-/g, '');
      }
    }

    // Handle Date objects
    if (date instanceof Date && !isNaN(date.getTime())) {
      return date.toISOString().slice(0, 10).replace(/-/g, '');
    }

    // Fallback to today
    console.warn('[TallyService] Could not parse date, using today:', date);
    return new Date().toISOString().slice(0, 10).replace(/-/g, '');
  } catch (e) {
    console.warn('[TallyService] Date formatting error:', e);
    return new Date().toISOString().slice(0, 10).replace(/-/g, '');
  }
};

/**
 * Escape XML special characters
 */
const escapeXML = (str) => {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
};

/**
 * Create voucher XML for Tally Prime (WORKING format verified via terminal test)
 * Reference: https://help.tallysolutions.com/xml-integration/
 * Uses: IMPORTDATA > REQUESTDESC > REQUESTDATA structure with VOUCHER VCHTYPE/ACTION attributes
 */
const createVoucherXML = (transaction, companyName, bankLedger, partyLedger) => {
  const isCredit = transaction.credit > 0 || transaction.type === 'CREDIT';
  const voucherType = isCredit ? 'Receipt' : 'Payment';
  const amount = Math.abs(transaction.credit || transaction.debit || transaction.amount || 0);
  const date = formatTallyDate(transaction.date);
  const narration = escapeXML(transaction.description || 'Bank Transaction');
  const bank = escapeXML(bankLedger || 'Bank Account');
  const party = escapeXML(partyLedger || (isCredit ? 'Sundry Debtors' : 'Sundry Creditors'));

  // Working Tally XML format verified via terminal test on 2025-12-26
  // Key: Use "Import Data" header and IMPORTDATA/REQUESTDESC/REQUESTDATA structure
  return `<?xml version="1.0" encoding="UTF-8"?>
<ENVELOPE>
<HEADER>
<TALLYREQUEST>Import Data</TALLYREQUEST>
</HEADER>
<BODY>
<IMPORTDATA>
<REQUESTDESC>
<REPORTNAME>Vouchers</REPORTNAME>
<STATICVARIABLES>
<SVCURRENTCOMPANY>${escapeXML(companyName)}</SVCURRENTCOMPANY>
</STATICVARIABLES>
</REQUESTDESC>
<REQUESTDATA>
<TALLYMESSAGE xmlns:UDF="TallyUDF">
<VOUCHER VCHTYPE="${voucherType}" ACTION="Create">
<DATE>${date}</DATE>
<PARTYLEDGERNAME>${party}</PARTYLEDGERNAME>
<VOUCHERTYPENAME>${voucherType}</VOUCHERTYPENAME>
<NARRATION>${narration}</NARRATION>
<ALLLEDGERENTRIES.LIST>
<LEDGERNAME>${party}</LEDGERNAME>
<ISDEEMEDPOSITIVE>${isCredit ? 'Yes' : 'No'}</ISDEEMEDPOSITIVE>
<AMOUNT>${isCredit ? -amount : amount}</AMOUNT>
</ALLLEDGERENTRIES.LIST>
<ALLLEDGERENTRIES.LIST>
<LEDGERNAME>${bank}</LEDGERNAME>
<ISDEEMEDPOSITIVE>${isCredit ? 'No' : 'Yes'}</ISDEEMEDPOSITIVE>
<AMOUNT>${isCredit ? amount : -amount}</AMOUNT>
</ALLLEDGERENTRIES.LIST>
</VOUCHER>
</TALLYMESSAGE>
</REQUESTDATA>
</IMPORTDATA>
</BODY>
</ENVELOPE>`;
};

/**
 * Push single transaction to Tally
 */
export const pushToTally = async (transaction, companyName, bankLedger, partyLedger) => {
  try {
    logger.tallyOperation('pushVoucher', {
      company: companyName,
      amount: transaction.amount || transaction.credit || transaction.debit,
      type: transaction.type
    });

    if (mockMode) {
      await new Promise(resolve => setTimeout(resolve, 200));
      return { success: true, voucherId: `MOCK-${Date.now()}` };
    }

    const xml = createVoucherXML(transaction, companyName, bankLedger, partyLedger);

    logger.debug('Sending voucher XML', { xml: xml.substring(0, 500) });

    const response = await fetch(TALLY_PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/xml' },
      body: xml
    });

    const result = await response.text();
    logger.debug('Tally response', { response: result.substring(0, 500) });

    // Check for errors
    if (result.includes('LINEERROR') || result.includes('<ERROR>')) {
      const errorMatch = result.match(/<LINEERROR>(.*?)<\/LINEERROR>/s) ||
        result.match(/<ERROR>(.*?)<\/ERROR>/s);
      const errorMsg = errorMatch ? errorMatch[1].trim() : 'Tally returned an error';
      throw new Error(errorMsg);
    }

    // Check for success indicators
    const successIndicators = [
      'CREATED',
      '<LASTVCHID>',
      'IMPORTED',
      '<IMPORTRESULT>',
      '<RESULT>1</RESULT>',
      'successfully'
    ];

    const isSuccess = successIndicators.some(ind =>
      result.toLowerCase().includes(ind.toLowerCase())
    );

    if (isSuccess) {
      const voucherIdMatch = result.match(/<LASTVCHID>(\d+)<\/LASTVCHID>/);
      return {
        success: true,
        voucherId: voucherIdMatch ? voucherIdMatch[1] : 'Created',
        message: 'Voucher created successfully'
      };
    }

    // If we get a response but no clear success/error, log and assume partial success
    logger.warn('Tally response unclear', { response: result.substring(0, 300) });

    // Check if response looks like valid XML with no error
    if (result.includes('<ENVELOPE>') && !result.includes('ERROR')) {
      return { success: true, message: 'Voucher sent to Tally' };
    }

    throw new Error('No success confirmation from Tally');
  } catch (error) {
    logger.error('Failed to push to Tally', { error: error.message });
    throw error;
  }
};

/**
 * Push multiple transactions to Tally with detailed results
 * Auto-creates missing ledgers with proper verification
 */
export const batchPushToTally = async (transactions, companyName, bankLedger) => {
  const results = {
    success: 0,
    failed: 0,
    skipped: 0,
    errors: [],
    ledgersCreated: 0,
    ledgersFailed: []
  };

  console.log('Starting batch push to Tally:', {
    count: transactions.length,
    company: companyName,
    bankLedger
  });

  logger.info('Starting batch push to Tally', {
    count: transactions.length,
    company: companyName,
    bankLedger
  });

  // Step 1: Fetch existing ledgers from Tally
  let existingLedgers = new Set();
  try {
    const ledgers = await getLedgers(companyName);
    existingLedgers = new Set(ledgers.map(l => l.name.toLowerCase().trim()));
    console.log('Existing ledgers in Tally:', ledgers.length);
  } catch (error) {
    console.warn('Could not fetch existing ledgers, will try to create all:', error.message);
  }

  // Step 2: Collect all unique ledgers needed
  const uniqueLedgers = new Set();
  const effectiveBankLedger = bankLedger || 'Bank Account';
  uniqueLedgers.add(effectiveBankLedger);

  for (const transaction of transactions) {
    const partyLedger = transaction.userLedger ||
      transaction.aiSuggestedLedger ||
      (transaction.credit > 0 ? 'Sundry Debtors' : 'Sundry Creditors');
    uniqueLedgers.add(partyLedger);
  }

  console.log('Unique ledgers needed:', Array.from(uniqueLedgers));

  // Step 3: Comprehensive ledger-to-group mapping
  const ledgerGroupMap = {
    // Bank ledgers
    'Bank Account': 'Bank Accounts',
    'Cash': 'Cash-in-Hand',
    'Cash in Hand': 'Cash-in-Hand',
    'Petty Cash': 'Cash-in-Hand',
    // Income ledgers - Direct
    'Sales Account': 'Sales Accounts',
    'Sales': 'Sales Accounts',
    'UPI Income': 'Direct Incomes',
    'Interest Income': 'Direct Incomes',
    'Interest Received': 'Direct Incomes',
    'Commission Income': 'Direct Incomes',
    'Service Income': 'Direct Incomes',
    'Dividend Income': 'Direct Incomes',
    // Income ledgers - Indirect
    'Other Income': 'Indirect Incomes',
    'Miscellaneous Income': 'Indirect Incomes',
    'Discount Received': 'Indirect Incomes',
    'Refund Received': 'Indirect Incomes',
    // Expense ledgers - Direct
    'Purchase Account': 'Purchase Accounts',
    'Purchases': 'Purchase Accounts',
    // Expense ledgers - Indirect (common expenses)
    'Office Expenses': 'Indirect Expenses',
    'Administrative Expenses': 'Indirect Expenses',
    'Food Expenses': 'Indirect Expenses',
    'Food & Dining': 'Indirect Expenses',
    'Entertainment Expenses': 'Indirect Expenses',
    'Entertainment': 'Indirect Expenses',
    'Travel Expenses': 'Indirect Expenses',
    'Travel': 'Indirect Expenses',
    'Transportation': 'Indirect Expenses',
    'Rent': 'Indirect Expenses',
    'Rent Expense': 'Indirect Expenses',
    'Office Rent': 'Indirect Expenses',
    'Utilities': 'Indirect Expenses',
    'Utility Bills': 'Indirect Expenses',
    'Electricity': 'Indirect Expenses',
    'Telephone Expenses': 'Indirect Expenses',
    'Internet Expenses': 'Indirect Expenses',
    'Mobile Expenses': 'Indirect Expenses',
    'Professional Fees': 'Indirect Expenses',
    'Legal Fees': 'Indirect Expenses',
    'Consulting Fees': 'Indirect Expenses',
    'Audit Fees': 'Indirect Expenses',
    'Bank Charges': 'Indirect Expenses',
    'Bank Fees': 'Indirect Expenses',
    'Miscellaneous Expenses': 'Indirect Expenses',
    'General Expenses': 'Indirect Expenses',
    'Other Expenses': 'Indirect Expenses',
    'Printing & Stationery': 'Indirect Expenses',
    'Stationery': 'Indirect Expenses',
    'Postage & Courier': 'Indirect Expenses',
    'Insurance': 'Indirect Expenses',
    'Insurance Premium': 'Indirect Expenses',
    'Repairs & Maintenance': 'Indirect Expenses',
    'Salary': 'Indirect Expenses',
    'Salaries': 'Indirect Expenses',
    'Wages': 'Indirect Expenses',
    'Staff Welfare': 'Indirect Expenses',
    'Subscription': 'Indirect Expenses',
    'Software Subscription': 'Indirect Expenses',
    'Membership Fees': 'Indirect Expenses',
    'Advertising': 'Indirect Expenses',
    'Marketing Expenses': 'Indirect Expenses',
    'GST Expense': 'Duties & Taxes',
    'TDS Payable': 'Duties & Taxes',
    // Capital accounts
    'Capital Account': 'Capital Account',
    'Drawings': 'Capital Account',
    // Parties
    'Sundry Debtors': 'Sundry Debtors',
    'Sundry Creditors': 'Sundry Creditors',
    // Loans
    'Loan Account': 'Loans (Liability)',
    'EMI Payment': 'Loans (Liability)',
    'Personal Loan': 'Loans (Liability)',
    'Home Loan': 'Loans (Liability)',
    'Vehicle Loan': 'Loans (Liability)'
  };

  // Helper function to guess group from ledger name
  const guessLedgerGroup = (ledgerName) => {
    const name = ledgerName.toLowerCase();

    // Check for known patterns
    if (name.includes('bank') || name.includes('account') && !name.includes('expense')) {
      return 'Bank Accounts';
    }
    if (name.includes('income') || name.includes('received') || name.includes('revenue')) {
      return 'Indirect Incomes';
    }
    if (name.includes('expense') || name.includes('charges') || name.includes('fees') ||
      name.includes('payment') || name.includes('cost')) {
      return 'Indirect Expenses';
    }
    if (name.includes('cash')) {
      return 'Cash-in-Hand';
    }
    if (name.includes('loan') || name.includes('emi')) {
      return 'Loans (Liability)';
    }
    if (name.includes('tax') || name.includes('gst') || name.includes('tds')) {
      return 'Duties & Taxes';
    }
    if (name.includes('salary') || name.includes('wage')) {
      return 'Indirect Expenses';
    }
    if (name.includes('sale')) {
      return 'Sales Accounts';
    }
    if (name.includes('purchase')) {
      return 'Purchase Accounts';
    }

    // Default to Indirect Expenses for unknown ledgers
    return 'Indirect Expenses';
  };

  // Step 4: Create missing ledgers with verification
  const confirmedLedgers = new Set(existingLedgers);

  for (const ledger of uniqueLedgers) {
    const ledgerLower = ledger.toLowerCase().trim();

    // Skip if ledger already exists
    if (confirmedLedgers.has(ledgerLower)) {
      console.log(`Ledger "${ledger}" already exists`);
      continue;
    }

    // Determine the group for this ledger
    const group = ledgerGroupMap[ledger] || guessLedgerGroup(ledger);

    try {
      console.log(`Creating ledger: ${ledger} in ${group}`);
      const createResult = await createLedger(ledger, group, companyName);

      if (createResult.success || createResult.existed) {
        confirmedLedgers.add(ledgerLower);
        results.ledgersCreated++;
        console.log(`Ledger "${ledger}" created/confirmed`);
      }
    } catch (error) {
      const errorMsg = error.message || '';

      // Check if it's actually an "already exists" error (success for us)
      if (errorMsg.includes('already exists') || errorMsg.includes('duplicate') ||
        errorMsg.includes('Duplicate')) {
        confirmedLedgers.add(ledgerLower);
        console.log(`Ledger "${ledger}" already exists (from error message)`);
      } else {
        console.error(`Failed to create ledger "${ledger}":`, errorMsg);
        results.ledgersFailed.push({ name: ledger, group, error: errorMsg });
      }
    }
  }

  console.log(`Ledgers confirmed: ${confirmedLedgers.size}, Created: ${results.ledgersCreated}`);

  // Step 5: Push vouchers only for transactions with confirmed ledgers
  for (const transaction of transactions) {
    const partyLedger = transaction.userLedger ||
      transaction.aiSuggestedLedger ||
      (transaction.credit > 0 ? 'Sundry Debtors' : 'Sundry Creditors');

    const partyLedgerLower = partyLedger.toLowerCase().trim();
    const bankLedgerLower = effectiveBankLedger.toLowerCase().trim();

    // Check if both ledgers are available
    if (!confirmedLedgers.has(partyLedgerLower) || !confirmedLedgers.has(bankLedgerLower)) {
      const missingLedger = !confirmedLedgers.has(partyLedgerLower) ? partyLedger : effectiveBankLedger;
      console.warn(`Skipping transaction - ledger "${missingLedger}" not available`);
      results.skipped++;
      results.errors.push({
        transactionId: transaction.id,
        description: transaction.description?.substring(0, 50),
        error: `Ledger "${missingLedger}" does not exist in Tally`
      });
      continue;
    }

    try {
      console.log('Pushing voucher:', {
        date: transaction.date,
        amount: transaction.credit || transaction.debit,
        type: transaction.type,
        partyLedger,
        bankLedger: effectiveBankLedger
      });

      await pushToTally(transaction, companyName, effectiveBankLedger, partyLedger);
      results.success++;

      console.log('Voucher created successfully');
      logger.debug('Voucher created', {
        description: transaction.description?.substring(0, 30),
        amount: transaction.credit || transaction.debit
      });
    } catch (error) {
      console.error('Voucher creation failed:', error.message);
      results.failed++;
      results.errors.push({
        transactionId: transaction.id,
        description: transaction.description?.substring(0, 50),
        error: error.message
      });
      logger.warn('Voucher creation failed', {
        description: transaction.description?.substring(0, 30),
        error: error.message
      });
    }
  }

  console.log('Batch push complete:', results);
  logger.tallyOperation('batchPush', results);

  // If all failed or skipped, throw an error with helpful message
  if (results.success === 0 && transactions.length > 0) {
    const firstError = results.errors[0]?.error || 'Unknown error';
    const ledgerFailures = results.ledgersFailed.length > 0
      ? ` Failed ledgers: ${results.ledgersFailed.map(l => l.name).join(', ')}`
      : '';
    throw new Error(`Failed to create vouchers: ${firstError}${ledgerFailures}`);
  }

  return results;
};

/**
 * Get active company from Tally
 */
export const getActiveCompany = async () => {
  try {
    if (mockMode) {
      return 'Demo Company';
    }
    const companies = await getCompanies();
    return companies.length > 0 ? companies[0].name : null;
  } catch {
    return null;
  }
};

/**
 * Create a new company in Tally
 * @param {Object} companyData - Company details
 * @returns {Promise<Object>} Creation result
 */
export const createCompany = async (companyData) => {
  try {
    const { name, address, country, state, pincode, email, phone, financialYearFrom } = companyData;

    logger.tallyOperation('createCompany', { name });

    if (mockMode) {
      await new Promise(resolve => setTimeout(resolve, 500));
      return { success: true, message: `Company "${name}" created (Mock)` };
    }

    // Calculate financial year start (must be April 1st)
    const getFYStartDate = (dateStr) => {
      let year;
      if (dateStr && dateStr !== '') {
        const d = new Date(dateStr);
        if (!isNaN(d.getTime())) {
          // Use the year from the date, but always April 1st
          year = d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear();
        } else {
          const now = new Date();
          year = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
        }
      } else {
        const now = new Date();
        year = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
      }
      return `${year}0401`; // Always April 1st
    };

    const fyDate = getFYStartDate(financialYearFrom);

    // Tally Prime requires this specific XML structure for company creation
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<ENVELOPE>
  <HEADER>
    <VERSION>1</VERSION>
    <TALLYREQUEST>Import</TALLYREQUEST>
    <TYPE>Data</TYPE>
    <ID>All Masters</ID>
  </HEADER>
  <BODY>
    <DESC>
      <STATICVARIABLES>
        <IMPORTDUPS>@@DUPCREATE</IMPORTDUPS>
      </STATICVARIABLES>
    </DESC>
    <DATA>
      <TALLYMESSAGE xmlns:UDF="TallyUDF">
        <COMPANY NAME="${escapeXML(name)}" ACTION="Create">
          <NAME.LIST>
            <NAME>${escapeXML(name)}</NAME>
          </NAME.LIST>
          <STARTINGFROM TYPE="Date">${fyDate}</STARTINGFROM>
          <BOOKSFROM TYPE="Date">${fyDate}</BOOKSFROM>
          <COMPANYNUMBER></COMPANYNUMBER>
          <COUNTRYNAME>${escapeXML(country || 'India')}</COUNTRYNAME>
          <STATENAME>${escapeXML(state || 'Maharashtra')}</STATENAME>
          <PINCODE>${escapeXML(pincode || '')}</PINCODE>
          <EMAIL>${escapeXML(email || '')}</EMAIL>
          <MOBILENUMBER>${escapeXML(phone || '')}</MOBILENUMBER>
          <ADDRESS.LIST TYPE="String">
            <ADDRESS>${escapeXML(address || '')}</ADDRESS>
          </ADDRESS.LIST>
          <BASECURRENCYNAME>₹</BASECURRENCYNAME>
          <CURRENCYNAME>INR</CURRENCYNAME>
          <BASICCURRENCYCODE>INR</BASICCURRENCYCODE>
          <ISINDIANGST>Yes</ISINDIANGST>
          <ISPERPETUALDATASET>Yes</ISPERPETUALDATASET>
        </COMPANY>
      </TALLYMESSAGE>
    </DATA>
  </BODY>
</ENVELOPE>`;

    logger.debug('Creating company with XML', {
      company: name,
      fyDate: fyDate,
      state: state
    });

    const response = await fetch(TALLY_PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/xml' },
      body: xml
    });

    const result = await response.text();
    logger.debug('Create company response', { response: result.substring(0, 500) });

    // Check for errors
    if (result.includes('LINEERROR') || result.includes('<ERROR>')) {
      const errorMatch = result.match(/<LINEERROR>(.*?)<\/LINEERROR>/s) ||
        result.match(/<ERROR>(.*?)<\/ERROR>/s);
      const errorMsg = errorMatch ? errorMatch[1].replace(/&apos;/g, "'").replace(/&quot;/g, '"').trim() : 'Failed to create company';
      throw new Error(errorMsg);
    }

    // Check for success
    if (result.includes('CREATED') || result.includes('IMPORTED') ||
      result.includes('<LASTVCHID>') ||
      (result.includes('<ENVELOPE>') && !result.includes('ERROR') && !result.includes('LINEERROR'))) {
      return { success: true, message: `Company "${name}" created successfully. Financial Year: April 1, ${fyDate.substring(0, 4)}` };
    }

    throw new Error('No success confirmation from Tally');
  } catch (error) {
    logger.error('Failed to create company', error);
    throw error;
  }
};

/**
 * Get vouchers from Tally
 * Uses Export Data format with Payment/Receipt Vouchers reports
 * Verified working via terminal tests on 2025-12-27
 * @param {string} companyName - Company name
 * @param {string} voucherType - Type of voucher (Payment, Receipt, etc.) - optional
 * @returns {Promise<Array>} List of vouchers
 */
export const getVouchers = async (companyName, voucherType = '') => {
  try {
    logger.tallyOperation('getVouchers', { company: companyName, type: voucherType });

    if (mockMode) {
      return [
        { date: '2024-04-01', voucherNumber: 'PMT-001', type: 'Payment', amount: 5000, narration: 'Office Rent', ledgerName: 'Bank Account', allLedgers: ['Bank Account', 'Office Rent'] },
        { date: '2024-04-02', voucherNumber: 'RCT-001', type: 'Receipt', amount: 15000, narration: 'Sales Revenue', ledgerName: 'Bank Account', allLedgers: ['Bank Account', 'Sales Account'] }
      ];
    }

    // Fetch both Payment and Receipt vouchers using Export Data format
    // This format is verified working via terminal tests
    const voucherTypes = voucherType ? [voucherType] : ['Payment', 'Receipt'];
    const allVouchers = [];

    for (const type of voucherTypes) {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<ENVELOPE>
<HEADER>
<TALLYREQUEST>Export Data</TALLYREQUEST>
</HEADER>
<BODY>
<EXPORTDATA>
<REQUESTDESC>
<REPORTNAME>${escapeXML(type)} Vouchers</REPORTNAME>
<STATICVARIABLES>
<SVCURRENTCOMPANY>${escapeXML(companyName)}</SVCURRENTCOMPANY>
</STATICVARIABLES>
</REQUESTDESC>
</EXPORTDATA>
</BODY>
</ENVELOPE>`;

      const response = await fetch(TALLY_PROXY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/xml' },
        body: xml
      });

      const xmlText = await response.text();
      console.log(`[Tally] ${type} vouchers response length:`, xmlText.length);

      const vouchers = parseVouchersFromXML(xmlText, type);
      console.log(`[Tally] Parsed ${type} vouchers:`, vouchers.length);
      allVouchers.push(...vouchers);
    }

    logger.info('Fetched vouchers from Tally', { count: allVouchers.length });
    return allVouchers;
  } catch (error) {
    logger.error('Failed to get vouchers', error);
    throw error;
  }
};

/**
 * Parse vouchers from XML response
 * @param {string} xml - XML response from Tally
 * @param {string} defaultType - Default voucher type if not found in XML (Payment/Receipt)
 */
const parseVouchersFromXML = (xml, defaultType = '') => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'text/xml');
  const vouchers = [];

  // Try multiple ways to find voucher nodes
  let voucherNodes = doc.querySelectorAll('VOUCHER');

  // If no vouchers found with querySelectorAll, try getElementsByTagName
  if (voucherNodes.length === 0) {
    voucherNodes = doc.getElementsByTagName('VOUCHER');
  }

  console.log(`[Tally] Found VOUCHER nodes: ${voucherNodes.length} (defaultType: ${defaultType})`);

  Array.from(voucherNodes).forEach((node, idx) => {
    // Get the raw XML of this voucher node for parsing
    const voucherXml = node.outerHTML || '';

    // Get date - try multiple sources
    let date = node.querySelector('DATE')?.textContent ||
      node.getAttribute('DATE') || '';
    // Convert YYYYMMDD to YYYY-MM-DD if needed
    if (date.length === 8 && !date.includes('-')) {
      date = `${date.substring(0, 4)}-${date.substring(4, 6)}-${date.substring(6, 8)}`;
    }

    // Get voucher type - try multiple locations, fallback to defaultType
    const voucherType = node.querySelector('VOUCHERTYPENAME')?.textContent ||
      node.getAttribute('VOUCHERTYPENAME') ||
      node.getAttribute('VCHTYPE') ||
      defaultType;

    // Get voucher number - try multiple locations
    const voucherNumber = node.querySelector('VOUCHERNUMBER')?.textContent ||
      node.getAttribute('VOUCHERNUMBER') ||
      node.querySelector('NUMBER')?.textContent || '';

    // Get narration
    const narration = node.querySelector('NARRATION')?.textContent || '';

    // Collect all ledger names using regex on raw XML (more reliable for Tally XML)
    const allLedgers = [];
    const ledgerEntries = [];

    // Method 1: Extract LEDGERNAME from raw XML using regex
    const ledgerNameRegex = /<LEDGERNAME>([^<]+)<\/LEDGERNAME>/gi;
    let match;
    while ((match = ledgerNameRegex.exec(voucherXml)) !== null) {
      const ledgerName = match[1].trim();
      if (ledgerName && !allLedgers.includes(ledgerName)) {
        allLedgers.push(ledgerName);
      }
    }

    // Method 2: Extract ledger entries with amounts using regex
    const entryRegex = /<ALLLEDGERENTRIES\.LIST[^>]*>[\s\S]*?<LEDGERNAME>([^<]+)<\/LEDGERNAME>[\s\S]*?<AMOUNT>([^<]+)<\/AMOUNT>[\s\S]*?<\/ALLLEDGERENTRIES\.LIST>/gi;
    while ((match = entryRegex.exec(voucherXml)) !== null) {
      const ledgerName = match[1].trim();
      const amount = parseFloat(match[2]) || 0;
      ledgerEntries.push({ ledgerName, amount });
      if (ledgerName && !allLedgers.includes(ledgerName)) {
        allLedgers.push(ledgerName);
      }
    }

    // Method 3: Also try simpler pattern for ledger entries
    const simpleEntryRegex = /<LEDGERNAME>([^<]+)<\/LEDGERNAME>[\s\S]*?<AMOUNT>([^<]+)<\/AMOUNT>/gi;
    while ((match = simpleEntryRegex.exec(voucherXml)) !== null) {
      const ledgerName = match[1].trim();
      const amount = parseFloat(match[2]) || 0;
      const exists = ledgerEntries.some(e => e.ledgerName === ledgerName);
      if (!exists) {
        ledgerEntries.push({ ledgerName, amount });
      }
      if (ledgerName && !allLedgers.includes(ledgerName)) {
        allLedgers.push(ledgerName);
      }
    }

    // Get party ledger name
    const partyLedger = node.querySelector('PARTYLEDGERNAME')?.textContent?.trim() || '';
    if (partyLedger && !allLedgers.includes(partyLedger)) {
      allLedgers.push(partyLedger);
    }

    // Calculate amount from ledger entries
    let amount = 0;
    if (ledgerEntries.length > 0) {
      // Use absolute max from ledger entries (the main transaction amount)
      amount = Math.max(...ledgerEntries.map(e => Math.abs(e.amount)));
    }

    // Fallback to AMOUNT element
    if (amount === 0) {
      const amountNode = node.querySelector('AMOUNT');
      if (amountNode) {
        amount = Math.abs(parseFloat(amountNode.textContent || 0));
      }
    }

    // Always add the voucher
    const voucher = {
      voucherNumber,
      date,
      type: voucherType,
      amount,
      narration,
      particularLedger: partyLedger,
      ledgerName: partyLedger || (allLedgers.length > 0 ? allLedgers[0] : ''),
      ledgerEntries,
      allLedgers
    };

    vouchers.push(voucher);

    // Debug first 5 vouchers with full details
    if (idx < 5) {
      console.log(`[Tally] Parsed Voucher ${idx}:`, {
        voucherNumber: voucher.voucherNumber,
        date: voucher.date,
        type: voucher.type,
        amount: voucher.amount,
        allLedgers: voucher.allLedgers,
        ledgerEntriesCount: voucher.ledgerEntries.length,
        ledgerEntries: voucher.ledgerEntries
      });
    }
  });

  console.log('[Tally] Total parsed vouchers:', vouchers.length);
  if (vouchers.length > 0) {
    console.log('[Tally] Sample voucher:', JSON.stringify(vouchers[0], null, 2));
  }

  return vouchers;
};

/**
 * Full sync - sync all data between app and Tally
 * @param {string} companyName - Company name
 * @param {Object} data - Data to sync (transactions, ledgers, etc.)
 * @returns {Promise<Object>} Sync result
 */
export const fullSync = async (companyName, data = {}) => {
  const results = {
    companies: { synced: false },
    ledgers: { fetched: 0, created: 0 },
    vouchers: { fetched: 0, created: 0 },
    errors: []
  };

  try {
    logger.info('Starting full sync', { company: companyName });

    // Step 1: Verify connection
    const connection = await checkConnection();
    if (!connection.connected) {
      throw new Error('Tally is not connected');
    }
    results.companies.synced = true;

    // Step 2: Ensure basic ledgers exist
    try {
      const ledgerResult = await ensureBasicLedgers(companyName);
      results.ledgers.created = ledgerResult.created || 0;
    } catch (e) {
      results.errors.push({ type: 'ledgers', error: e.message });
    }

    // Step 3: Get all ledgers
    try {
      const ledgers = await getLedgers(companyName);
      results.ledgers.fetched = ledgers.length;
    } catch (e) {
      results.errors.push({ type: 'ledgers', error: e.message });
    }

    // Step 4: Push transactions if provided
    if (data.transactions && data.transactions.length > 0) {
      try {
        const pendingTxns = data.transactions.filter(t => !t.syncedToTally);
        if (pendingTxns.length > 0) {
          const pushResult = await batchPushToTally(pendingTxns, companyName, data.bankLedger || 'Bank Account');
          results.vouchers.created = pushResult.success;
          if (pushResult.errors.length > 0) {
            results.errors.push(...pushResult.errors.map(e => ({ type: 'voucher', error: e.error })));
          }
        }
      } catch (e) {
        results.errors.push({ type: 'vouchers', error: e.message });
      }
    }

    // Step 5: Get existing vouchers
    try {
      const vouchers = await getVouchers(companyName);
      results.vouchers.fetched = vouchers.length;
    } catch (e) {
      results.errors.push({ type: 'vouchers', error: e.message });
    }

    logger.info('Full sync complete', results);
    return {
      success: results.errors.length === 0,
      ...results
    };
  } catch (error) {
    logger.error('Full sync failed', error);
    throw error;
  }
};

/**
 * Create Sales Voucher XML for Tally Prime
 * Supports GST vouchers with party ledger, sales account, and tax ledgers
 * @param {Object} entry - Sales entry data
 * @param {string} companyName - Company name
 * @returns {string} XML string
 */
const createSalesVoucherXML = (entry, companyName) => {
  const date = formatTallyDate(entry.date);
  const narration = escapeXML(entry.description || `Sales Invoice ${entry.invoiceNo || ''}`);
  const partyLedger = escapeXML(entry.customerLedger || entry.customer || 'Sundry Debtors');
  const salesLedger = escapeXML(entry.salesLedger || 'Sales Account');
  const amount = parseFloat(entry.amount) || 0;
  const gstRate = parseFloat(entry.gstRate) || 0;
  const gstAmount = amount * (gstRate / 100);
  const totalAmount = amount + gstAmount;

  // GST ledgers (CGST + SGST for intra-state, IGST for inter-state)
  const isInterState = entry.isInterState || false;
  const cgstLedger = escapeXML(entry.cgstLedger || 'Output CGST');
  const sgstLedger = escapeXML(entry.sgstLedger || 'Output SGST');
  const igstLedger = escapeXML(entry.igstLedger || 'Output IGST');

  let gstEntries = '';
  if (gstRate > 0) {
    if (isInterState) {
      // IGST for inter-state
      gstEntries = `
<ALLLEDGERENTRIES.LIST>
<LEDGERNAME>${igstLedger}</LEDGERNAME>
<ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
<AMOUNT>-${gstAmount.toFixed(2)}</AMOUNT>
</ALLLEDGERENTRIES.LIST>`;
    } else {
      // CGST + SGST for intra-state (split equally)
      const halfGst = (gstAmount / 2).toFixed(2);
      gstEntries = `
<ALLLEDGERENTRIES.LIST>
<LEDGERNAME>${cgstLedger}</LEDGERNAME>
<ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
<AMOUNT>-${halfGst}</AMOUNT>
</ALLLEDGERENTRIES.LIST>
<ALLLEDGERENTRIES.LIST>
<LEDGERNAME>${sgstLedger}</LEDGERNAME>
<ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
<AMOUNT>-${halfGst}</AMOUNT>
</ALLLEDGERENTRIES.LIST>`;
    }
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<ENVELOPE>
<HEADER>
<TALLYREQUEST>Import Data</TALLYREQUEST>
</HEADER>
<BODY>
<IMPORTDATA>
<REQUESTDESC>
<REPORTNAME>Vouchers</REPORTNAME>
<STATICVARIABLES>
<SVCURRENTCOMPANY>${escapeXML(companyName)}</SVCURRENTCOMPANY>
</STATICVARIABLES>
</REQUESTDESC>
<REQUESTDATA>
<TALLYMESSAGE xmlns:UDF="TallyUDF">
<VOUCHER VCHTYPE="Sales" ACTION="Create">
<DATE>${date}</DATE>
<VOUCHERTYPENAME>Sales</VOUCHERTYPENAME>
<PARTYLEDGERNAME>${partyLedger}</PARTYLEDGERNAME>
<NARRATION>${narration}</NARRATION>
<VOUCHERNUMBER>${escapeXML(entry.invoiceNo || '')}</VOUCHERNUMBER>
<ALLLEDGERENTRIES.LIST>
<LEDGERNAME>${partyLedger}</LEDGERNAME>
<ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
<AMOUNT>-${totalAmount.toFixed(2)}</AMOUNT>
</ALLLEDGERENTRIES.LIST>
<ALLLEDGERENTRIES.LIST>
<LEDGERNAME>${salesLedger}</LEDGERNAME>
<ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
<AMOUNT>${amount.toFixed(2)}</AMOUNT>
</ALLLEDGERENTRIES.LIST>${gstEntries}
</VOUCHER>
</TALLYMESSAGE>
</REQUESTDATA>
</IMPORTDATA>
</BODY>
</ENVELOPE>`;
};

/**
 * Create Purchase Voucher XML for Tally Prime
 * Supports GST vouchers with party ledger, purchase account, and input tax ledgers
 * @param {Object} entry - Purchase entry data
 * @param {string} companyName - Company name
 * @returns {string} XML string
 */
const createPurchaseVoucherXML = (entry, companyName) => {
  const date = formatTallyDate(entry.date);
  const narration = escapeXML(entry.description || `Purchase Invoice ${entry.invoiceNo || ''}`);
  const partyLedger = escapeXML(entry.vendorLedger || entry.vendor || 'Sundry Creditors');
  const purchaseLedger = escapeXML(entry.purchaseLedger || 'Purchase Account');
  const amount = parseFloat(entry.amount) || 0;
  const gstRate = parseFloat(entry.gstRate) || 0;
  const gstAmount = amount * (gstRate / 100);
  const totalAmount = amount + gstAmount;

  // Input GST ledgers
  const isInterState = entry.isInterState || false;
  const cgstLedger = escapeXML(entry.cgstLedger || 'Input CGST');
  const sgstLedger = escapeXML(entry.sgstLedger || 'Input SGST');
  const igstLedger = escapeXML(entry.igstLedger || 'Input IGST');

  let gstEntries = '';
  if (gstRate > 0) {
    if (isInterState) {
      // IGST for inter-state
      gstEntries = `
<ALLLEDGERENTRIES.LIST>
<LEDGERNAME>${igstLedger}</LEDGERNAME>
<ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
<AMOUNT>-${gstAmount.toFixed(2)}</AMOUNT>
</ALLLEDGERENTRIES.LIST>`;
    } else {
      // CGST + SGST for intra-state (split equally)
      const halfGst = (gstAmount / 2).toFixed(2);
      gstEntries = `
<ALLLEDGERENTRIES.LIST>
<LEDGERNAME>${cgstLedger}</LEDGERNAME>
<ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
<AMOUNT>-${halfGst}</AMOUNT>
</ALLLEDGERENTRIES.LIST>
<ALLLEDGERENTRIES.LIST>
<LEDGERNAME>${sgstLedger}</LEDGERNAME>
<ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
<AMOUNT>-${halfGst}</AMOUNT>
</ALLLEDGERENTRIES.LIST>`;
    }
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<ENVELOPE>
<HEADER>
<TALLYREQUEST>Import Data</TALLYREQUEST>
</HEADER>
<BODY>
<IMPORTDATA>
<REQUESTDESC>
<REPORTNAME>Vouchers</REPORTNAME>
<STATICVARIABLES>
<SVCURRENTCOMPANY>${escapeXML(companyName)}</SVCURRENTCOMPANY>
</STATICVARIABLES>
</REQUESTDESC>
<REQUESTDATA>
<TALLYMESSAGE xmlns:UDF="TallyUDF">
<VOUCHER VCHTYPE="Purchase" ACTION="Create">
<DATE>${date}</DATE>
<VOUCHERTYPENAME>Purchase</VOUCHERTYPENAME>
<PARTYLEDGERNAME>${partyLedger}</PARTYLEDGERNAME>
<NARRATION>${narration}</NARRATION>
<VOUCHERNUMBER>${escapeXML(entry.invoiceNo || '')}</VOUCHERNUMBER>
<ALLLEDGERENTRIES.LIST>
<LEDGERNAME>${partyLedger}</LEDGERNAME>
<ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
<AMOUNT>${totalAmount.toFixed(2)}</AMOUNT>
</ALLLEDGERENTRIES.LIST>
<ALLLEDGERENTRIES.LIST>
<LEDGERNAME>${purchaseLedger}</LEDGERNAME>
<ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
<AMOUNT>-${amount.toFixed(2)}</AMOUNT>
</ALLLEDGERENTRIES.LIST>${gstEntries}
</VOUCHER>
</TALLYMESSAGE>
</REQUESTDATA>
</IMPORTDATA>
</BODY>
</ENVELOPE>`;
};

/**
 * Push Sales entry to Tally
 * @param {Object} entry - Sales entry with customer, amount, gstRate, etc.
 * @param {string} companyName - Tally company name
 * @returns {Promise<Object>} Result
 */
export const pushSalesEntry = async (entry, companyName) => {
  try {
    logger.tallyOperation('pushSalesEntry', { company: companyName, amount: entry.totalAmount });

    if (mockMode) {
      await new Promise(resolve => setTimeout(resolve, 200));
      return { success: true, voucherId: `SALE-${Date.now()}` };
    }

    const xml = createSalesVoucherXML(entry, companyName);
    logger.debug('Sales voucher XML', { xml: xml.substring(0, 500) });

    const response = await fetch(TALLY_PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/xml' },
      body: xml
    });

    const result = await response.text();
    console.log('[TallyService] Sales voucher response:', result);
    logger.debug('Sales voucher response', { response: result });

    // Check for specific errors first
    if (result.includes('LINEERROR')) {
      const errorMatch = result.match(/<LINEERROR>(.*?)<\/LINEERROR>/s);
      throw new Error(errorMatch ? errorMatch[1].trim() : 'Line error in voucher');
    }

    if (result.includes('<ERROR>')) {
      const errorMatch = result.match(/<ERROR>(.*?)<\/ERROR>/s);
      throw new Error(errorMatch ? errorMatch[1].trim() : 'Tally error');
    }

    // Check if ledger doesn't exist
    if (result.includes('does not exist') || result.includes('not found') || result.includes('Cannot find')) {
      throw new Error('Ledger not found in Tally. Please ensure the customer and sales ledgers exist.');
    }

    // Check for actual success - must have CREATED or LASTVCHID
    if (result.includes('CREATED="1"') || result.includes('<LASTVCHID>')) {
      const voucherIdMatch = result.match(/<LASTVCHID>(\d+)<\/LASTVCHID>/);
      return {
        success: true,
        voucherId: voucherIdMatch ? voucherIdMatch[1] : 'Created',
        message: 'Sales voucher created successfully'
      };
    }

    // Check for CREATED attribute in response
    const createdMatch = result.match(/CREATED="(\d+)"/);
    if (createdMatch && parseInt(createdMatch[1]) > 0) {
      return {
        success: true,
        voucherId: 'Created',
        message: 'Sales voucher created successfully'
      };
    }

    // If response has ENVELOPE but no success indicator, likely an error
    throw new Error('Voucher creation failed - check that ledgers exist in Tally');
  } catch (error) {
    logger.error('Failed to push sales entry', { error: error.message });
    throw error;
  }
};

/**
 * Push Purchase entry to Tally
 * @param {Object} entry - Purchase entry with vendor, amount, gstRate, etc.
 * @param {string} companyName - Tally company name
 * @returns {Promise<Object>} Result
 */
export const pushPurchaseEntry = async (entry, companyName) => {
  try {
    logger.tallyOperation('pushPurchaseEntry', { company: companyName, amount: entry.totalAmount });

    if (mockMode) {
      await new Promise(resolve => setTimeout(resolve, 200));
      return { success: true, voucherId: `PUR-${Date.now()}` };
    }

    const xml = createPurchaseVoucherXML(entry, companyName);
    logger.debug('Purchase voucher XML', { xml: xml.substring(0, 500) });

    const response = await fetch(TALLY_PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/xml' },
      body: xml
    });

    const result = await response.text();
    logger.debug('Purchase voucher response', { response: result.substring(0, 500) });

    // Check for errors
    if (result.includes('LINEERROR') || result.includes('<ERROR>')) {
      const errorMatch = result.match(/<LINEERROR>(.*?)<\/LINEERROR>/s) ||
        result.match(/<ERROR>(.*?)<\/ERROR>/s);
      throw new Error(errorMatch ? errorMatch[1].trim() : 'Failed to create purchase voucher');
    }

    // Check for success
    if (result.includes('CREATED') || result.includes('<LASTVCHID>') ||
      result.includes('IMPORTED') || result.includes('<ENVELOPE>')) {
      const voucherIdMatch = result.match(/<LASTVCHID>(\d+)<\/LASTVCHID>/);
      return {
        success: true,
        voucherId: voucherIdMatch ? voucherIdMatch[1] : 'Created',
        message: 'Purchase voucher created successfully'
      };
    }

    throw new Error('No success confirmation from Tally');
  } catch (error) {
    logger.error('Failed to push purchase entry', { error: error.message });
    throw error;
  }
};

/**
 * Batch push Sales entries to Tally
 * @param {Array} entries - Array of sales entries
 * @param {string} companyName - Tally company name
 * @returns {Promise<Object>} Batch result
 */
export const batchPushSales = async (entries, companyName) => {
  const results = { success: 0, failed: 0, errors: [] };

  logger.info('Starting batch sales push', { count: entries.length, company: companyName });

  for (const entry of entries) {
    try {
      await pushSalesEntry(entry, companyName);
      results.success++;
    } catch (error) {
      results.failed++;
      results.errors.push({
        invoiceNo: entry.invoiceNo,
        customer: entry.customer,
        error: error.message
      });
    }
  }

  logger.info('Batch sales push complete', results);
  return results;
};

/**
 * Batch push Purchase entries to Tally
 * @param {Array} entries - Array of purchase entries
 * @param {string} companyName - Tally company name
 * @returns {Promise<Object>} Batch result
 */
export const batchPushPurchases = async (entries, companyName) => {
  const results = { success: 0, failed: 0, errors: [] };

  logger.info('Starting batch purchase push', { count: entries.length, company: companyName });

  for (const entry of entries) {
    try {
      await pushPurchaseEntry(entry, companyName);
      results.success++;
    } catch (error) {
      results.failed++;
      results.errors.push({
        invoiceNo: entry.invoiceNo,
        vendor: entry.vendor,
        error: error.message
      });
    }
  }

  logger.info('Batch purchase push complete', results);
  return results;
};

export default {
  checkConnection,
  setMockMode,
  isMockMode,
  getCompanies,
  createCompany,
  getLedgers,
  createLedger,
  createMultipleLedgers,
  ensureBasicLedgers,
  getVouchers,
  pushToTally,
  batchPushToTally,
  pushSalesEntry,
  pushPurchaseEntry,
  batchPushSales,
  batchPushPurchases,
  fullSync,
  getActiveCompany
};
