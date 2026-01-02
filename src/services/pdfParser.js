/**
 * AI Tally Sync - PDF Parser Service
 * Parses PDF bank statements using pdf.js
 * Falls back to AI extraction when structured parsing fails
 */

import * as pdfjsLib from 'pdfjs-dist';
import { BANK_TEMPLATES } from '../utils/constants';
import { extractTransactionsFromPDFText } from './openaiService';

// Configure PDF.js worker for version 5.x
// Use jsdelivr CDN with the exact version and correct path for v5.x build structure
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@5.4.449/build/pdf.worker.min.mjs';

/**
 * Bank detection patterns for PDF statements
 */
const BANK_PDF_PATTERNS = {
    SBI: ['state bank of india', 'sbi', 'sbintouch'],
    HDFC: ['hdfc bank', 'hdfcbank'],
    ICICI: ['icici bank', 'icicibank'],
    AXIS: ['axis bank', 'axisbank'],
    KOTAK: ['kotak mahindra', 'kotak bank'],
    PNB: ['punjab national bank', 'pnb'],
    BOB: ['bank of baroda', 'bob'],
    CANARA: ['canara bank'],
    UNION: ['union bank of india'],
    IDBI: ['idbi bank'],
    INDUSIND: ['indusind bank'],
    YES: ['yes bank'],
    FEDERAL: ['federal bank'],
};

/**
 * Parse PDF file and extract text content
 * Uses structured extraction first, falls back to AI if no transactions found
 * @param {File|ArrayBuffer} pdfInput - PDF file or ArrayBuffer
 * @returns {Promise<Object>} Parsed content with text and detected bank
 */
export const parsePDF = async (pdfInput) => {
    try {
        // Convert File to ArrayBuffer if needed
        let arrayBuffer;
        if (pdfInput instanceof File) {
            arrayBuffer = await pdfInput.arrayBuffer();
        } else {
            arrayBuffer = pdfInput;
        }

        console.log('[PDF Parser] Loading PDF document...');

        // Load PDF document
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const numPages = pdf.numPages;

        console.log('[PDF Parser] PDF has', numPages, 'pages');

        const allText = [];
        const allItems = [];

        // Extract text from all pages
        for (let pageNum = 1; pageNum <= numPages; pageNum++) {
            const page = await pdf.getPage(pageNum);
            const textContent = await page.getTextContent();

            // Get text items with their positions
            const pageItems = textContent.items.map(item => ({
                text: item.str,
                x: item.transform[4],
                y: item.transform[5],
                width: item.width,
                height: item.height,
                page: pageNum
            }));

            allItems.push(...pageItems);
            allText.push(textContent.items.map(item => item.str).join(' '));
        }

        const fullText = allText.join('\n');
        console.log('[PDF Parser] Extracted', fullText.length, 'characters of text');

        if (fullText.length < 50) {
            console.log('[PDF Parser] PDF text too short, may be image-based PDF');
            return {
                success: false,
                error: 'PDF appears to be image-based or empty. Please use a text-based PDF statement.',
                text: fullText,
                transactions: []
            };
        }

        // Detect bank from content
        const detectedBank = detectBankFromText(fullText);
        console.log('[PDF Parser] Detected bank:', detectedBank);

        // Try structured extraction first
        let transactions = extractTransactionsFromPDF(allItems, detectedBank);
        console.log('[PDF Parser] Structured extraction found', transactions.length, 'transactions');

        // If structured extraction failed, try AI extraction with chunking
        if (transactions.length === 0) {
            console.log('[PDF Parser] Structured parsing failed, trying AI extraction...');

            try {
                // Process in chunks for large documents
                const chunkSize = 6000;
                const chunks = [];

                for (let i = 0; i < fullText.length; i += chunkSize) {
                    chunks.push(fullText.substring(i, i + chunkSize));
                }

                console.log('[PDF Parser] Processing', chunks.length, 'text chunks');

                // Process first 2 chunks only to avoid timeout
                const chunksToProcess = chunks.slice(0, 2);

                for (let i = 0; i < chunksToProcess.length; i++) {
                    console.log('[PDF Parser] Processing chunk', i + 1, 'of', chunksToProcess.length);
                    const chunkTransactions = await extractTransactionsFromPDFText(chunksToProcess[i]);
                    if (chunkTransactions && chunkTransactions.length > 0) {
                        transactions.push(...chunkTransactions);
                        console.log('[PDF Parser] Chunk', i + 1, 'yielded', chunkTransactions.length, 'transactions');
                    }
                }

                console.log('[PDF Parser] AI extraction total:', transactions.length, 'transactions');
            } catch (aiError) {
                console.error('[PDF Parser] AI extraction failed:', aiError.message);
            }
        }

        // If still no transactions, log sample text for debugging
        if (transactions.length === 0) {
            console.log('[PDF Parser] No transactions extracted. Sample text (first 2000 chars):');
            console.log(fullText.substring(0, 2000));
        }

        return {
            success: true,
            text: fullText,
            detectedBank,
            transactions,
            pageCount: numPages,
            rawItems: allItems,
            usedAI: transactions.length > 0 && transactions[0]?.source === 'ai-pdf'
        };
    } catch (error) {
        console.error('PDF parsing error:', error);
        return {
            success: false,
            error: error.message,
            text: '',
            transactions: []
        };
    }
};

/**
 * Detect bank from PDF text content
 * @param {string} text - Full text from PDF
 * @returns {string|null} Detected bank key or null
 */
const detectBankFromText = (text) => {
    const lowerText = text.toLowerCase();

    for (const [bankKey, patterns] of Object.entries(BANK_PDF_PATTERNS)) {
        for (const pattern of patterns) {
            if (lowerText.includes(pattern)) {
                return bankKey;
            }
        }
    }

    return 'GENERIC';
};

/**
 * Extract transactions from PDF items
 * Groups items by Y-coordinate to form rows
 * @param {Array} items - PDF text items with positions
 * @param {string} bankKey - Detected bank key
 * @returns {Array} Extracted transactions
 */
const extractTransactionsFromPDF = (items, bankKey) => {
    if (!items || items.length === 0) return [];

    console.log('[PDF Parser] Starting structured extraction with', items.length, 'items');

    // Group items by approximate Y position (same row)
    const rowTolerance = 5;
    const rows = [];
    let currentRow = [];
    let currentY = null;

    // Sort by page, then Y (descending - PDF coordinates start from bottom)
    const sortedItems = [...items].sort((a, b) => {
        if (a.page !== b.page) return a.page - b.page;
        return b.y - a.y;
    });

    for (const item of sortedItems) {
        if (currentY === null || Math.abs(item.y - currentY) <= rowTolerance) {
            currentRow.push(item);
            currentY = item.y;
        } else {
            if (currentRow.length > 0) {
                // Sort row by X position (left to right)
                currentRow.sort((a, b) => a.x - b.x);
                rows.push(currentRow);
            }
            currentRow = [item];
            currentY = item.y;
        }
    }

    // Don't forget the last row
    if (currentRow.length > 0) {
        currentRow.sort((a, b) => a.x - b.x);
        rows.push(currentRow);
    }

    console.log('[PDF Parser] Formed', rows.length, 'rows from items');

    // Convert rows to text
    const textRows = rows.map(row =>
        row.map(item => item.text.trim()).filter(t => t.length > 0)
    );

    // Find transaction rows based on patterns
    const transactions = [];

    // Multiple date patterns for Indian bank statements
    const datePatterns = [
        /^\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4}$/,          // DD/MM/YYYY or DD-MM-YYYY
        /^\d{1,2}[-\/]\d{1,2}[-\/]\d{2}$/,             // DD/MM/YY
        /^\d{1,2}\s+[A-Za-z]{3}\s+\d{2,4}$/,           // DD MMM YYYY (e.g., 01 Jan 2024)
        /^\d{1,2}[A-Za-z]{3}\d{2,4}$/,                 // DDMmmYYYY (e.g., 01Jan2024)
        /^\d{1,2}\.\d{1,2}\.\d{2,4}$/,                 // DD.MM.YYYY
        /^\d{8}$/,                                      // DDMMYYYY or YYYYMMDD
    ];

    // Check if text matches any date pattern
    const isDateLike = (text) => {
        return datePatterns.some(pattern => pattern.test(text.trim()));
    };

    let skippedRows = 0;
    for (const row of textRows) {
        const rowText = row.join(' ').toLowerCase();

        // Skip header rows and empty rows
        if (row.length < 3) {
            skippedRows++;
            continue;
        }
        if (rowText.includes('date') && (rowText.includes('description') || rowText.includes('particular'))) continue;
        if (rowText.includes('opening balance')) continue;
        if (rowText.includes('closing balance')) continue;
        if (rowText.includes('page no')) continue;
        if (rowText.includes('statement of')) continue;

        // Look for date in any column (first few)
        const hasDate = row.slice(0, 3).some(cell => isDateLike(cell));

        // Look for amounts (debit/credit)
        const amounts = row.filter(cell => {
            const cleaned = cell.replace(/,/g, '').replace(/Dr\.?|Cr\.?/gi, '').trim();
            return !isNaN(parseFloat(cleaned)) && parseFloat(cleaned) > 0;
        });

        if (hasDate && amounts.length > 0) {
            const transaction = parseTransactionRow(row, bankKey);
            if (transaction) {
                transactions.push(transaction);
            }
        }
    }

    console.log('[PDF Parser] Extracted', transactions.length, 'transactions, skipped', skippedRows, 'short rows');

    return transactions;
};

/**
 * Parse a single transaction row
 * @param {Array} row - Array of cell texts
 * @param {string} bankKey - Bank key for template
 * @returns {Object|null} Parsed transaction
 */
const parseTransactionRow = (row, bankKey) => {
    const datePattern = /^\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4}$/;

    let date = '';
    let description = '';
    let debit = 0;
    let credit = 0;
    let balance = 0;
    let reference = '';

    for (let i = 0; i < row.length; i++) {
        const cell = row[i].trim();

        // Check if it's a date
        if (datePattern.test(cell) && !date) {
            date = cell;
            continue;
        }

        // Check if it's an amount
        const cleanedAmount = cell.replace(/,/g, '').replace(/Dr\.?|Cr\.?/gi, '').trim();
        const numValue = parseFloat(cleanedAmount);

        if (!isNaN(numValue) && numValue > 0) {
            // Determine if debit or credit based on position or keywords
            const cellLower = cell.toLowerCase();

            if (cellLower.includes('dr') || (i === row.length - 3 && !debit)) {
                debit = numValue;
            } else if (cellLower.includes('cr') || (i === row.length - 2 && !credit)) {
                credit = numValue;
            } else if (i === row.length - 1) {
                balance = numValue;
            } else if (!debit && !credit) {
                // Try to determine from context
                if (row.slice(0, i).join(' ').toLowerCase().includes('withdrawal') ||
                    row.slice(0, i).join(' ').toLowerCase().includes('debit')) {
                    debit = numValue;
                } else {
                    credit = numValue;
                }
            }
            continue;
        }

        // Check if it's a reference number
        if (/^[A-Z0-9]{8,}$/.test(cell) && !reference) {
            reference = cell;
            continue;
        }

        // Otherwise it's part of the description
        if (cell && cell.length > 2 && !datePattern.test(cell)) {
            description += (description ? ' ' : '') + cell;
        }
    }

    if (!date || (!debit && !credit)) {
        return null;
    }

    return {
        date,
        dateRaw: date,
        description: description.trim(),
        reference,
        debit,
        credit,
        balance,
        type: credit > 0 ? 'CREDIT' : 'DEBIT',
        amount: credit || debit,
        source: 'pdf'
    };
};

/**
 * Parse password-protected PDF
 * @param {File} file - PDF file
 * @param {string} password - PDF password
 * @returns {Promise<Object>} Parsed content
 */
export const parsePDFWithPassword = async (file, password) => {
    try {
        const arrayBuffer = await file.arrayBuffer();

        const pdf = await pdfjsLib.getDocument({
            data: arrayBuffer,
            password: password
        }).promise;

        // Continue with normal parsing using the unlocked document
        return await parsePDFDocument(pdf);
    } catch (error) {
        if (error.name === 'PasswordException') {
            return {
                success: false,
                error: 'Incorrect password',
                needsPassword: true
            };
        }
        throw error;
    }
};

/**
 * Parse an already loaded PDF document
 * @param {PDFDocumentProxy} pdf - Loaded PDF document
 * @returns {Promise<Object>} Parsed content
 */
const parsePDFDocument = async (pdf) => {
    const numPages = pdf.numPages;
    const allText = [];
    const allItems = [];

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();

        const pageItems = textContent.items.map(item => ({
            text: item.str,
            x: item.transform[4],
            y: item.transform[5],
            width: item.width,
            height: item.height,
            page: pageNum
        }));

        allItems.push(...pageItems);
        allText.push(textContent.items.map(item => item.str).join(' '));
    }

    const fullText = allText.join('\n');
    const detectedBank = detectBankFromText(fullText);
    const transactions = extractTransactionsFromPDF(allItems, detectedBank);

    return {
        success: true,
        text: fullText,
        detectedBank,
        transactions,
        pageCount: numPages,
        rawItems: allItems
    };
};

/**
 * Check if file is a PDF
 * @param {File} file - File to check
 * @returns {boolean}
 */
export const isPDFFile = (file) => {
    return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
};

export default {
    parsePDF,
    parsePDFWithPassword,
    isPDFFile
};
