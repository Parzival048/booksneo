/**
 * AI Tally Sync - Data Service
 * CRUD operations using Firebase Firestore
 */

import {
    collection,
    doc,
    getDocs,
    getDoc,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    writeBatch,
    limit as firestoreLimit
} from 'firebase/firestore';
import { auth, db } from './firebaseClient';
import logger from '../utils/logger';

// Helper to get current user ID
const getCurrentUserId = () => {
    const user = auth.currentUser;
    if (!user) throw new Error('Not authenticated');
    return user.uid;
};

// Helper to check if error is an AbortError (should be silently ignored)
const isAbortError = (error) => {
    return error?.name === 'AbortError' ||
        error?.message?.includes('aborted') ||
        error?.message?.includes('The user aborted a request');
};

// ============================================
// TRANSACTIONS
// ============================================

export const getTransactions = async (filters = {}) => {
    try {
        const userId = getCurrentUserId();
        let q = query(
            collection(db, 'transactions'),
            where('user_id', '==', userId),
            orderBy('date', 'desc')
        );

        const querySnapshot = await getDocs(q);
        let data = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        // Apply client-side filters (Firestore has limitations on compound queries)
        if (filters.companyId) {
            data = data.filter(t => t.company_id === filters.companyId);
        }
        if (filters.startDate) {
            data = data.filter(t => t.date >= filters.startDate);
        }
        if (filters.endDate) {
            data = data.filter(t => t.date <= filters.endDate);
        }
        if (filters.status) {
            data = data.filter(t => t.status === filters.status);
        }

        return { data, error: null };
    } catch (error) {
        // Silently ignore abort errors
        if (isAbortError(error)) {
            return { data: [], error: null };
        }
        logger.error('Error fetching transactions:', error);
        return { data: [], error };
    }
};

export const saveTransactions = async (transactions) => {
    try {
        const userId = getCurrentUserId();
        const batch = writeBatch(db);
        const savedDocs = [];

        for (const t of transactions) {
            const transactionData = {
                ...t,
                user_id: userId,
                updated_at: new Date().toISOString()
            };

            if (t.id && !t.id.startsWith('temp_')) {
                // Update existing
                const docRef = doc(db, 'transactions', t.id);
                batch.update(docRef, transactionData);
                savedDocs.push({ id: t.id, ...transactionData });
            } else {
                // Create new
                const docRef = doc(collection(db, 'transactions'));
                transactionData.created_at = new Date().toISOString();
                delete transactionData.id;
                batch.set(docRef, transactionData);
                savedDocs.push({ id: docRef.id, ...transactionData });
            }
        }

        await batch.commit();
        return { data: savedDocs, error: null };
    } catch (error) {
        // Silently ignore abort errors (expected when user navigates away)
        if (isAbortError(error)) {
            return { data: null, error: null };
        }
        logger.error('Error saving transactions:', error);
        return { data: null, error };
    }
};

export const updateTransaction = async (id, updates) => {
    try {
        const docRef = doc(db, 'transactions', id);
        await updateDoc(docRef, {
            ...updates,
            updated_at: new Date().toISOString()
        });

        const updatedDoc = await getDoc(docRef);
        return { data: { id, ...updatedDoc.data() }, error: null };
    } catch (error) {
        logger.error('Error updating transaction:', error);
        return { data: null, error };
    }
};

export const deleteTransactions = async (ids) => {
    try {
        const batch = writeBatch(db);
        ids.forEach(id => {
            batch.delete(doc(db, 'transactions', id));
        });
        await batch.commit();
        return { error: null };
    } catch (error) {
        logger.error('Error deleting transactions:', error);
        return { error };
    }
};

export const getTransactionCount = async (startDate = null) => {
    try {
        const userId = getCurrentUserId();
        let q = query(
            collection(db, 'transactions'),
            where('user_id', '==', userId)
        );

        const querySnapshot = await getDocs(q);
        let count = querySnapshot.size;

        if (startDate) {
            count = querySnapshot.docs.filter(doc =>
                doc.data().created_at >= startDate
            ).length;
        }

        return { count, error: null };
    } catch (error) {
        logger.error('Error counting transactions:', error);
        return { count: 0, error };
    }
};

// ============================================
// COMPANIES
// ============================================

export const getCompanies = async () => {
    try {
        const userId = getCurrentUserId();
        const q = query(
            collection(db, 'companies'),
            where('user_id', '==', userId),
            orderBy('created_at', 'desc')
        );

        const querySnapshot = await getDocs(q);
        const data = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        return { data, error: null };
    } catch (error) {
        logger.error('Error fetching companies:', error);
        return { data: [], error };
    }
};

export const saveCompany = async (company) => {
    try {
        const userId = getCurrentUserId();
        const companyData = {
            ...company,
            user_id: userId,
            updated_at: new Date().toISOString()
        };

        if (company.id) {
            const docRef = doc(db, 'companies', company.id);
            await updateDoc(docRef, companyData);
            return { data: { id: company.id, ...companyData }, error: null };
        } else {
            companyData.created_at = new Date().toISOString();
            const docRef = await addDoc(collection(db, 'companies'), companyData);
            return { data: { id: docRef.id, ...companyData }, error: null };
        }
    } catch (error) {
        logger.error('Error saving company:', error);
        return { data: null, error };
    }
};

export const deleteCompany = async (id) => {
    try {
        await deleteDoc(doc(db, 'companies', id));
        return { error: null };
    } catch (error) {
        logger.error('Error deleting company:', error);
        return { error };
    }
};

// ============================================
// LEDGERS
// ============================================

export const getLedgers = async (companyId = null) => {
    try {
        const userId = getCurrentUserId();
        let q = query(
            collection(db, 'ledgers'),
            where('user_id', '==', userId),
            orderBy('name', 'asc')
        );

        const querySnapshot = await getDocs(q);
        let data = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        if (companyId) {
            data = data.filter(l => l.company_id === companyId);
        }

        return { data, error: null };
    } catch (error) {
        logger.error('Error fetching ledgers:', error);
        return { data: [], error };
    }
};

export const saveLedger = async (ledger) => {
    try {
        const userId = getCurrentUserId();
        const ledgerData = {
            ...ledger,
            user_id: userId,
            updated_at: new Date().toISOString()
        };

        if (ledger.id) {
            const docRef = doc(db, 'ledgers', ledger.id);
            await updateDoc(docRef, ledgerData);
            return { data: { id: ledger.id, ...ledgerData }, error: null };
        } else {
            ledgerData.created_at = new Date().toISOString();
            const docRef = await addDoc(collection(db, 'ledgers'), ledgerData);
            return { data: { id: docRef.id, ...ledgerData }, error: null };
        }
    } catch (error) {
        logger.error('Error saving ledger:', error);
        return { data: null, error };
    }
};

export const deleteLedger = async (id) => {
    try {
        await deleteDoc(doc(db, 'ledgers', id));
        return { error: null };
    } catch (error) {
        logger.error('Error deleting ledger:', error);
        return { error };
    }
};

// ============================================
// USER SETTINGS
// ============================================

export const getSettings = async () => {
    try {
        const userId = getCurrentUserId();
        const docRef = doc(db, 'settings', userId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            return { data: docSnap.data(), error: null };
        }
        return { data: {}, error: null };
    } catch (error) {
        logger.error('Error fetching settings:', error);
        return { data: {}, error };
    }
};

export const updateSettings = async (settings) => {
    try {
        const userId = getCurrentUserId();
        const docRef = doc(db, 'settings', userId);

        await updateDoc(docRef, {
            ...settings,
            updated_at: new Date().toISOString()
        }).catch(async () => {
            // Document doesn't exist, create it
            const { setDoc } = await import('firebase/firestore');
            await setDoc(docRef, {
                ...settings,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            });
        });

        const updatedDoc = await getDoc(docRef);
        return { data: updatedDoc.data(), error: null };
    } catch (error) {
        logger.error('Error updating settings:', error);
        return { data: null, error };
    }
};

// ============================================
// LEARNING PATTERNS
// ============================================

export const getLearningPatterns = async (patternType = null) => {
    try {
        const userId = getCurrentUserId();
        let q = query(
            collection(db, 'learningPatterns'),
            where('user_id', '==', userId)
        );

        const querySnapshot = await getDocs(q);
        let data = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        // Sort by usage_count descending
        data.sort((a, b) => (b.usage_count || 0) - (a.usage_count || 0));

        if (patternType) {
            data = data.filter(p => p.pattern_type === patternType);
        }

        return { data, error: null };
    } catch (error) {
        logger.error('Error fetching learning patterns:', error);
        return { data: [], error };
    }
};

export const saveLearningPattern = async (pattern) => {
    try {
        const userId = getCurrentUserId();

        // Check if pattern exists
        const q = query(
            collection(db, 'learningPatterns'),
            where('user_id', '==', userId),
            where('pattern_type', '==', pattern.pattern_type),
            where('pattern_key', '==', pattern.pattern_key),
            firestoreLimit(1)
        );

        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            // Update existing pattern
            const existingDoc = querySnapshot.docs[0];
            const existingData = existingDoc.data();

            await updateDoc(doc(db, 'learningPatterns', existingDoc.id), {
                pattern_value: pattern.pattern_value,
                confidence: pattern.confidence || 1.0,
                usage_count: (existingData.usage_count || 0) + 1,
                updated_at: new Date().toISOString()
            });

            return {
                data: {
                    id: existingDoc.id,
                    ...existingData,
                    ...pattern,
                    usage_count: (existingData.usage_count || 0) + 1
                },
                error: null
            };
        } else {
            // Create new pattern
            const newPattern = {
                user_id: userId,
                ...pattern,
                usage_count: 1,
                confidence: pattern.confidence || 1.0,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            const docRef = await addDoc(collection(db, 'learningPatterns'), newPattern);
            return { data: { id: docRef.id, ...newPattern }, error: null };
        }
    } catch (error) {
        logger.error('Error saving learning pattern:', error);
        return { data: null, error };
    }
};

export const deleteLearningPattern = async (id) => {
    try {
        await deleteDoc(doc(db, 'learningPatterns', id));
        return { error: null };
    } catch (error) {
        logger.error('Error deleting learning pattern:', error);
        return { error };
    }
};

// ============================================
// PLANS (Static for now - can be moved to Firestore)
// ============================================

export const getPlans = async () => {
    // Import from centralized config
    const { getAllPlans } = await import('../config/plans');
    const plans = getAllPlans().map(plan => ({
        id: plan.id,
        name: plan.name,
        displayName: plan.displayName,
        description: plan.description,
        price_monthly: plan.priceMonthly,
        price_yearly: plan.priceYearly,
        popular: plan.popular || false,
        max_transactions: plan.limits.transactionsPerMonth,
        max_companies: plan.limits.maxCompanies,
        has_ai_categorization: plan.features.aiCategorization,
        has_pdf_processing: plan.features.pdfProcessing,
        has_bank_reconciliation: plan.features.bankReconciliation,
        has_reports: plan.features.reports,
        has_tally_sync: plan.features.tallySync,
        badge: plan.badge
    }));

    return { data: plans, error: null };
};

// ============================================
// BULK OPERATIONS
// ============================================

export const clearAllUserData = async () => {
    try {
        const userId = getCurrentUserId();
        const batch = writeBatch(db);

        // Get all user documents from each collection
        const collections = ['transactions', 'ledgers', 'learningPatterns', 'companies'];

        for (const collName of collections) {
            const q = query(
                collection(db, collName),
                where('user_id', '==', userId)
            );
            const snapshot = await getDocs(q);
            snapshot.docs.forEach(docSnap => {
                batch.delete(doc(db, collName, docSnap.id));
            });
        }

        await batch.commit();
        return { error: null };
    } catch (error) {
        logger.error('Error clearing user data:', error);
        return { error };
    }
};

export default {
    // Transactions
    getTransactions,
    saveTransactions,
    updateTransaction,
    deleteTransactions,
    getTransactionCount,
    // Companies
    getCompanies,
    saveCompany,
    deleteCompany,
    // Ledgers
    getLedgers,
    saveLedger,
    deleteLedger,
    // Settings
    getSettings,
    updateSettings,
    // Learning Patterns
    getLearningPatterns,
    saveLearningPattern,
    deleteLearningPattern,
    // Plans
    getPlans,
    // Bulk
    clearAllUserData
};
