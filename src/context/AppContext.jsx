/**
 * AI Tally Sync - Application Context
 * Global state management with Firestore + localStorage persistence
 */

import { createContext, useContext, useReducer, useEffect, useRef, useCallback } from 'react';
import { getActiveCompany, checkConnection, getCompanies, getLedgers } from '../services/tallyService';
import { getTransactions as fetchTransactionsFromDB, saveTransactions as saveTransactionsToFirestore } from '../services/dataService';
import { auth } from '../services/firebaseClient';
import { onAuthStateChanged } from 'firebase/auth';
import logger from '../utils/logger';

// Storage key
const STORAGE_KEY = 'ai_tally_sync_state';

// Load persisted state from localStorage
const loadPersistedState = () => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            return JSON.parse(stored);
        }
    } catch (error) {
        // Silent fail - will use default state
    }
    return null;
};

// Save state to localStorage
const saveToStorage = (state) => {
    try {
        const toSave = {
            banking: state.banking,
            tally: {
                activeCompany: state.tally.activeCompany,
                companies: state.tally.companies,
                ledgers: state.tally.ledgers
            }
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    } catch (error) {
        logger.warn('Failed to save state to storage', error);
    }
};

// Initial State
const getInitialState = () => {
    const persisted = loadPersistedState();

    return {
        // User & Auth
        user: {
            name: 'User',
            email: 'user@example.com',
            plan: 'Professional'
        },

        // Tally Connection
        tally: {
            connected: false,
            // Only use persisted activeCompany if it's a valid non-empty string
            activeCompany: (typeof persisted?.tally?.activeCompany === 'string' && persisted.tally.activeCompany)
                ? persisted.tally.activeCompany
                : null,
            companies: persisted?.tally?.companies || [],
            ledgers: persisted?.tally?.ledgers || []
        },

        // Banking Module - Load from storage
        banking: persisted?.banking || {
            transactions: [],
            selectedTemplate: null,
            filters: {
                startDate: null,
                endDate: null,
                ledger: null
            },
            summary: null,
            isProcessing: false
        },

        // Purchase Module
        purchase: {
            entries: [],
            isProcessing: false
        },

        // Sales Module
        sales: {
            entries: [],
            isProcessing: false
        },

        // UI State
        ui: {
            sidebarCollapsed: false,
            theme: 'dark',
            notifications: []
        },

        // Loading States
        loading: {
            global: false,
            ai: false,
            tally: false
        }
    };
};

// Action Types
const ActionTypes = {
    SET_USER: 'SET_USER',
    SET_TALLY_STATUS: 'SET_TALLY_STATUS',
    SET_TALLY_COMPANIES: 'SET_TALLY_COMPANIES',
    SET_ACTIVE_COMPANY: 'SET_ACTIVE_COMPANY',
    SET_LEDGERS: 'SET_LEDGERS',
    SET_TRANSACTIONS: 'SET_TRANSACTIONS',
    ADD_TRANSACTIONS: 'ADD_TRANSACTIONS',
    UPDATE_TRANSACTION: 'UPDATE_TRANSACTION',
    SET_TEMPLATE: 'SET_TEMPLATE',
    SET_FILTERS: 'SET_FILTERS',
    SET_SUMMARY: 'SET_SUMMARY',
    SET_PROCESSING: 'SET_PROCESSING',
    SET_PURCHASE_ENTRIES: 'SET_PURCHASE_ENTRIES',
    SET_SALES_ENTRIES: 'SET_SALES_ENTRIES',
    TOGGLE_SIDEBAR: 'TOGGLE_SIDEBAR',
    ADD_NOTIFICATION: 'ADD_NOTIFICATION',
    REMOVE_NOTIFICATION: 'REMOVE_NOTIFICATION',
    SET_LOADING: 'SET_LOADING',
    RESET_BANKING: 'RESET_BANKING',
    LOAD_TRANSACTIONS_FROM_DB: 'LOAD_TRANSACTIONS_FROM_DB'
};

// Reducer
const appReducer = (state, action) => {
    let newState;

    switch (action.type) {
        case ActionTypes.SET_USER:
            return { ...state, user: { ...state.user, ...action.payload } };

        case ActionTypes.SET_TALLY_STATUS:
            return {
                ...state,
                tally: { ...state.tally, connected: action.payload }
            };

        case ActionTypes.SET_TALLY_COMPANIES:
            newState = {
                ...state,
                tally: { ...state.tally, companies: action.payload }
            };
            saveToStorage(newState);
            return newState;

        case ActionTypes.SET_ACTIVE_COMPANY:
            newState = {
                ...state,
                tally: { ...state.tally, activeCompany: action.payload }
            };
            saveToStorage(newState);
            return newState;

        case ActionTypes.SET_LEDGERS:
            newState = {
                ...state,
                tally: { ...state.tally, ledgers: action.payload }
            };
            saveToStorage(newState);
            return newState;

        case ActionTypes.SET_TRANSACTIONS:
            newState = {
                ...state,
                banking: { ...state.banking, transactions: action.payload }
            };
            saveToStorage(newState);
            // Also save to Firestore in background (handled by action creator)
            return newState;

        case ActionTypes.LOAD_TRANSACTIONS_FROM_DB:
            // Load from Firestore without saving back
            newState = {
                ...state,
                banking: { ...state.banking, transactions: action.payload }
            };
            saveToStorage(newState); // Update localStorage cache
            return newState;

        case ActionTypes.ADD_TRANSACTIONS:
            newState = {
                ...state,
                banking: {
                    ...state.banking,
                    transactions: [...state.banking.transactions, ...action.payload]
                }
            };
            saveToStorage(newState);
            return newState;

        case ActionTypes.UPDATE_TRANSACTION:
            newState = {
                ...state,
                banking: {
                    ...state.banking,
                    transactions: state.banking.transactions.map(t =>
                        t.id === action.payload.id ? { ...t, ...action.payload.updates } : t
                    )
                }
            };
            saveToStorage(newState);
            return newState;

        case ActionTypes.SET_TEMPLATE:
            newState = {
                ...state,
                banking: { ...state.banking, selectedTemplate: action.payload }
            };
            saveToStorage(newState);
            return newState;

        case ActionTypes.SET_FILTERS:
            return {
                ...state,
                banking: {
                    ...state.banking,
                    filters: { ...state.banking.filters, ...action.payload }
                }
            };

        case ActionTypes.SET_SUMMARY:
            newState = {
                ...state,
                banking: { ...state.banking, summary: action.payload }
            };
            saveToStorage(newState);
            return newState;

        case ActionTypes.SET_PROCESSING:
            return {
                ...state,
                banking: { ...state.banking, isProcessing: action.payload }
            };

        case ActionTypes.SET_PURCHASE_ENTRIES:
            return {
                ...state,
                purchase: { ...state.purchase, entries: action.payload }
            };

        case ActionTypes.SET_SALES_ENTRIES:
            return {
                ...state,
                sales: { ...state.sales, entries: action.payload }
            };

        case ActionTypes.TOGGLE_SIDEBAR:
            return {
                ...state,
                ui: { ...state.ui, sidebarCollapsed: !state.ui.sidebarCollapsed }
            };

        case ActionTypes.ADD_NOTIFICATION:
            return {
                ...state,
                ui: {
                    ...state.ui,
                    notifications: [...state.ui.notifications, action.payload]
                }
            };

        case ActionTypes.REMOVE_NOTIFICATION:
            return {
                ...state,
                ui: {
                    ...state.ui,
                    notifications: state.ui.notifications.filter(n => n.id !== action.payload)
                }
            };

        case ActionTypes.SET_LOADING:
            return {
                ...state,
                loading: { ...state.loading, ...action.payload }
            };

        case ActionTypes.RESET_BANKING:
            newState = {
                ...state,
                banking: {
                    transactions: [],
                    selectedTemplate: null,
                    filters: { startDate: null, endDate: null, ledger: null },
                    summary: null,
                    isProcessing: false
                }
            };
            saveToStorage(newState);
            return newState;

        default:
            return state;
    }
};

// Create Context
const AppContext = createContext(null);

// Provider Component
export const AppProvider = ({ children }) => {
    const [state, dispatch] = useReducer(appReducer, null, getInitialState);

    // Ref to prevent double initialization in React Strict Mode
    const initializingRef = useRef(false);

    // Initialize app on mount
    useEffect(() => {
        // Prevent double initialization in React Strict Mode
        if (initializingRef.current) {
            return;
        }
        initializingRef.current = true;

        const initializeApp = async () => {
            logger.info('Initializing application');

            // Check Tally connection (silently - don't log errors for expected failures)
            try {
                const result = await checkConnection();
                const isConnected = result?.connected || false;
                dispatch({ type: ActionTypes.SET_TALLY_STATUS, payload: isConnected });

                if (isConnected) {
                    // Load companies
                    const companies = await getCompanies();
                    dispatch({ type: ActionTypes.SET_TALLY_COMPANIES, payload: companies });

                    if (companies.length > 0) {
                        const activeCompany = state.tally.activeCompany || companies[0].name;
                        dispatch({ type: ActionTypes.SET_ACTIVE_COMPANY, payload: activeCompany });

                        // Load ledgers
                        const ledgers = await getLedgers(activeCompany);
                        dispatch({ type: ActionTypes.SET_LEDGERS, payload: ledgers });
                    }
                }

                logger.info('Application initialized', {
                    tallyConnected: isConnected,
                    transactions: state.banking.transactions.length
                });
            } catch (error) {
                // Don't log as error - Tally not running is expected
                logger.info('Application initialized (Tally not connected)');
            }
        };

        initializeApp();
    }, []);

    // Track if Firestore transactions have been loaded
    const firestoreLoadedRef = useRef(false);

    // Load transactions from Firestore when user is authenticated
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user && !firestoreLoadedRef.current) {
                firestoreLoadedRef.current = true;
                logger.info('Loading transactions from Firestore for user:', user.email);
                try {
                    const { data, error } = await fetchTransactionsFromDB();
                    if (!error && data && data.length > 0) {
                        logger.info(`Loaded ${data.length} transactions from Firestore`);
                        dispatch({ type: ActionTypes.LOAD_TRANSACTIONS_FROM_DB, payload: data });
                    } else if (error) {
                        logger.warn('Failed to load transactions from Firestore:', error);
                    }
                } catch (err) {
                    logger.warn('Error loading transactions:', err);
                }
            } else if (!user) {
                firestoreLoadedRef.current = false;
            }
        });

        return () => unsubscribe();
    }, []);

    // Action creators
    const actions = {
        // Tally actions
        setTallyStatus: (connected) => {
            dispatch({ type: ActionTypes.SET_TALLY_STATUS, payload: connected });
        },

        setActiveCompany: (company) => {
            dispatch({ type: ActionTypes.SET_ACTIVE_COMPANY, payload: company });
        },

        setCompanies: (companies) => {
            dispatch({ type: ActionTypes.SET_TALLY_COMPANIES, payload: companies });
        },

        setLedgers: (ledgers) => {
            dispatch({ type: ActionTypes.SET_LEDGERS, payload: ledgers });
        },

        // Banking actions
        setTransactions: async (transactions) => {
            dispatch({ type: ActionTypes.SET_TRANSACTIONS, payload: transactions });

            // Save to Firestore in background
            try {
                if (auth.currentUser) {
                    const { error } = await saveTransactionsToFirestore(transactions);
                    if (error) {
                        logger.warn('Failed to save transactions to Firestore:', error);
                    } else {
                        logger.info(`Saved ${transactions.length} transactions to Firestore`);
                    }
                }
            } catch (err) {
                logger.warn('Error saving transactions to Firestore:', err);
            }
        },

        addTransactions: (transactions) => {
            dispatch({ type: ActionTypes.ADD_TRANSACTIONS, payload: transactions });
        },

        updateTransaction: (id, updates) => {
            dispatch({ type: ActionTypes.UPDATE_TRANSACTION, payload: { id, updates } });
        },

        setTemplate: (template) => {
            dispatch({ type: ActionTypes.SET_TEMPLATE, payload: template });
        },

        setFilters: (filters) => {
            dispatch({ type: ActionTypes.SET_FILTERS, payload: filters });
        },

        setSummary: (summary) => {
            dispatch({ type: ActionTypes.SET_SUMMARY, payload: summary });
        },

        setProcessing: (isProcessing) => {
            dispatch({ type: ActionTypes.SET_PROCESSING, payload: isProcessing });
        },

        resetBanking: () => {
            dispatch({ type: ActionTypes.RESET_BANKING });
        },

        // UI actions
        toggleSidebar: () => {
            dispatch({ type: ActionTypes.TOGGLE_SIDEBAR });
        },

        addNotification: (notification) => {
            // Generate unique ID using timestamp + random to prevent duplicates
            const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            dispatch({
                type: ActionTypes.ADD_NOTIFICATION,
                payload: { id, ...notification }
            });

            // Auto-remove after 5 seconds
            setTimeout(() => {
                dispatch({ type: ActionTypes.REMOVE_NOTIFICATION, payload: id });
            }, 5000);
        },

        removeNotification: (id) => {
            dispatch({ type: ActionTypes.REMOVE_NOTIFICATION, payload: id });
        },

        setLoading: (loadingState) => {
            dispatch({ type: ActionTypes.SET_LOADING, payload: loadingState });
        }
    };

    return (
        <AppContext.Provider value={{ state, actions }}>
            {children}
        </AppContext.Provider>
    );
};

// Custom hook for using the context
export const useApp = () => {
    const context = useContext(AppContext);
    if (!context) {
        throw new Error('useApp must be used within an AppProvider');
    }
    return context;
};

export default AppContext;
