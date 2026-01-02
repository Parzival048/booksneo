/**
 * AI Tally Sync - Sales Module Page
 * Full Tally integration with GST support
 */

import { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import FileUpload from '../components/common/FileUpload';
import {
    DollarSign, Plus, Send, Check, X, Edit2, Trash2,
    RefreshCw, CheckCircle, AlertCircle, Building2, Search
} from 'lucide-react';
import { formatCurrency, formatDate } from '../utils/helpers';
import { pushSalesEntry, batchPushSales } from '../services/tallyService';

const Sales = () => {
    const { state, actions } = useApp();
    const [entries, setEntries] = useState([]);
    const [showAddForm, setShowAddForm] = useState(false);
    const [isPushing, setIsPushing] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [selectedEntries, setSelectedEntries] = useState(new Set());

    // Search state for ledger dropdowns
    const [customerSearch, setCustomerSearch] = useState('');
    const [salesSearch, setSalesSearch] = useState('');

    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        customer: '',
        customerLedger: '',
        invoiceNo: '',
        amount: '',
        description: '',
        gstRate: '18',
        isInterState: false,
        salesLedger: 'Sales Account'
    });

    // Get all customer ledgers from Tally
    const allCustomerLedgers = useMemo(() => {
        return state.tally.ledgers.filter(l =>
            l.group?.toLowerCase().includes('sundry debtor') ||
            l.group?.toLowerCase().includes('debtors')
        );
    }, [state.tally.ledgers]);

    // Filtered customer ledgers based on search
    const customerLedgers = useMemo(() => {
        if (!customerSearch.trim()) return allCustomerLedgers;
        const search = customerSearch.toLowerCase();
        return allCustomerLedgers.filter(l =>
            l.name.toLowerCase().includes(search)
        );
    }, [allCustomerLedgers, customerSearch]);

    // Get all sales ledgers from Tally
    const allSalesLedgers = useMemo(() => {
        return state.tally.ledgers.filter(l =>
            l.group?.toLowerCase().includes('sales') ||
            l.group?.toLowerCase().includes('income')
        );
    }, [state.tally.ledgers]);

    // Filtered sales ledgers based on search
    const salesLedgers = useMemo(() => {
        if (!salesSearch.trim()) return allSalesLedgers;
        const search = salesSearch.toLowerCase();
        return allSalesLedgers.filter(l =>
            l.name.toLowerCase().includes(search)
        );
    }, [allSalesLedgers, salesSearch]);

    // Summary stats
    const summary = useMemo(() => {
        const total = entries.reduce((sum, e) => sum + (e.totalAmount || 0), 0);
        const pending = entries.filter(e => e.status === 'pending').length;
        const synced = entries.filter(e => e.status === 'synced').length;
        return { total, pending, synced, count: entries.length };
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
            customerLedger: formData.customerLedger || formData.customer,
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
            message: editingId ? 'Sales entry updated' : 'Sales entry added'
        });
    };

    const resetForm = () => {
        setFormData({
            date: new Date().toISOString().split('T')[0],
            customer: '',
            customerLedger: '',
            invoiceNo: '',
            amount: '',
            description: '',
            gstRate: '18',
            isInterState: false,
            salesLedger: 'Sales Account'
        });
        setShowAddForm(false);
        setEditingId(null);
    };

    const handleEdit = (entry) => {
        setFormData({
            date: entry.date,
            customer: entry.customer,
            customerLedger: entry.customerLedger || '',
            invoiceNo: entry.invoiceNo,
            amount: entry.amount.toString(),
            description: entry.description,
            gstRate: entry.gstRate?.toString() || '18',
            isInterState: entry.isInterState || false,
            salesLedger: entry.salesLedger || 'Sales Account'
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
            await pushSalesEntry(entry, state.tally.activeCompany);
            setEntries(entries.map(e =>
                e.id === entry.id ? { ...e, status: 'synced', syncedAt: new Date().toISOString() } : e
            ));
            actions.addNotification({ type: 'success', message: 'Sales voucher created in Tally' });
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
            const result = await batchPushSales(pendingEntries, state.tally.activeCompany);

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

    const toggleSelectAll = () => {
        if (selectedEntries.size === entries.length) {
            setSelectedEntries(new Set());
        } else {
            setSelectedEntries(new Set(entries.map(e => e.id)));
        }
    };

    return (
        <div className="animate-slideUp">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="flex items-center gap-2 mb-2">
                        <DollarSign size={24} />
                        Sales Module
                    </h2>
                    <p className="text-secondary" style={{ marginBottom: 0 }}>
                        Create and push sales invoices to Tally
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        className="btn btn-primary"
                        onClick={() => setShowAddForm(true)}
                    >
                        <Plus size={18} />
                        Add Sales Entry
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
                                Connect to Tally Prime to push sales entries
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
                        <p className="stat-value text-success">{formatCurrency(summary.total)}</p>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-content">
                        <p className="stat-label">Pending Sync</p>
                        <p className="stat-value" style={{ color: 'var(--warning-500)' }}>{summary.pending}</p>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-content">
                        <p className="stat-label">Synced to Tally</p>
                        <p className="stat-value" style={{ color: 'var(--success-500)' }}>{summary.synced}</p>
                    </div>
                </div>
            </div>

            {/* Add/Edit Form Modal */}
            {showAddForm && (
                <div className="card mb-6" style={{ border: '2px solid var(--primary-500)' }}>
                    <div className="card-header">
                        <h3 className="card-title">
                            {editingId ? 'Edit Sales Entry' : 'New Sales Entry'}
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
                                placeholder="INV-001"
                                value={formData.invoiceNo}
                                onChange={(e) => setFormData({ ...formData, invoiceNo: e.target.value })}
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Customer Name *</label>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="Enter customer name"
                                value={formData.customer}
                                onChange={(e) => setFormData({ ...formData, customer: e.target.value })}
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Customer Ledger (Tally)</label>
                            <div style={{ position: 'relative' }}>
                                <div style={{ position: 'relative', marginBottom: 'var(--space-2)' }}>
                                    <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                    <input
                                        type="text"
                                        className="form-input"
                                        placeholder="Search ledgers..."
                                        value={customerSearch}
                                        onChange={(e) => setCustomerSearch(e.target.value)}
                                        style={{ paddingLeft: '32px', fontSize: 'var(--text-sm)' }}
                                    />
                                </div>
                                <select
                                    className="form-select"
                                    value={formData.customerLedger}
                                    onChange={(e) => setFormData({ ...formData, customerLedger: e.target.value })}
                                    size={customerLedgers.length > 5 ? 5 : undefined}
                                    style={customerLedgers.length > 5 ? { height: 'auto' } : {}}
                                >
                                    <option value="">Use customer name as ledger</option>
                                    {customerLedgers.map(l => (
                                        <option key={l.name} value={l.name}>{l.name}</option>
                                    ))}
                                </select>
                                {customerLedgers.length === 0 && customerSearch && (
                                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 'var(--space-1)' }}>
                                        No matching ledgers found
                                    </div>
                                )}
                            </div>
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
                            <label className="form-label">Sales Account (Tally)</label>
                            <div style={{ position: 'relative' }}>
                                <div style={{ position: 'relative', marginBottom: 'var(--space-2)' }}>
                                    <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                    <input
                                        type="text"
                                        className="form-input"
                                        placeholder="Search sales accounts..."
                                        value={salesSearch}
                                        onChange={(e) => setSalesSearch(e.target.value)}
                                        style={{ paddingLeft: '32px', fontSize: 'var(--text-sm)' }}
                                    />
                                </div>
                                <select
                                    className="form-select"
                                    value={formData.salesLedger}
                                    onChange={(e) => setFormData({ ...formData, salesLedger: e.target.value })}
                                >
                                    <option value="Sales Account">Sales Account</option>
                                    {salesLedgers.map(l => (
                                        <option key={l.name} value={l.name}>{l.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={formData.isInterState}
                                    onChange={(e) => setFormData({ ...formData, isInterState: e.target.checked })}
                                />
                                Inter-State Sale (IGST)
                            </label>
                        </div>

                        <div className="form-group" style={{ gridColumn: 'span 2' }}>
                            <label className="form-label">Description</label>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="Sales description"
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
                            <div className="flex items-center justify-between" style={{ fontSize: 'var(--text-sm)' }}>
                                <span>GST ({formData.gstRate}%):</span>
                                <span>{formatCurrency((parseFloat(formData.amount) || 0) * (parseFloat(formData.gstRate) / 100))}</span>
                            </div>
                            <div className="flex items-center justify-between" style={{ fontSize: 'var(--text-md)', fontWeight: 600 }}>
                                <span>Total:</span>
                                <span className="text-success">
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
                            disabled={!formData.customer || !formData.amount || !formData.invoiceNo}
                        >
                            <Check size={16} /> {editingId ? 'Update Entry' : 'Add Entry'}
                        </button>
                    </div>
                </div>
            )}

            {/* Entries Table */}
            {entries.length > 0 && (
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">Sales Entries ({entries.length})</h3>
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
                                    <th>Customer</th>
                                    <th>Amount</th>
                                    <th>GST</th>
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
                                            <div>{entry.customer}</div>
                                            {entry.customerLedger && entry.customerLedger !== entry.customer && (
                                                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                                                    → {entry.customerLedger}
                                                </div>
                                            )}
                                        </td>
                                        <td>{formatCurrency(entry.amount)}</td>
                                        <td>
                                            {formatCurrency(entry.gstAmount)}
                                            <span style={{
                                                fontSize: 'var(--text-xs)',
                                                color: 'var(--text-muted)',
                                                marginLeft: '4px'
                                            }}>
                                                ({entry.gstRate}%)
                                            </span>
                                        </td>
                                        <td className="font-semibold text-success">{formatCurrency(entry.totalAmount)}</td>
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
                    <DollarSign size={48} style={{ color: 'var(--text-muted)', margin: '0 auto var(--space-4)' }} />
                    <h3>No Sales Entries</h3>
                    <p className="text-muted">Add sales entries to track your revenue and push to Tally</p>
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

export default Sales;
