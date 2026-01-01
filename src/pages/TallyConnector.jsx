/**
 * AI Tally Sync - Tally Connector Page
 * Full functional Import/Export, connection management, and ledger creation
 */

import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import PlanGate from '../components/common/PlanGate';
import {
    Link2,
    RefreshCw,
    Building2,
    CheckCircle,
    XCircle,
    Download,
    Upload,
    Settings,
    AlertTriangle,
    FileDown,
    FileUp,
    Plus,
    Layers,
    Zap
} from 'lucide-react';
import { checkConnection, getCompanies, getLedgers, setMockMode, createLedger, ensureBasicLedgers, createCompany, fullSync, getVouchers } from '../services/tallyService';
import { downloadFile, convertToCSV } from '../utils/helpers';

const TallyConnector = () => {
    const { state, actions } = useApp();
    const { hasFeatureAccess, setCompanyCount, canAddCompany, getCompanyLimit } = useAuth();
    const [isChecking, setIsChecking] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [isCreatingLedger, setIsCreatingLedger] = useState(false);
    const [showLedgerForm, setShowLedgerForm] = useState(false);
    const [connectionError, setConnectionError] = useState(null);
    const [config, setConfig] = useState({
        host: 'localhost',
        port: '9000',
        mockMode: false
    });
    const [newLedger, setNewLedger] = useState({
        name: '',
        group: 'Indirect Expenses'
    });

    // Company creation state
    const [showCompanyForm, setShowCompanyForm] = useState(false);
    const [isCreatingCompany, setIsCreatingCompany] = useState(false);
    const [newCompany, setNewCompany] = useState({
        name: '',
        address: '',
        state: '',
        pincode: '',
        email: '',
        phone: '',
        financialYearFrom: ''
    });

    // Full sync state
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncResult, setSyncResult] = useState(null);

    useEffect(() => {
        if (state.tally.connected) {
            loadCompanies();
        }
    }, [state.tally.connected]);

    const handleTestConnection = async () => {
        setIsChecking(true);
        setConnectionError(null);

        try {
            setMockMode(config.mockMode);
            const result = await checkConnection();

            if (result.connected) {
                actions.setTallyStatus(true);
                await loadCompanies();
                actions.addNotification({
                    type: 'success',
                    title: result.mock ? 'Connected (Mock Mode)' : 'Connected to Tally Prime',
                    message: result.mock ? 'Using simulated data' : 'Real Tally connection established'
                });
            } else {
                actions.setTallyStatus(false);
                setConnectionError(result.error || 'Failed to connect to Tally');
                actions.addNotification({
                    type: 'error',
                    title: 'Connection Failed',
                    message: result.error || 'Make sure Tally Prime is running'
                });
            }
        } catch (error) {
            actions.setTallyStatus(false);
            setConnectionError(error.message);
            actions.addNotification({
                type: 'error',
                message: error.message
            });
        } finally {
            setIsChecking(false);
        }
    };

    const loadCompanies = async () => {
        try {
            const companies = await getCompanies();
            actions.setCompanies(companies);

            // Sync company count to usage tracking
            await setCompanyCount(companies.length);

            if (companies.length > 0) {
                actions.setActiveCompany(companies[0].name);
                const ledgers = await getLedgers(companies[0].name);
                actions.setLedgers(ledgers);
            }
        } catch (error) {
            console.error('Failed to load companies:', error);
        }
    };

    const handleCompanyChange = async (companyName) => {
        actions.setActiveCompany(companyName);
        const ledgers = await getLedgers(companyName);
        actions.setLedgers(ledgers);
    };

    // Create a new company in Tally
    const handleCreateCompany = async () => {
        if (!newCompany.name.trim()) {
            actions.addNotification({ type: 'warning', message: 'Please enter company name' });
            return;
        }

        setIsCreatingCompany(true);
        try {
            await createCompany(newCompany);

            // Refresh companies list
            const companies = await getCompanies();
            actions.setCompanies(companies);

            // Select the new company
            actions.setActiveCompany(newCompany.name);
            const ledgers = await getLedgers(newCompany.name);
            actions.setLedgers(ledgers);

            actions.addNotification({
                type: 'success',
                title: 'Company Created',
                message: `"${newCompany.name}" created in Tally`
            });

            // Reset form
            setNewCompany({ name: '', address: '', state: '', pincode: '', email: '', phone: '', financialYearFrom: '' });
            setShowCompanyForm(false);
        } catch (error) {
            actions.addNotification({
                type: 'error',
                message: 'Failed to create company: ' + error.message
            });
        } finally {
            setIsCreatingCompany(false);
        }
    };

    // Full synchronization with Tally
    const handleFullSync = async () => {
        if (!state.tally.activeCompany) {
            actions.addNotification({ type: 'warning', message: 'Please select a company first' });
            return;
        }

        setIsSyncing(true);
        setSyncResult(null);

        try {
            const result = await fullSync(state.tally.activeCompany, {
                transactions: state.banking.transactions,
                bankLedger: 'Bank Account'
            });

            // Refresh ledgers after sync
            const ledgers = await getLedgers(state.tally.activeCompany);
            actions.setLedgers(ledgers);

            // Update transactions as synced
            if (result.vouchers.created > 0) {
                const updatedTransactions = state.banking.transactions.map(t => ({
                    ...t,
                    syncedToTally: true,
                    status: 'synced'
                }));
                actions.setTransactions(updatedTransactions);
            }

            setSyncResult(result);

            actions.addNotification({
                type: result.success ? 'success' : 'warning',
                title: 'Sync Complete',
                message: `Ledgers: ${result.ledgers.fetched} | Vouchers created: ${result.vouchers.created}`
            });
        } catch (error) {
            actions.addNotification({
                type: 'error',
                message: 'Full sync failed: ' + error.message
            });
        } finally {
            setIsSyncing(false);
        }
    };

    // Create a single ledger in Tally
    const handleCreateLedger = async () => {
        if (!newLedger.name.trim()) {
            actions.addNotification({
                type: 'warning',
                message: 'Please enter a ledger name'
            });
            return;
        }

        setIsCreatingLedger(true);
        try {
            await createLedger(newLedger.name, newLedger.group, state.tally.activeCompany);

            // Refresh ledgers
            const ledgers = await getLedgers(state.tally.activeCompany);
            actions.setLedgers(ledgers);

            actions.addNotification({
                type: 'success',
                title: 'Ledger Created',
                message: `"${newLedger.name}" created in ${newLedger.group}`
            });

            // Reset form
            setNewLedger({ name: '', group: 'Indirect Expenses' });
            setShowLedgerForm(false);
        } catch (error) {
            actions.addNotification({
                type: 'error',
                message: 'Failed to create ledger: ' + error.message
            });
        } finally {
            setIsCreatingLedger(false);
        }
    };

    // Create all basic ledgers needed for bank transactions
    const handleEnsureBasicLedgers = async () => {
        setIsCreatingLedger(true);
        try {
            const result = await ensureBasicLedgers(state.tally.activeCompany);

            // Refresh ledgers
            const ledgers = await getLedgers(state.tally.activeCompany);
            actions.setLedgers(ledgers);

            actions.addNotification({
                type: 'success',
                title: 'Basic Ledgers Ready',
                message: result.created > 0
                    ? `Created ${result.created} ledgers in Tally`
                    : 'All basic ledgers already exist'
            });
        } catch (error) {
            actions.addNotification({
                type: 'error',
                message: 'Failed to create ledgers: ' + error.message
            });
        } finally {
            setIsCreatingLedger(false);
        }
    };

    // Ledger group options for dropdown
    const ledgerGroups = [
        'Bank Accounts',
        'Cash-in-Hand',
        'Sundry Debtors',
        'Sundry Creditors',
        'Sales Accounts',
        'Purchase Accounts',
        'Direct Expenses',
        'Indirect Expenses',
        'Direct Incomes',
        'Indirect Incomes',
        'Fixed Assets',
        'Investments',
        'Loans (Liability)',
        'Duties & Taxes'
    ];

    // Import Data - Fetch ledgers from Tally and store locally
    const handleImportData = async () => {
        setIsImporting(true);
        try {
            // Refresh companies and ledgers from Tally
            const companies = await getCompanies();
            actions.setCompanies(companies);

            if (state.tally.activeCompany) {
                const ledgers = await getLedgers(state.tally.activeCompany);
                actions.setLedgers(ledgers);
            }

            actions.addNotification({
                type: 'success',
                title: 'Import Complete',
                message: `Imported ${companies.length} companies and ${state.tally.ledgers.length} ledgers from Tally`
            });
        } catch (error) {
            actions.addNotification({
                type: 'error',
                message: 'Failed to import data: ' + error.message
            });
        } finally {
            setIsImporting(false);
        }
    };

    // Export Data - Export ledgers and transactions to CSV
    const handleExportData = async () => {
        setIsExporting(true);
        try {
            const exportData = {
                company: state.tally.activeCompany,
                exportDate: new Date().toISOString(),
                ledgers: state.tally.ledgers,
                transactions: state.banking.transactions
            };

            // Export ledgers to CSV
            if (state.tally.ledgers.length > 0) {
                const ledgersCsv = convertToCSV(state.tally.ledgers.map(l => ({
                    'Ledger Name': l.name,
                    'Group': l.group
                })));
                downloadFile(ledgersCsv, `ledgers_${state.tally.activeCompany || 'export'}_${Date.now()}.csv`, 'text/csv');
            }

            // Export transactions if any
            if (state.banking.transactions.length > 0) {
                const transactionsCsv = convertToCSV(state.banking.transactions.map(t => ({
                    'Date': t.date,
                    'Description': t.description,
                    'Credit': t.credit || 0,
                    'Debit': t.debit || 0,
                    'Category': t.userCategory || t.aiCategory || '',
                    'Ledger': t.userLedger || t.aiSuggestedLedger || '',
                    'Synced': t.syncedToTally ? 'Yes' : 'No'
                })));
                downloadFile(transactionsCsv, `transactions_${Date.now()}.csv`, 'text/csv');
            }

            // Export full JSON backup
            const jsonData = JSON.stringify(exportData, null, 2);
            downloadFile(jsonData, `tally_sync_backup_${Date.now()}.json`, 'application/json');

            actions.addNotification({
                type: 'success',
                title: 'Export Complete',
                message: 'Data exported successfully'
            });
        } catch (error) {
            actions.addNotification({
                type: 'error',
                message: 'Export failed: ' + error.message
            });
        } finally {
            setIsExporting(false);
        }
    };

    // Refresh ledgers
    const handleRefreshLedgers = async () => {
        if (state.tally.activeCompany) {
            try {
                const ledgers = await getLedgers(state.tally.activeCompany);
                actions.setLedgers(ledgers);
                actions.addNotification({
                    type: 'success',
                    message: `Refreshed ${ledgers.length} ledgers`
                });
            } catch (error) {
                actions.addNotification({
                    type: 'error',
                    message: 'Failed to refresh ledgers'
                });
            }
        }
    };

    // Tally Sync is now available for all plans including Free
    // No feature gate needed

    return (
        <div className="animate-slideUp">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="flex items-center gap-2 mb-2">
                        <Link2 size={24} />
                        Tally Connector
                    </h2>
                    <p className="text-secondary" style={{ marginBottom: 0 }}>
                        Configure connection to Tally Prime
                    </p>
                </div>
                <div className={`connection-status ${state.tally.connected ? 'connected' : 'disconnected'}`}>
                    <span className={`status-dot ${state.tally.connected ? 'connected' : 'disconnected'}`} />
                    {state.tally.connected ? 'Connected' : 'Disconnected'}
                </div>
            </div>


            <div className="dashboard-grid-2">
                {/* Connection Settings */}
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title flex items-center gap-2">
                            <Settings size={18} />
                            Connection Settings
                        </h3>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Tally Host</label>
                        <input
                            type="text"
                            className="form-input"
                            value={config.host}
                            onChange={(e) => setConfig({ ...config, host: e.target.value })}
                            placeholder="localhost"
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Tally Port</label>
                        <input
                            type="text"
                            className="form-input"
                            value={config.port}
                            onChange={(e) => setConfig({ ...config, port: e.target.value })}
                            placeholder="9000"
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={config.mockMode}
                                onChange={(e) => setConfig({ ...config, mockMode: e.target.checked })}
                                style={{ width: '16px', height: '16px' }}
                            />
                            Enable Mock Mode (for testing without Tally)
                        </label>
                        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 'var(--space-1)' }}>
                            Mock mode simulates Tally responses for development
                        </p>
                    </div>

                    {connectionError && (
                        <div
                            style={{
                                padding: 'var(--space-4)',
                                background: 'rgba(239, 68, 68, 0.1)',
                                border: '1px solid var(--error-500)',
                                borderRadius: 'var(--radius-lg)',
                                marginBottom: 'var(--space-4)'
                            }}
                        >
                            <div className="flex items-center gap-2">
                                <AlertTriangle size={18} style={{ color: 'var(--error-500)' }} />
                                <span style={{ color: 'var(--error-500)', fontSize: 'var(--text-sm)' }}>
                                    {connectionError}
                                </span>
                            </div>
                            <p style={{
                                fontSize: 'var(--text-xs)',
                                color: 'var(--text-muted)',
                                marginTop: 'var(--space-2)',
                                marginBottom: 0
                            }}>
                                Make sure Tally Prime is running with ODBC/HTTP server enabled on port {config.port}
                            </p>
                        </div>
                    )}

                    <button
                        className="btn btn-primary w-full mt-4"
                        onClick={handleTestConnection}
                        disabled={isChecking}
                    >
                        {isChecking ? (
                            <>
                                <span className="spinner" />
                                Testing Connection...
                            </>
                        ) : (
                            <>
                                <RefreshCw size={18} />
                                Test Connection
                            </>
                        )}
                    </button>
                </div>

                {/* Active Company */}
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title flex items-center gap-2">
                            <Building2 size={18} />
                            Active Company
                        </h3>
                    </div>

                    {state.tally.connected ? (
                        <>
                            <div className="form-group">
                                <div className="flex items-center justify-between mb-2">
                                    <label className="form-label" style={{ marginBottom: 0 }}>Select Company</label>
                                    <button
                                        type="button"
                                        className="btn btn-sm btn-ghost"
                                        onClick={() => setShowCompanyForm(!showCompanyForm)}
                                    >
                                        <AlertTriangle size={14} />
                                        {showCompanyForm ? 'Hide Help' : 'Need New Company?'}
                                    </button>
                                </div>

                                {showCompanyForm ? (
                                    <div
                                        style={{
                                            background: 'rgba(245, 158, 11, 0.1)',
                                            borderRadius: 'var(--radius-lg)',
                                            padding: 'var(--space-4)',
                                            border: '1px solid var(--warning-500)',
                                            marginBottom: 'var(--space-4)'
                                        }}
                                    >
                                        <div className="flex items-center gap-2 mb-3">
                                            <AlertTriangle size={20} style={{ color: 'var(--warning-500)' }} />
                                            <h4 style={{ marginBottom: 0, color: 'var(--warning-500)' }}>Create Company in Tally Prime</h4>
                                        </div>
                                        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginBottom: 'var(--space-3)' }}>
                                            Companies must be created directly in Tally Prime. The XML API only supports data sync within existing companies.
                                        </p>
                                        <div style={{
                                            background: 'var(--bg-secondary)',
                                            padding: 'var(--space-3)',
                                            borderRadius: 'var(--radius-md)',
                                            fontSize: 'var(--text-sm)'
                                        }}>
                                            <p style={{ fontWeight: 600, marginBottom: 'var(--space-2)' }}>Steps to create a new company:</p>
                                            <ol style={{ paddingLeft: 'var(--space-4)', margin: 0 }}>
                                                <li>Open <strong>Tally Prime</strong></li>
                                                <li>Press <kbd style={{ background: 'var(--bg-tertiary)', padding: '2px 6px', borderRadius: '4px' }}>Alt+F3</kbd> (Company Info)</li>
                                                <li>Select <strong>Create Company</strong></li>
                                                <li>Fill in company details</li>
                                                <li>Press <kbd style={{ background: 'var(--bg-tertiary)', padding: '2px 6px', borderRadius: '4px' }}>Ctrl+A</kbd> to save</li>
                                            </ol>
                                        </div>
                                        <button
                                            className="btn btn-secondary w-full mt-4"
                                            onClick={async () => {
                                                // Refresh companies after user creates in Tally
                                                const companies = await getCompanies();
                                                actions.setCompanies(companies);
                                                if (companies.length > 0) {
                                                    actions.setActiveCompany(companies[0].name);
                                                    const ledgers = await getLedgers(companies[0].name);
                                                    actions.setLedgers(ledgers);
                                                }
                                                setShowCompanyForm(false);
                                                actions.addNotification({
                                                    type: 'success',
                                                    message: `Found ${companies.length} companies in Tally`
                                                });
                                            }}
                                        >
                                            <RefreshCw size={16} />
                                            Refresh Company List
                                        </button>
                                    </div>
                                ) : (
                                    <select
                                        className="form-select"
                                        value={state.tally.activeCompany || ''}
                                        onChange={(e) => handleCompanyChange(e.target.value)}
                                    >
                                        {state.tally.companies.map((company) => (
                                            <option key={company.name} value={company.name}>
                                                {company.name}
                                            </option>
                                        ))}
                                    </select>
                                )}
                            </div>

                            {state.tally.activeCompany && (
                                <div
                                    className="mt-4 p-4"
                                    style={{
                                        background: 'var(--bg-glass)',
                                        borderRadius: 'var(--radius-lg)',
                                        border: '1px solid var(--border-default)'
                                    }}
                                >
                                    <div className="flex items-center gap-3 mb-3">
                                        <CheckCircle size={20} style={{ color: 'var(--success-500)' }} />
                                        <span className="font-semibold">{state.tally.activeCompany}</span>
                                    </div>
                                    <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginBottom: 'var(--space-2)' }}>
                                        Ledgers loaded: {state.tally.ledgers.length}
                                    </p>
                                    {state.banking.transactions.length > 0 && (
                                        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginBottom: 'var(--space-3)' }}>
                                            Pending transactions: {state.banking.transactions.filter(t => !t.syncedToTally).length}
                                        </p>
                                    )}

                                    {/* Full Sync Button */}
                                    <button
                                        className="btn btn-success w-full"
                                        onClick={handleFullSync}
                                        disabled={isSyncing}
                                    >
                                        {isSyncing ? (
                                            <><span className="spinner" /> Syncing...</>
                                        ) : (
                                            <><Zap size={16} /> Full Sync with Tally</>
                                        )}
                                    </button>

                                    {/* Sync Results */}
                                    {syncResult && (
                                        <div
                                            className="mt-4 p-3"
                                            style={{
                                                background: syncResult.success ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                                                borderRadius: 'var(--radius-md)',
                                                border: `1px solid ${syncResult.success ? 'var(--success-500)' : 'var(--warning-500)'}`
                                            }}
                                        >
                                            <p className="font-semibold mb-2" style={{ color: syncResult.success ? 'var(--success-500)' : 'var(--warning-500)' }}>
                                                {syncResult.success ? '✓ Sync Complete' : '⚠ Sync with Warnings'}
                                            </p>
                                            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                                                <p>Ledgers: {syncResult.ledgers.fetched} fetched, {syncResult.ledgers.created} created</p>
                                                <p>Vouchers: {syncResult.vouchers.created} created, {syncResult.vouchers.fetched} existing</p>
                                                {syncResult.errors.length > 0 && (
                                                    <p className="mt-1" style={{ color: 'var(--error-500)' }}>
                                                        Errors: {syncResult.errors.length}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="flex gap-3 mt-6">
                                <button
                                    className="btn btn-secondary flex-1"
                                    onClick={handleImportData}
                                    disabled={isImporting}
                                >
                                    {isImporting ? (
                                        <>
                                            <span className="spinner" />
                                            Importing...
                                        </>
                                    ) : (
                                        <>
                                            <FileDown size={16} />
                                            Import Data
                                        </>
                                    )}
                                </button>
                                <button
                                    className="btn btn-secondary flex-1"
                                    onClick={handleExportData}
                                    disabled={isExporting}
                                >
                                    {isExporting ? (
                                        <>
                                            <span className="spinner" />
                                            Exporting...
                                        </>
                                    ) : (
                                        <>
                                            <FileUp size={16} />
                                            Export Data
                                        </>
                                    )}
                                </button>
                            </div>

                            {/* Ledger Creation Section */}
                            <div className="mt-6" style={{ borderTop: '1px solid var(--border-default)', paddingTop: 'var(--space-4)' }}>
                                <div className="flex items-center justify-between mb-4">
                                    <h4 className="flex items-center gap-2" style={{ marginBottom: 0 }}>
                                        <Layers size={18} />
                                        Ledger Management
                                    </h4>
                                    <button
                                        className="btn btn-sm btn-ghost"
                                        onClick={() => setShowLedgerForm(!showLedgerForm)}
                                    >
                                        <Plus size={16} />
                                        {showLedgerForm ? 'Cancel' : 'New Ledger'}
                                    </button>
                                </div>

                                {/* Quick Create Basic Ledgers */}
                                <button
                                    className="btn btn-success w-full mb-4"
                                    onClick={handleEnsureBasicLedgers}
                                    disabled={isCreatingLedger}
                                >
                                    {isCreatingLedger ? (
                                        <>
                                            <span className="spinner" />
                                            Creating ledgers...
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle size={16} />
                                            Create Basic Ledgers for Bank Sync
                                        </>
                                    )}
                                </button>
                                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 'var(--space-4)' }}>
                                    Creates: Bank Account, Sundry Debtors, Sundry Creditors, Cash, Sales Account, Miscellaneous Expenses
                                </p>

                                {/* Custom Ledger Form */}
                                {showLedgerForm && (
                                    <div
                                        style={{
                                            background: 'var(--bg-glass)',
                                            borderRadius: 'var(--radius-lg)',
                                            padding: 'var(--space-4)',
                                            border: '1px solid var(--border-default)'
                                        }}
                                    >
                                        <div className="form-group">
                                            <label className="form-label">Ledger Name</label>
                                            <input
                                                type="text"
                                                className="form-input"
                                                placeholder="e.g., HDFC Bank"
                                                value={newLedger.name}
                                                onChange={(e) => setNewLedger({ ...newLedger, name: e.target.value })}
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Parent Group</label>
                                            <select
                                                className="form-select"
                                                value={newLedger.group}
                                                onChange={(e) => setNewLedger({ ...newLedger, group: e.target.value })}
                                            >
                                                {ledgerGroups.map(group => (
                                                    <option key={group} value={group}>{group}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <button
                                            className="btn btn-primary w-full"
                                            onClick={handleCreateLedger}
                                            disabled={isCreatingLedger || !newLedger.name.trim()}
                                        >
                                            {isCreatingLedger ? (
                                                <>
                                                    <span className="spinner" />
                                                    Creating...
                                                </>
                                            ) : (
                                                <>
                                                    <Plus size={16} />
                                                    Create Ledger in Tally
                                                </>
                                            )}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="text-center" style={{ padding: 'var(--space-8)' }}>
                            <XCircle size={48} style={{ color: 'var(--error-500)', margin: '0 auto var(--space-4)' }} />
                            <h4>Not Connected</h4>
                            <p className="text-muted">
                                {config.mockMode
                                    ? 'Click "Test Connection" to connect in mock mode'
                                    : 'Make sure Tally Prime is running, then click "Test Connection"'
                                }
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Requirements Info */}
            {!state.tally.connected && !config.mockMode && (
                <div
                    className="card mt-6"
                    style={{
                        borderColor: 'var(--warning-500)',
                        background: 'rgba(245, 158, 11, 0.1)'
                    }}
                >
                    <h4 className="flex items-center gap-2 mb-4">
                        <AlertTriangle size={20} style={{ color: 'var(--warning-500)' }} />
                        Tally Prime Requirements
                    </h4>
                    <ul style={{
                        marginLeft: 'var(--space-6)',
                        color: 'var(--text-secondary)',
                        fontSize: 'var(--text-sm)'
                    }}>
                        <li>Tally Prime must be running on your computer</li>
                        <li>Go to <strong>F12 → Advanced Configuration → Enable ODBC Server</strong></li>
                        <li>Set <strong>Tally Prime Server Port</strong> to 9000 (or your custom port)</li>
                        <li>Restart Tally Prime after enabling the server</li>
                        <li>Open a company in Tally before testing connection</li>
                    </ul>
                </div>
            )}

            {/* Ledgers List */}
            {state.tally.connected && state.tally.ledgers.length > 0 && (
                <div className="card mt-6">
                    <div className="card-header">
                        <h3 className="card-title">Available Ledgers ({state.tally.ledgers.length})</h3>
                        <button className="btn btn-secondary btn-sm" onClick={handleRefreshLedgers}>
                            <RefreshCw size={16} />
                            Refresh
                        </button>
                    </div>

                    <div className="data-table-container">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Ledger Name</th>
                                    <th>Group</th>
                                </tr>
                            </thead>
                            <tbody>
                                {state.tally.ledgers.slice(0, 15).map((ledger, index) => (
                                    <tr key={index}>
                                        <td>{ledger.name}</td>
                                        <td>
                                            <span className="badge badge-info">{ledger.group}</span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {state.tally.ledgers.length > 15 && (
                        <p className="text-muted text-center mt-4" style={{ fontSize: 'var(--text-sm)' }}>
                            Showing 15 of {state.tally.ledgers.length} ledgers
                        </p>
                    )}
                </div>
            )}
        </div>
    );
};

export default TallyConnector;
