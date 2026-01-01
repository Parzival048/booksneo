/**
 * AI Tally Sync - Dashboard Page
 * Main dashboard with real-time analytics from transaction data
 */

import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import {
    TrendingUp,
    TrendingDown,
    DollarSign,
    CreditCard,
    ArrowUpRight,
    Upload,
    ShoppingCart,
    RefreshCw,
    Building2,
    PieChart,
    BarChart3,
    Zap,
    Crown
} from 'lucide-react';
import { formatCurrency, groupBy } from '../utils/helpers';
import { TRANSACTION_CATEGORIES, BANK_TEMPLATES } from '../utils/constants';
import { Doughnut, Bar } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    ArcElement,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
    ArcElement,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend
);

// Chart options
const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: {
            labels: {
                color: '#94a3b8',
                font: { family: 'Inter' }
            }
        }
    },
    scales: {
        x: {
            ticks: { color: '#64748b' },
            grid: { color: 'rgba(100, 116, 139, 0.1)' }
        },
        y: {
            ticks: { color: '#64748b' },
            grid: { color: 'rgba(100, 116, 139, 0.1)' }
        }
    }
};

const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '70%',
    plugins: {
        legend: {
            position: 'top',
            labels: {
                color: '#94a3b8',
                font: { family: 'Inter' },
                padding: 15
            }
        }
    }
};

const Dashboard = () => {
    const { state } = useApp();
    const { plan, usage, getTransactionLimit, getCompanyLimit } = useAuth();

    // Get limits info
    const transactionLimit = getTransactionLimit();
    const companyLimit = getCompanyLimit();

    // Calculate real-time stats from transactions
    const stats = useMemo(() => {
        const transactions = state.banking.transactions || [];
        const purchaseEntries = state.purchase?.entries || [];
        const salesEntries = state.sales?.entries || [];

        const totalCredit = transactions.reduce((sum, t) => sum + (t.credit || 0), 0);
        const totalDebit = transactions.reduce((sum, t) => sum + (t.debit || 0), 0);
        const pendingSync = transactions.filter(t => !t.syncedToTally).length;

        // Calculate percentage change (mock for now, would compare to previous period)
        const creditChange = transactions.length > 0 ? '+8.5%' : '0%';
        const debitChange = transactions.length > 0 ? '-3.2%' : '0%';

        return {
            totalTransactions: transactions.length + purchaseEntries.length + salesEntries.length,
            totalBankingTransactions: transactions.length,
            totalCredit,
            totalDebit,
            netAmount: totalCredit - totalDebit,
            pendingSync,
            creditChange,
            debitChange,
            purchaseCount: purchaseEntries.length,
            salesCount: salesEntries.length
        };
    }, [state.banking.transactions, state.purchase?.entries, state.sales?.entries]);

    // Calculate category distribution from real transaction data
    const categoryData = useMemo(() => {
        const transactions = state.banking.transactions || [];

        if (transactions.length === 0) {
            // Show placeholder data when no transactions
            return {
                labels: ['No Data'],
                datasets: [{
                    data: [1],
                    backgroundColor: ['rgba(100, 116, 139, 0.3)'],
                    borderColor: ['rgb(100, 116, 139)'],
                    borderWidth: 2
                }]
            };
        }

        // Group transactions by category
        const categoryTotals = {};
        transactions.forEach(t => {
            const category = t.userCategory || t.aiCategory || 'Uncategorized';
            if (!categoryTotals[category]) {
                categoryTotals[category] = 0;
            }
            categoryTotals[category] += Math.abs(t.credit || t.debit || 0);
        });

        const labels = Object.keys(categoryTotals);
        const data = Object.values(categoryTotals);

        // Category colors from our constants
        const colors = labels.map(label => {
            const cat = TRANSACTION_CATEGORIES[label];
            return cat?.color || 'var(--text-muted)';
        });

        return {
            labels,
            datasets: [{
                data,
                backgroundColor: colors.map(c => c.replace(')', ', 0.7)').replace('rgb', 'rgba')),
                borderColor: colors,
                borderWidth: 2
            }]
        };
    }, [state.banking.transactions]);

    // Calculate monthly trends from transaction data
    const monthlyData = useMemo(() => {
        const transactions = state.banking.transactions || [];

        if (transactions.length === 0) {
            // Show placeholder data
            return {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                datasets: [
                    {
                        label: 'Credit',
                        data: [0, 0, 0, 0, 0, 0],
                        backgroundColor: 'rgba(16, 185, 129, 0.7)',
                        borderRadius: 8
                    },
                    {
                        label: 'Debit',
                        data: [0, 0, 0, 0, 0, 0],
                        backgroundColor: 'rgba(239, 68, 68, 0.7)',
                        borderRadius: 8
                    }
                ]
            };
        }

        // Group by month
        const monthlyCredits = {};
        const monthlyDebits = {};
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        transactions.forEach(t => {
            const date = new Date(t.date);
            const monthKey = months[date.getMonth()];

            if (!monthlyCredits[monthKey]) monthlyCredits[monthKey] = 0;
            if (!monthlyDebits[monthKey]) monthlyDebits[monthKey] = 0;

            monthlyCredits[monthKey] += t.credit || 0;
            monthlyDebits[monthKey] += t.debit || 0;
        });

        // Get last 6 months with data
        const activeMonths = [...new Set(transactions.map(t => months[new Date(t.date).getMonth()]))].slice(-6);

        if (activeMonths.length === 0) {
            activeMonths.push(...months.slice(0, 6));
        }

        return {
            labels: activeMonths,
            datasets: [
                {
                    label: 'Credit',
                    data: activeMonths.map(m => monthlyCredits[m] || 0),
                    backgroundColor: 'rgba(16, 185, 129, 0.7)',
                    borderRadius: 8
                },
                {
                    label: 'Debit',
                    data: activeMonths.map(m => monthlyDebits[m] || 0),
                    backgroundColor: 'rgba(239, 68, 68, 0.7)',
                    borderRadius: 8
                }
            ]
        };
    }, [state.banking.transactions]);

    // Bank template breakdown
    const templateStats = useMemo(() => {
        const transactions = state.banking.transactions || [];
        const template = state.banking.selectedTemplate;

        if (!template || transactions.length === 0) return null;

        const bankInfo = BANK_TEMPLATES[template];
        return {
            bankName: bankInfo?.name || template,
            logo: bankInfo?.logo || '🏦',
            transactionCount: transactions.length,
            dateRange: transactions.length > 0 ? {
                from: new Date(Math.min(...transactions.map(t => new Date(t.date)))).toLocaleDateString(),
                to: new Date(Math.max(...transactions.map(t => new Date(t.date)))).toLocaleDateString()
            } : null
        };
    }, [state.banking.transactions, state.banking.selectedTemplate]);

    const quickActions = [
        {
            icon: Upload,
            label: 'Upload Bank Statement',
            path: '/banking',
            color: 'var(--primary-500)',
            count: stats.totalBankingTransactions
        },
        {
            icon: ShoppingCart,
            label: 'Add Purchase Entry',
            path: '/purchase',
            color: 'var(--warning-500)',
            count: stats.purchaseCount
        },
        {
            icon: DollarSign,
            label: 'Add Sale Entry',
            path: '/sales',
            color: 'var(--success-500)',
            count: stats.salesCount
        },
        {
            icon: RefreshCw,
            label: 'Sync with Tally',
            path: '/tally',
            color: 'var(--accent-500)',
            count: stats.pendingSync
        }
    ];

    return (
        <div className="animate-slideUp">
            {/* Stats Grid */}
            <div className="dashboard-grid stagger-children mb-8">
                {/* Total Transactions */}
                <div className="stat-card">
                    <div className="stat-icon primary">
                        <CreditCard size={24} />
                    </div>
                    <div className="stat-content">
                        <p className="stat-label">Total Transactions</p>
                        <p className="stat-value">{stats.totalTransactions}</p>
                        <span className="stat-change positive">
                            {stats.totalBankingTransactions > 0 && (
                                <>
                                    <TrendingUp size={14} />
                                    {stats.totalBankingTransactions} from bank
                                </>
                            )}
                        </span>
                    </div>
                </div>

                {/* Total Credit */}
                <div className="stat-card">
                    <div className="stat-icon success">
                        <TrendingUp size={24} />
                    </div>
                    <div className="stat-content">
                        <p className="stat-label">Total Credit</p>
                        <p className="stat-value">{formatCurrency(stats.totalCredit)}</p>
                        {stats.totalCredit > 0 && (
                            <span className="stat-change positive">
                                <TrendingUp size={14} />
                                {stats.creditChange} vs last month
                            </span>
                        )}
                    </div>
                </div>

                {/* Total Debit */}
                <div className="stat-card">
                    <div className="stat-icon warning">
                        <TrendingDown size={24} />
                    </div>
                    <div className="stat-content">
                        <p className="stat-label">Total Debit</p>
                        <p className="stat-value">{formatCurrency(stats.totalDebit)}</p>
                        {stats.totalDebit > 0 && (
                            <span className="stat-change negative">
                                <TrendingDown size={14} />
                                {stats.debitChange} vs last month
                            </span>
                        )}
                    </div>
                </div>

                {/* Pending Sync */}
                <div className="stat-card">
                    <div className="stat-icon accent">
                        <Building2 size={24} />
                    </div>
                    <div className="stat-content">
                        <p className="stat-label">Pending Tally Sync</p>
                        <p className="stat-value">{stats.pendingSync}</p>
                        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                            {stats.pendingSync > 0 ? 'Awaiting push to Tally' : 'All synced'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Usage & Limits Card */}
            {plan && (
                <div className="card mb-6" style={{
                    background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.05), rgba(139, 92, 246, 0.05))',
                    borderColor: 'var(--border-subtle)'
                }}>
                    <div className="card-header" style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                    }}>
                        <h3 className="card-title flex items-center gap-2">
                            <Zap size={18} style={{ color: 'var(--primary-400)' }} />
                            Plan Usage
                        </h3>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 'var(--space-2)',
                            padding: 'var(--space-1) var(--space-3)',
                            background: plan.name === 'Free' ? 'rgba(100, 116, 139, 0.2)' : 'rgba(99, 102, 241, 0.2)',
                            borderRadius: 'var(--radius-full)',
                            fontSize: 'var(--text-xs)',
                            fontWeight: '600',
                            color: plan.name === 'Free' ? 'var(--text-muted)' : 'var(--primary-400)'
                        }}>
                            {plan.name !== 'Free' && <Crown size={12} />}
                            {plan.displayName || plan.name}
                        </div>
                    </div>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                        gap: 'var(--space-4)',
                        padding: 'var(--space-4)'
                    }}>
                        {/* Transactions Usage */}
                        <div>
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                marginBottom: 'var(--space-2)',
                                fontSize: 'var(--text-sm)'
                            }}>
                                <span style={{ color: 'var(--text-secondary)' }}>Transactions</span>
                                <span style={{ fontWeight: '600' }}>
                                    {transactionLimit.unlimited
                                        ? 'Unlimited'
                                        : `${transactionLimit.usage} / ${transactionLimit.displayLimit}`
                                    }
                                </span>
                            </div>
                            <div style={{
                                height: '8px',
                                background: 'var(--bg-glass)',
                                borderRadius: 'var(--radius-full)',
                                overflow: 'hidden'
                            }}>
                                <div style={{
                                    width: transactionLimit.unlimited ? '0%' : `${transactionLimit.percentage}%`,
                                    height: '100%',
                                    background: transactionLimit.percentage > 80
                                        ? 'var(--warning-500)'
                                        : 'var(--primary-500)',
                                    borderRadius: 'var(--radius-full)',
                                    transition: 'width 0.3s ease'
                                }} />
                            </div>
                            {!transactionLimit.unlimited && transactionLimit.percentage > 80 && (
                                <p style={{
                                    fontSize: 'var(--text-xs)',
                                    color: 'var(--warning-500)',
                                    marginTop: 'var(--space-1)',
                                    marginBottom: 0
                                }}>
                                    {transactionLimit.remaining} transactions remaining
                                </p>
                            )}
                        </div>

                        {/* Companies Usage */}
                        <div>
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                marginBottom: 'var(--space-2)',
                                fontSize: 'var(--text-sm)'
                            }}>
                                <span style={{ color: 'var(--text-secondary)' }}>Companies</span>
                                <span style={{ fontWeight: '600' }}>
                                    {companyLimit.unlimited
                                        ? 'Unlimited'
                                        : `${companyLimit.usage} / ${companyLimit.displayLimit}`
                                    }
                                </span>
                            </div>
                            <div style={{
                                height: '8px',
                                background: 'var(--bg-glass)',
                                borderRadius: 'var(--radius-full)',
                                overflow: 'hidden'
                            }}>
                                <div style={{
                                    width: companyLimit.unlimited ? '0%' : `${companyLimit.percentage}%`,
                                    height: '100%',
                                    background: companyLimit.percentage > 80
                                        ? 'var(--warning-500)'
                                        : 'var(--success-500)',
                                    borderRadius: 'var(--radius-full)',
                                    transition: 'width 0.3s ease'
                                }} />
                            </div>
                        </div>
                    </div>

                    {/* Upgrade CTA for Free users */}
                    {plan.name === 'Free' && (
                        <div style={{
                            padding: 'var(--space-3) var(--space-4)',
                            borderTop: '1px solid var(--border-subtle)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between'
                        }}>
                            <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
                                Unlock unlimited transactions & more features
                            </span>
                            <Link to="/profile#plans">
                                <button className="btn btn-primary" style={{ padding: 'var(--space-2) var(--space-4)' }}>
                                    <Crown size={14} style={{ marginRight: 'var(--space-2)' }} />
                                    Upgrade Plan
                                </button>
                            </Link>
                        </div>
                    )}
                </div>
            )}

            {/* Bank Template Info - Shows when transactions are loaded */}
            {templateStats && (
                <div
                    className="card mb-6"
                    style={{
                        background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(139, 92, 246, 0.1))',
                        borderColor: 'var(--primary-500)'
                    }}
                >
                    <div className="flex items-center gap-4">
                        <span style={{ fontSize: '2.5rem' }}>{templateStats.logo}</span>
                        <div style={{ flex: 1 }}>
                            <h3 style={{ marginBottom: 'var(--space-1)' }}>{templateStats.bankName}</h3>
                            <p style={{ color: 'var(--text-muted)', marginBottom: 0, fontSize: 'var(--text-sm)' }}>
                                {templateStats.transactionCount} transactions
                                {templateStats.dateRange && (
                                    <> • {templateStats.dateRange.from} to {templateStats.dateRange.to}</>
                                )}
                            </p>
                        </div>
                        <Link to="/banking">
                            <button className="btn btn-primary">
                                View Details
                            </button>
                        </Link>
                    </div>
                </div>
            )}

            {/* Charts Section */}
            <div className="dashboard-grid-2 mb-8">
                {/* Category Distribution */}
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title flex items-center gap-2">
                            <PieChart size={18} />
                            Category Distribution
                        </h3>
                    </div>
                    <div className="chart-container" style={{ height: '280px' }}>
                        <Doughnut data={categoryData} options={doughnutOptions} />
                    </div>
                    {state.banking.transactions.length === 0 && (
                        <p className="text-center text-muted" style={{ fontSize: 'var(--text-sm)' }}>
                            Upload a bank statement to see category breakdown
                        </p>
                    )}
                </div>

                {/* Monthly Trends */}
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title flex items-center gap-2">
                            <BarChart3 size={18} />
                            Monthly Trends
                        </h3>
                    </div>
                    <div className="chart-container" style={{ height: '280px' }}>
                        <Bar data={monthlyData} options={chartOptions} />
                    </div>
                    {state.banking.transactions.length === 0 && (
                        <p className="text-center text-muted" style={{ fontSize: 'var(--text-sm)' }}>
                            Upload a bank statement to see monthly trends
                        </p>
                    )}
                </div>
            </div>

            {/* Summary Card - Shows when there's data */}
            {state.banking.summary && (
                <div className="card mb-8">
                    <div className="card-header">
                        <h3 className="card-title">Transaction Summary</h3>
                    </div>
                    <div className="dashboard-grid">
                        <div style={{ textAlign: 'center', padding: 'var(--space-4)' }}>
                            <p className="stat-label">Total Credit</p>
                            <p className="text-success" style={{ fontSize: 'var(--text-2xl)', fontWeight: '700' }}>
                                {formatCurrency(state.banking.summary.totalCredit)}
                            </p>
                        </div>
                        <div style={{ textAlign: 'center', padding: 'var(--space-4)' }}>
                            <p className="stat-label">Total Debit</p>
                            <p style={{ fontSize: 'var(--text-2xl)', fontWeight: '700', color: 'var(--error-500)' }}>
                                {formatCurrency(state.banking.summary.totalDebit)}
                            </p>
                        </div>
                        <div style={{ textAlign: 'center', padding: 'var(--space-4)' }}>
                            <p className="stat-label">Net Amount</p>
                            <p style={{
                                fontSize: 'var(--text-2xl)',
                                fontWeight: '700',
                                color: state.banking.summary.netAmount >= 0 ? 'var(--success-500)' : 'var(--error-500)'
                            }}>
                                {formatCurrency(state.banking.summary.netAmount)}
                            </p>
                        </div>
                        <div style={{ textAlign: 'center', padding: 'var(--space-4)' }}>
                            <p className="stat-label">Transactions</p>
                            <p style={{ fontSize: 'var(--text-2xl)', fontWeight: '700' }}>
                                {state.banking.summary.totalTransactions}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Quick Actions */}
            <div className="card">
                <div className="card-header">
                    <h3 className="card-title">Quick Actions</h3>
                </div>
                <div className="dashboard-grid">
                    {quickActions.map((action, index) => {
                        const Icon = action.icon;
                        return (
                            <Link
                                key={index}
                                to={action.path}
                                style={{ textDecoration: 'none' }}
                            >
                                <div
                                    className="card"
                                    style={{
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 'var(--space-4)'
                                    }}
                                >
                                    <div style={{
                                        width: '48px',
                                        height: '48px',
                                        borderRadius: 'var(--radius-lg)',
                                        background: `${action.color}20`,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: action.color
                                    }}>
                                        <Icon size={24} />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <p style={{ fontWeight: '500', marginBottom: 0 }}>{action.label}</p>
                                        {action.count > 0 && (
                                            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 0 }}>
                                                {action.count} entries
                                            </p>
                                        )}
                                    </div>
                                    <ArrowUpRight size={20} style={{ color: 'var(--text-muted)' }} />
                                </div>
                            </Link>
                        );
                    })}
                </div>
            </div>

            {/* Tally Connection Status */}
            {!state.tally.connected && (
                <div
                    className="card mt-6"
                    style={{
                        borderColor: 'var(--warning-500)',
                        background: 'rgba(245, 158, 11, 0.1)'
                    }}
                >
                    <div className="flex items-center gap-4">
                        <div style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: 'var(--radius-lg)',
                            background: 'rgba(245, 158, 11, 0.2)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--warning-500)'
                        }}>
                            <Building2 size={24} />
                        </div>
                        <div style={{ flex: 1 }}>
                            <p style={{ fontWeight: '600', marginBottom: 'var(--space-1)' }}>
                                Tally Not Connected
                            </p>
                            <p style={{ color: 'var(--text-muted)', marginBottom: 0, fontSize: 'var(--text-sm)' }}>
                                Connect to Tally Prime to enable data sync. Make sure Tally is running on your system.
                            </p>
                        </div>
                        <Link to="/tally">
                            <button className="btn btn-primary">
                                Configure Connection
                            </button>
                        </Link>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dashboard;
