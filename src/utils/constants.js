/**
 * AI Tally Sync - Constants
 * Bank templates, categories, and configuration
 * Updated with accurate Indian bank statement column mappings
 */

// Bank Statement Templates with comprehensive column mappings
// Each bank may have multiple column name variations
export const BANK_TEMPLATES = {
    SBI: {
        name: 'State Bank of India',
        logo: '🏦',
        columns: {
            date: 'Txn Date',
            description: 'Description',
            reference: 'Ref No./Cheque No.',
            debit: 'Debit',
            credit: 'Credit',
            balance: 'Balance'
        },
        // Alternative column names found in different SBI statement formats
        aliases: {
            date: ['Txn Date', 'Transaction Date', 'Value Date', 'DATE', 'Trans Date'],
            description: ['Description', 'Narration', 'NARRATION', 'Particulars', 'DESCRIPTION'],
            reference: ['Ref No./Cheque No.', 'Ref No', 'Reference', 'Chq No', 'CHQ/REF NO'],
            debit: ['Debit', 'DEBIT', 'Withdrawal', 'DR', 'Dr Amount'],
            credit: ['Credit', 'CREDIT', 'Deposit', 'CR', 'Cr Amount'],
            balance: ['Balance', 'BALANCE', 'Closing Balance', 'Available Balance']
        },
        dateFormat: 'DD/MM/YYYY',
        skipRows: 0  // Number of header rows to skip
    },
    HDFC: {
        name: 'HDFC Bank',
        logo: '🏛️',
        columns: {
            date: 'Date',
            description: 'Narration',
            reference: 'Chq./Ref.No.',
            debit: 'Withdrawal Amt.',
            credit: 'Deposit Amt.',
            balance: 'Closing Balance'
        },
        aliases: {
            date: ['Date', 'Transaction Date', 'Value Date', 'Txn Date', 'TXN DATE'],
            description: ['Narration', 'Description', 'NARRATION', 'Transaction Description', 'Particulars'],
            reference: ['Chq./Ref.No.', 'Cheque No', 'Reference No', 'Ref No.', 'CHQ NO'],
            debit: ['Withdrawal Amt.', 'Withdrawal', 'Debit', 'DR', 'Debit Amount'],
            credit: ['Deposit Amt.', 'Deposit', 'Credit', 'CR', 'Credit Amount'],
            balance: ['Closing Balance', 'Balance', 'Available Balance', 'Running Balance']
        },
        dateFormat: 'DD/MM/YY',
        skipRows: 0
    },
    ICICI: {
        name: 'ICICI Bank',
        logo: '💳',
        columns: {
            date: 'Transaction Date',
            description: 'Transaction Remarks',
            reference: 'Cheque Number',
            debit: 'Withdrawal Amount (INR)',
            credit: 'Deposit Amount (INR)',
            balance: 'Balance (INR)'
        },
        aliases: {
            date: ['Transaction Date', 'Txn Date', 'Value Date', 'Date', 'S No.'],
            description: ['Transaction Remarks', 'Remarks', 'Description', 'Narration', 'PARTICULARS'],
            reference: ['Cheque Number', 'Chq No', 'Reference', 'Ref No', 'CHEQUE NO'],
            debit: ['Withdrawal Amount (INR)', 'Withdrawal', 'Debit', 'DR Amount', 'DR'],
            credit: ['Deposit Amount (INR)', 'Deposit', 'Credit', 'CR Amount', 'CR'],
            balance: ['Balance (INR)', 'Balance', 'Closing Balance', 'Available Balance']
        },
        dateFormat: 'DD-MM-YYYY',
        skipRows: 0
    },
    AXIS: {
        name: 'Axis Bank',
        logo: '🔷',
        columns: {
            date: 'Tran Date',
            description: 'PARTICULARS',
            reference: 'CHQNO',
            debit: 'DR',
            credit: 'CR',
            balance: 'BAL'
        },
        aliases: {
            date: ['Tran Date', 'Transaction Date', 'Value Date', 'Date', 'TXN DATE'],
            description: ['PARTICULARS', 'Particulars', 'Description', 'Narration', 'Transaction Details'],
            reference: ['CHQNO', 'Chq No', 'Reference', 'Ref No', 'Cheque No'],
            debit: ['DR', 'Debit', 'Withdrawal', 'DR Amount', 'Debit Amount'],
            credit: ['CR', 'Credit', 'Deposit', 'CR Amount', 'Credit Amount'],
            balance: ['BAL', 'Balance', 'Closing Balance', 'Running Balance']
        },
        dateFormat: 'DD-MM-YYYY',
        skipRows: 0
    },
    KOTAK: {
        name: 'Kotak Mahindra Bank',
        logo: '🏧',
        columns: {
            date: 'Transaction Date',
            description: 'Description',
            reference: 'Reference No',
            debit: 'Debit',
            credit: 'Credit',
            balance: 'Balance'
        },
        aliases: {
            date: ['Transaction Date', 'Date', 'Value Date', 'Txn Date', 'TRAN DATE'],
            description: ['Description', 'Narration', 'Particulars', 'DESCRIPTION', 'Details'],
            reference: ['Reference No', 'Ref No', 'Chq No', 'Reference', 'CHQNO'],
            debit: ['Debit', 'DR', 'Withdrawal', 'Debit Amt', 'DEBIT'],
            credit: ['Credit', 'CR', 'Deposit', 'Credit Amt', 'CREDIT'],
            balance: ['Balance', 'Closing Balance', 'Available Balance', 'BALANCE']
        },
        dateFormat: 'DD/MM/YYYY',
        skipRows: 0
    },
    PNB: {
        name: 'Punjab National Bank',
        logo: '🏦',
        columns: {
            date: 'DATE',
            description: 'NARRATION',
            reference: 'REF NO',
            debit: 'WITHDRAWAL',
            credit: 'DEPOSIT',
            balance: 'BALANCE'
        },
        aliases: {
            date: ['DATE', 'Date', 'Transaction Date', 'Value Date', 'Txn Date'],
            description: ['NARRATION', 'Narration', 'Description', 'Particulars'],
            reference: ['REF NO', 'Ref No', 'Reference', 'Chq No', 'CHEQUE NO'],
            debit: ['WITHDRAWAL', 'Withdrawal', 'Debit', 'DR', 'Dr Amount'],
            credit: ['DEPOSIT', 'Deposit', 'Credit', 'CR', 'Cr Amount'],
            balance: ['BALANCE', 'Balance', 'Closing Balance']
        },
        dateFormat: 'DD/MM/YYYY',
        skipRows: 0
    },
    BOB: {
        name: 'Bank of Baroda',
        logo: '🏛️',
        columns: {
            date: 'Trans Date',
            description: 'Particulars',
            reference: 'Chq No',
            debit: 'Withdrawals',
            credit: 'Deposits',
            balance: 'Balance'
        },
        aliases: {
            date: ['Trans Date', 'Transaction Date', 'Date', 'Value Date', 'TXN DATE'],
            description: ['Particulars', 'Description', 'Narration', 'PARTICULARS'],
            reference: ['Chq No', 'Cheque No', 'Ref No', 'Reference'],
            debit: ['Withdrawals', 'Withdrawal', 'Debit', 'DR', 'Dr Amount'],
            credit: ['Deposits', 'Deposit', 'Credit', 'CR', 'Cr Amount'],
            balance: ['Balance', 'Closing Balance', 'Available Balance']
        },
        dateFormat: 'DD-MMM-YYYY',
        skipRows: 0
    },
    CANARA: {
        name: 'Canara Bank',
        logo: '🏦',
        columns: {
            date: 'Date',
            description: 'Narration',
            reference: 'Cheque No',
            debit: 'Debit Amount',
            credit: 'Credit Amount',
            balance: 'Balance'
        },
        aliases: {
            date: ['Date', 'Transaction Date', 'Value Date', 'Txn Date'],
            description: ['Narration', 'Description', 'Particulars', 'NARRATION'],
            reference: ['Cheque No', 'Chq No', 'Ref No', 'Reference'],
            debit: ['Debit Amount', 'Debit', 'DR', 'Withdrawal'],
            credit: ['Credit Amount', 'Credit', 'CR', 'Deposit'],
            balance: ['Balance', 'Closing Balance', 'Available Balance']
        },
        dateFormat: 'DD/MM/YYYY',
        skipRows: 0
    },
    UNION: {
        name: 'Union Bank of India',
        logo: '🏦',
        columns: {
            date: 'Transaction Date',
            description: 'Narration',
            reference: 'Cheque No',
            debit: 'Debit',
            credit: 'Credit',
            balance: 'Balance'
        },
        aliases: {
            date: ['Transaction Date', 'Date', 'Value Date', 'TXN DATE'],
            description: ['Narration', 'Description', 'Particulars'],
            reference: ['Cheque No', 'Chq No', 'Ref No', 'Reference'],
            debit: ['Debit', 'DR', 'Withdrawal', 'Dr Amount'],
            credit: ['Credit', 'CR', 'Deposit', 'Cr Amount'],
            balance: ['Balance', 'Closing Balance']
        },
        dateFormat: 'DD/MM/YYYY',
        skipRows: 0
    },
    IDBI: {
        name: 'IDBI Bank',
        logo: '🏦',
        columns: {
            date: 'VCH DATE',
            description: 'NARRATION',
            reference: 'CHQ NO',
            debit: 'DEBIT',
            credit: 'CREDIT',
            balance: 'BALANCE'
        },
        aliases: {
            date: ['VCH DATE', 'Date', 'Transaction Date', 'Value Date'],
            description: ['NARRATION', 'Narration', 'Description', 'Particulars'],
            reference: ['CHQ NO', 'Cheque No', 'Ref No', 'Reference'],
            debit: ['DEBIT', 'Debit', 'DR', 'Withdrawal'],
            credit: ['CREDIT', 'Credit', 'CR', 'Deposit'],
            balance: ['BALANCE', 'Balance', 'Closing Balance']
        },
        dateFormat: 'DD-MM-YYYY',
        skipRows: 0
    },
    INDUSIND: {
        name: 'IndusInd Bank',
        logo: '🏦',
        columns: {
            date: 'Transaction Date',
            description: 'Transaction Particulars',
            reference: 'Cheque No',
            debit: 'Debit',
            credit: 'Credit',
            balance: 'Balance'
        },
        aliases: {
            date: ['Transaction Date', 'Date', 'Value Date', 'Txn Date'],
            description: ['Transaction Particulars', 'Particulars', 'Narration', 'Description'],
            reference: ['Cheque No', 'Chq No', 'Ref No', 'Reference'],
            debit: ['Debit', 'DR', 'Withdrawal', 'Debit Amount'],
            credit: ['Credit', 'CR', 'Deposit', 'Credit Amount'],
            balance: ['Balance', 'Closing Balance', 'Available Balance']
        },
        dateFormat: 'DD/MM/YYYY',
        skipRows: 0
    },
    YES: {
        name: 'YES Bank',
        logo: '🏦',
        columns: {
            date: 'Transaction Date',
            description: 'Description',
            reference: 'Reference Number',
            debit: 'Debit Amount',
            credit: 'Credit Amount',
            balance: 'Running Balance'
        },
        aliases: {
            date: ['Transaction Date', 'Date', 'Value Date', 'Txn Date'],
            description: ['Description', 'Narration', 'Particulars', 'Transaction Details'],
            reference: ['Reference Number', 'Ref No', 'Cheque No', 'Reference'],
            debit: ['Debit Amount', 'Debit', 'DR', 'Withdrawal'],
            credit: ['Credit Amount', 'Credit', 'CR', 'Deposit'],
            balance: ['Running Balance', 'Balance', 'Closing Balance']
        },
        dateFormat: 'DD/MM/YYYY',
        skipRows: 0
    },
    FEDERAL: {
        name: 'Federal Bank',
        logo: '🏦',
        columns: {
            date: 'Transaction Date',
            description: 'Particulars',
            reference: 'Cheque No',
            debit: 'Debit',
            credit: 'Credit',
            balance: 'Balance'
        },
        aliases: {
            date: ['Transaction Date', 'Date', 'Value Date'],
            description: ['Particulars', 'Description', 'Narration'],
            reference: ['Cheque No', 'Chq No', 'Reference'],
            debit: ['Debit', 'DR', 'Withdrawal'],
            credit: ['Credit', 'CR', 'Deposit'],
            balance: ['Balance', 'Closing Balance']
        },
        dateFormat: 'DD/MM/YYYY',
        skipRows: 0
    },
    GENERIC: {
        name: 'Generic/Other Bank',
        logo: '🏦',
        columns: {
            date: 'Date',
            description: 'Description',
            reference: 'Reference',
            debit: 'Debit',
            credit: 'Credit',
            balance: 'Balance'
        },
        aliases: {
            date: ['Date', 'Transaction Date', 'Txn Date', 'Value Date', 'Trans Date', 'TXN DATE', 'DATE'],
            description: ['Description', 'Narration', 'Particulars', 'Details', 'Transaction Details', 'NARRATION', 'DESCRIPTION', 'PARTICULARS'],
            reference: ['Reference', 'Ref No', 'Cheque No', 'Chq No', 'Reference No', 'CHQ NO', 'REF NO'],
            debit: ['Debit', 'DR', 'Withdrawal', 'Withdrawal Amount', 'Debit Amount', 'DEBIT', 'DR AMOUNT'],
            credit: ['Credit', 'CR', 'Deposit', 'Deposit Amount', 'Credit Amount', 'CREDIT', 'CR AMOUNT'],
            balance: ['Balance', 'Closing Balance', 'Available Balance', 'Running Balance', 'BALANCE']
        },
        dateFormat: 'DD/MM/YYYY',
        skipRows: 0
    },
    AUTO: {
        name: 'Auto-Detect (AI)',
        logo: '🤖',
        description: 'Let AI automatically detect columns from any bank statement format',
        isAuto: true,
        columns: {
            date: 'Date',
            description: 'Description',
            reference: 'Reference',
            debit: 'Debit',
            credit: 'Credit',
            balance: 'Balance'
        },
        aliases: {
            date: ['Date', 'Transaction Date', 'Txn Date', 'Value Date', 'Trans Date', 'TXN DATE', 'DATE', 'Posting Date'],
            description: ['Description', 'Narration', 'Particulars', 'Details', 'Transaction Details', 'NARRATION', 'DESCRIPTION', 'PARTICULARS', 'Remarks'],
            reference: ['Reference', 'Ref No', 'Cheque No', 'Chq No', 'Reference No', 'CHQ NO', 'REF NO', 'UTR', 'Ref.No'],
            debit: ['Debit', 'DR', 'Withdrawal', 'Withdrawal Amount', 'Debit Amount', 'DEBIT', 'DR AMOUNT', 'Withdrawals', 'Dr', 'Out'],
            credit: ['Credit', 'CR', 'Deposit', 'Deposit Amount', 'Credit Amount', 'CREDIT', 'CR AMOUNT', 'Deposits', 'Cr', 'In'],
            balance: ['Balance', 'Closing Balance', 'Available Balance', 'Running Balance', 'BALANCE', 'Net Balance']
        },
        dateFormat: 'AUTO',
        skipRows: 0
    }
};

// Transaction Categories for AI Classification
export const TRANSACTION_CATEGORIES = {
    INCOME: {
        label: 'Income',
        color: '#10b981',
        subcategories: [
            'Salary',
            'Business Revenue',
            'Investment Returns',
            'Interest Income',
            'Rental Income',
            'Commission',
            'Refund',
            'Other Income'
        ]
    },
    EXPENSE: {
        label: 'Expense',
        color: '#ef4444',
        subcategories: [
            'Utilities',
            'Rent',
            'Salary & Wages',
            'Office Supplies',
            'Travel',
            'Marketing',
            'Professional Fees',
            'Insurance',
            'Bank Charges',
            'Taxes',
            'Repairs & Maintenance',
            'Food & Dining',
            'Fuel & Transport',
            'Communication',
            'Subscriptions',
            'Other Expense'
        ]
    },
    TRANSFER: {
        label: 'Transfer',
        color: '#6366f1',
        subcategories: [
            'Internal Transfer',
            'Self Transfer',
            'Fund Transfer',
            'Investment',
            'Loan Payment',
            'EMI',
            'Credit Card Payment',
            'UPI Transfer'
        ]
    },
    PURCHASE: {
        label: 'Purchase',
        color: '#f59e0b',
        subcategories: [
            'Raw Materials',
            'Inventory',
            'Fixed Assets',
            'Equipment',
            'Vehicle',
            'Property',
            'Goods'
        ]
    },
    SALES: {
        label: 'Sales',
        color: '#14b8a6',
        subcategories: [
            'Product Sales',
            'Service Revenue',
            'Export Sales'
        ]
    },
    TAX: {
        label: 'Tax',
        color: '#8b5cf6',
        subcategories: [
            'GST Payment',
            'TDS Payment',
            'Income Tax',
            'Professional Tax',
            'Advance Tax'
        ]
    },
    LOAN: {
        label: 'Loan',
        color: '#ec4899',
        subcategories: [
            'Loan Disbursement',
            'EMI Payment',
            'Interest Payment',
            'Loan Repayment'
        ]
    }
};

// Tally Ledger Groups
export const TALLY_LEDGER_GROUPS = [
    'Bank Accounts',
    'Bank OCC A/c',
    'Bank OD A/c',
    'Cash-in-Hand',
    'Current Assets',
    'Current Liabilities',
    'Direct Expenses',
    'Direct Incomes',
    'Duties & Taxes',
    'Expenses (Direct)',
    'Expenses (Indirect)',
    'Fixed Assets',
    'Income (Direct)',
    'Income (Indirect)',
    'Indirect Expenses',
    'Indirect Incomes',
    'Investments',
    'Loans & Advances (Asset)',
    'Loans (Liability)',
    'Provisions',
    'Purchase Accounts',
    'Sales Accounts',
    'Secured Loans',
    'Stock-in-Hand',
    'Sundry Creditors',
    'Sundry Debtors',
    'Suspense A/c',
    'Unsecured Loans'
];

// Common Ledger Names
export const COMMON_LEDGERS = {
    BANK: ['HDFC Bank', 'SBI Bank', 'ICICI Bank', 'Axis Bank', 'Kotak Bank', 'Bank Account'],
    CASH: ['Cash in Hand', 'Petty Cash', 'Cash'],
    EXPENSE: ['Rent', 'Salary', 'Office Expenses', 'Electricity Charges', 'Telephone Charges', 'Internet Charges', 'Conveyance', 'Food Expenses', 'Bank Charges'],
    INCOME: ['Sales Account', 'Service Revenue', 'Interest Received', 'Commission Received'],
    PURCHASE: ['Purchase Account', 'Raw Materials', 'Stock'],
    DEBTOR: ['Sundry Debtors'],
    CREDITOR: ['Sundry Creditors'],
    TAX: ['GST Payable', 'TDS Payable', 'Income Tax']
};

// GST Rates
export const GST_RATES = [
    { value: 0, label: 'Exempt (0%)' },
    { value: 0.05, label: '5%' },
    { value: 0.12, label: '12%' },
    { value: 0.18, label: '18%' },
    { value: 0.28, label: '28%' }
];

// App Configuration
export const APP_CONFIG = {
    name: 'BooksNeo',
    version: '1.0.0',
    maxFileSize: 10 * 1024 * 1024, // 10MB
    supportedFileTypes: ['.csv', '.xlsx', '.xls'],
    apiRetryAttempts: 3,
    apiRetryDelay: 1000
};

// Dashboard Quick Actions
export const QUICK_ACTIONS = [
    { id: 'upload-bank', label: 'Upload Bank Statement', icon: 'Upload', path: '/banking' },
    { id: 'add-purchase', label: 'Add Purchase Entry', icon: 'ShoppingCart', path: '/purchase' },
    { id: 'add-sale', label: 'Add Sale Entry', icon: 'DollarSign', path: '/sales' },
    { id: 'sync-tally', label: 'Sync with Tally', icon: 'RefreshCw', path: '/tally' }
];
