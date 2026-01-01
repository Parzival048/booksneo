/**
 * AI Tally Sync - Smart Ledger Learning Service
 * Learns from user corrections to improve predictions
 * Uses IndexedDB for persistent pattern storage
 */

const DB_NAME = 'AITallySyncLearning';
const DB_VERSION = 1;
const PATTERNS_STORE = 'transactionPatterns';
const CORRECTIONS_STORE = 'userCorrections';

let db = null;

/**
 * Initialize IndexedDB database
 * @returns {Promise<IDBDatabase>}
 */
const initDB = () => {
    return new Promise((resolve, reject) => {
        if (db) {
            resolve(db);
            return;
        }

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => {
            console.error('Failed to open learning database');
            reject(request.error);
        };

        request.onsuccess = () => {
            db = request.result;
            resolve(db);
        };

        request.onupgradeneeded = (event) => {
            const database = event.target.result;

            // Store for transaction patterns
            if (!database.objectStoreNames.contains(PATTERNS_STORE)) {
                const patternsStore = database.createObjectStore(PATTERNS_STORE, { keyPath: 'pattern' });
                patternsStore.createIndex('ledger', 'ledger', { unique: false });
                patternsStore.createIndex('category', 'category', { unique: false });
                patternsStore.createIndex('count', 'count', { unique: false });
            }

            // Store for user corrections
            if (!database.objectStoreNames.contains(CORRECTIONS_STORE)) {
                const correctionsStore = database.createObjectStore(CORRECTIONS_STORE, { keyPath: 'id', autoIncrement: true });
                correctionsStore.createIndex('description', 'description', { unique: false });
                correctionsStore.createIndex('timestamp', 'timestamp', { unique: false });
            }
        };
    });
};

/**
 * Extract patterns from a transaction description
 * Creates normalized patterns for matching
 * @param {string} description - Transaction description
 * @returns {Array<string>} Array of patterns
 */
export const extractPatterns = (description) => {
    if (!description) return [];

    const normalized = description.toUpperCase().trim();
    const patterns = [];

    // Full description (normalized)
    patterns.push(normalized);

    // Extract key identifiers
    const words = normalized.split(/\s+/);

    // First 2-3 significant words (often merchant name)
    if (words.length >= 2) {
        patterns.push(words.slice(0, 2).join(' '));
    }
    if (words.length >= 3) {
        patterns.push(words.slice(0, 3).join(' '));
    }

    // Common payment patterns
    const paymentPatterns = [
        /UPI[-\/]([A-Z0-9]+)/i,           // UPI transactions
        /NEFT[-\/]([A-Z0-9]+)/i,          // NEFT transfers
        /IMPS[-\/]([A-Z0-9]+)/i,          // IMPS transfers
        /RTGS[-\/]([A-Z0-9]+)/i,          // RTGS transfers
        /ATM[-\s]*([A-Z0-9]+)/i,          // ATM withdrawals
        /(AMAZON|FLIPKART|SWIGGY|ZOMATO|UBER|OLA)/i, // E-commerce
        /GST[-\/]?([A-Z0-9]+)/i,          // GST payments
        /EMI[-\s]*/i,                      // EMI payments
        /SALARY|SAL\s|PAY\s/i,            // Salary credits
    ];

    for (const pattern of paymentPatterns) {
        const match = normalized.match(pattern);
        if (match) {
            patterns.push(match[0]);
        }
    }

    return [...new Set(patterns)]; // Remove duplicates
};

/**
 * Store a user correction to learn from
 * @param {Object} correction - User correction data
 * @returns {Promise<void>}
 */
export const storeCorrection = async (correction) => {
    try {
        const database = await initDB();
        const transaction = database.transaction([PATTERNS_STORE, CORRECTIONS_STORE], 'readwrite');

        // Store the correction
        const correctionsStore = transaction.objectStore(CORRECTIONS_STORE);
        await new Promise((resolve, reject) => {
            const request = correctionsStore.add({
                ...correction,
                timestamp: Date.now()
            });
            request.onsuccess = resolve;
            request.onerror = reject;
        });

        // Update patterns
        const patternsStore = transaction.objectStore(PATTERNS_STORE);
        const patterns = extractPatterns(correction.description);

        for (const pattern of patterns) {
            const getRequest = patternsStore.get(pattern);

            await new Promise((resolve, reject) => {
                getRequest.onsuccess = () => {
                    const existing = getRequest.result;

                    if (existing) {
                        // Update existing pattern
                        existing.count = (existing.count || 0) + 1;
                        existing.ledger = correction.ledger || existing.ledger;
                        existing.category = correction.category || existing.category;
                        existing.subcategory = correction.subcategory || existing.subcategory;
                        existing.lastUsed = Date.now();
                        patternsStore.put(existing);
                    } else {
                        // Create new pattern
                        patternsStore.add({
                            pattern,
                            ledger: correction.ledger,
                            category: correction.category,
                            subcategory: correction.subcategory,
                            count: 1,
                            createdAt: Date.now(),
                            lastUsed: Date.now()
                        });
                    }
                    resolve();
                };
                getRequest.onerror = reject;
            });
        }

        console.log('Stored correction for learning:', correction.description);
    } catch (error) {
        console.error('Failed to store correction:', error);
    }
};

/**
 * Get prediction based on learned patterns
 * @param {string} description - Transaction description
 * @returns {Promise<Object|null>} Prediction with ledger, category, confidence
 */
export const getPrediction = async (description) => {
    try {
        const database = await initDB();
        const patterns = extractPatterns(description);

        if (patterns.length === 0) return null;

        const transaction = database.transaction(PATTERNS_STORE, 'readonly');
        const store = transaction.objectStore(PATTERNS_STORE);

        let bestMatch = null;
        let highestScore = 0;

        for (const pattern of patterns) {
            const request = store.get(pattern);

            await new Promise((resolve) => {
                request.onsuccess = () => {
                    const result = request.result;
                    if (result) {
                        // Score based on pattern length and usage count
                        const score = (pattern.length * 0.3) + (result.count * 0.7);

                        if (score > highestScore) {
                            highestScore = score;
                            bestMatch = result;
                        }
                    }
                    resolve();
                };
                request.onerror = resolve;
            });
        }

        if (bestMatch) {
            // Calculate confidence (0-1)
            const confidence = Math.min(0.95, 0.5 + (bestMatch.count * 0.1));

            return {
                ledger: bestMatch.ledger,
                category: bestMatch.category,
                subcategory: bestMatch.subcategory,
                confidence,
                matchedPattern: bestMatch.pattern,
                usageCount: bestMatch.count,
                source: 'learned'
            };
        }

        return null;
    } catch (error) {
        console.error('Failed to get prediction:', error);
        return null;
    }
};

/**
 * Get predictions for multiple transactions
 * @param {Array} transactions - Array of transactions
 * @returns {Promise<Array>} Transactions with predictions
 */
export const getPredictionsForBatch = async (transactions) => {
    const results = [];

    for (const txn of transactions) {
        const prediction = await getPrediction(txn.description);

        results.push({
            ...txn,
            learnedPrediction: prediction
        });
    }

    return results;
};

/**
 * Find similar transactions based on patterns
 * @param {Array} transactions - All transactions
 * @returns {Object} Groups of similar transactions
 */
export const groupSimilarTransactions = (transactions) => {
    const groups = {};

    for (const txn of transactions) {
        const patterns = extractPatterns(txn.description);

        // Use the most specific pattern (longest) for grouping
        const groupKey = patterns.length > 0
            ? patterns.sort((a, b) => b.length - a.length)[0]
            : 'UNGROUPED';

        if (!groups[groupKey]) {
            groups[groupKey] = {
                pattern: groupKey,
                transactions: [],
                totalAmount: 0,
                type: null
            };
        }

        groups[groupKey].transactions.push(txn);
        groups[groupKey].totalAmount += txn.amount || 0;
        groups[groupKey].type = groups[groupKey].type || txn.type;
    }

    // Only return groups with more than 1 transaction
    const significantGroups = Object.values(groups)
        .filter(g => g.transactions.length > 1)
        .sort((a, b) => b.transactions.length - a.transactions.length);

    return significantGroups;
};

/**
 * Apply learned prediction to enhance AI categorization
 * @param {Object} transaction - Transaction to enhance
 * @param {Object} aiPrediction - AI prediction (from OpenAI)
 * @returns {Promise<Object>} Enhanced prediction
 */
export const enhancePrediction = async (transaction, aiPrediction) => {
    const learnedPrediction = await getPrediction(transaction.description);

    if (!learnedPrediction) {
        return {
            ...aiPrediction,
            source: 'ai'
        };
    }

    // If learned confidence is higher, prefer learned
    if (learnedPrediction.confidence > (aiPrediction?.confidence || 0)) {
        return {
            ledger: learnedPrediction.ledger,
            category: learnedPrediction.category,
            subcategory: learnedPrediction.subcategory,
            confidence: learnedPrediction.confidence,
            source: 'learned',
            aiSuggestion: aiPrediction
        };
    }

    // Otherwise use AI but include learned as fallback
    return {
        ...aiPrediction,
        source: 'ai',
        learnedSuggestion: learnedPrediction
    };
};

/**
 * Get statistics about learned patterns
 * @returns {Promise<Object>} Learning statistics
 */
export const getLearningStats = async () => {
    try {
        const database = await initDB();
        const transaction = database.transaction([PATTERNS_STORE, CORRECTIONS_STORE], 'readonly');

        const patternsStore = transaction.objectStore(PATTERNS_STORE);
        const correctionsStore = transaction.objectStore(CORRECTIONS_STORE);

        const patternCount = await new Promise((resolve) => {
            const request = patternsStore.count();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => resolve(0);
        });

        const correctionCount = await new Promise((resolve) => {
            const request = correctionsStore.count();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => resolve(0);
        });

        return {
            patternsLearned: patternCount,
            correctionsStored: correctionCount,
            estimatedAccuracy: Math.min(95, 60 + (patternCount * 0.5))
        };
    } catch (error) {
        console.error('Failed to get learning stats:', error);
        return {
            patternsLearned: 0,
            correctionsStored: 0,
            estimatedAccuracy: 60
        };
    }
};

/**
 * Clear all learned data
 * @returns {Promise<void>}
 */
export const clearLearningData = async () => {
    try {
        const database = await initDB();
        const transaction = database.transaction([PATTERNS_STORE, CORRECTIONS_STORE], 'readwrite');

        transaction.objectStore(PATTERNS_STORE).clear();
        transaction.objectStore(CORRECTIONS_STORE).clear();

        console.log('Cleared all learning data');
    } catch (error) {
        console.error('Failed to clear learning data:', error);
    }
};

export default {
    storeCorrection,
    getPrediction,
    getPredictionsForBatch,
    groupSimilarTransactions,
    enhancePrediction,
    getLearningStats,
    clearLearningData,
    extractPatterns
};
