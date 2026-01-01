/**
 * AI Tally Sync - Bank Reconciliation Module
 * Match bank statement entries with Tally transactions
 * Generate Bank Reconciliation Statement (BRS)
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import PlanGate from '../components/common/PlanGate';
import {
    GitCompare,
    Check,
    X,
    Link2,
    Unlink,
    Download,
    RefreshCw,
    Search,
    AlertCircle,
    CheckCircle2,
    Clock,
    FileText,
    ArrowRight,
    Loader2,
    Info
} from 'lucide-react';
import { getLedgers, getVouchers } from '../services/tallyService';
import { formatCurrency, formatDate } from '../utils/helpers';

const BankReconciliation = () => {
    const { state, actions } = useApp();
    const { hasFeatureAccess } = useAuth();

    // Bank statement entries (from uploaded transactions that are synced)
    const bankEntries = useMemo(() =>
        state.banking.transactions.filter(t => t.syncedToTally),
        [state.banking.transactions]
    );

    // State
    const [tallyEntries, setTallyEntries] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedBankLedger, setSelectedBankLedger] = useState('');
    const [availableLedgers, setAvailableLedgers] = useState([]);
    const [matches, setMatches] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [showMatched, setShowMatched] = useState(true);
    const [showUnmatched, setShowUnmatched] = useState(true);
    const [ledgersInVouchers, setLedgersInVouchers] = useState([]);

    // Auto-select first bank ledger when ledgers are loaded
    useEffect(() => {
        if (state.tally.ledgers.length > 0 && !selectedBankLedger) {
            // Find the first bank-type ledger
            const bankLedger = state.tally.ledgers.find(l => {
                const group = (l.group || '').toLowerCase();
                return group.includes('bank');
            });
            if (bankLedger) {
                setSelectedBankLedger(bankLedger.name);
            }
        }
    }, [state.tally.ledgers, selectedBankLedger]);

    // Get filtered bank ledgers for dropdown
    const bankLedgerOptions = useMemo(() => {
        const ledgers = state.tally.ledgers.filter(l => {
            const group = (l.group || '').toLowerCase();
            const name = (l.name || '').toLowerCase();
            return group.includes('bank') ||
                group.includes('cash') ||
                name.includes('bank');
        });

        // Sort: Bank Accounts group first, then alphabetically
        return ledgers.sort((a, b) => {
            const aIsBank = (a.group || '').toLowerCase().includes('bank');
            const bIsBank = (b.group || '').toLowerCase().includes('bank');
            if (aIsBank && !bIsBank) return -1;
            if (!aIsBank && bIsBank) return 1;
            return a.name.localeCompare(b.name);
        });
    }, [state.tally.ledgers]);

    // BRS Summary calculations
    const brsSummary = useMemo(() => {
        const bankBalance = bankEntries.reduce((sum, e) => sum + (e.credit || 0) - (e.debit || 0), 0);
        const tallyBalance = tallyEntries.reduce((sum, e) => sum + (e.credit || 0) - (e.debit || 0), 0);

        const matchedBankIds = new Set(matches.map(m => m.bankId));
        const matchedTallyIds = new Set(matches.map(m => m.tallyId));

        const unmatchedBank = bankEntries.filter(e => !matchedBankIds.has(e.id));
        const unmatchedTally = tallyEntries.filter(e => !matchedTallyIds.has(e.id));

        return {
            bankBalance,
            tallyBalance,
            difference: bankBalance - tallyBalance,
            matchedCount: matches.length,
            unmatchedBankCount: unmatchedBank.length,
            unmatchedTallyCount: unmatchedTally.length,
            totalBank: bankEntries.length,
            totalTally: tallyEntries.length
        };
    }, [bankEntries, tallyEntries, matches]);

    // Fetch Tally vouchers
    const fetchTallyEntries = useCallback(async () => {
        if (!state.tally.connected) {
            actions.addNotification({ type: 'warning', message: 'Please connect to Tally first' });
            return;
        }

        if (!selectedBankLedger) {
            actions.addNotification({ type: 'warning', message: 'Please select a bank ledger' });
            return;
        }

        setIsLoading(true);
        setTallyEntries([]);
        setMatches([]);

        try {
            const vouchers = await getVouchers(state.tally.activeCompany);
            console.log('[BRS] Fetched vouchers from Tally:', vouchers.length);

            // Collect all unique ledgers from vouchers for reference
            const allLedgersSet = new Set();
            vouchers.forEach(v => {
                if (v.allLedgers && Array.isArray(v.allLedgers)) {
                    v.allLedgers.forEach(l => allLedgersSet.add(l));
                }
                if (v.ledgerName) allLedgersSet.add(v.ledgerName);
                if (v.particularLedger) allLedgersSet.add(v.particularLedger);
            });
            const allLedgersList = Array.from(allLedgersSet);
            setLedgersInVouchers(allLedgersList);
            console.log('[BRS] Ledgers found in vouchers:', allLedgersList);

            // Normalize selected ledger name
            const normalizedBankLedger = selectedBankLedger.toLowerCase().trim();

            // Filter vouchers that involve the selected bank ledger
            const bankVouchers = vouchers.filter(v => {
                // Check all possible ledger fields
                const checkMatch = (name) => {
                    if (!name) return false;
                    return name.toLowerCase().trim() === normalizedBankLedger;
                };

                // Check primary ledger fields
                if (checkMatch(v.ledgerName)) return true;
                if (checkMatch(v.particularLedger)) return true;

                // Check allLedgers array
                if (v.allLedgers && Array.isArray(v.allLedgers)) {
                    if (v.allLedgers.some(l => checkMatch(l))) return true;
                }

                // Check ledgerEntries array
                if (v.ledgerEntries && Array.isArray(v.ledgerEntries)) {
                    if (v.ledgerEntries.some(e => checkMatch(e.ledgerName))) return true;
                }

                return false;
            });

            console.log('[BRS] Filtered vouchers for', selectedBankLedger, ':', bankVouchers.length);

            // Convert to reconciliation entries
            const entries = bankVouchers.map((v, idx) => {
                const isReceipt = v.type === 'Receipt';
                const amount = Math.abs(v.amount || 0);

                return {
                    id: `tally-${v.voucherNumber || idx}-${v.date || ''}`,
                    date: v.date,
                    description: v.narration || v.particularLedger || v.ledgerName || 'No description',
                    debit: isReceipt ? 0 : amount,
                    credit: isReceipt ? amount : 0,
                    reference: v.voucherNumber,
                    voucherType: v.type,
                    source: 'tally',
                    rawVoucher: v
                };
            });

            setTallyEntries(entries);

            // Auto-match if we have entries
            if (entries.length > 0 && bankEntries.length > 0) {
                performAutoMatch(bankEntries, entries);
                actions.addNotification({
                    type: 'success',
                    message: `Loaded ${entries.length} Tally entries for "${selectedBankLedger}"`
                });
            } else if (entries.length === 0) {
                // Find bank-related ledgers to suggest
                const suggestions = allLedgersList.filter(l => {
                    const lower = l.toLowerCase();
                    return lower.includes('bank') || lower.includes('account');
                });

                if (suggestions.length > 0) {
                    actions.addNotification({
                        type: 'warning',
                        message: `No vouchers for "${selectedBankLedger}". Try: ${suggestions.slice(0, 3).join(', ')}`
                    });
                } else {
                    actions.addNotification({
                        type: 'warning',
                        message: `No vouchers found for "${selectedBankLedger}". Total vouchers in Tally: ${vouchers.length}`
                    });
                }
            } else {
                actions.addNotification({
                    type: 'info',
                    message: `Loaded ${entries.length} Tally entries. Upload bank statement to reconcile.`
                });
            }
        } catch (error) {
            console.error('[BRS] Fetch error:', error);
            actions.addNotification({
                type: 'error',
                message: 'Failed to fetch Tally entries: ' + error.message
            });
        } finally {
            setIsLoading(false);
        }
    }, [state.tally.connected, state.tally.activeCompany, selectedBankLedger, bankEntries, actions]);

    // Auto-match algorithm
    const performAutoMatch = useCallback((bank, tally) => {
        const newMatches = [];
        const usedBankIds = new Set();
        const usedTallyIds = new Set();

        // Pass 1: Exact amount + close date match (±7 days)
        for (const bankEntry of bank) {
            if (usedBankIds.has(bankEntry.id)) continue;

            const bankAmount = Math.abs(bankEntry.credit || bankEntry.debit || 0);
            const bankDate = new Date(bankEntry.date);
            const bankIsCredit = (bankEntry.credit || 0) > 0;

            for (const tallyEntry of tally) {
                if (usedTallyIds.has(tallyEntry.id)) continue;

                const tallyAmount = Math.abs(tallyEntry.credit || tallyEntry.debit || 0);
                const tallyDate = new Date(tallyEntry.date);
                const tallyIsCredit = (tallyEntry.credit || 0) > 0;

                // Amount must match exactly (within 1 paisa for rounding)
                if (Math.abs(bankAmount - tallyAmount) < 0.02) {
                    // Same direction (both credit or both debit)
                    if (bankIsCredit === tallyIsCredit) {
                        // Date within 7 days
                        const daysDiff = Math.abs((bankDate - tallyDate) / (1000 * 60 * 60 * 24));
                        if (daysDiff <= 7) {
                            newMatches.push({ bankId: bankEntry.id, tallyId: tallyEntry.id, confidence: 'high' });
                            usedBankIds.add(bankEntry.id);
                            usedTallyIds.add(tallyEntry.id);
                            break;
                        }
                    }
                }
            }
        }

        // Pass 2: Amount match only (for remaining unmatched)
        for (const bankEntry of bank) {
            if (usedBankIds.has(bankEntry.id)) continue;

            const bankAmount = Math.abs(bankEntry.credit || bankEntry.debit || 0);
            const bankIsCredit = (bankEntry.credit || 0) > 0;

            for (const tallyEntry of tally) {
                if (usedTallyIds.has(tallyEntry.id)) continue;

                const tallyAmount = Math.abs(tallyEntry.credit || tallyEntry.debit || 0);
                const tallyIsCredit = (tallyEntry.credit || 0) > 0;

                if (Math.abs(bankAmount - tallyAmount) < 0.02 && bankIsCredit === tallyIsCredit) {
                    newMatches.push({ bankId: bankEntry.id, tallyId: tallyEntry.id, confidence: 'medium' });
                    usedBankIds.add(bankEntry.id);
                    usedTallyIds.add(tallyEntry.id);
                    break;
                }
            }
        }

        setMatches(newMatches);

        if (newMatches.length > 0) {
            actions.addNotification({
                type: 'success',
                message: `Auto-matched ${newMatches.length} entries`
            });
        }
    }, [actions]);

    // Manual match
    const handleManualMatch = (bankId, tallyId) => {
        setMatches(prev => [...prev, { bankId, tallyId, confidence: 'manual' }]);
    };

    // Unmatch
    const handleUnmatch = (bankId) => {
        setMatches(prev => prev.filter(m => m.bankId !== bankId));
    };

    // Get match info for an entry
    const getMatchInfo = (entryId, type) => {
        if (type === 'bank') {
            const match = matches.find(m => m.bankId === entryId);
            if (match) {
                const partner = tallyEntries.find(e => e.id === match.tallyId);
                return { matched: true, partner, confidence: match.confidence };
            }
        } else {
            const match = matches.find(m => m.tallyId === entryId);
            if (match) {
                const partner = bankEntries.find(e => e.id === match.bankId);
                return { matched: true, partner, confidence: match.confidence };
            }
        }
        return { matched: false, partner: null };
    };

    // Filtered entries based on search and filters
    const filteredBankEntries = useMemo(() => {
        return bankEntries.filter(e => {
            const matchInfo = getMatchInfo(e.id, 'bank');
            if (matchInfo.matched && !showMatched) return false;
            if (!matchInfo.matched && !showUnmatched) return false;
            if (searchTerm && !e.description?.toLowerCase().includes(searchTerm.toLowerCase())) return false;
            return true;
        });
    }, [bankEntries, matches, showMatched, showUnmatched, searchTerm]);

    const filteredTallyEntries = useMemo(() => {
        return tallyEntries.filter(e => {
            const matchInfo = getMatchInfo(e.id, 'tally');
            if (matchInfo.matched && !showMatched) return false;
            if (!matchInfo.matched && !showUnmatched) return false;
            if (searchTerm && !e.description?.toLowerCase().includes(searchTerm.toLowerCase())) return false;
            return true;
        });
    }, [tallyEntries, matches, showMatched, showUnmatched, searchTerm]);

    // Export BRS
    const handleExportBRS = () => {
        const brsData = {
            generatedAt: new Date().toISOString(),
            company: state.tally.activeCompany,
            bankLedger: selectedBankLedger,
            summary: brsSummary,
            matches: matches.map(m => {
                const bank = bankEntries.find(e => e.id === m.bankId);
                const tally = tallyEntries.find(e => e.id === m.tallyId);
                return { bank, tally, confidence: m.confidence };
            }),
            unmatchedBank: bankEntries.filter(e => !matches.some(m => m.bankId === e.id)),
            unmatchedTally: tallyEntries.filter(e => !matches.some(m => m.tallyId === e.id))
        };

        const blob = new Blob([JSON.stringify(brsData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `BRS_${state.tally.activeCompany}_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);

        actions.addNotification({
            type: 'success',
            message: 'Bank Reconciliation Statement exported'
        });
    };

    // Check feature access
    if (!hasFeatureAccess('bankReconciliation')) {
        return (
            <PlanGate
                feature="bankReconciliation"
                requiredPlan="Professional"
                fallbackMessage="Bank Reconciliation is a Professional feature. Upgrade to match bank statements with Tally transactions and generate BRS reports."
            >
                <div />
            </PlanGate>
        );
    }

    return (
        <div className="animate-slideUp">
            {/* Header */}
            <div className="page-header">
                <div>
                    <h1 className="page-title flex items-center gap-3">
                        <GitCompare size={28} />
                        Bank Reconciliation
                    </h1>
                    <p className="page-subtitle">Match bank statement entries with Tally transactions</p>
                </div>
            </div>

            {/* Connection Warning */}
            {!state.tally.connected && (
                <div className="card mb-6" style={{
                    background: 'rgba(251, 191, 36, 0.1)',
                    border: '1px solid var(--warning-500)',
                    padding: 'var(--space-4)'
                }}>
                    <div className="flex items-center gap-3">
                        <AlertCircle size={20} style={{ color: 'var(--warning-500)' }} />
                        <div>
                            <p style={{ fontWeight: 600, color: 'var(--warning-500)' }}>Tally Not Connected</p>
                            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
                                Please start Tally Prime and ensure it's connected via the Tally Connector page.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Controls */}
            <div className="card mb-6">
                <div className="flex items-center gap-4 flex-wrap" style={{ padding: 'var(--space-4)' }}>
                    {/* Bank Ledger Selection */}
                    <div style={{ minWidth: '220px' }}>
                        <label className="form-label">Bank Ledger in Tally</label>
                        <select
                            className="form-select"
                            value={selectedBankLedger}
                            onChange={(e) => setSelectedBankLedger(e.target.value)}
                            disabled={!state.tally.connected}
                        >
                            <option value="">Select bank ledger...</option>
                            {bankLedgerOptions.map(l => (
                                <option key={l.name} value={l.name}>
                                    {l.name} ({l.group})
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Search */}
                    <div style={{ flex: 1, minWidth: '200px' }}>
                        <label className="form-label">Search</label>
                        <div className="relative">
                            <Search size={16} style={{
                                position: 'absolute',
                                left: '12px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                color: 'var(--text-muted)'
                            }} />
                            <input
                                type="text"
                                className="form-input"
                                placeholder="Search descriptions..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                style={{ paddingLeft: '36px' }}
                            />
                        </div>
                    </div>

                    {/* Filters */}
                    <div className="flex items-center gap-3">
                        <label className="flex items-center gap-2" style={{ fontSize: 'var(--text-sm)' }}>
                            <input
                                type="checkbox"
                                checked={showMatched}
                                onChange={(e) => setShowMatched(e.target.checked)}
                            />
                            <span className="flex items-center gap-1">
                                <CheckCircle2 size={14} style={{ color: 'var(--success-500)' }} />
                                Matched
                            </span>
                        </label>
                        <label className="flex items-center gap-2" style={{ fontSize: 'var(--text-sm)' }}>
                            <input
                                type="checkbox"
                                checked={showUnmatched}
                                onChange={(e) => setShowUnmatched(e.target.checked)}
                            />
                            <span className="flex items-center gap-1">
                                <Clock size={14} style={{ color: 'var(--warning-500)' }} />
                                Unmatched
                            </span>
                        </label>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                        <button
                            className="btn btn-primary"
                            onClick={fetchTallyEntries}
                            disabled={isLoading || !selectedBankLedger || !state.tally.connected}
                        >
                            {isLoading ? (
                                <><Loader2 className="animate-spin" size={16} /> Loading...</>
                            ) : (
                                <><RefreshCw size={16} /> Fetch & Auto-Match</>
                            )}
                        </button>
                        <button
                            className="btn btn-secondary"
                            onClick={handleExportBRS}
                            disabled={matches.length === 0}
                        >
                            <Download size={16} /> Export BRS
                        </button>
                    </div>
                </div>
            </div>

            {/* BRS Summary */}
            <div className="dashboard-grid mb-6">
                <div className="stat-card">
                    <div className="stat-content">
                        <p className="stat-label">Bank Balance</p>
                        <p className="stat-value">{formatCurrency(brsSummary.bankBalance)}</p>
                        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                            {brsSummary.totalBank} entries
                        </p>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-content">
                        <p className="stat-label">Tally Balance</p>
                        <p className="stat-value">{formatCurrency(brsSummary.tallyBalance)}</p>
                        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                            {brsSummary.totalTally} entries
                        </p>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-content">
                        <p className="stat-label">Difference</p>
                        <p className="stat-value" style={{
                            color: Math.abs(brsSummary.difference) < 0.01 ? 'var(--success-500)' : 'var(--error-500)'
                        }}>
                            {formatCurrency(brsSummary.difference)}
                        </p>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-content">
                        <p className="stat-label">Matched / Unmatched</p>
                        <p className="stat-value">
                            <span style={{ color: 'var(--success-500)' }}>{brsSummary.matchedCount}</span>
                            {' / '}
                            <span style={{ color: 'var(--warning-500)' }}>
                                {brsSummary.unmatchedBankCount + brsSummary.unmatchedTallyCount}
                            </span>
                        </p>
                    </div>
                </div>
            </div>

            {/* No Data Message */}
            {bankEntries.length === 0 && tallyEntries.length === 0 && (
                <div className="card" style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
                    <Info size={48} style={{ color: 'var(--text-muted)', margin: '0 auto 16px' }} />
                    <h3 style={{ marginBottom: 'var(--space-2)' }}>No Data to Reconcile</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)', maxWidth: '400px', margin: '0 auto' }}>
                        To use Bank Reconciliation:
                    </p>
                    <ol style={{
                        textAlign: 'left',
                        maxWidth: '400px',
                        margin: '16px auto',
                        fontSize: 'var(--text-sm)',
                        color: 'var(--text-secondary)'
                    }}>
                        <li style={{ marginBottom: '8px' }}>Upload a bank statement in the <strong>Banking</strong> page</li>
                        <li style={{ marginBottom: '8px' }}>Categorize and push transactions to <strong>Tally</strong></li>
                        <li style={{ marginBottom: '8px' }}>Select the bank ledger above and click <strong>Fetch & Auto-Match</strong></li>
                    </ol>
                </div>
            )}

            {/* Reconciliation Table - Side by Side */}
            {(bankEntries.length > 0 || tallyEntries.length > 0) && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                    {/* Bank Statement Column */}
                    <div className="card">
                        <div className="card-header" style={{ background: 'rgba(59, 130, 246, 0.1)' }}>
                            <h3 className="card-title" style={{ fontSize: 'var(--text-md)' }}>
                                <FileText size={18} /> Bank Statement ({filteredBankEntries.length})
                            </h3>
                        </div>
                        <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
                            {filteredBankEntries.length === 0 ? (
                                <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--text-muted)' }}>
                                    <AlertCircle size={32} style={{ margin: '0 auto 8px' }} />
                                    <p>No bank entries</p>
                                    <p style={{ fontSize: 'var(--text-sm)' }}>
                                        Upload and sync bank transactions first
                                    </p>
                                </div>
                            ) : (
                                filteredBankEntries.map(entry => {
                                    const matchInfo = getMatchInfo(entry.id, 'bank');
                                    return (
                                        <div
                                            key={entry.id}
                                            style={{
                                                padding: 'var(--space-3) var(--space-4)',
                                                borderBottom: '1px solid var(--border-default)',
                                                background: matchInfo.matched ? 'rgba(16, 185, 129, 0.1)' : 'inherit'
                                            }}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div className="flex items-center gap-2">
                                                        {matchInfo.matched && (
                                                            <Link2 size={14} style={{ color: 'var(--success-500)', flexShrink: 0 }} />
                                                        )}
                                                        <span style={{ fontSize: 'var(--text-sm)', fontWeight: 500 }}>
                                                            {formatDate(entry.date)}
                                                        </span>
                                                    </div>
                                                    <p style={{
                                                        fontSize: 'var(--text-sm)',
                                                        color: 'var(--text-muted)',
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        whiteSpace: 'nowrap'
                                                    }}>
                                                        {entry.description}
                                                    </p>
                                                </div>
                                                <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '8px' }}>
                                                    {(entry.debit || 0) > 0 && (
                                                        <span style={{ color: 'var(--error-500)', fontWeight: 600 }}>
                                                            -{formatCurrency(entry.debit)}
                                                        </span>
                                                    )}
                                                    {(entry.credit || 0) > 0 && (
                                                        <span style={{ color: 'var(--success-500)', fontWeight: 600 }}>
                                                            +{formatCurrency(entry.credit)}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            {matchInfo.matched && (
                                                <div style={{
                                                    marginTop: 'var(--space-2)',
                                                    fontSize: 'var(--text-xs)',
                                                    color: 'var(--success-500)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between'
                                                }}>
                                                    <span>✓ Matched</span>
                                                    <button
                                                        className="btn btn-ghost btn-sm"
                                                        onClick={() => handleUnmatch(entry.id)}
                                                        style={{ color: 'var(--error-400)', padding: '2px 6px' }}
                                                    >
                                                        <Unlink size={12} /> Unmatch
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* Tally Entries Column */}
                    <div className="card">
                        <div className="card-header" style={{ background: 'rgba(139, 92, 246, 0.1)' }}>
                            <h3 className="card-title" style={{ fontSize: 'var(--text-md)' }}>
                                <GitCompare size={18} /> Tally Entries ({filteredTallyEntries.length})
                            </h3>
                        </div>
                        <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
                            {filteredTallyEntries.length === 0 ? (
                                <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--text-muted)' }}>
                                    <RefreshCw size={32} style={{ margin: '0 auto 8px' }} />
                                    <p>No Tally entries loaded</p>
                                    <p style={{ fontSize: 'var(--text-sm)' }}>
                                        Select a bank ledger and click "Fetch & Auto-Match"
                                    </p>
                                </div>
                            ) : (
                                filteredTallyEntries.map(entry => {
                                    const matchInfo = getMatchInfo(entry.id, 'tally');
                                    return (
                                        <div
                                            key={entry.id}
                                            style={{
                                                padding: 'var(--space-3) var(--space-4)',
                                                borderBottom: '1px solid var(--border-default)',
                                                background: matchInfo.matched ? 'rgba(16, 185, 129, 0.1)' : 'inherit'
                                            }}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div className="flex items-center gap-2">
                                                        {matchInfo.matched && (
                                                            <Link2 size={14} style={{ color: 'var(--success-500)', flexShrink: 0 }} />
                                                        )}
                                                        <span style={{ fontSize: 'var(--text-sm)', fontWeight: 500 }}>
                                                            {formatDate(entry.date)}
                                                        </span>
                                                        <span style={{
                                                            fontSize: 'var(--text-xs)',
                                                            background: 'var(--bg-glass)',
                                                            padding: '2px 6px',
                                                            borderRadius: 'var(--radius-sm)',
                                                            flexShrink: 0
                                                        }}>
                                                            {entry.voucherType}
                                                        </span>
                                                    </div>
                                                    <p style={{
                                                        fontSize: 'var(--text-sm)',
                                                        color: 'var(--text-muted)',
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        whiteSpace: 'nowrap'
                                                    }}>
                                                        {entry.description}
                                                    </p>
                                                </div>
                                                <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '8px' }}>
                                                    {(entry.debit || 0) > 0 && (
                                                        <span style={{ color: 'var(--error-500)', fontWeight: 600 }}>
                                                            -{formatCurrency(entry.debit)}
                                                        </span>
                                                    )}
                                                    {(entry.credit || 0) > 0 && (
                                                        <span style={{ color: 'var(--success-500)', fontWeight: 600 }}>
                                                            +{formatCurrency(entry.credit)}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            {matchInfo.matched && (
                                                <div style={{
                                                    marginTop: 'var(--space-2)',
                                                    fontSize: 'var(--text-xs)',
                                                    color: 'var(--success-500)'
                                                }}>
                                                    ✓ Matched with bank entry
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BankReconciliation;
