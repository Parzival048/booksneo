/**
 * AI Tally Sync - Plan Configuration
 * Centralized plan definitions with detailed limits and features
 */

// Plan definitions with detailed features
export const PLANS = {
    free: {
        id: 'free',
        name: 'Free',
        displayName: 'Free',
        tagline: 'Get started for free',
        description: 'Perfect for individuals trying out BooksNeo',
        priceMonthly: 0,
        priceYearly: 0,
        limits: {
            transactionsPerMonth: 50,
            maxCompanies: 1,
            maxLedgers: 20,
            maxStorageMB: 50,
            maxBankAccounts: 1
        },
        features: {
            // Core Features
            aiCategorization: true,
            tallySync: true,
            bankStatementUpload: true,
            manualEntry: true,
            // Premium Features
            pdfProcessing: false,
            bankReconciliation: false,
            reports: false,
            multiCompany: false,
            bulkOperations: false,
            customCategories: false,
            // Advanced Features
            apiAccess: false,
            multiUser: false,
            prioritySupport: false,
            emailSupport: false,
            dedicatedManager: false,
            whiteLabeling: false,
            customIntegrations: false
        },
        badge: { color: 'slate', icon: null },
        highlight: false
    },
    starter: {
        id: 'starter',
        name: 'Starter',
        displayName: 'Starter',
        tagline: 'For small businesses',
        description: 'Essential features for small business accounting',
        priceMonthly: 499,
        priceYearly: 4999,
        savings: '₹989/year',
        limits: {
            transactionsPerMonth: 500,
            maxCompanies: 3,
            maxLedgers: 100,
            maxStorageMB: 500,
            maxBankAccounts: 5
        },
        features: {
            // Core Features
            aiCategorization: true,
            tallySync: true,
            bankStatementUpload: true,
            manualEntry: true,
            // Premium Features
            pdfProcessing: true,
            bankReconciliation: false,
            reports: true,
            multiCompany: true,
            bulkOperations: true,
            customCategories: true,
            // Advanced Features
            apiAccess: false,
            multiUser: false,
            prioritySupport: false,
            emailSupport: true,
            dedicatedManager: false,
            whiteLabeling: false,
            customIntegrations: false
        },
        badge: { color: 'warning', icon: 'star' },
        highlight: false
    },
    professional: {
        id: 'professional',
        name: 'Professional',
        displayName: 'Professional',
        tagline: 'Most Popular',
        description: 'Complete solution for growing businesses',
        priceMonthly: 999,
        priceYearly: 9999,
        savings: '₹1,989/year',
        popular: true,
        limits: {
            transactionsPerMonth: -1, // Unlimited
            maxCompanies: 10,
            maxLedgers: -1,
            maxStorageMB: 5000,
            maxBankAccounts: 20
        },
        features: {
            // Core Features
            aiCategorization: true,
            tallySync: true,
            bankStatementUpload: true,
            manualEntry: true,
            // Premium Features
            pdfProcessing: true,
            bankReconciliation: true,
            reports: true,
            multiCompany: true,
            bulkOperations: true,
            customCategories: true,
            // Advanced Features
            apiAccess: false,
            multiUser: true,
            prioritySupport: true,
            emailSupport: true,
            dedicatedManager: false,
            whiteLabeling: false,
            customIntegrations: false
        },
        badge: { color: 'primary', icon: 'crown' },
        highlight: true
    },
    enterprise: {
        id: 'enterprise',
        name: 'Enterprise',
        displayName: 'Enterprise',
        tagline: 'For large organizations',
        description: 'Custom solutions for enterprise needs',
        priceMonthly: 2499,
        priceYearly: 24999,
        savings: '₹4,989/year',
        limits: {
            transactionsPerMonth: -1,
            maxCompanies: -1,
            maxLedgers: -1,
            maxStorageMB: -1,
            maxBankAccounts: -1
        },
        features: {
            // Core Features
            aiCategorization: true,
            tallySync: true,
            bankStatementUpload: true,
            manualEntry: true,
            // Premium Features
            pdfProcessing: true,
            bankReconciliation: true,
            reports: true,
            multiCompany: true,
            bulkOperations: true,
            customCategories: true,
            // Advanced Features
            apiAccess: true,
            multiUser: true,
            prioritySupport: true,
            emailSupport: true,
            dedicatedManager: true,
            whiteLabeling: true,
            customIntegrations: true
        },
        badge: { color: 'purple', icon: 'crown' },
        highlight: false
    }
};

// Feature display names and descriptions for UI
export const FEATURE_INFO = {
    // Core Features
    aiCategorization: {
        name: 'AI Categorization',
        description: 'Smart AI-powered transaction categorization',
        icon: 'Sparkles'
    },
    tallySync: {
        name: 'Tally Sync',
        description: 'Seamless integration with Tally Prime',
        icon: 'Link2'
    },
    bankStatementUpload: {
        name: 'Bank Statement Upload',
        description: 'Upload and parse bank statements',
        icon: 'Upload'
    },
    manualEntry: {
        name: 'Manual Entry',
        description: 'Add transactions manually',
        icon: 'Edit3'
    },
    // Premium Features
    pdfProcessing: {
        name: 'PDF Processing',
        description: 'Extract data from PDF invoices',
        icon: 'FileText'
    },
    bankReconciliation: {
        name: 'Bank Reconciliation',
        description: 'Match bank transactions automatically',
        icon: 'GitCompare'
    },
    reports: {
        name: 'Reports & Analytics',
        description: 'Detailed financial reports and insights',
        icon: 'BarChart3'
    },
    multiCompany: {
        name: 'Multi-Company',
        description: 'Manage multiple companies',
        icon: 'Building2'
    },
    bulkOperations: {
        name: 'Bulk Operations',
        description: 'Process multiple transactions at once',
        icon: 'Layers'
    },
    customCategories: {
        name: 'Custom Categories',
        description: 'Create your own transaction categories',
        icon: 'Tag'
    },
    // Advanced Features
    apiAccess: {
        name: 'API Access',
        description: 'Programmatic access via REST API',
        icon: 'Code'
    },
    multiUser: {
        name: 'Multi-User Access',
        description: 'Team collaboration with role management',
        icon: 'Users'
    },
    prioritySupport: {
        name: 'Priority Support',
        description: '24/7 priority customer support',
        icon: 'Headphones'
    },
    emailSupport: {
        name: 'Email Support',
        description: 'Dedicated email support',
        icon: 'Mail'
    },
    dedicatedManager: {
        name: 'Dedicated Manager',
        description: 'Personal account manager',
        icon: 'UserCheck'
    },
    whiteLabeling: {
        name: 'White Labeling',
        description: 'Custom branding for your business',
        icon: 'Palette'
    },
    customIntegrations: {
        name: 'Custom Integrations',
        description: 'Tailored integrations for your needs',
        icon: 'Puzzle'
    }
};

// Feature groups for organized display
export const FEATURE_GROUPS = {
    core: {
        name: 'Core Features',
        features: ['aiCategorization', 'tallySync', 'bankStatementUpload', 'manualEntry']
    },
    premium: {
        name: 'Premium Features',
        features: ['pdfProcessing', 'bankReconciliation', 'reports', 'multiCompany', 'bulkOperations', 'customCategories']
    },
    advanced: {
        name: 'Advanced Features',
        features: ['apiAccess', 'multiUser', 'prioritySupport', 'emailSupport', 'dedicatedManager', 'whiteLabeling', 'customIntegrations']
    }
};

// Feature to route mapping for navigation restrictions
export const FEATURE_ROUTES = {
    '/banking': null, // Always accessible
    '/purchase': null,
    '/sales': null,
    '/reconciliation': 'bankReconciliation',
    '/reports': 'reports',
    '/tally': null, // Tally is now available for all including Free
    '/settings': null,
    '/profile': null,
    '/dashboard': null
};

// Get plan by ID
export const getPlanById = (planId) => {
    return PLANS[planId] || PLANS.free;
};

// Get all plans as array
export const getAllPlans = () => {
    return Object.values(PLANS);
};

// Check if limit is unlimited (-1)
export const isUnlimited = (limit) => limit === -1;

// Format limit for display
export const formatLimit = (limit) => {
    if (limit === -1) return 'Unlimited';
    return limit.toLocaleString();
};

// Format price for display
export const formatPrice = (price) => {
    if (price === 0) return 'Free';
    return `₹${price.toLocaleString()}`;
};

// Check if user can perform action based on current usage vs limit
export const checkLimit = (currentUsage, limit) => {
    if (limit === -1) return { allowed: true, remaining: Infinity };
    const remaining = limit - currentUsage;
    return {
        allowed: remaining > 0,
        remaining: Math.max(0, remaining),
        limit,
        usage: currentUsage,
        percentage: Math.min(100, Math.round((currentUsage / limit) * 100))
    };
};

// Check if feature is available in plan
export const hasFeature = (plan, featureName) => {
    const planConfig = typeof plan === 'string' ? PLANS[plan] : plan;
    if (!planConfig) return false;
    return planConfig.features[featureName] === true;
};

// Get feature info
export const getFeatureInfo = (featureName) => {
    return FEATURE_INFO[featureName] || { name: featureName, description: '' };
};

// Get features list for a plan (for display)
export const getPlanFeatures = (planId) => {
    const plan = getPlanById(planId);
    const included = [];
    const notIncluded = [];

    Object.entries(plan.features).forEach(([key, value]) => {
        const info = getFeatureInfo(key);
        if (value) {
            included.push({ key, ...info });
        } else {
            notIncluded.push({ key, ...info });
        }
    });

    return { included, notIncluded };
};

// Get upgrade recommendation based on what user needs
export const getUpgradeRecommendation = (currentPlan, neededFeature) => {
    const planOrder = ['free', 'starter', 'professional', 'enterprise'];
    const currentIndex = planOrder.indexOf(currentPlan);

    for (let i = currentIndex + 1; i < planOrder.length; i++) {
        const plan = PLANS[planOrder[i]];
        if (plan.features[neededFeature]) {
            return plan;
        }
    }
    return PLANS.professional; // Default recommendation
};

// Compare features between plans
export const comparePlans = () => {
    const plans = getAllPlans();
    const allFeatures = Object.keys(FEATURE_INFO);

    return allFeatures.map(feature => ({
        feature,
        ...getFeatureInfo(feature),
        availability: plans.map(plan => ({
            planId: plan.id,
            available: plan.features[feature]
        }))
    }));
};

export default PLANS;
