/**
 * AI Tally Sync - File Parser Service
 * Parse CSV, Excel, and PDF bank statements
 */

import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import logger from '../utils/logger';
import { BANK_TEMPLATES } from '../utils/constants';
import { parseDate, parseCurrency, generateId } from '../utils/helpers';
import { parsePDF, isPDFFile } from './pdfParser';

/**
 * Parse CSV file
 * @param {File} file - CSV file to parse
 * @returns {Promise<Array>} Parsed data array
 */
const parseCSV = (file) => {
    return new Promise((resolve, reject) => {
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            transformHeader: (header) => header.trim(),
            complete: (results) => {
                logger.fileOperation('parse', file.name, {
                    rows: results.data.length,
                    fields: results.meta.fields
                });
                resolve(results.data);
            },
            error: (error) => {
                logger.error('CSV parse error', error);
                reject(error);
            }
        });
    });
};

/**
 * Parse Excel file (xlsx/xls)
 * @param {File} file - Excel file to parse
 * @returns {Promise<Array>} Parsed data array
 */
const parseExcel = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });

                // Get first sheet
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];

                // Convert to JSON
                const jsonData = XLSX.utils.sheet_to_json(worksheet, {
                    raw: false,
                    defval: ''
                });

                logger.fileOperation('parse', file.name, {
                    rows: jsonData.length,
                    sheet: sheetName
                });

                resolve(jsonData);
            } catch (error) {
                logger.error('Excel parse error', error);
                reject(error);
            }
        };

        reader.onerror = () => {
            reject(new Error('Failed to read Excel file'));
        };

        reader.readAsArrayBuffer(file);
    });
};

/**
 * Parse file based on extension
 * Supports CSV, Excel, and PDF
 * @param {File} file - File to parse
 * @param {string} password - Optional password for protected PDFs
 * @returns {Promise<Object>} Parsed data with transactions and metadata
 */
export const parseFile = async (file, password = null) => {
    const extension = file.name.split('.').pop().toLowerCase();

    logger.fileOperation('upload', file.name, {
        size: file.size,
        type: extension
    });

    // Handle PDF files
    if (extension === 'pdf' || isPDFFile(file)) {
        logger.info('Processing PDF file', { name: file.name });
        const pdfResult = await parsePDF(file);

        if (!pdfResult.success) {
            throw new Error(pdfResult.error || 'Failed to parse PDF');
        }

        // Return PDF transactions in a format compatible with existing flow
        return {
            rawData: pdfResult.transactions,
            detectedBank: pdfResult.detectedBank,
            isPDF: true,
            pageCount: pdfResult.pageCount
        };
    }

    // Handle CSV and Excel
    let rawData;
    switch (extension) {
        case 'csv':
            rawData = await parseCSV(file);
            break;
        case 'xlsx':
        case 'xls':
            rawData = await parseExcel(file);
            break;
        default:
            throw new Error(`Unsupported file type: ${extension}. Supported: CSV, Excel, PDF`);
    }

    return {
        rawData,
        detectedBank: null,
        isPDF: false
    };
};

/**
 * Map raw data to standardized transaction format
 * Uses column aliases for intelligent matching
 * @param {Array} rawData - Raw parsed data
 * @param {string} bankTemplate - Bank template key (SBI, HDFC, etc.)
 * @returns {Array} Standardized transactions
 */
export const mapToTransactions = (rawData, bankTemplate) => {
    const template = BANK_TEMPLATES[bankTemplate];

    if (!template) {
        throw new Error(`Unknown bank template: ${bankTemplate}`);
    }

    const { columns, aliases, dateFormat } = template;
    const isAutoMode = template.isAuto || bankTemplate === 'AUTO' || bankTemplate === 'GENERIC';

    // Enhanced smart column finder with broader fuzzy matching for AUTO mode
    const findColumn = (row, columnKey) => {
        const rowKeys = Object.keys(row);

        // First try exact match (case-insensitive)
        const exactMatch = rowKeys.find(k =>
            k.trim().toLowerCase() === columns[columnKey].toLowerCase()
        );
        if (exactMatch && row[exactMatch]) return row[exactMatch];

        // Then try aliases if available (case-insensitive)
        if (aliases && aliases[columnKey]) {
            for (const alias of aliases[columnKey]) {
                const match = rowKeys.find(k =>
                    k.trim().toLowerCase() === alias.toLowerCase()
                );
                if (match && row[match]) return row[match];
            }
        }

        // For AUTO/GENERIC mode, use aggressive fuzzy matching
        const fuzzyPatterns = {
            date: ['date', 'txn', 'trans', 'value', 'posting', 'time', 'dt'],
            description: ['narr', 'desc', 'part', 'detail', 'remark', 'memo', 'particular'],
            reference: ['ref', 'chq', 'cheque', 'utr', 'check', 'trx', 'txn id'],
            debit: ['debit', 'dr', 'withdraw', 'out', 'payment', 'paid'],
            credit: ['credit', 'cr', 'deposit', 'in', 'receipt', 'received'],
            balance: ['balance', 'bal', 'closing', 'running', 'available', 'net']
        };

        if (fuzzyPatterns[columnKey]) {
            for (const pattern of fuzzyPatterns[columnKey]) {
                const match = rowKeys.find(k =>
                    k.trim().toLowerCase().includes(pattern)
                );
                if (match && row[match] !== undefined && row[match] !== '') return row[match];
            }
        }

        // For debit/credit, also check for amount column and determine by sign
        if ((columnKey === 'debit' || columnKey === 'credit') && isAutoMode) {
            // Look for a generic "Amount" column
            const amountMatch = rowKeys.find(k =>
                k.trim().toLowerCase().includes('amount') &&
                !k.trim().toLowerCase().includes('debit') &&
                !k.trim().toLowerCase().includes('credit')
            );
            if (amountMatch && row[amountMatch]) {
                // This will be handled in the mapping logic
                return columnKey === 'debit' ? `__AMOUNT__:${amountMatch}` : '';
            }
        }

        return '';
    };

    // Log sample column matching for debugging
    if (rawData.length > 0) {
        const sampleRow = rawData[0];
        console.log('mapToTransactions sample matching:', {
            rowKeys: Object.keys(sampleRow),
            foundDate: findColumn(sampleRow, 'date'),
            foundDesc: findColumn(sampleRow, 'description'),
            foundDebit: findColumn(sampleRow, 'debit'),
            foundCredit: findColumn(sampleRow, 'credit')
        });
    }

    return rawData.map((row, index) => {
        const dateValue = findColumn(row, 'date');
        const description = findColumn(row, 'description');
        const reference = findColumn(row, 'reference');
        const debitValue = findColumn(row, 'debit');
        const creditValue = findColumn(row, 'credit');
        const balanceValue = findColumn(row, 'balance');

        const debit = parseCurrency(debitValue);
        const credit = parseCurrency(creditValue);

        return {
            id: generateId(),
            index: index + 1,
            date: parseDate(dateValue, dateFormat),
            dateRaw: dateValue,
            description: String(description || '').trim(),
            reference: String(reference || '').trim(),
            debit: debit,
            credit: credit,
            balance: parseCurrency(balanceValue),
            type: credit > 0 ? 'CREDIT' : 'DEBIT',
            amount: credit || debit,
            // AI fields (to be populated later)
            aiCategory: null,
            aiSubcategory: null,
            aiLedgerGroup: null,
            aiSuggestedLedger: null,
            aiConfidence: null,
            // User overrides
            userCategory: null,
            userLedger: null,
            // Status
            status: 'pending', // pending, reviewed, synced
            syncedToTally: false
        };
    }).filter(t => {
        // Filter out empty rows - keep if has any meaningful value
        const hasAmount = t.debit > 0 || t.credit > 0 || t.amount > 0;
        const hasDescription = t.description && t.description.length > 0;
        const hasDate = t.date || t.dateRaw;
        return hasAmount || (hasDescription && hasDate);
    });
};

/**
 * Filter transactions by date range
 * @param {Array} transactions - Transactions to filter
 * @param {Date|string} startDate - Start date
 * @param {Date|string} endDate - End date
 * @returns {Array} Filtered transactions
 */
export const filterByDateRange = (transactions, startDate, endDate) => {
    return transactions.filter(t => {
        if (!t.date) return false;

        const txDate = new Date(t.date);

        if (startDate && txDate < new Date(startDate)) {
            return false;
        }

        if (endDate && txDate > new Date(endDate)) {
            return false;
        }

        return true;
    });
};

/**
 * Sort transactions by date
 * @param {Array} transactions - Transactions to sort
 * @param {string} order - 'asc' or 'desc'
 * @returns {Array} Sorted transactions
 */
export const sortByDate = (transactions, order = 'desc') => {
    return [...transactions].sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return order === 'desc' ? dateB - dateA : dateA - dateB;
    });
};

/**
 * Calculate transaction summary
 * @param {Array} transactions - Transactions to summarize
 * @returns {Object} Summary object
 */
export const calculateSummary = (transactions) => {
    const summary = {
        totalTransactions: transactions.length,
        totalCredit: 0,
        totalDebit: 0,
        netAmount: 0,
        creditCount: 0,
        debitCount: 0,
        categoryBreakdown: {},
        dateRange: {
            start: null,
            end: null
        }
    };

    transactions.forEach(t => {
        // Totals
        if (t.credit > 0) {
            summary.totalCredit += t.credit;
            summary.creditCount++;
        }
        if (t.debit > 0) {
            summary.totalDebit += t.debit;
            summary.debitCount++;
        }

        // Category breakdown
        const category = t.userCategory || t.aiCategory || 'Uncategorized';
        if (!summary.categoryBreakdown[category]) {
            summary.categoryBreakdown[category] = { count: 0, amount: 0 };
        }
        summary.categoryBreakdown[category].count++;
        summary.categoryBreakdown[category].amount += t.amount || 0;

        // Date range
        if (t.date) {
            const date = new Date(t.date);
            if (!summary.dateRange.start || date < summary.dateRange.start) {
                summary.dateRange.start = date;
            }
            if (!summary.dateRange.end || date > summary.dateRange.end) {
                summary.dateRange.end = date;
            }
        }
    });

    summary.netAmount = summary.totalCredit - summary.totalDebit;

    return summary;
};

/**
 * Validate bank statement data
 * @param {Array} data - Parsed data to validate
 * @param {string} bankTemplate - Bank template key
 * @returns {Object} Validation result
 */
export const validateBankStatement = (data, bankTemplate) => {
    const template = BANK_TEMPLATES[bankTemplate];
    const result = {
        isValid: true,
        errors: [],
        warnings: []
    };

    if (!data || data.length === 0) {
        result.isValid = false;
        result.errors.push('File is empty or contains no data');
        return result;
    }

    // Check for expected columns
    const firstRow = data[0];
    const columnKeys = Object.keys(firstRow).map(k => k.toLowerCase().trim());

    const requiredColumns = [
        template.columns.date,
        template.columns.description
    ];

    requiredColumns.forEach(col => {
        if (!columnKeys.some(k => k.includes(col.toLowerCase()))) {
            result.warnings.push(`Column "${col}" not found. Check if bank template is correct.`);
        }
    });

    // Check for amount columns
    const hasDebit = columnKeys.some(k =>
        k.includes(template.columns.debit.toLowerCase())
    );
    const hasCredit = columnKeys.some(k =>
        k.includes(template.columns.credit.toLowerCase())
    );

    if (!hasDebit && !hasCredit) {
        result.isValid = false;
        result.errors.push('No debit or credit columns found');
    }

    // Check data quality
    const emptyDescriptions = data.filter(row => {
        const desc = Object.entries(row).find(([k]) =>
            k.toLowerCase().includes('description') || k.toLowerCase().includes('narration')
        );
        return !desc || !desc[1];
    }).length;

    if (emptyDescriptions > data.length * 0.5) {
        result.warnings.push('More than 50% of transactions have empty descriptions');
    }

    return result;
};

/**
 * Export transactions to CSV
 * @param {Array} transactions - Transactions to export
 * @returns {string} CSV string
 */
export const exportToCSV = (transactions) => {
    const exportData = transactions.map(t => ({
        'Date': t.dateRaw || t.date,
        'Description': t.description,
        'Reference': t.reference,
        'Debit': t.debit || '',
        'Credit': t.credit || '',
        'Balance': t.balance || '',
        'Category': t.userCategory || t.aiCategory || '',
        'Subcategory': t.aiSubcategory || '',
        'Ledger': t.userLedger || t.aiSuggestedLedger || '',
        'Status': t.status
    }));

    return Papa.unparse(exportData);
};

export default {
    parseFile,
    mapToTransactions,
    filterByDateRange,
    sortByDate,
    calculateSummary,
    validateBankStatement,
    exportToCSV
};
