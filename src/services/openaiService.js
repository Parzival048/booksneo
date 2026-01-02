/**
 * AI Tally Sync - OpenAI Service
 * Integration with OpenAI GPT-4o-mini for transaction categorization
 * 
 * Optimized for accuracy and speed
 */

import logger from '../utils/logger';
import { TRANSACTION_CATEGORIES } from '../utils/constants';

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const MODEL = import.meta.env.VITE_OPENAI_MODEL || 'gpt-4o-mini';
const API_KEY = import.meta.env.VITE_OPENAI_API_KEY;
const REQUEST_TIMEOUT = 45000; // 45 seconds timeout

/**
 * Create optimized system prompt for Indian accounting
 */
const getSystemPrompt = () => {
    return `You are an expert Indian accountant categorizing bank transactions for Tally Prime.

CATEGORIES (use exact keys):
- EXPENSE: Business expenses (rent, salary, utilities, office, travel, marketing)
- INCOME: Revenue (sales, interest, commission, refunds)
- TRANSFER: Bank transfers (NEFT, RTGS, IMPS, UPI to self/related parties)
- PURCHASE: Goods/inventory purchases (raw materials, stock)
- SALES: Direct sales revenue
- TAX: Tax payments (GST, TDS, income tax)
- LOAN: Loan disbursements/repayments
- INVESTMENT: Investments, FD, mutual funds

INDIAN BANKING PATTERNS:
- "UPI" = Unified Payment Interface (categorize by merchant/purpose, NOT as TRANSFER unless self-transfer)
- "NEFT/RTGS/IMPS" = Bank transfers
- "ATM" = Cash withdrawal (EXPENSE)
- "ECS/NACH" = Auto-debit (bill payment, loan EMI)
- "INT.PYMT" = Interest payment
- "CHQ" = Cheque transaction

CRITICAL RULES:
1. UPI payments to businesses = EXPENSE or PURCHASE (NOT TRANSFER)
2. Transfers between own accounts = TRANSFER
3. Salary credited = INCOME
4. Salary paid to employees = EXPENSE
5. Look at merchant name after UPI/ to determine category
6. Return results as JSON array

OUTPUT FORMAT:
{"results":[{"i":1,"cat":"EXPENSE","sub":"Office Expenses","led":"Office Expenses","conf":85}]}
- i = transaction index (1-based)
- cat = category key
- sub = subcategory
- led = suggested Tally ledger name
- conf = confidence 0-100`;
};

/**
 * Create compact user prompt
 */
const createUserPrompt = (transactions) => {
    const list = transactions.map((t, i) => {
        const type = t.credit > 0 ? 'CR' : 'DR';
        const amt = Math.abs(t.credit || t.debit || 0);
        const desc = (t.description || '').substring(0, 100);
        return `${i + 1}|${type}|${amt}|${desc}`;
    }).join('\n');

    return `Categorize these Indian bank transactions:\n\n${list}\n\nReturn JSON only.`;
};

/**
 * Call OpenAI API with timeout
 */
const callOpenAI = async (systemPrompt, userPrompt) => {
    if (!API_KEY) {
        throw new Error('OpenAI API key not configured');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    try {
        const startTime = Date.now();

        const response = await fetch(OPENAI_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`
            },
            body: JSON.stringify({
                model: MODEL,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                temperature: 0.1, // Lower temperature for more consistent results
                max_tokens: 3000,
                response_format: { type: 'json_object' }
            }),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        const duration = Date.now() - startTime;
        logger.apiResponse(OPENAI_API_URL, response.status, duration);

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.error?.message || `API error: ${response.status}`);
        }

        return response.json();
    } catch (error) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
            throw new Error('Request timed out');
        }
        throw error;
    }
};

/**
 * Parse OpenAI response
 */
const parseResponse = (response) => {
    try {
        const content = response.choices[0]?.message?.content;
        if (!content) return [];

        const parsed = JSON.parse(content);

        // Handle different response formats
        if (Array.isArray(parsed)) return parsed;
        if (parsed.results) return parsed.results;
        if (parsed.categorizations) return parsed.categorizations;
        if (parsed.transactions) return parsed.transactions;

        // Find any array in response
        const arrayKey = Object.keys(parsed).find(k => Array.isArray(parsed[k]));
        if (arrayKey) return parsed[arrayKey];

        return [];
    } catch (error) {
        logger.error('Failed to parse OpenAI response', error);
        return [];
    }
};

/**
 * Smart rule-based categorization for common patterns
 */
const ruleBasedCategorize = (transaction) => {
    const desc = (transaction.description || '').toLowerCase();
    const isCredit = transaction.credit > 0;

    // Default values
    let category = isCredit ? 'INCOME' : 'EXPENSE';
    let subcategory = isCredit ? 'Other Income' : 'Other Expense';
    let ledger = isCredit ? 'Sales Account' : 'Miscellaneous Expenses';
    let confidence = 60;

    // Salary patterns
    if (desc.includes('salary') || desc.includes('sal cr')) {
        if (isCredit) {
            category = 'INCOME';
            subcategory = 'Salary';
            ledger = 'Salary Income';
            confidence = 95;
        } else {
            category = 'EXPENSE';
            subcategory = 'Salary';
            ledger = 'Salary Expense';
            confidence = 95;
        }
    }
    // Rent patterns
    else if (desc.includes('rent')) {
        category = 'EXPENSE';
        subcategory = 'Rent';
        ledger = 'Rent';
        confidence = 90;
    }
    // Utility patterns
    else if (desc.includes('electric') || desc.includes('power') || desc.includes('bescom')) {
        category = 'EXPENSE';
        subcategory = 'Electricity';
        ledger = 'Electricity Charges';
        confidence = 90;
    }
    // Phone/Internet
    else if (desc.includes('airtel') || desc.includes('jio') || desc.includes('vodafone') || desc.includes('telecom')) {
        category = 'EXPENSE';
        subcategory = 'Communication';
        ledger = 'Telephone Charges';
        confidence = 85;
    }
    // Bank charges
    else if (desc.includes('bank chg') || desc.includes('sms chg') || desc.includes('service charge')) {
        category = 'EXPENSE';
        subcategory = 'Bank Charges';
        ledger = 'Bank Charges';
        confidence = 95;
    }
    // ATM/Cash
    else if (desc.includes('atm') || desc.includes('cash wd')) {
        category = 'EXPENSE';
        subcategory = 'Cash Withdrawal';
        ledger = 'Cash';
        confidence = 90;
    }
    // Interest
    else if (desc.includes('int.') || desc.includes('interest')) {
        if (isCredit) {
            category = 'INCOME';
            subcategory = 'Interest';
            ledger = 'Interest Received';
            confidence = 90;
        } else {
            category = 'EXPENSE';
            subcategory = 'Interest';
            ledger = 'Interest Paid';
            confidence = 90;
        }
    }
    // GST/Tax
    else if (desc.includes('gst') || desc.includes('tds') || desc.includes('income tax')) {
        category = 'TAX';
        subcategory = 'Tax Payment';
        ledger = desc.includes('gst') ? 'GST Payable' : 'TDS Payable';
        confidence = 90;
    }
    // EMI/Loan
    else if (desc.includes('emi') || desc.includes('loan')) {
        category = 'LOAN';
        subcategory = 'Loan Repayment';
        ledger = 'Loan Account';
        confidence = 85;
    }
    // UPI payments - check merchant
    else if (desc.includes('upi')) {
        // Common food/restaurant apps
        if (desc.includes('swiggy') || desc.includes('zomato')) {
            category = 'EXPENSE';
            subcategory = 'Food & Dining';
            ledger = 'Food Expenses';
            confidence = 90;
        }
        // Travel
        else if (desc.includes('uber') || desc.includes('ola') || desc.includes('rapido')) {
            category = 'EXPENSE';
            subcategory = 'Travel';
            ledger = 'Conveyance';
            confidence = 90;
        }
        // Shopping
        else if (desc.includes('amazon') || desc.includes('flipkart') || desc.includes('myntra')) {
            category = 'EXPENSE';
            subcategory = 'Shopping';
            ledger = 'Office Expenses';
            confidence = 75;
        }
        // Generic UPI
        else {
            category = isCredit ? 'INCOME' : 'EXPENSE';
            subcategory = isCredit ? 'UPI Receipt' : 'UPI Payment';
            ledger = isCredit ? 'Sundry Debtors' : 'Sundry Creditors';
            confidence = 60;
        }
    }
    // NEFT/RTGS/IMPS - usually transfers
    else if (desc.includes('neft') || desc.includes('rtgs') || desc.includes('imps')) {
        if (desc.includes('to self') || desc.includes('own a/c')) {
            category = 'TRANSFER';
            subcategory = 'Self Transfer';
            ledger = 'Bank Accounts';
            confidence = 90;
        } else {
            category = isCredit ? 'INCOME' : 'EXPENSE';
            subcategory = 'Bank Transfer';
            ledger = isCredit ? 'Sundry Debtors' : 'Sundry Creditors';
            confidence = 65;
        }
    }

    return {
        aiCategory: category,
        aiSubcategory: subcategory,
        aiSuggestedLedger: ledger,
        aiConfidence: confidence,
        aiNotes: 'Rule-based'
    };
};

/**
 * Categorize transactions using AI with rule-based fallback
 */
export const categorizeTransactions = async (transactions) => {
    if (!transactions || transactions.length === 0) {
        return [];
    }

    logger.info('Starting AI categorization', { count: transactions.length });

    // First pass: Apply rule-based categorization
    const withRules = transactions.map(t => ({
        ...t,
        ...ruleBasedCategorize(t)
    }));

    // If no API key, return rule-based results
    if (!API_KEY) {
        logger.warn('No API key, using rule-based categorization');
        return withRules;
    }

    try {
        // Process in batches for speed
        const BATCH_SIZE = 15;
        const results = [];

        for (let i = 0; i < transactions.length; i += BATCH_SIZE) {
            const batch = transactions.slice(i, i + BATCH_SIZE);
            const batchWithRules = withRules.slice(i, i + BATCH_SIZE);

            try {
                const response = await callOpenAI(getSystemPrompt(), createUserPrompt(batch));
                const categorizations = parseResponse(response);

                // Merge AI results with rule-based
                batch.forEach((transaction, batchIndex) => {
                    const ruleBased = batchWithRules[batchIndex];
                    const aiResult = categorizations.find(c =>
                        c.i === batchIndex + 1 || c.index === batchIndex + 1
                    );

                    if (aiResult && aiResult.conf > ruleBased.aiConfidence) {
                        // AI is more confident - use AI result
                        results.push({
                            ...transaction,
                            aiCategory: aiResult.cat || aiResult.category || ruleBased.aiCategory,
                            aiSubcategory: aiResult.sub || aiResult.subcategory || ruleBased.aiSubcategory,
                            aiSuggestedLedger: aiResult.led || aiResult.ledger || ruleBased.aiSuggestedLedger,
                            aiConfidence: aiResult.conf || aiResult.confidence || ruleBased.aiConfidence,
                            aiNotes: 'AI-categorized'
                        });
                    } else {
                        // Rule-based is more confident
                        results.push(ruleBased);
                    }
                });

                logger.info(`Batch ${Math.floor(i / BATCH_SIZE) + 1} complete`);
            } catch (batchError) {
                logger.warn('Batch failed, using rule-based', { error: batchError.message });
                results.push(...batchWithRules);
            }
        }

        logger.info('Categorization complete', {
            total: results.length,
            highConfidence: results.filter(r => r.aiConfidence >= 80).length
        });

        return results;
    } catch (error) {
        logger.error('AI categorization failed', error);
        return withRules; // Return rule-based results on failure
    }
};

/**
 * Get AI suggestion for single transaction
 */
export const getSingleSuggestion = async (transaction) => {
    const results = await categorizeTransactions([transaction]);
    return results[0] || null;
};

/**
 * Validate API key
 */
export const validateApiKey = async () => {
    try {
        if (!API_KEY) return false;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const response = await fetch('https://api.openai.com/v1/models', {
            headers: { 'Authorization': `Bearer ${API_KEY}` },
            signal: controller.signal
        });

        clearTimeout(timeoutId);
        return response.ok;
    } catch {
        return false;
    }
};

/**
 * Try to repair and parse malformed JSON from AI response
 * Handles cases where JSON is truncated or has minor formatting issues
 */
const repairAndParseJSON = (content) => {
    if (!content) return { transactions: [] };

    // First, try direct parsing
    try {
        return JSON.parse(content);
    } catch (e) {
        console.log('[AI PDF Parser] JSON parsing failed, attempting repair...');
    }

    // Try to find and extract the transactions array
    let repaired = content;

    // Common fixes for truncated JSON
    // 1. If transactions array is truncated, try to close it properly
    const transactionsMatch = content.match(/"transactions"\s*:\s*\[/);
    if (transactionsMatch) {
        // Count brackets to see if array is properly closed
        const startIdx = content.indexOf('[', transactionsMatch.index);
        let bracketCount = 0;
        let lastValidPos = startIdx;

        for (let i = startIdx; i < content.length; i++) {
            if (content[i] === '[') bracketCount++;
            if (content[i] === ']') bracketCount--;
            if (content[i] === '}' && bracketCount === 0) {
                // Found valid end of an object
                lastValidPos = i + 1;
            }
        }

        // If array not properly closed, try to close it
        if (bracketCount > 0) {
            // Find last valid transaction object
            const lastBraceMatch = content.lastIndexOf('}');
            if (lastBraceMatch > startIdx) {
                repaired = content.substring(0, lastBraceMatch + 1) + ']}';
            }
        }
    }

    // Try parsing repaired version
    try {
        return JSON.parse(repaired);
    } catch (e) {
        console.log('[AI PDF Parser] Repair attempt 1 failed');
    }

    // More aggressive repair - extract individual transaction objects
    try {
        const transactionRegex = /\{\s*"date"\s*:\s*"[^"]*"[^}]*\}/g;
        const matches = content.match(transactionRegex) || [];
        console.log('[AI PDF Parser] Found', matches.length, 'transaction objects via regex');

        const transactions = [];
        for (const match of matches) {
            try {
                const obj = JSON.parse(match);
                if (obj.date) {
                    transactions.push(obj);
                }
            } catch (parseErr) {
                // Skip malformed individual objects
            }
        }

        if (transactions.length > 0) {
            console.log('[AI PDF Parser] Recovered', transactions.length, 'transactions via regex extraction');
            return { transactions };
        }
    } catch (e) {
        console.log('[AI PDF Parser] Regex extraction failed');
    }

    return { transactions: [] };
};

/**
 * Extract transactions from raw PDF text using AI
 * Uses a longer timeout since PDF text can be large
 * @param {string} rawText - Raw text extracted from PDF
 * @returns {Promise<Array>} Array of extracted transactions
 */
export const extractTransactionsFromPDFText = async (rawText) => {
    if (!rawText || rawText.length < 50) {
        console.log('[AI PDF Parser] Text too short, skipping');
        return [];
    }

    if (!API_KEY) {
        console.log('[AI PDF Parser] No API key configured');
        return [];
    }

    // Limit text to 4000 chars for reliable JSON responses
    const text = rawText.length > 4000 ? rawText.substring(0, 4000) : rawText;
    console.log('[AI PDF Parser] Processing', text.length, 'characters');

    // Very simple prompt for reliable responses
    const systemPrompt = `Extract bank transactions from text. Return JSON only.
Format: {"transactions":[{"date":"DD/MM/YYYY","description":"text","debit":0,"credit":0}]}
Rules: Numbers without commas. Debit=withdrawal. Credit=deposit. Skip headers.`;

    const userPrompt = text;

    // Use longer timeout for PDF extraction (90 seconds)
    const PDF_TIMEOUT = 90000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), PDF_TIMEOUT);

    try {
        console.log('[AI PDF Parser] Sending text to AI for extraction...');
        const startTime = Date.now();

        const response = await fetch(OPENAI_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`
            },
            body: JSON.stringify({
                model: MODEL,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                temperature: 0.1,
                max_tokens: 4000,
                response_format: { type: 'json_object' }
            }),
            signal: controller.signal
        });

        clearTimeout(timeoutId);
        const duration = Date.now() - startTime;
        console.log('[AI PDF Parser] API responded in', duration, 'ms');

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            console.error('[AI PDF Parser] API error:', error);
            throw new Error(error.error?.message || `API error: ${response.status}`);
        }

        const data = await response.json();
        const content = data.choices[0]?.message?.content;

        if (!content) {
            console.log('[AI PDF Parser] No content in response');
            return [];
        }

        console.log('[AI PDF Parser] Raw response length:', content.length);
        console.log('[AI PDF Parser] Response preview:', content.substring(0, 300));

        // Use robust JSON parsing
        const parsed = repairAndParseJSON(content);
        const transactions = parsed.transactions || [];

        console.log('[AI PDF Parser] Extracted', transactions.length, 'transactions');

        if (transactions.length === 0) {
            console.log('[AI PDF Parser] No transactions found. Full response:', content);
        }

        // Normalize the transactions
        return transactions.map((t, i) => ({
            id: `ai-pdf-${Date.now()}-${i}`,
            date: String(t.date || '').trim(),
            dateRaw: String(t.date || '').trim(),
            description: String(t.description || '').trim(),
            reference: String(t.reference || '').trim(),
            debit: parseFloat(String(t.debit || 0).replace(/,/g, '')) || 0,
            credit: parseFloat(String(t.credit || 0).replace(/,/g, '')) || 0,
            balance: parseFloat(String(t.balance || 0).replace(/,/g, '')) || 0,
            type: (parseFloat(String(t.credit || 0).replace(/,/g, '')) || 0) > 0 ? 'CREDIT' : 'DEBIT',
            amount: parseFloat(String(t.credit || 0).replace(/,/g, '')) || parseFloat(String(t.debit || 0).replace(/,/g, '')) || 0,
            source: 'ai-pdf',
            status: 'pending'
        })).filter(t => t.date && (t.debit > 0 || t.credit > 0));

    } catch (error) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
            console.error('[AI PDF Parser] Request timed out after 90 seconds');
        } else {
            console.error('[AI PDF Parser] Failed to extract transactions:', error.message);
        }
        return [];
    }
};

export default {
    categorizeTransactions,
    getSingleSuggestion,
    validateApiKey,
    extractTransactionsFromPDFText
};
