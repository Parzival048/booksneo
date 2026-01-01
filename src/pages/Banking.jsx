/**
 * AI Tally Sync - Banking Module Page
 * Bank statement upload, AI categorization, and Tally sync
 * Now with PDF support, transaction grouping, and smart learning
 */

import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import FileUpload from '../components/common/FileUpload';
import PlanGate from '../components/common/PlanGate';
import {
    Upload,
    Sparkles,
    Send,
    Download,
    Filter,
    CheckCircle,
    Edit2,
    Trash2,
    RefreshCw,
    X,
    Save,
    Plus,
    Layers,
    Brain,
    CheckSquare,
    FileText,
    Lock
} from 'lucide-react';
import { BANK_TEMPLATES, TRANSACTION_CATEGORIES, TALLY_LEDGER_GROUPS } from '../utils/constants';
import { parseFile, mapToTransactions, calculateSummary, filterByDateRange, sortByDate, exportToCSV } from '../services/fileParser';
import { categorizeTransactions } from '../services/openaiService';
import { batchPushToTally, createLedger, getLedgers } from '../services/tallyService';
import { storeCorrection, groupSimilarTransactions, getPrediction, getLearningStats } from '../services/learningService';
import { formatCurrency, formatDate, downloadFile, convertToCSV } from '../utils/helpers';
import logger from '../utils/logger';

const Banking = () => {
    const { state, actions } = useApp();
    const { hasFeatureAccess, canAddTransaction, getTransactionLimit, setTransactionCount } = useAuth();

    // Start at step 3 if transactions already exist (e.g., coming from "View Pending")
    const initialStep = state.banking.transactions.length > 0 ? 3 : 1;
    const [step, setStep] = useState(initialStep);
    const [selectedBank, setSelectedBank] = useState(state.banking.selectedTemplate || '');
    const [selectedLedger, setSelectedLedger] = useState('');
    const [dateRange, setDateRange] = useState({ start: '', end: '' });
    const [uploadedFile, setUploadedFile] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [processingStep, setProcessingStep] = useState('');
    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState({ category: '', ledger: '' });

    // Ledger creation state
    const [showCreateLedger, setShowCreateLedger] = useState(false);
    const [newLedgerName, setNewLedgerName] = useState('');
    const [newLedgerGroup, setNewLedgerGroup] = useState('Bank Accounts');
    const [isCreatingLedger, setIsCreatingLedger] = useState(false);

    // Transaction grouping and bulk editing state
    const [showGroups, setShowGroups] = useState(false);
    const [transactionGroups, setTransactionGroups] = useState([]);
    const [selectedTransactions, setSelectedTransactions] = useState(new Set());
    const [bulkCategory, setBulkCategory] = useState('');
    const [bulkLedger, setBulkLedger] = useState('');
    const [learningStats, setLearningStats] = useState({ patternsLearned: 0, estimatedAccuracy: 60 });

    const { transactions } = state.banking;

    // Check for existing transactions when component mounts
    useEffect(() => {
        if (transactions.length > 0 && step === 1) {
            setStep(3); // Go to Review step
        }
        // Load learning stats
        getLearningStats().then(setLearningStats);
    }, []);

    // Handle creating a new ledger in Tally
    const handleCreateLedger = async () => {
        if (!newLedgerName.trim()) {
            actions.addNotification({ type: 'warning', message: 'Please enter ledger name' });
            return;
        }
        if (!state.tally.connected) {
            actions.addNotification({ type: 'error', message: 'Please connect to Tally first' });
            return;
        }

        setIsCreatingLedger(true);
        try {
            await createLedger(newLedgerName, newLedgerGroup, state.tally.activeCompany);

            // Refresh ledgers
            const ledgers = await getLedgers(state.tally.activeCompany);
            actions.setLedgers(ledgers);

            // Select the newly created ledger
            setSelectedLedger(newLedgerName);

            actions.addNotification({
                type: 'success',
                title: 'Ledger Created',
                message: `"${newLedgerName}" created in Tally`
            });

            // Reset form
            setNewLedgerName('');
            setShowCreateLedger(false);
        } catch (error) {
            actions.addNotification({
                type: 'error',
                message: 'Failed to create ledger: ' + error.message
            });
        } finally {
            setIsCreatingLedger(false);
        }
    };

    // Handle file selection
    const handleFileSelect = (file) => {
        setUploadedFile(file);
        if (file) {
            setStep(2);
        }
    };

    // Process the uploaded file
    const handleProcessFile = async () => {
        if (!uploadedFile || !selectedBank) {
            actions.addNotification({
                type: 'error',
                message: 'Please select a bank template'
            });
            return;
        }

        // Check transaction limits before processing
        const limitInfo = getTransactionLimit();
        if (!limitInfo.unlimited && limitInfo.remaining <= 0) {
            actions.addNotification({
                type: 'error',
                title: 'Transaction Limit Reached',
                message: `You've used all ${limitInfo.displayLimit} transactions this month. Upgrade your plan for more.`
            });
            return;
        }

        setIsProcessing(true);
        setProcessingStep('Parsing file...');
        logger.userAction('processFile', { bank: selectedBank, file: uploadedFile.name });

        try {
            const parseResult = await parseFile(uploadedFile);

            console.log('Parse result:', parseResult);

            // Handle both array (old format) and object (new format) returns
            let rawData;
            let detectedBank = null;

            if (Array.isArray(parseResult)) {
                // Old format: direct array
                rawData = parseResult;
            } else if (parseResult && typeof parseResult === 'object') {
                // New format: object with rawData
                rawData = parseResult.rawData || [];
                detectedBank = parseResult.detectedBank;

                // If PDF detected a bank, use it
                if (parseResult.isPDF && detectedBank && !selectedBank) {
                    setSelectedBank(detectedBank);
                }
            } else {
                rawData = [];
            }

            console.log('Raw data rows:', rawData.length, rawData.slice(0, 2));

            if (!rawData || rawData.length === 0) {
                throw new Error('No data found in file. Please check the file format and try again.');
            }

            // Check if transactions would exceed limit
            if (!limitInfo.unlimited && rawData.length > limitInfo.remaining) {
                const canProcess = limitInfo.remaining;
                actions.addNotification({
                    type: 'warning',
                    title: 'Limit Warning',
                    message: `You can only add ${canProcess} more transactions. File has ${rawData.length}. Processing first ${canProcess}.`
                });
                rawData = rawData.slice(0, canProcess);
            }

            const effectiveBank = selectedBank || detectedBank || 'GENERIC';

            setProcessingStep(`Parsed ${parseResult.isPDF ? `PDF (${parseResult.pageCount} pages)` : rawData.length + ' rows'}`);

            // For PDF, transactions are already mapped; for CSV/Excel, need to map
            let mappedTransactions;
            if (parseResult.isPDF && rawData.length > 0 && rawData[0].date) {
                // PDF already has mapped transactions
                mappedTransactions = rawData.map((t, i) => ({
                    ...t,
                    id: t.id || `pdf-${Date.now()}-${i}`
                }));
            } else {
                console.log('Mapping with bank template:', effectiveBank);
                console.log('First row keys:', Object.keys(rawData[0] || {}));
                mappedTransactions = mapToTransactions(rawData, effectiveBank);
            }

            console.log('Mapped transactions:', mappedTransactions.length);

            if (mappedTransactions.length === 0) {
                throw new Error(`No valid transactions found. The file may have column headers that don't match the ${effectiveBank} template. Try selecting a different bank or use GENERIC.`);
            }

            setProcessingStep(`Mapped ${mappedTransactions.length} transactions`);

            if (dateRange.start || dateRange.end) {
                mappedTransactions = filterByDateRange(mappedTransactions, dateRange.start, dateRange.end);
                setProcessingStep(`Filtered to ${mappedTransactions.length} transactions`);
            }

            mappedTransactions = sortByDate(mappedTransactions, 'date', 'asc');

            setProcessingStep('Running AI categorization...');
            const categorizedTransactions = await categorizeTransactions(mappedTransactions);

            const summary = calculateSummary(categorizedTransactions);

            actions.setTransactions(categorizedTransactions);
            actions.setSummary(summary);
            actions.setTemplate(selectedBank);

            // Update transaction count in usage
            const newCount = limitInfo.usage + categorizedTransactions.length;
            await setTransactionCount(newCount);

            setStep(3);

            actions.addNotification({
                type: 'success',
                title: 'Processing Complete',
                message: `Categorized ${categorizedTransactions.length} transactions`
            });

        } catch (error) {
            logger.error('File processing failed', error);
            actions.addNotification({
                type: 'error',
                title: 'Processing Failed',
                message: error.message
            });
        } finally {
            setIsProcessing(false);
            setProcessingStep('');
        }
    };

    // Push transactions to Tally
    const handlePushToTally = async () => {
        if (!state.tally.connected) {
            actions.addNotification({
                type: 'error',
                message: 'Please connect to Tally first'
            });
            return;
        }

        if (!state.tally.activeCompany) {
            actions.addNotification({
                type: 'error',
                message: 'No active company selected. Please go to Tally Connector and select a company.'
            });
            return;
        }

        const pendingTransactions = transactions.filter(t => !t.syncedToTally);

        if (pendingTransactions.length === 0) {
            actions.addNotification({
                type: 'info',
                message: 'All transactions are already synced'
            });
            return;
        }

        // Validate bank ledger selection
        const bankLedger = selectedLedger || 'Bank Account';
        console.log('Push to Tally:', {
            company: state.tally.activeCompany,
            bankLedger,
            pendingCount: pendingTransactions.length
        });

        setIsProcessing(true);
        setProcessingStep('Pushing to Tally...');

        try {
            const result = await batchPushToTally(
                pendingTransactions,
                state.tally.activeCompany,
                bankLedger
            );

            console.log('Tally push result:', result);

            // Update all transactions at once to ensure proper persistence
            const pendingIds = new Set(pendingTransactions.map(t => t.id));
            const updatedTransactions = transactions.map(t =>
                pendingIds.has(t.id)
                    ? { ...t, syncedToTally: true, status: 'synced' }
                    : t
            );

            // Use setTransactions to save all at once (triggers localStorage save)
            actions.setTransactions(updatedTransactions);

            // Also update summary
            const summary = {
                totalTransactions: updatedTransactions.length,
                totalCredit: updatedTransactions.reduce((sum, t) => sum + (t.credit || 0), 0),
                totalDebit: updatedTransactions.reduce((sum, t) => sum + (t.debit || 0), 0),
                netAmount: updatedTransactions.reduce((sum, t) => sum + (t.credit || 0) - (t.debit || 0), 0)
            };
            actions.setSummary(summary);

            if (result.failed > 0) {
                actions.addNotification({
                    type: 'warning',
                    title: 'Partial Sync',
                    message: `${result.success} created, ${result.failed} failed. ${result.errors[0]?.error || ''}`
                });
            } else {
                actions.addNotification({
                    type: 'success',
                    title: 'Sync Complete',
                    message: `${result.success} vouchers created in Tally`
                });
            }

            setStep(4);

        } catch (error) {
            console.error('Tally sync failed:', error);
            logger.error('Tally sync failed', error);
            actions.addNotification({
                type: 'error',
                title: 'Sync Failed',
                message: error.message || 'Failed to sync with Tally. Check console for details.'
            });
        } finally {
            setIsProcessing(false);
            setProcessingStep('');
        }
    };

    // Export transactions to CSV
    const handleExport = () => {
        if (transactions.length === 0) {
            actions.addNotification({
                type: 'warning',
                message: 'No transactions to export'
            });
            return;
        }

        try {
            const exportData = transactions.map(t => ({
                'Date': formatDate(t.date),
                'Description': t.description,
                'Debit': t.debit || 0,
                'Credit': t.credit || 0,
                'Balance': t.balance || '',
                'Category': t.userCategory || t.aiCategory || '',
                'Subcategory': t.aiSubcategory || '',
                'Suggested Ledger': t.userLedger || t.aiSuggestedLedger || '',
                'AI Confidence': `${t.aiConfidence || 0}%`,
                'Synced to Tally': t.syncedToTally ? 'Yes' : 'No',
                'Reference': t.reference || ''
            }));

            const csvContent = convertToCSV(exportData);
            const bankName = BANK_TEMPLATES[state.banking.selectedTemplate]?.name || 'Bank';
            const fileName = `${bankName}_Transactions_${new Date().toISOString().split('T')[0]}.csv`;

            downloadFile(csvContent, fileName, 'text/csv');

            actions.addNotification({
                type: 'success',
                message: `Exported ${transactions.length} transactions to CSV`
            });
        } catch (error) {
            actions.addNotification({
                type: 'error',
                message: 'Export failed: ' + error.message
            });
        }
    };

    // Toggle transaction grouping view
    const handleToggleGroups = () => {
        if (!showGroups) {
            const groups = groupSimilarTransactions(transactions);
            setTransactionGroups(groups);
        }
        setShowGroups(!showGroups);
    };

    // Toggle transaction selection
    const handleToggleSelect = (id) => {
        const newSelected = new Set(selectedTransactions);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedTransactions(newSelected);
    };

    // Select all transactions in a group
    const handleSelectGroup = (group) => {
        const newSelected = new Set(selectedTransactions);
        group.transactions.forEach(t => newSelected.add(t.id));
        setSelectedTransactions(newSelected);
    };

    // Apply bulk category/ledger to selected transactions
    const handleBulkApply = async () => {
        if (selectedTransactions.size === 0) {
            actions.addNotification({ type: 'warning', message: 'No transactions selected' });
            return;
        }

        const updatedTransactions = transactions.map(t => {
            if (selectedTransactions.has(t.id)) {
                const updated = { ...t };
                if (bulkCategory) {
                    updated.userCategory = bulkCategory;
                    updated.aiCategory = bulkCategory;
                }
                if (bulkLedger) {
                    updated.userLedger = bulkLedger;
                    updated.aiSuggestedLedger = bulkLedger;
                }

                // Store correction for learning
                storeCorrection({
                    description: t.description,
                    ledger: bulkLedger || t.aiSuggestedLedger,
                    category: bulkCategory || t.aiCategory,
                    subcategory: t.aiSubcategory
                });

                return updated;
            }
            return t;
        });

        actions.setTransactions(updatedTransactions);

        // Refresh learning stats
        const stats = await getLearningStats();
        setLearningStats(stats);

        actions.addNotification({
            type: 'success',
            message: `Updated ${selectedTransactions.size} transactions`
        });

        setSelectedTransactions(new Set());
        setBulkCategory('');
        setBulkLedger('');
    };

    // Select all / deselect all
    const handleSelectAll = () => {
        if (selectedTransactions.size === transactions.length) {
            setSelectedTransactions(new Set());
        } else {
            setSelectedTransactions(new Set(transactions.map(t => t.id)));
        }
    };

    // Start editing a transaction
    const handleStartEdit = (transaction) => {
        setEditingId(transaction.id);
        setEditForm({
            category: transaction.userCategory || transaction.aiCategory || '',
            ledger: transaction.userLedger || transaction.aiSuggestedLedger || ''
        });
    };

    // Save edited transaction
    const handleSaveEdit = async () => {
        if (editingId) {
            const transaction = transactions.find(t => t.id === editingId);

            actions.updateTransaction(editingId, {
                userCategory: editForm.category,
                userLedger: editForm.ledger,
                status: 'reviewed'
            });

            // Store correction for learning
            if (transaction) {
                await storeCorrection({
                    description: transaction.description,
                    ledger: editForm.ledger || transaction.aiSuggestedLedger,
                    category: editForm.category || transaction.aiCategory,
                    subcategory: transaction.aiSubcategory
                });

                // Refresh learning stats
                const stats = await getLearningStats();
                setLearningStats(stats);
            }

            // Update summary after edit
            const updatedTransactions = transactions.map(t =>
                t.id === editingId
                    ? { ...t, userCategory: editForm.category, userLedger: editForm.ledger }
                    : t
            );
            const summary = calculateSummary(updatedTransactions);
            actions.setSummary(summary);

            setEditingId(null);
            setEditForm({ category: '', ledger: '' });

            actions.addNotification({
                type: 'success',
                message: 'Transaction updated & pattern learned'
            });
        }
    };

    // Cancel editing
    const handleCancelEdit = () => {
        setEditingId(null);
        setEditForm({ category: '', ledger: '' });
    };

    // Delete a transaction
    const handleDeleteTransaction = (id) => {
        const updatedTransactions = transactions.filter(t => t.id !== id);
        actions.setTransactions(updatedTransactions);

        // Update summary
        const summary = calculateSummary(updatedTransactions);
        actions.setSummary(summary);

        actions.addNotification({
            type: 'info',
            message: 'Transaction deleted'
        });
    };

    // Reset and start over
    const handleReset = () => {
        actions.resetBanking();
        setStep(1);
        setUploadedFile(null);
        setSelectedBank('');
        setSelectedLedger('');
        setDateRange({ start: '', end: '' });
    };

    // Get category color
    const getCategoryColor = (category) => {
        return TRANSACTION_CATEGORIES[category]?.color || 'var(--text-muted)';
    };

    // Get available categories for dropdown
    const categoryOptions = Object.entries(TRANSACTION_CATEGORIES).map(([key, val]) => ({
        value: key,
        label: val.label,
        color: val.color
    }));

    return (
        <div className="animate-slideUp">
            {/* Progress Steps */}
            <div className="card mb-6">
                <div className="flex items-center gap-4">
                    {[
                        { num: 1, label: 'Upload' },
                        { num: 2, label: 'Configure' },
                        { num: 3, label: 'Review' },
                        { num: 4, label: 'Sync' }
                    ].map(({ num, label }) => (
                        <div
                            key={num}
                            className="flex items-center gap-2"
                            style={{ flex: num < 4 ? 1 : 'auto' }}
                        >
                            <div style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                background: step >= num
                                    ? 'var(--gradient-primary)'
                                    : 'var(--bg-glass)',
                                border: step >= num
                                    ? 'none'
                                    : '1px solid var(--border-default)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: '600',
                                fontSize: 'var(--text-sm)',
                                color: step >= num ? 'white' : 'var(--text-muted)'
                            }}>
                                {step > num ? <CheckCircle size={16} /> : num}
                            </div>
                            <span style={{
                                fontSize: 'var(--text-sm)',
                                fontWeight: step === num ? '600' : '400',
                                color: step >= num ? 'var(--text-primary)' : 'var(--text-muted)'
                            }}>
                                {label}
                            </span>
                            {num < 4 && (
                                <div style={{
                                    flex: 1,
                                    height: '2px',
                                    background: step > num
                                        ? 'var(--primary-500)'
                                        : 'var(--border-default)',
                                    marginLeft: 'var(--space-2)'
                                }} />
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Step 1: Upload */}
            {step === 1 && (
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title flex items-center gap-2">
                            <Upload size={20} />
                            Upload Bank Statement
                        </h3>
                    </div>
                    <FileUpload onFileSelect={handleFileSelect} />
                </div>
            )}

            {/* Step 2: Configure */}
            {step === 2 && (
                <div className="dashboard-grid-2">
                    <div className="card">
                        <div className="card-header">
                            <h3 className="card-title">Select Bank Template</h3>
                        </div>
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(2, 1fr)',
                            gap: 'var(--space-3)'
                        }}>
                            {Object.entries(BANK_TEMPLATES).map(([key, bank]) => (
                                <div
                                    key={key}
                                    onClick={() => setSelectedBank(key)}
                                    style={{
                                        padding: 'var(--space-4)',
                                        borderRadius: 'var(--radius-lg)',
                                        border: selectedBank === key
                                            ? '2px solid var(--primary-500)'
                                            : '1px solid var(--border-default)',
                                        background: selectedBank === key
                                            ? 'rgba(99, 102, 241, 0.1)'
                                            : 'var(--bg-glass)',
                                        cursor: 'pointer',
                                        transition: 'all var(--transition-fast)'
                                    }}
                                >
                                    <div className="flex items-center gap-3">
                                        <span style={{ fontSize: 'var(--text-2xl)' }}>{bank.logo}</span>
                                        <div>
                                            <p style={{ fontWeight: '500', marginBottom: 0 }}>{bank.name}</p>
                                            <p style={{
                                                fontSize: 'var(--text-xs)',
                                                color: 'var(--text-muted)',
                                                marginBottom: 0
                                            }}>
                                                {key}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="card">
                        <div className="card-header">
                            <h3 className="card-title flex items-center gap-2">
                                <Filter size={20} />
                                Filters & Settings
                            </h3>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Date Range</label>
                            <div className="flex gap-3">
                                <input
                                    type="date"
                                    className="form-input"
                                    value={dateRange.start}
                                    onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                                />
                                <input
                                    type="date"
                                    className="form-input"
                                    value={dateRange.end}
                                    onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <div className="flex items-center justify-between mb-2">
                                <label className="form-label" style={{ marginBottom: 0 }}>Bank Ledger in Tally</label>
                                <button
                                    type="button"
                                    className="btn btn-sm btn-ghost"
                                    onClick={() => setShowCreateLedger(!showCreateLedger)}
                                    disabled={!state.tally.connected}
                                >
                                    <Plus size={14} />
                                    {showCreateLedger ? 'Cancel' : 'Create New'}
                                </button>
                            </div>

                            {showCreateLedger ? (
                                <div
                                    style={{
                                        background: 'var(--bg-glass)',
                                        borderRadius: 'var(--radius-lg)',
                                        padding: 'var(--space-4)',
                                        border: '1px solid var(--border-default)',
                                        marginBottom: 'var(--space-4)'
                                    }}
                                >
                                    <div className="form-group" style={{ marginBottom: 'var(--space-3)' }}>
                                        <label className="form-label" style={{ fontSize: 'var(--text-xs)' }}>Ledger Name</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            placeholder="e.g., HDFC Bank"
                                            value={newLedgerName}
                                            onChange={(e) => setNewLedgerName(e.target.value)}
                                        />
                                    </div>
                                    <div className="form-group" style={{ marginBottom: 'var(--space-3)' }}>
                                        <label className="form-label" style={{ fontSize: 'var(--text-xs)' }}>Group</label>
                                        <select
                                            className="form-select"
                                            value={newLedgerGroup}
                                            onChange={(e) => setNewLedgerGroup(e.target.value)}
                                        >
                                            {TALLY_LEDGER_GROUPS.map(group => (
                                                <option key={group} value={group}>{group}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <button
                                        className="btn btn-primary w-full btn-sm"
                                        onClick={handleCreateLedger}
                                        disabled={isCreatingLedger || !newLedgerName.trim()}
                                    >
                                        {isCreatingLedger ? (
                                            <><span className="spinner" /> Creating...</>
                                        ) : (
                                            <><Plus size={14} /> Create Ledger</>
                                        )}
                                    </button>
                                </div>
                            ) : (
                                <select
                                    className="form-select"
                                    value={selectedLedger}
                                    onChange={(e) => setSelectedLedger(e.target.value)}
                                >
                                    <option value="">Select ledger...</option>
                                    {state.tally.ledgers.map(l => (
                                        <option key={l.name} value={l.name}>{l.name}</option>
                                    ))}
                                    <option value="Bank Account">Bank Account (Default)</option>
                                </select>
                            )}
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                className="btn btn-secondary"
                                onClick={() => setStep(1)}
                            >
                                Back
                            </button>
                            <button
                                className="btn btn-primary flex-1"
                                onClick={handleProcessFile}
                                disabled={!selectedBank || isProcessing}
                            >
                                {isProcessing ? (
                                    <>
                                        <span className="spinner" />
                                        {processingStep}
                                    </>
                                ) : (
                                    <>
                                        <Sparkles size={18} />
                                        Process with AI
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Step 3: Review */}
            {step === 3 && (
                <>
                    {/* Summary Cards */}
                    {state.banking.summary && (
                        <div className="dashboard-grid mb-6">
                            <div className="stat-card">
                                <div className="stat-content">
                                    <p className="stat-label">Total Transactions</p>
                                    <p className="stat-value">{state.banking.summary.totalTransactions}</p>
                                </div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-content">
                                    <p className="stat-label">Total Credit</p>
                                    <p className="stat-value text-success">{formatCurrency(state.banking.summary.totalCredit)}</p>
                                </div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-content">
                                    <p className="stat-label">Total Debit</p>
                                    <p className="stat-value" style={{ color: 'var(--error-500)' }}>{formatCurrency(state.banking.summary.totalDebit)}</p>
                                </div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-content">
                                    <p className="stat-label">Net Amount</p>
                                    <p className="stat-value" style={{
                                        color: state.banking.summary.netAmount >= 0 ? 'var(--success-500)' : 'var(--error-500)'
                                    }}>{formatCurrency(state.banking.summary.netAmount)}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Learning Stats & Bulk Actions Toolbar */}
                    <div className="card mb-4">
                        <div className="flex items-center justify-between flex-wrap gap-4" style={{ padding: 'var(--space-3) var(--space-4)' }}>
                            {/* Learning Stats */}
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2" style={{ color: 'var(--primary-400)' }}>
                                    <Brain size={18} />
                                    <span style={{ fontSize: 'var(--text-sm)' }}>
                                        <strong>{learningStats.patternsLearned}</strong> patterns learned
                                    </span>
                                </div>
                                <div style={{
                                    fontSize: 'var(--text-xs)',
                                    background: 'var(--bg-glass)',
                                    padding: '4px 10px',
                                    borderRadius: 'var(--radius-full)'
                                }}>
                                    ~{learningStats.estimatedAccuracy}% accuracy
                                </div>
                            </div>

                            {/* Grouping Toggle */}
                            <div className="flex items-center gap-3">
                                <button
                                    className={`btn btn-sm ${showGroups ? 'btn-primary' : 'btn-secondary'}`}
                                    onClick={handleToggleGroups}
                                >
                                    <Layers size={14} />
                                    {showGroups ? 'Hide Groups' : 'Group Similar'}
                                </button>

                                <button
                                    className="btn btn-sm btn-secondary"
                                    onClick={handleSelectAll}
                                >
                                    <CheckSquare size={14} />
                                    {selectedTransactions.size === transactions.length ? 'Deselect All' : 'Select All'}
                                </button>
                            </div>
                        </div>

                        {/* Bulk Editing Panel - Shows when transactions selected */}
                        {selectedTransactions.size > 0 && (
                            <div style={{
                                borderTop: '1px solid var(--border-default)',
                                padding: 'var(--space-3) var(--space-4)',
                                background: 'rgba(99, 102, 241, 0.1)'
                            }}>
                                <div className="flex items-center gap-4 flex-wrap">
                                    <span style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>
                                        {selectedTransactions.size} selected
                                    </span>

                                    <select
                                        className="form-select"
                                        value={bulkCategory}
                                        onChange={(e) => setBulkCategory(e.target.value)}
                                        style={{ width: '160px', height: '36px', fontSize: 'var(--text-sm)' }}
                                    >
                                        <option value="">Set Category...</option>
                                        {Object.keys(TRANSACTION_CATEGORIES).map(cat => (
                                            <option key={cat} value={cat}>{cat}</option>
                                        ))}
                                    </select>

                                    <select
                                        className="form-select"
                                        value={bulkLedger}
                                        onChange={(e) => setBulkLedger(e.target.value)}
                                        style={{ width: '180px', height: '36px', fontSize: 'var(--text-sm)' }}
                                    >
                                        <option value="">Set Ledger...</option>
                                        {state.tally.ledgers.map(l => (
                                            <option key={l.name} value={l.name}>{l.name}</option>
                                        ))}
                                    </select>

                                    <button
                                        className="btn btn-primary btn-sm"
                                        onClick={handleBulkApply}
                                        disabled={!bulkCategory && !bulkLedger}
                                    >
                                        <Save size={14} />
                                        Apply & Remember
                                    </button>

                                    <button
                                        className="btn btn-ghost btn-sm"
                                        onClick={() => setSelectedTransactions(new Set())}
                                    >
                                        <X size={14} />
                                        Clear
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Transaction Groups Panel */}
                    {showGroups && transactionGroups.length > 0 && (
                        <div className="card mb-4">
                            <div className="card-header">
                                <h4 className="card-title" style={{ fontSize: 'var(--text-md)' }}>
                                    <Layers size={16} /> Similar Transaction Groups ({transactionGroups.length})
                                </h4>
                            </div>
                            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                                {transactionGroups.map((group, idx) => (
                                    <div
                                        key={idx}
                                        style={{
                                            padding: 'var(--space-3) var(--space-4)',
                                            borderBottom: '1px solid var(--border-default)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between'
                                        }}
                                    >
                                        <div>
                                            <div style={{ fontWeight: 500 }}>{group.pattern}</div>
                                            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                                                {group.transactions.length} transactions · Total: {formatCurrency(group.totalAmount)}
                                            </div>
                                        </div>
                                        <button
                                            className="btn btn-sm btn-secondary"
                                            onClick={() => handleSelectGroup(group)}
                                        >
                                            <CheckSquare size={14} />
                                            Select Group
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Transactions Table */}
                    <div className="card">
                        <div className="card-header">
                            <h3 className="card-title">Categorized Transactions ({transactions.length})</h3>
                            <div className="flex gap-2">
                                <button
                                    className="btn btn-secondary btn-sm"
                                    onClick={handleExport}
                                >
                                    <Download size={16} />
                                    Export CSV
                                </button>
                                <button
                                    className="btn btn-primary btn-sm"
                                    onClick={handlePushToTally}
                                    disabled={isProcessing || !state.tally.connected}
                                >
                                    <Send size={16} />
                                    Push to Tally
                                </button>
                            </div>
                        </div>

                        <div className="data-table-container">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th style={{ width: '40px' }}>
                                            <input
                                                type="checkbox"
                                                checked={selectedTransactions.size === transactions.length && transactions.length > 0}
                                                onChange={handleSelectAll}
                                                style={{ cursor: 'pointer' }}
                                            />
                                        </th>
                                        <th>Date</th>
                                        <th>Description</th>
                                        <th>Debit</th>
                                        <th>Credit</th>
                                        <th>Category</th>
                                        <th>Confidence</th>
                                        <th>Ledger</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {transactions.map((t) => (
                                        <tr
                                            key={t.id}
                                            style={{
                                                background: selectedTransactions.has(t.id) ? 'rgba(99, 102, 241, 0.1)' : 'inherit'
                                            }}
                                        >
                                            <td>
                                                <input
                                                    type="checkbox"
                                                    checked={selectedTransactions.has(t.id)}
                                                    onChange={() => handleToggleSelect(t.id)}
                                                    style={{ cursor: 'pointer' }}
                                                />
                                            </td>
                                            <td style={{ whiteSpace: 'nowrap' }}>{formatDate(t.date, t.dateRaw)}</td>
                                            <td style={{ maxWidth: '250px' }} className="truncate">
                                                {t.description}
                                            </td>
                                            <td style={{ color: t.debit > 0 ? 'var(--error-500)' : 'inherit' }}>
                                                {t.debit > 0 ? formatCurrency(t.debit) : '-'}
                                            </td>
                                            <td style={{ color: t.credit > 0 ? 'var(--success-500)' : 'inherit' }}>
                                                {t.credit > 0 ? formatCurrency(t.credit) : '-'}
                                            </td>
                                            <td>
                                                {editingId === t.id ? (
                                                    <select
                                                        className="form-select"
                                                        value={editForm.category}
                                                        onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                                                        style={{ width: '120px', padding: '4px 8px', fontSize: 'var(--text-xs)' }}
                                                    >
                                                        <option value="">Select...</option>
                                                        {categoryOptions.map(opt => (
                                                            <option key={opt.value} value={opt.value}>
                                                                {opt.label}
                                                            </option>
                                                        ))}
                                                    </select>
                                                ) : (
                                                    <span
                                                        className="badge"
                                                        style={{
                                                            background: `${getCategoryColor(t.userCategory || t.aiCategory)}20`,
                                                            color: getCategoryColor(t.userCategory || t.aiCategory)
                                                        }}
                                                    >
                                                        {t.userCategory || t.aiCategory || 'Unknown'}
                                                    </span>
                                                )}
                                            </td>
                                            <td>
                                                <div className="flex items-center gap-2">
                                                    <div style={{
                                                        width: '40px',
                                                        height: '6px',
                                                        borderRadius: 'var(--radius-full)',
                                                        background: 'var(--bg-glass)',
                                                        overflow: 'hidden'
                                                    }}>
                                                        <div style={{
                                                            width: `${t.aiConfidence || 0}%`,
                                                            height: '100%',
                                                            background: t.aiConfidence >= 80
                                                                ? 'var(--success-500)'
                                                                : t.aiConfidence >= 50
                                                                    ? 'var(--warning-500)'
                                                                    : 'var(--error-500)',
                                                            borderRadius: 'var(--radius-full)'
                                                        }} />
                                                    </div>
                                                    <span style={{ fontSize: 'var(--text-xs)' }}>{t.aiConfidence || 0}%</span>
                                                </div>
                                            </td>
                                            <td style={{ fontSize: 'var(--text-sm)' }}>
                                                {editingId === t.id ? (
                                                    <input
                                                        type="text"
                                                        className="form-input"
                                                        value={editForm.ledger}
                                                        onChange={(e) => setEditForm({ ...editForm, ledger: e.target.value })}
                                                        style={{ width: '100px', padding: '4px 8px', fontSize: 'var(--text-xs)' }}
                                                        placeholder="Ledger name"
                                                    />
                                                ) : (
                                                    t.userLedger || t.aiSuggestedLedger || '-'
                                                )}
                                            </td>
                                            <td>
                                                <div className="flex gap-1">
                                                    {editingId === t.id ? (
                                                        <>
                                                            <button
                                                                className="btn btn-ghost btn-icon btn-sm"
                                                                onClick={handleSaveEdit}
                                                                title="Save"
                                                                style={{ color: 'var(--success-500)' }}
                                                            >
                                                                <Save size={14} />
                                                            </button>
                                                            <button
                                                                className="btn btn-ghost btn-icon btn-sm"
                                                                onClick={handleCancelEdit}
                                                                title="Cancel"
                                                            >
                                                                <X size={14} />
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <button
                                                                className="btn btn-ghost btn-icon btn-sm"
                                                                onClick={() => handleStartEdit(t)}
                                                                title="Edit"
                                                            >
                                                                <Edit2 size={14} />
                                                            </button>
                                                            <button
                                                                className="btn btn-ghost btn-icon btn-sm"
                                                                onClick={() => handleDeleteTransaction(t.id)}
                                                                title="Delete"
                                                                style={{ color: 'var(--error-500)' }}
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 mt-6">
                        <button className="btn btn-secondary" onClick={handleReset}>
                            <RefreshCw size={18} />
                            Start Over
                        </button>
                        <button
                            className="btn btn-success flex-1"
                            onClick={handlePushToTally}
                            disabled={isProcessing || !state.tally.connected}
                        >
                            {isProcessing ? (
                                <>
                                    <span className="spinner" />
                                    {processingStep}
                                </>
                            ) : (
                                <>
                                    <Send size={18} />
                                    Push All to Tally ({transactions.filter(t => !t.syncedToTally).length} pending)
                                </>
                            )}
                        </button>
                    </div>
                </>
            )}

            {/* Step 4: Complete */}
            {step === 4 && (
                <div className="card text-center" style={{ padding: 'var(--space-12)' }}>
                    <div style={{
                        width: '80px',
                        height: '80px',
                        borderRadius: '50%',
                        background: 'rgba(16, 185, 129, 0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto var(--space-6)',
                        color: 'var(--success-500)'
                    }}>
                        <CheckCircle size={40} />
                    </div>
                    <h2 style={{ marginBottom: 'var(--space-2)' }}>Sync Complete!</h2>
                    <p style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-6)' }}>
                        All {transactions.length} transactions have been successfully pushed to Tally.
                    </p>
                    <div className="flex gap-3 justify-center">
                        <button className="btn btn-secondary" onClick={handleReset}>
                            Upload Another Statement
                        </button>
                        <button className="btn btn-primary" onClick={handleExport}>
                            <Download size={18} />
                            Export Report
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Banking;
