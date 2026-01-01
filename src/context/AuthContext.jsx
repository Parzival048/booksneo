/**
 * AI Tally Sync - Authentication Context
 * Provides authentication state and methods using Firebase Auth
 */

import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut as firebaseSignOut,
    sendPasswordResetEmail,
    sendEmailVerification,
    updatePassword as firebaseUpdatePassword,
    onAuthStateChanged,
    updateProfile as firebaseUpdateProfile
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../services/firebaseClient';
import { PLANS, getPlanById, hasFeature, checkLimit, formatLimit } from '../config/plans';
import logger from '../utils/logger';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [plan, setPlan] = useState(null);
    const [usage, setUsage] = useState({ transactions: 0, companies: 0 });
    const [initialized, setInitialized] = useState(false);

    // Ref to prevent concurrent fetches
    const fetchingDataRef = useRef(false);

    // Fetch user profile and plan from Firestore
    const fetchUserData = useCallback(async (userId) => {
        if (fetchingDataRef.current) {
            return;
        }

        fetchingDataRef.current = true;

        try {
            // Fetch user profile from Firestore
            const profileRef = doc(db, 'users', userId);
            const profileSnap = await getDoc(profileRef);

            if (profileSnap.exists()) {
                const profileData = profileSnap.data();
                setProfile(profileData);

                // Get plan from user document or default to free
                const planId = profileData.planId || 'free';
                const planConfig = getPlanById(planId);
                setPlan({
                    ...planConfig,
                    id: planId,
                    displayName: planConfig.displayName || planConfig.name
                });

                // Set usage data
                setUsage({
                    transactions: profileData.transactionsThisMonth || 0,
                    companies: profileData.companiesCount || 0
                });
            } else {
                // No profile exists yet - use default free plan
                setProfile(null);
                const freePlan = PLANS.free;
                setPlan({
                    ...freePlan,
                    displayName: freePlan.displayName || freePlan.name
                });
                setUsage({ transactions: 0, companies: 0 });
            }
        } catch (error) {
            logger.error('Error fetching user data:', error);
        } finally {
            fetchingDataRef.current = false;
        }
    }, []);

    // Initialize auth state - listen for Firebase auth changes
    useEffect(() => {
        logger.info('Initializing auth...');

        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            logger.info('Auth state changed:', firebaseUser ? 'signed in' : 'signed out');

            if (firebaseUser) {
                setUser({
                    id: firebaseUser.uid,
                    email: firebaseUser.email,
                    displayName: firebaseUser.displayName,
                    emailVerified: firebaseUser.emailVerified
                });

                // Fetch profile in background
                fetchUserData(firebaseUser.uid).catch(() => { });
            } else {
                setUser(null);
                setProfile(null);
                setPlan(null);
            }

            setInitialized(true);
            logger.info('Auth initialized');
        });

        return () => unsubscribe();
    }, [fetchUserData]);

    // Sign up with email and password
    const signUp = async (email, password, fullName) => {
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const firebaseUser = userCredential.user;

            // Update display name
            await firebaseUpdateProfile(firebaseUser, {
                displayName: fullName
            });

            // Create user document in Firestore
            await setDoc(doc(db, 'users', firebaseUser.uid), {
                full_name: fullName,
                email: email,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                plan: {
                    name: 'Free',
                    max_transactions: 50,
                    max_companies: 1,
                    has_ai_categorization: true,
                    has_pdf_processing: false,
                    has_bank_reconciliation: false,
                    has_reports: false,
                    has_tally_sync: true
                }
            });

            // Send email verification
            await sendEmailVerification(firebaseUser, {
                url: `${window.location.origin}/login`
            });

            return { data: { user: firebaseUser }, error: null };
        } catch (error) {
            logger.error('Sign up error:', error);
            return { data: null, error };
        }
    };

    // Sign in with email and password
    const signIn = async (email, password) => {
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            return { data: { user: userCredential.user }, error: null };
        } catch (error) {
            logger.error('Sign in error:', error);
            return { data: null, error };
        }
    };

    // Sign out
    const signOut = async () => {
        try {
            await firebaseSignOut(auth);
            setUser(null);
            setProfile(null);
            setPlan(null);
            return { error: null };
        } catch (error) {
            logger.error('Sign out error:', error);
            return { error };
        }
    };

    // Reset password (send email)
    const resetPassword = async (email) => {
        try {
            await sendPasswordResetEmail(auth, email, {
                url: `${window.location.origin}/login`
            });
            return { data: true, error: null };
        } catch (error) {
            logger.error('Reset password error:', error);
            return { data: null, error };
        }
    };

    // Update password
    const updatePassword = async (newPassword) => {
        try {
            const currentUser = auth.currentUser;
            if (!currentUser) {
                throw new Error('No user logged in');
            }
            await firebaseUpdatePassword(currentUser, newPassword);
            return { data: true, error: null };
        } catch (error) {
            logger.error('Update password error:', error);
            return { data: null, error };
        }
    };

    // Update profile
    const updateProfile = async (updates) => {
        try {
            if (!user) {
                throw new Error('No user logged in');
            }

            const userRef = doc(db, 'users', user.id);
            await updateDoc(userRef, {
                ...updates,
                updated_at: new Date().toISOString()
            });

            // Update local state
            setProfile(prev => ({ ...prev, ...updates }));
            return { data: { ...profile, ...updates }, error: null };
        } catch (error) {
            logger.error('Update profile error:', error);
            return { data: null, error };
        }
    };

    // Check if user has access to a feature
    const hasFeatureAccess = (featureName) => {
        // If user is authenticated but plan hasn't loaded yet, allow access
        if (user && !plan) return true;

        // If no user or no plan, deny access
        if (!plan) return false;

        return hasFeature(plan, featureName);
    };

    // Get transaction limit info
    const getTransactionLimit = () => {
        if (!plan) return { limit: 50, usage: 0, remaining: 50, unlimited: false };
        const limit = plan.limits?.transactionsPerMonth ?? 50;
        const unlimited = limit === -1;
        return {
            limit: unlimited ? Infinity : limit,
            usage: usage.transactions,
            remaining: unlimited ? Infinity : Math.max(0, limit - usage.transactions),
            unlimited,
            percentage: unlimited ? 0 : Math.min(100, Math.round((usage.transactions / limit) * 100)),
            displayLimit: formatLimit(limit)
        };
    };

    // Get company limit info
    const getCompanyLimit = () => {
        if (!plan) return { limit: 1, usage: 0, remaining: 1, unlimited: false };
        const limit = plan.limits?.maxCompanies ?? 1;
        const unlimited = limit === -1;
        return {
            limit: unlimited ? Infinity : limit,
            usage: usage.companies,
            remaining: unlimited ? Infinity : Math.max(0, limit - usage.companies),
            unlimited,
            percentage: unlimited ? 0 : Math.min(100, Math.round((usage.companies / limit) * 100)),
            displayLimit: formatLimit(limit)
        };
    };

    // Check if user can perform action
    const canAddTransaction = () => {
        const { remaining, unlimited } = getTransactionLimit();
        return unlimited || remaining > 0;
    };

    const canAddCompany = () => {
        const { remaining, unlimited } = getCompanyLimit();
        return unlimited || remaining > 0;
    };

    // Update usage counts
    const updateUsage = async (type, increment = 1) => {
        if (!user) return;

        const newUsage = { ...usage };
        const fieldName = type === 'transactions' ? 'transactionsThisMonth' : 'companiesCount';

        if (type === 'transactions') {
            newUsage.transactions = Math.max(0, newUsage.transactions + increment);
        } else if (type === 'companies') {
            newUsage.companies = Math.max(0, newUsage.companies + increment);
        }
        setUsage(newUsage);

        // Update in Firestore
        try {
            const userRef = doc(db, 'users', user.id);
            await updateDoc(userRef, {
                [fieldName]: type === 'transactions' ? newUsage.transactions : newUsage.companies,
                updated_at: new Date().toISOString()
            });
            logger.info(`Updated ${type} usage to ${type === 'transactions' ? newUsage.transactions : newUsage.companies}`);
        } catch (error) {
            logger.warn('Failed to update usage:', error);
        }
    };

    // Set company count directly (for Tally sync)
    const setCompanyCount = async (count) => {
        if (!user) return;

        setUsage(prev => ({ ...prev, companies: count }));

        try {
            const userRef = doc(db, 'users', user.id);
            await updateDoc(userRef, {
                companiesCount: count,
                updated_at: new Date().toISOString()
            });
            logger.info(`Set company count to ${count}`);
        } catch (error) {
            logger.warn('Failed to set company count:', error);
        }
    };

    // Set transaction count directly (for batch operations)
    const setTransactionCount = async (count) => {
        if (!user) return;

        setUsage(prev => ({ ...prev, transactions: count }));

        try {
            const userRef = doc(db, 'users', user.id);
            await updateDoc(userRef, {
                transactionsThisMonth: count,
                updated_at: new Date().toISOString()
            });
            logger.info(`Set transaction count to ${count}`);
        } catch (error) {
            logger.warn('Failed to set transaction count:', error);
        }
    };

    // Refresh usage from Firestore
    const refreshUsage = async () => {
        if (!user) return;

        try {
            const profileRef = doc(db, 'users', user.id);
            const profileSnap = await getDoc(profileRef);

            if (profileSnap.exists()) {
                const data = profileSnap.data();
                setUsage({
                    transactions: data.transactionsThisMonth || 0,
                    companies: data.companiesCount || 0
                });
                logger.info('Refreshed usage from Firestore');
            }
        } catch (error) {
            logger.warn('Failed to refresh usage:', error);
        }
    };
    // Resend email verification
    const resendVerificationEmail = async () => {
        try {
            const currentUser = auth.currentUser;
            if (!currentUser) {
                throw new Error('No user logged in');
            }
            await sendEmailVerification(currentUser, {
                url: `${window.location.origin}/login`
            });
            return { data: true, error: null };
        } catch (error) {
            logger.error('Resend verification error:', error);
            return { data: null, error };
        }
    };

    // Refresh email verification status
    const refreshEmailVerification = async () => {
        try {
            const currentUser = auth.currentUser;
            if (!currentUser) return false;

            await currentUser.reload();
            setUser(prev => ({
                ...prev,
                emailVerified: currentUser.emailVerified
            }));
            return currentUser.emailVerified;
        } catch (error) {
            logger.error('Refresh email verification error:', error);
            return false;
        }
    };

    const value = {
        user,
        profile,
        plan,
        usage,
        initialized,
        isAuthenticated: !!user,
        isEmailVerified: user?.emailVerified ?? false,
        signUp,
        signIn,
        signOut,
        resetPassword,
        updatePassword,
        updateProfile,
        resendVerificationEmail,
        refreshEmailVerification,
        hasFeatureAccess,
        getTransactionLimit,
        getCompanyLimit,
        canAddTransaction,
        canAddCompany,
        updateUsage,
        setCompanyCount,
        setTransactionCount,
        refreshUsage,
        refreshUserData: () => user && fetchUserData(user.id)
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export default AuthContext;
