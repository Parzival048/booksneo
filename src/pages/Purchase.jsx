/**
 * AI Tally Sync - Purchase Module Page
 * Full Tally integration with GST input credit support
 */

import { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import FileUpload from '../components/common/FileUpload';
import {
    ShoppingCart, Plus, Send, Check, X, Edit2, Trash2,
    RefreshCw, CheckCircle, AlertCircle, Upload
} from 'lucide-react';
import { formatCurrency, formatDate } from '../utils/helpers';
import { pushPurchaseEntry, batchPushPurchases } from '../services/tallyService';

const Purchase = () => {
    const { state, actions } = useApp();
    const [entries, setEntries] = useState([]);
    const [showAddForm, setShowAddForm] = useState(false);
    const [isPushing, setIsPushing] = useState(false);
    const [editingId, setEditingId] = useState(null);

    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        vendor: '',
        vendorLedger: '',
        invoiceNo: '',
        amount: '',
        description: '',
        gstRate: '18',
        isInterState: false,
        purchaseLedger: 'Purchase Account'
    });

    // Get vendor ledgers from Tally
    const vendorLedgers = useMemo(() => {
        return state.tally.ledgers.filter(l =>
            l.group?.toLowerCase().includes('sundry creditor') ||
            l.group?.toLowerCase().includes('creditors')
        );
    }, [state.tally.ledgers]);

    // Get purchase ledgers from Tally
    const purchaseLedgers = useMemo(() => {
        return state.tally.ledgers.filter(l =>
            l.group?.toLowerCase().includes('purchase') ||
            l.group?.toLowerCase().includes('expense')
        );
    }, [state.tally.ledgers]);

    // Summary stats
    const summary = useMemo(() => {
        const total = entries.reduce((sum, e) => sum + (e.totalAmount || 0), 0);
        const gstTotal = entries.reduce((sum, e) => sum + (e.gstAmount || 0), 0);
        const pending = entries.filter(e => e.status === 'pending').length;
        const synced = entries.filter(e => e.status === 'synced').length;
        return { total, gstTotal, pending, synced, count: entries.length };
    }, [entries]);

    const handleAddEntry = () => {
        const amount = parseFloat(formData.amount) || 0;
        const gstRate = parseFloat(formData.gstRate) || 0;
        const gstAmount = amount * (gstRate / 100);

        const newEntry = {
            id: Date.now(),
            ...formData,
            amount,
            gstRate,
            gstAmount,
            totalAmount: amount + gstAmount,
            vendorLedger: formData.vendorLedger || formData.vendor,
            status: 'pending',
            createdAt: new Date().toISOString()
        };

        if (editingId) {
            setEntries(entries.map(e => e.id === editingId ? { ...newEntry, id: editingId } : e));
            setEditingId(null);
        } else {
            setEntries([...entries, newEntry]);
        }

        resetForm();
        actions.addNotification({
            type: 'success',
            message: editingId ? 'Purchase entry updated' : 'Purchase entry added'
        });
    };

    const resetForm = () => {
        setFormData({
            date: new Date().toISOString().split('T')[0],
            vendor: '',
            vendorLedger: '',
            invoiceNo: '',
            amount: '',
            description: '',
            gstRate: '18',
            isInterState: false,
            purchaseLedger: 'Purchase Account'
        });
        setShowAddForm(false);
        setEditingId(null);
    };

    const handleEdit = (entry) => {
        setFormData({
            date: entry.date,
            vendor: entry.vendor,
            vendorLedger: entry.vendorLedger || '',
            invoiceNo: entry.invoiceNo,
            amount: entry.amount.toString(),
            description: entry.description,
            gstRate: entry.gstRate?.toString() || '18',
            isInterState: entry.isInterState || false,
            purchaseLedger: entry.purchaseLedger || 'Purchase Account'
        });
        setEditingId(entry.id);
        setShowAddForm(true);
    };

    const handleDelete = (id) => {
        setEntries(entries.filter(e => e.id !== id));
        actions.addNotification({ type: 'info', message: 'Entry deleted' });
    };

    const handlePushSingle = async (entry) => {
        if (!state.tally.connected || !state.tally.activeCompany) {
            actions.addNotification({
                type: 'error',
                message: 'Please connect to Tally and select a company first'
            });
            return;
        }

        setIsPushing(true);
        try {
            await pushPurchaseEntry(entry, state.tally.activeCompany);
            setEntries(entries.map(e =>
                e.id === entry.id ? { ...e, status: 'synced', syncedAt: new Date().toISOString() } : e
            ));
            actions.addNotification({ type: 'success', message: 'Purchase voucher created in Tally' });
        } catch (error) {
            actions.addNotification({ type: 'error', message: `Failed: ${error.message}` });
        } finally {
            setIsPushing(false);
        }
    };

    const handlePushAll = async () => {
        const pendingEntries = entries.filter(e => e.status === 'pending');
        if (pendingEntries.length === 0) {
            actions.addNotification({ type: 'warning', message: 'No pending entries to push' });
            return;
        }

        if (!state.tally.connected || !state.tally.activeCompany) {
            actions.addNotification({
                type: 'error',
                message: 'Please connect to Tally and select a company first'
            });
            return;
        }

        setIsPushing(true);
        try {
            const result = await batchPushPurchases(pendingEntries, state.tally.activeCompany);

            // Update synced entries
            const syncedIds = new Set(pendingEntries.slice(0, result.success).map(e => e.id));
            setEntries(entries.map(e =>
                syncedIds.has(e.id) ? { ...e, status: 'synced', syncedAt: new Date().toISOString() } : e
            ));

            actions.addNotification({
                type: result.failed > 0 ? 'warning' : 'success',
                message: `Pushed ${result.success} of ${pendingEntries.length} entries to Tally`
            });
        } catch (error) {
            actions.addNotification({ type: 'error', message: `Batch push failed: ${error.message}` });
        } finally {
            setIsPushing(false);
        }
    };

    return (
        <div className="animate-slideUp">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="flex items-center gap-2 mb-2">
                        <ShoppingCart size={24} />
                        Purchase Module
                    </h2>
                    <p className="text-secondary" style={{ marginBottom: 0 }}>
                        Create and push purchase invoices to Tally with GST input credit
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        className="btn btn-primary"
                        onClick={() => setShowAddForm(true)}
                    >
                        <Plus size={18} />
                        Add Purchase Entry
                    </button>
                </div>
            </div>

            {/* Tally Connection Status */}
            {!state.tally.connected && (
                <div className="card mb-6" style={{
                    background: 'rgba(245, 158, 11, 0.1)',
                    border: '1px solid var(--warning-500)'
                }}>
                    <div className="flex items-center gap-3" style={{ padding: 'var(--space-4)' }}>
                        <AlertCircle size={24} style={{ color: 'var(--warning-500)' }} />
                        <div>
                            <p style={{ fontWeight: 600, marginBottom: 'var(--space-1)' }}>
                                Tally Not Connected
                            </p>
                            <p style={{ color: 'var(--text-muted)', marginBottom: 0, fontSize: 'var(--text-sm)' }}>
                                Connect to Tally Prime to push purchase entries
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Summary Cards */}
            <div className="dashboard-grid mb-6">
                <div className="stat-card">
                    <div className="stat-content">
                        <p className="stat-label">Total Entries</p>
                        <p className="stat-value">{summary.count}</p>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-content">
                        <p className="stat-label">Total Amount</p>
                        <p className="stat-value" style={{ color: 'var(--error-500)' }}>
                            {formatCurrency(summary.total)}
                        </p>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-content">
                        <p className="stat-label">Input GST Credit</p>
                        <p className="stat-value text-success">{formatCurrency(summary.gstTotal)}</p>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-content">
                        <p className="stat-label">Pending / Synced</p>
                        <p className="stat-value">
                            <span style={{ color: 'var(--warning-500)' }}>{summary.pending}</span>
                            {' / '}
                            <span style={{ color: 'var(--success-500)' }}>{summary.synced}</span>
                        </p>
                    </div>
                </div>
            </div>

            {/* Add/Edit Form Modal */}
            {showAddForm && (
                <div className="card mb-6" style={{ border: '2px solid var(--primary-500)' }}>
                    <div className="card-header">
                        <h3 className="card-title">
                            {editingId ? 'Edit Purchase Entry' : 'New Purchase Entry'}
                        </h3>
                    </div>

                    <div className="dashboard-grid-2" style={{ padding: 'var(--space-4)' }}>
                        <div className="form-group">
                            <label className="form-label">Date *</label>
                            <input
                                type="date"
                                className="form-input"
                                value={formData.date}
                                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Invoice Number *</label>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="PUR-001"
                                value={formData.invoiceNo}
                                onChange={(e) => setFormData({ ...formData, invoiceNo: e.target.value })}
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Vendor Name *</label>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="Enter vendor name"
                                value={formData.vendor}
                                onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Vendor Ledger (Tally)</label>
                            <select
                                className="form-select"
                                value={formData.vendorLedger}
                                onChange={(e) => setFormData({ ...formData, vendorLedger: e.target.value })}
                            >
                                <option value="">Use vendor name as ledger</option>
                                {vendorLedgers.map(l => (
                                    <option key={l.name} value={l.name}>{l.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Amount (Before GST) *</label>
                            <input
                                type="number"
                                className="form-input"
                                placeholder="0.00"
                                value={formData.amount}
                                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">GST Rate</label>
                            <select
                                className="form-select"
                                value={formData.gstRate}
                                onChange={(e) => setFormData({ ...formData, gstRate: e.target.value })}
                            >
                                <option value="0">Exempt (0%)</option>
                                <option value="5">5%</option>
                                <option value="12">12%</option>
                                <option value="18">18%</option>
                                <option value="28">28%</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Purchase Account (Tally)</label>
                            <select
                                className="form-select"
                                value={formData.purchaseLedger}
                                onChange={(e) => setFormData({ ...formData, purchaseLedger: e.target.value })}
                            >
                                <option value="Purchase Account">Purchase Account</option>
                                {purchaseLedgers.map(l => (
                                    <option key={l.name} value={l.name}>{l.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label className="form-label flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={formData.isInterState}
                                    onChange={(e) => setFormData({ ...formData, isInterState: e.target.checked })}
                                />
                                Inter-State Purchase (IGST)
                            </label>
                        </div>

                        <div className="form-group" style={{ gridColumn: 'span 2' }}>
                            <label className="form-label">Description</label>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="Purchase description"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            />
                        </div>
                    </div>

                    {/* Amount Preview */}
                    {formData.amount && (
                        <div style={{
                            padding: 'var(--space-4)',
                            background: 'var(--bg-glass)',
                            borderTop: '1px solid var(--border-default)'
                        }}>
                            <div className="flex items-center justify-between" style={{ fontSize: 'var(--text-sm)' }}>
                                <span>Base Amount:</span>
                                <span>{formatCurrency(parseFloat(formData.amount) || 0)}</span>
                            </div>
                            <div className="flex items-center justify-between" style={{ fontSize: 'var(--text-sm)', color: 'var(--success-500)' }}>
                                <span>Input GST Credit ({formData.gstRate}%):</span>
                                <span>+{formatCurrency((parseFloat(formData.amount) || 0) * (parseFloat(formData.gstRate) / 100))}</span>
                            </div>
                            <div className="flex items-center justify-between" style={{ fontSize: 'var(--text-md)', fontWeight: 600 }}>
                                <span>Total Payable:</span>
                                <span style={{ color: 'var(--error-500)' }}>
                                    {formatCurrency((parseFloat(formData.amount) || 0) * (1 + parseFloat(formData.gstRate) / 100))}
                                </span>
                            </div>
                        </div>
                    )}

                    <div className="flex gap-3" style={{ padding: 'var(--space-4)' }}>
                        <button className="btn btn-secondary" onClick={resetForm}>
                            <X size={16} /> Cancel
                        </button>
                        <button
                            className="btn btn-primary"
                            onClick={handleAddEntry}
                            disabled={!formData.vendor || !formData.amount || !formData.invoiceNo}
                        >
                            <Check size={16} /> {editingId ? 'Update Entry' : 'Add Entry'}
                        </button>
                    </div>
                </div>
            )}

            {/* Upload Section */}
            <div className="card mb-6">
                <div className="card-header">
                    <h3 className="card-title flex items-center gap-2">
                        <Upload size={18} />
                        Upload Purchase Invoices
                    </h3>
                </div>
                <div style={{ padding: 'var(--space-4)' }}>
                    <p style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-3)', fontSize: 'var(--text-sm)' }}>
                        Upload PDF invoices for AI-powered data extraction (Coming Soon)
                    </p>
                    <FileUpload onFileSelect={(file) => {
                        console.log('File:', file);
                        actions.addNotification({
                            type: 'info',
                            message: 'PDF invoice parsing coming soon!'
                        });
                    }} />
                </div>
            </div>

            {/* Entries Table */}
            {entries.length > 0 && (
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">Purchase Entries ({entries.length})</h3>
                        <button
                            className="btn btn-success"
                            onClick={handlePushAll}
                            disabled={isPushing || summary.pending === 0 || !state.tally.connected}
                        >
                            {isPushing ? (
                                <><RefreshCw size={16} className="spinner" /> Pushing...</>
                            ) : (
                                <><Send size={16} /> Push All to Tally ({summary.pending})</>
                            )}
                        </button>
                    </div>

                    <div className="data-table-container">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Invoice No</th>
                                    <th>Vendor</th>
                                    <th>Amount</th>
                                    <th>GST (Input)</th>
                                    <th>Total</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {entries.map((entry) => (
                                    <tr key={entry.id}>
                                        <td>{formatDate(entry.date)}</td>
                                        <td>{entry.invoiceNo}</td>
                                        <td>
                                            <div>{entry.vendor}</div>
                                            {entry.vendorLedger && entry.vendorLedger !== entry.vendor && (
                                                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                                                    → {entry.vendorLedger}
                                                </div>
                                            )}
                                        </td>
                                        <td>{formatCurrency(entry.amount)}</td>
                                        <td className="text-success">
                                            +{formatCurrency(entry.gstAmount)}
                                            <span style={{
                                                fontSize: 'var(--text-xs)',
                                                color: 'var(--text-muted)',
                                                marginLeft: '4px'
                                            }}>
                                                ({entry.gstRate}%)
                                            </span>
                                        </td>
                                        <td className="font-semibold">{formatCurrency(entry.totalAmount)}</td>
                                        <td>
                                            {entry.status === 'synced' ? (
                                                <span className="badge badge-success">
                                                    <CheckCircle size={12} /> Synced
                                                </span>
                                            ) : (
                                                <span className="badge badge-warning">Pending</span>
                                            )}
                                        </td>
                                        <td>
                                            <div className="flex gap-1">
                                                {entry.status === 'pending' && (
                                                    <>
                                                        <button
                                                            className="btn btn-ghost btn-sm"
                                                            onClick={() => handleEdit(entry)}
                                                            title="Edit"
                                                        >
                                                            <Edit2 size={14} />
                                                        </button>
                                                        <button
                                                            className="btn btn-ghost btn-sm"
                                                            onClick={() => handlePushSingle(entry)}
                                                            disabled={isPushing || !state.tally.connected}
                                                            title="Push to Tally"
                                                        >
                                                            <Send size={14} />
                                                        </button>
                                                    </>
                                                )}
                                                <button
                                                    className="btn btn-ghost btn-sm"
                                                    onClick={() => handleDelete(entry.id)}
                                                    title="Delete"
                                                    style={{ color: 'var(--error-500)' }}
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {entries.length === 0 && !showAddForm && (
                <div className="card text-center" style={{ padding: 'var(--space-12)' }}>
                    <ShoppingCart size={48} style={{ color: 'var(--text-muted)', margin: '0 auto var(--space-4)' }} />
                    <h3>No Purchase Entries</h3>
                    <p className="text-muted">Add purchase entries manually or upload invoices</p>
                    <button
                        className="btn btn-primary mt-4"
                        onClick={() => setShowAddForm(true)}
                    >
                        <Plus size={18} />
                        Add First Entry
                    </button>
                </div>
            )}
        </div>
    );
};

export default Purchase;
